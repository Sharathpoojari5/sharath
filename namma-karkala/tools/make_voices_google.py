#!/usr/bin/env python3
"""Natural Kannada (and Indian-English) voice-over for Namma Karkala with Google Cloud Text-to-Speech.

    GOOGLE_TTS_API_KEY=... python3 make_voices_google.py --script ../voice/script.json --out ../voice --langs kn tcy en

* Picks the best Kannada voices the API offers (Chirp3-HD > Studio > Neural2 > WaveNet > Standard), separate male and female
  voices, and gives each character its own voice, speaking rate and pitch, so people sound different.
* SSML adds natural pauses at commas, full stops and dashes, which is what makes it sound like a person talking and not reading.
* Tulu is written in Kannada script, so the Kannada voices read the Tulu text: a Kannada-accented Tulu (no Tulu voice exists).
* The few English / Hindi words inside the mixed street lines are written in Kannada script first, so the Kannada voice says them.
* English (en) uses the en-IN voices, so the English version also has an Indian accent.

Output: <out>/<lang>/<id>.mp3 for every spoken line (sung lyrics S* are skipped) and <out>/manifest.json.
Free tier: about 1M characters a month for WaveNet; this script uses about 25k.
"""
import argparse, base64, json, os, re, subprocess, sys, tempfile, time, urllib.error, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_voices import spoken, trim_and_normalise, to_mp3, load_script   # noqa: E402
import numpy as np                                                          # noqa: E402
import soundfile as sf                                                      # noqa: E402

KEY = os.environ.get('GOOGLE_TTS_API_KEY', '').strip()
BASE = os.environ.get('GOOGLE_TTS_BASE', 'https://texttospeech.googleapis.com/v1')      # override only for offline tests
RANK = [('chirp3-hd', 5), ('chirp-hd', 5), ('studio', 4), ('neural2', 3), ('wavenet', 2), ('news', 2), ('polyglot', 1), ('standard', 0)]

# character -> (gender, which of that gender's voices, speaking rate, pitch in semitones, volume dB)
CAST = {
    'RAJU': ('M', 0, 1.0, 0, 0), 'NARRATOR': ('M', 1, 0.92, -1.5, 0), 'AMMA': ('F', 0, 0.98, 0, 0), 'AJJI': ('F', 1, 0.88, -1, 0),
    'ARCHAKARU': ('M', 2, 0.88, -3, 0), 'PRAMOD': ('M', 3, 1.08, 1, 0), 'OWNER': ('M', 2, 0.98, -2, 0), 'CANTEEN': ('M', 4, 1.0, -2, 0),
    'SHWETHA': ('F', 2, 1.03, 1, 0), 'THIEF': ('M', 3, 1.22, 2, 0), 'PEDESTRIAN': ('M', 5, 1.05, 0, 0), 'DJ': ('M', 3, 1.12, 1, 2),
    'UNCLE': ('M', 4, 0.98, -1, 0), 'AUNTY': ('F', 3, 1.0, 0, 0), 'STUDENT': ('M', 5, 1.15, 1, 0), 'FISHERMAN': ('M', 2, 0.85, -2, 0),
    'BOY': ('M', 5, 1.2, 3, 0), 'CONSTABLE': ('M', 1, 0.95, -2, 1), 'VENDOR': ('M', 0, 1.15, 1, 3), 'DRIVER': ('M', 3, 1.2, 0, 3),
    'SINGER': ('M', 0, 1.0, 0, 0),
}


def call(path, body=None, params=''):
    req = urllib.request.Request(f'{BASE}/{path}{params}', data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Content-Type': 'application/json', 'x-goog-api-key': KEY})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            msg = e.read().decode('utf-8', 'replace')[:300]
            if e.code in (429, 500, 503) and attempt < 3:
                time.sleep(2 ** attempt * 2); continue
            raise RuntimeError(f'HTTP {e.code}: {msg}')


def rank(name):
    n = name.lower()
    for k, v in RANK:
        if k in n:
            return v
    return 0


def pick_voices(lang):
    vs = call('voices', params=f'?languageCode={lang}').get('voices', [])
    out = {'M': [], 'F': []}
    for v in sorted(vs, key=lambda v: (-rank(v['name']), v['name'])):
        g = {'MALE': 'M', 'FEMALE': 'F'}.get(v.get('ssmlGender'))
        if g:
            out[g].append(v['name'])
    # keep the best tier only, but never fewer than 2 voices per gender
    for g in out:
        if out[g]:
            top = rank(out[g][0]); tier = [n for n in out[g] if rank(n) == top]
            out[g] = tier if len(tier) >= 2 else out[g]
    return out


def to_ssml(text, rate, pitch, vol):
    t = re.sub(r'&', '&amp;', text); t = re.sub(r'<', '&lt;', t)
    t = re.sub(r'([.!?।])\s+', r'\1 <break time="420ms"/> ', t)
    t = re.sub(r'([,;:–—])\s+', r'\1 <break time="200ms"/> ', t)
    t = t.replace('…', '… <break time="400ms"/>')
    return (f'<speak><prosody rate="{int(rate * 100)}%" pitch="{pitch:+.1f}st" volume="{vol:+d}dB">{t}</prosody></speak>')


def synth(voice, lang, text, rate, pitch, vol):
    chirp = 'chirp' in voice.lower()
    attempts = []
    if not chirp:
        attempts.append(({'ssml': to_ssml(text, rate, pitch, vol)}, {'audioEncoding': 'MP3', 'sampleRateHertz': 24000}))
    attempts.append(({'text': text}, {'audioEncoding': 'MP3', 'sampleRateHertz': 24000, **({} if chirp else {'speakingRate': rate, 'pitch': pitch})}))
    attempts.append(({'text': text}, {'audioEncoding': 'MP3'}))
    last = None
    for inp, cfg in attempts:
        try:
            r = call('text:synthesize', {'input': inp, 'voice': {'languageCode': lang, 'name': voice}, 'audioConfig': cfg})
            return base64.b64decode(r['audioContent'])
        except RuntimeError as e:
            last = e
    raise last


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--script', default='../voice/script.json'); ap.add_argument('--out', default='../voice')
    ap.add_argument('--langs', nargs='+', default=['kn', 'tcy', 'en']); ap.add_argument('--only', nargs='*')
    ap.add_argument('--skip-prefix', nargs='*', default=['S']); ap.add_argument('--skip-existing', action='store_true')
    ap.add_argument('--dry-run', action='store_true', help='list the chosen voices and exit')
    a = ap.parse_args()
    if not KEY:
        print('GOOGLE_TTS_API_KEY is not set: nothing to do (the open MMS voices stay in place).'); return 0
    lines, speakers = load_script(a.script)
    ids = a.only or [k for k in lines if not any(k.startswith(p) for p in a.skip_prefix)]
    pools = {'kn': pick_voices('kn-IN'), 'en': pick_voices('en-IN')}
    pools['tcy'] = pools['kn']
    print('Kannada voices:', json.dumps(pools['kn'])); print('Indian English voices:', json.dumps(pools['en']))
    if not pools['kn']['M'] or not pools['kn']['F']:
        print('No Kannada voices returned: is the Cloud Text-to-Speech API enabled for this key?'); return 1
    if a.dry_run:
        return 0
    manifest_path = os.path.join(a.out, 'manifest.json')
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {}
    for lang in a.langs:
        pool = pools[lang]; code = 'en-IN' if lang == 'en' else 'kn-IN'; done = set(manifest.get(lang, []))
        for n, id_ in enumerate(ids):
            rec = lines[id_]; path = os.path.join(a.out, lang, id_ + '.mp3')
            if a.skip_existing and os.path.exists(path):
                done.add(id_); continue
            g, k, rate, pitch, vol = CAST.get(rec['w'], CAST['NARRATOR'])
            names = pool[g] or pool['M' if g == 'F' else 'F']; voice = names[k % len(names)]
            text = spoken(rec[lang]) if lang in ('kn', 'tcy') else rec['en']
            try:
                mp3 = synth(voice, code, text, rate, pitch, vol)
                with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as t:
                    t.write(mp3)
                wav = t.name + '.wav'
                subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', t.name, '-ac', '1', '-ar', '24000', wav], check=True)
                x, sr = sf.read(wav); os.unlink(t.name); os.unlink(wav)
                to_mp3(trim_and_normalise(np.asarray(x, dtype='float32'), sr), sr, path)
                done.add(id_); print(f'[{lang}] {n + 1}/{len(ids)} {id_} {rec["w"]} {voice} ok')
            except Exception as e:                                  # one bad line must not stop the run
                print(f'[{lang}] {id_} FAILED: {e}')
        manifest[lang] = sorted(done)
        os.makedirs(a.out, exist_ok=True); json.dump(manifest, open(manifest_path, 'w'), indent=1)
    print('manifest:', {k: len(v) for k, v in manifest.items()})
    return 0


if __name__ == '__main__':
    sys.exit(main())
