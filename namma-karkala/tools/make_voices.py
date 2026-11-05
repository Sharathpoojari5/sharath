#!/usr/bin/env python3
"""Generate the Kannada and Tulu voice-over for Namma Karkala with open-source speech models.

    python3 make_voices.py --script ../voice/script.json --out ../voice --langs kn tcy

Needs internet access to huggingface.co (to download the models) and works best on a GPU (free Colab is fine;
see colab/namma_karkala_voices.ipynb).  Output: <out>/<lang>/<id>.mp3 for every line, plus <out>/manifest.json.

Models used (all open weights; READ EACH MODEL CARD'S LICENCE BEFORE YOU PUBLISH):
  * ai4bharat/indic-parler-tts  - Indic Parler-TTS, 21 Indian languages incl. Kannada. A text *description* controls
                                  the voice, so each character gets its own voice. (Apache-2.0)
  * facebook/mms-tts-tcy        - Meta MMS-TTS Tulu, tried first for Tulu if it exists. Single voice, so pitch is
                                  shifted per character. (CC-BY-NC 4.0: non-commercial use only)
  If the Tulu model is unavailable the Kannada Parler voice reads the Tulu text (Tulu is written in Kannada script),
  which gives a Kannada-accented Tulu: understandable, not native.

Flags: --engine parler|mms|auto   --only L01 L02   --skip-existing   --device cuda|cpu   --selftest (no models)
"""
import argparse, json, os, subprocess, sys, tempfile
import numpy as np

try:
    import soundfile as sf
except ImportError:
    sys.exit('pip install soundfile')

BASE_DESC = 'The recording is very clear, close up, with no background noise or reverb.'
PITCH = {  # semitone shift applied to single-voice engines (MMS) so characters differ
    'RAJU': 0, 'AMMA': 4, 'AJJI': 6, 'ARCHAKARU': -3, 'PRAMOD': 1, 'OWNER': -2, 'CANTEEN': -4,
    'SHWETHA': 5, 'THIEF': 3, 'PEDESTRIAN': 1, 'NARRATOR': -2,
}


def load_script(path):
    doc = json.load(open(path, encoding='utf-8'))
    return doc['lines'], doc.get('speakers', {})


# ----------------------------------------------------------------------------------- engines
class Parler:
    def __init__(self, device):
        import torch
        from parler_tts import ParlerTTSForConditionalGeneration
        from transformers import AutoTokenizer
        self.torch, self.device = torch, device
        name = 'ai4bharat/indic-parler-tts'
        self.model = ParlerTTSForConditionalGeneration.from_pretrained(name).to(device)
        self.tok = AutoTokenizer.from_pretrained(name)
        self.dtok = AutoTokenizer.from_pretrained(self.model.config.text_encoder._name_or_path)
        self.sr = self.model.config.sampling_rate

    def say(self, text, who, speakers):
        t = self.torch
        desc = f"A {speakers.get(who, 'clear adult voice')} speaks in Kannada. {BASE_DESC}"
        seed = sum(ord(c) for c in who)             # same speaker -> same seed -> a consistent voice across lines
        t.manual_seed(seed)
        d = self.dtok(desc, return_tensors='pt').to(self.device)
        p = self.tok(text, return_tensors='pt').to(self.device)
        out = self.model.generate(input_ids=d.input_ids, attention_mask=d.attention_mask,
                                  prompt_input_ids=p.input_ids, prompt_attention_mask=p.attention_mask)
        return out.cpu().numpy().squeeze().astype('float32'), self.sr


class MMS:
    def __init__(self, repo, device):
        import torch
        from transformers import VitsModel, AutoTokenizer
        self.torch, self.device = torch, device
        self.model = VitsModel.from_pretrained(repo).to(device)
        self.tok = AutoTokenizer.from_pretrained(repo)
        self.sr = self.model.config.sampling_rate

    def say(self, text, who, speakers):
        t = self.torch
        inp = self.tok(text, return_tensors='pt').to(self.device)
        t.manual_seed(7)
        with t.no_grad():
            wav = self.model(**inp).waveform.cpu().numpy().squeeze().astype('float32')
        return shift_pitch(wav, self.sr, PITCH.get(who, 0)), self.sr


def shift_pitch(wav, sr, semitones):
    if not semitones:
        return wav
    import librosa
    return librosa.effects.pitch_shift(wav, sr=sr, n_steps=semitones)


class SineEngine:      # --selftest: no models, proves the post-processing / mp3 / manifest path
    sr = 24000

    def say(self, text, who, speakers):
        n = int(self.sr * (0.4 + 0.045 * len(text)))
        f = 140 + 12 * (sum(map(ord, who)) % 10)
        t = np.arange(n) / self.sr
        return (0.3 * np.sin(2 * np.pi * f * t) * np.minimum(1, t * 20) * np.minimum(1, (n / self.sr - t) * 20)).astype('float32'), self.sr


# ----------------------------------------------------------------------------------- audio post-processing
def trim_and_normalise(wav, sr):
    a = np.abs(wav)
    idx = np.where(a > 0.02 * (a.max() or 1))[0]
    if len(idx):
        wav = wav[max(0, idx[0] - int(0.05 * sr)): idx[-1] + int(0.15 * sr)]
    peak = np.abs(wav).max() or 1
    return (wav * (0.7 / peak)).astype('float32')


def to_mp3(wav, sr, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        sf.write(tmp.name, wav, sr)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp.name, '-ac', '1', '-ar', '44100', '-codec:a', 'libmp3lame', '-q:a', '4', path], check=True)
    os.unlink(tmp.name)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--script', default='../voice/script.json')
    ap.add_argument('--out', default='../voice')
    ap.add_argument('--langs', nargs='+', default=['kn', 'tcy'])
    ap.add_argument('--engine', default='auto', choices=['auto', 'parler', 'mms'])
    ap.add_argument('--only', nargs='*')
    ap.add_argument('--skip-existing', action='store_true')
    ap.add_argument('--device', default=None)
    ap.add_argument('--selftest', action='store_true')
    a = ap.parse_args()

    lines, speakers = load_script(a.script)
    ids = a.only or list(lines)
    manifest_path = os.path.join(a.out, 'manifest.json')
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {}

    engines = {}
    if a.selftest:
        engines = {l: SineEngine() for l in a.langs}
    else:
        import torch
        dev = a.device or ('cuda' if torch.cuda.is_available() else 'cpu')
        print('device:', dev)
        parler = None
        for lang in a.langs:
            if lang == 'tcy' and a.engine in ('auto', 'mms'):
                try:
                    engines[lang] = MMS('facebook/mms-tts-tcy', dev)
                    print('Tulu: using facebook/mms-tts-tcy')
                    continue
                except Exception as e:
                    print('Tulu MMS model not available (%s); falling back to the Kannada Parler voice' % str(e)[:100])
            if parler is None:
                parler = Parler(dev)
            engines[lang] = parler
            print(lang, ': using ai4bharat/indic-parler-tts')

    for lang in a.langs:
        done = set(manifest.get(lang, []))
        for i, id_ in enumerate(ids):
            rec = lines[id_]
            path = os.path.join(a.out, lang, id_ + '.mp3')
            if a.skip_existing and os.path.exists(path):
                done.add(id_)
                continue
            text = rec[lang]
            try:
                wav, sr = engines[lang].say(text, rec['w'], speakers)
                to_mp3(trim_and_normalise(wav, sr), sr, path)
                done.add(id_)
                print(f'[{lang}] {i + 1}/{len(ids)} {id_} ({rec["w"]}) ok')
            except Exception as e:
                print(f'[{lang}] {id_} FAILED: {e}')
        manifest[lang] = sorted(done)
        json.dump(manifest, open(manifest_path, 'w'), indent=1)
    print('manifest:', {k: len(v) for k, v in manifest.items()})


if __name__ == '__main__':
    main()
