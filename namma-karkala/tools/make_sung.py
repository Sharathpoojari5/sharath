#!/usr/bin/env python3
"""Sung lyric lines from a REAL speaking voice.

For every lyric line of every song this takes natural speech (Google Cloud TTS Kannada / Indian-English voice) and re-pitches it
onto the melody with the WORLD vocoder: the voice's own timbre, accent and consonants stay, the pitch follows the tune (with
glides and vibrato), and the syllables are time-warped onto the beat. It is the "talk-sing" sound of a voice put through a
pitch corrector, much closer to a person than the formant synth singer, and it sings the actual Kannada / Tulu words.

    node export_song_plans.mjs ../voice/script.json > song_plans.json        # the melody (shared with the in-game singer)
    GOOGLE_TTS_API_KEY=... python3 make_sung.py --plans song_plans.json --out ../voice/sung

Output: <out>/<lang>/<song>__<id>_<span>.mp3 and <out>/manifest.json ({lang: [keys]}). The game plays them at the lyric cues and falls
back to the synth singer for any line that has no file.
Test without an API key:  python3 make_sung.py --plans song_plans.json --test-source some_speech.mp3 --out /tmp/x --only chande
"""
import argparse, json, os, subprocess, sys, tempfile
import numpy as np
import pyworld as pw
import soundfile as sf
from scipy.signal import find_peaks

HOP = 0.005


def load_audio(path, fs=24000):
    with tempfile.TemporaryDirectory() as d:
        wav = os.path.join(d, 'x.wav')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', path, '-ac', '1', '-ar', str(fs), wav], check=True)
        x, sr = sf.read(wav)
    return np.asarray(x, dtype=np.float64), sr


def energy(x, fs):
    n = int(0.025 * fs); h = int(HOP * fs)
    pad = np.pad(x, (n // 2, n))
    fr = np.lib.stride_tricks.sliding_window_view(pad, n)[::h]
    return np.sqrt((fr ** 2).mean(axis=1) + 1e-12)


def smooth(v, k):
    k = max(1, int(k)); return np.convolve(v, np.ones(k) / k, mode='same')


def sing(x, fs, plan, total):
    """x: speech, plan: [{t, dur, f}] one note per syllable, total: seconds of the musical phrase."""
    f0, t = pw.harvest(x, fs, f0_floor=70, f0_ceil=450, frame_period=HOP * 1000)
    f0 = pw.stonemask(x, f0, t, fs)
    sp = pw.cheaptrick(x, f0, t, fs); ap = pw.d4c(x, f0, t, fs)
    nf = len(f0); e = smooth(energy(x, fs)[:nf], 10)
    if len(e) < nf: e = np.pad(e, (0, nf - len(e)))
    act = np.where(e > 0.06 * e.max())[0]; a0, a1 = (act[0], act[-1]) if len(act) else (0, nf - 1)
    voiced = (f0 > 0)
    pk, _ = find_peaks(np.where(voiced, e, 0), distance=int(0.07 / HOP), prominence=0.08 * e.max())
    pk = pk[(pk >= a0) & (pk <= a1)]
    K = len(plan)
    if len(pk) >= 2 and K >= 2:
        nuc = np.interp(np.linspace(0, len(pk) - 1, K), np.arange(len(pk)), pk) * HOP        # nuclei resampled to the syllable count
    else:
        nuc = (a0 + (a1 - a0) * (np.arange(K) + 0.5) / K) * HOP
    centres = np.array([p['t'] + p['dur'] / 2 for p in plan])
    out_pts = np.concatenate([[0.0], centres, [total]]); src_pts = np.concatenate([[a0 * HOP], nuc, [a1 * HOP]])
    for i in range(1, len(out_pts)):                                                            # strictly increasing for interp
        out_pts[i] = max(out_pts[i], out_pts[i - 1] + 1e-3); src_pts[i] = max(src_pts[i], src_pts[i - 1] + 1e-3)
    n_out = int(total / HOP) + 1; tau = np.arange(n_out) * HOP
    idx = np.interp(tau, out_pts, src_pts) / HOP; idx = np.clip(idx, 0, nf - 1)
    i0 = np.floor(idx).astype(int); i1 = np.minimum(i0 + 1, nf - 1); w = (idx - i0)[:, None]
    sp_o = sp[i0] * (1 - w) + sp[i1] * w; ap_o = np.clip(ap[i0] * (1 - w) + ap[i1] * w, 0, 1)
    vo = np.interp(idx, np.arange(nf), voiced.astype(float)) > 0.5
    # target pitch contour: legato glides between syllable notes, a small scoop on slide notes, vibrato on held notes
    starts = np.array([p['t'] for p in plan]); ends = starts + np.array([p['dur'] for p in plan]); lf = np.log(np.array([p['f'] for p in plan]))
    k = np.clip(np.searchsorted(starts, tau, side='right') - 1, 0, K - 1)
    prev = np.maximum(k - 1, 0); s = np.clip((tau - starts[k]) / 0.07, 0, 1); s = s * s * (3 - 2 * s)
    cont = np.exp(lf[prev] * (1 - s) + lf[k] * s)
    held = np.clip(tau - starts[k] - 0.25, 0, None)
    cont *= 1 + 0.011 * np.sin(2 * np.pi * 5.6 * tau) * np.clip(held / 0.2, 0, 1)
    f0_o = np.where(vo, cont, 0.0)
    y = pw.synthesize(np.ascontiguousarray(f0_o), np.ascontiguousarray(sp_o), np.ascontiguousarray(ap_o), fs, HOP * 1000)
    y = y[: int((total + 0.25) * fs)]
    y *= 0.85 / (np.abs(y).max() + 1e-9)
    fade = int(0.02 * fs); y[:fade] *= np.linspace(0, 1, fade); y[-fade:] *= np.linspace(1, 0, fade)
    return y, f0_o


def pitch_error(y, fs, plan):
    """Median |cents| between the tracked pitch of the result and the planned notes (a self-check, no ears needed)."""
    import librosa
    f, vf, _ = librosa.pyin(y.astype(np.float32), fmin=70, fmax=700, sr=fs, frame_length=2048, hop_length=int(HOP * fs) * 2)
    tt = np.arange(len(f)) * HOP * 2; errs = []
    for p in plan:
        m = (tt >= p['t'] + 0.08) & (tt <= p['t'] + p['dur'] - 0.02) & vf & np.isfinite(f)
        if m.sum() >= 2:
            oct_err = 1200 * np.log2(np.median(f[m]) / p['f']); errs.append(abs(((oct_err + 600) % 1200) - 600))
    return (float(np.median(errs)), len(errs)) if errs else (None, 0)


def main():
    ap_ = argparse.ArgumentParser()
    ap_.add_argument('--plans', default='song_plans.json'); ap_.add_argument('--out', default='../voice/sung')
    ap_.add_argument('--langs', nargs='+', default=['kn', 'tcy', 'en']); ap_.add_argument('--only', nargs='*')
    ap_.add_argument('--test-source', help='use this speech file for every line (no API key needed; for DSP tests)')
    ap_.add_argument('--skip-existing', action='store_true')
    a = ap_.parse_args()
    plans = json.load(open(a.plans, encoding='utf-8'))
    tts = None
    if not a.test_source:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import make_voices_google as G
        if not G.KEY:
            print('GOOGLE_TTS_API_KEY is not set: nothing to do (the in-game synth singer stays).'); return 0
        pools = {'kn': G.pick_voices('kn-IN'), 'en': G.pick_voices('en-IN')}; pools['tcy'] = pools['kn']; tts = (G, pools)
    manifest = {l: [] for l in a.langs}; errs_all = []
    for song, sp_ in plans.items():
        if a.only and song not in a.only: continue
        for key, ln in sp_['lines'].items():
            for lang in a.langs:
                name = f'{song}__{key}.mp3'; path = os.path.join(a.out, lang, name)
                if a.skip_existing and os.path.exists(path): manifest[lang].append(name); continue
                info = ln['notes'][lang]; plan = info['plan']
                if not plan: continue
                try:
                    if a.test_source:
                        x, fs = load_audio(a.test_source)
                    else:
                        G, pools = tts; pool = pools[lang]; names = pool['F' if ln['female'] else 'M'] or pool['M'] or pool['F']
                        text = G.spoken(info['text']) if lang in ('kn', 'tcy') else info['text']
                        mp3 = G.synth(names[0], 'en-IN' if lang == 'en' else 'kn-IN', text, 0.9, 0, 0)
                        with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as t:
                            t.write(mp3)
                        x, fs = load_audio(t.name); os.unlink(t.name)
                    y, _ = sing(x, fs, plan, ln['seconds'])
                    os.makedirs(os.path.dirname(path), exist_ok=True)
                    with tempfile.TemporaryDirectory() as d:
                        wav = os.path.join(d, 'y.wav'); sf.write(wav, y, fs)
                        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-ac', '1', '-codec:a', 'libmp3lame', '-q:a', '3', path], check=True)
                    err, n = pitch_error(y, fs, plan); errs_all.append(err if err is not None else 0)
                    manifest[lang].append(name); print(f'[{lang}] {song} {key}: {len(plan)} syllables, {ln["seconds"]:.1f}s, median pitch error {err if err is None else round(err)} cents ({n} notes)')
                except Exception as e:
                    print(f'[{lang}] {song} {key} FAILED: {e}')
    os.makedirs(a.out, exist_ok=True)
    mp = os.path.join(a.out, 'manifest.json')
    old = json.load(open(mp)) if os.path.exists(mp) else {}
    for l, v in manifest.items(): old[l] = sorted(set(old.get(l, [])) | set(v))
    json.dump(old, open(mp, 'w'), indent=1)
    if errs_all: print('overall median pitch error (cents):', round(float(np.median(errs_all))))
    return 0


if __name__ == '__main__':
    sys.exit(main())
