#!/usr/bin/env python3
"""Put human recordings into the game.

    python3 ingest_recordings.py namma-karkala-voices.zip [more.zip ...] --voice ../voice

The zip comes from the Record page (/record/): files named <lang>/<id>.<webm|m4a|ogg|wav> plus meta.json (word edits).
Each recording is converted to a 24 kHz mono mp3, its leading/trailing silence is trimmed and its level is normalised, then it is saved as
voice/<lang>/<id>.mp3 and listed in voice/manifest.json. Words the speaker changed are written back into voice/script.json so the subtitles match.
"""
import argparse, json, os, subprocess, sys, tempfile, zipfile
import numpy as np, soundfile as sf

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_voices import trim_and_normalise, to_mp3   # noqa: E402


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('zips', nargs='+'); ap.add_argument('--voice', default='../voice'); a = ap.parse_args()
    script_path = os.path.join(a.voice, 'script.json'); script = json.load(open(script_path, encoding='utf-8'))
    mp = os.path.join(a.voice, 'manifest.json'); manifest = json.load(open(mp)) if os.path.exists(mp) else {}
    done, edited, bad = 0, 0, []
    for z in a.zips:
        with tempfile.TemporaryDirectory() as d, zipfile.ZipFile(z) as zf:
            zf.extractall(d)
            meta = json.load(open(os.path.join(d, 'meta.json'), encoding='utf-8')) if os.path.exists(os.path.join(d, 'meta.json')) else {}
            for lang in ('kn', 'tcy', 'en'):
                ld = os.path.join(d, lang)
                if not os.path.isdir(ld): continue
                for f in sorted(os.listdir(ld)):
                    id_ = os.path.splitext(f)[0]
                    if id_ not in script['lines']: bad.append(f'{lang}/{f} (no such line)'); continue
                    wav = os.path.join(d, f'{lang}_{id_}.wav')
                    r = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(ld, f), '-ac', '1', '-ar', '24000', wav], capture_output=True)
                    if r.returncode: bad.append(f'{lang}/{f}: ffmpeg failed'); continue
                    x, sr = sf.read(wav)
                    if len(x) < 0.4 * sr: bad.append(f'{lang}/{f}: too short'); continue
                    to_mp3(trim_and_normalise(np.asarray(x, dtype='float32'), sr), sr, os.path.join(a.voice, lang, id_ + '.mp3'))
                    manifest.setdefault(lang, []); manifest[lang] = sorted(set(manifest[lang]) | {id_}); done += 1
            for key, text in (meta.get('edits') or {}).items():
                lang, id_ = key.split('/', 1)
                if id_ in script['lines'] and text.strip():
                    script['lines'][id_][lang] = text.strip(); edited += 1
    json.dump(manifest, open(mp, 'w'), indent=1)
    json.dump(script, open(script_path, 'w'), ensure_ascii=False, indent=1)
    print(f'added {done} recordings, updated the words of {edited} lines')
    for b in bad: print('skipped:', b)
    return 0


if __name__ == '__main__':
    sys.exit(main())
