# Voices

`script.json` is the single source of truth for everything spoken in the game (46 story lines, 11 street lines,
9 trailer lines). Each line has an id, a speaker, and `en` / `kn` (Kannada) / `tcy` (Tulu) text.

> **The Tulu (`tcy`) text is a first draft written without a native speaker.** Please have a fluent Tulu speaker
> correct it before you record or publish. Edit the JSON, nothing else needs to change.

## Making the recordings

1. Open `colab/namma_karkala_voices.ipynb` in Google Colab (free GPU), Run all, download the zip.
2. Unzip into this folder so you have `voice/kn/L01.mp3`, `voice/tcy/L01.mp3`, … and `voice/manifest.json`.
3. Reload the game. Recordings play automatically; lines without a file fall back to browser speech, then to text.

Or locally: `python3 tools/make_voices.py --script voice/script.json --out voice --langs kn tcy`
(needs `pip install git+https://github.com/huggingface/parler-tts.git soundfile librosa` and ffmpeg).

The player chooses the language on the title screen, or in the pause menu.

## Models

| Use | Model | Licence |
|---|---|---|
| Kannada, one voice per character | `ai4bharat/indic-parler-tts` | Apache-2.0 (check the card) |
| Tulu | `facebook/mms-tts-tcy` if available | CC-BY-NC 4.0 (non-commercial) |
| Tulu fallback | Kannada Parler voice reading the Tulu text | as above |

Always read the current model cards before publishing: licences and availability change.

## Generate the voices on GitHub (no setup on your computer)

The repository has a workflow, `.github/workflows/voices.yml`, that makes the Kannada and Tulu voice-over on GitHub's own servers and commits
the result to the branch (`voice/kn/*.mp3`, `voice/tcy/*.mp3`, `voice/manifest.json`).

1. Open the repository on GitHub, **Actions**, **Generate voices**, **Run workflow**.
2. Without any secret it uses Meta's open **MMS-TTS Kannada** model (CC BY-NC 4.0, non-commercial). It works, but the delivery is flat.
3. For a more natural voice with better pauses and intonation, use AI4Bharat's **Indic Parler-TTS** (Apache-2.0). That model is gated:
   - make a free account at huggingface.co, open https://huggingface.co/ai4bharat/indic-parler-tts and click **Agree and access repository**;
   - Settings, Access Tokens, create a token with **Read** access;
   - on GitHub: repository Settings, Secrets and variables, Actions, **New repository secret**, name `HF_TOKEN`, paste the token;
   - run the workflow again. It then uses Parler for Kannada (and for Tulu text when no Tulu model exists).

Sung lyrics are not generated here: the in-game singer sings them. The game plays a recording when the file exists in `manifest.json`, otherwise it
falls back to the browser's own voice, then to text.
