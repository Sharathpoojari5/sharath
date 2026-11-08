// Voice-over. Real recordings (voice/<lang>/<id>.mp3, made with open-source Kannada TTS models, see
// tools/make_voices.py) play when they exist. Otherwise the browser's own speech synthesis is used when it
// has a matching voice; with no voice at all the game falls back to text plus soft speech blips.
import { LINES } from './story.js';

const LANGS = ['kn', 'tcy', 'en'];
export const LANG_NAME = { kn: 'ಕನ್ನಡ', tcy: 'ತುಳು', en: 'English' };
const PROFILE = {
  RAJU: { pitch: 1.0, rate: 1.0, female: false }, AMMA: { pitch: 1.35, rate: 1.0, female: true }, AJJI: { pitch: 1.5, rate: 0.9, female: true },
  ARCHAKARU: { pitch: 0.75, rate: 0.88, female: false }, PRAMOD: { pitch: 1.15, rate: 1.12, female: false }, OWNER: { pitch: 0.85, rate: 1.0, female: false },
  CANTEEN: { pitch: 0.8, rate: 1.0, female: false }, SHWETHA: { pitch: 1.45, rate: 1.08, female: true }, THIEF: { pitch: 1.3, rate: 1.3, female: false },
  NARRATOR: { pitch: 0.85, rate: 0.95, female: false }, PEDESTRIAN: { pitch: 1.1, rate: 1.1, female: false }, SINGER: { pitch: 1.0, rate: 1.1, female: false }, DJ: { pitch: 1.1, rate: 1.15, female: false },
};
const FEMALE = /lekha|veena|heera|zira|samantha|karen|moira|tessa|susan|hazel|female|priya|kalpana|sangeeta|raveena|aditi|swara|neerja|vani|soumya/i;

export const Voice = {
  enabled: true, voices: [], ok: false, manifest: null, audio: null, el: null, token: 0,
  lang: (() => { try { return localStorage.getItem('nk-lang') || 'kn'; } catch (e) { return 'kn'; } })(),
  init(audio) {
    this.audio = audio;
    if (!('speechSynthesis' in window)) return;
    const load = () => { this.voices = speechSynthesis.getVoices() || []; this.ok = this.voices.length > 0; };
    load(); speechSynthesis.onvoiceschanged = load;
  },
  setLang(l) { if (LANGS.includes(l)) { this.lang = l; try { localStorage.setItem('nk-lang', l); } catch (e) { } } },
  nextLang() { this.setLang(LANGS[(LANGS.indexOf(this.lang) + 1) % LANGS.length]); return this.lang; },
  /** Text of a line in the current language (falls back to English). */
  text(id) { const r = LINES[id]; return r ? (r[this.lang] || r.en) : id; },
  hasFile(id) { return !this.manifest || (this.manifest[this.lang] || []).includes(id); },
  kannadaVoice() { return this.voices.find(v => /^kn/i.test(v.lang)); },
  pickEnglish(who) {
    const want = PROFILE[who] || PROFILE.NARRATOR, rank = (x) => (/en[-_]IN/i.test(x.lang) ? 0 : /^en[-_](GB|AU)/i.test(x.lang) ? 1 : /^en/i.test(x.lang) ? 2 : 9);
    const pool = this.voices.filter(x => rank(x) < 9).sort((a, b) => rank(a) - rank(b)); if (!pool.length) return null;
    const top = pool.filter(x => rank(x) === rank(pool[0])), g = top.filter(x => FEMALE.test(x.name) === want.female); return (g.length ? g : top)[(who || '').length % (g.length || top.length)];
  },
  /** Speak line `id`. Returns true if something is playing (so the caller can wait for onEnd); false = silent (text only). */
  speak(id, who, onEnd) {
    this.stop(); const tok = ++this.token, rec = LINES[id]; if (!this.enabled || !rec) { onEnd && onEnd(false); return false; }
    const done = (ok) => { if (tok === this.token) { this.token++; this.audio && this.audio.duck(false); onEnd && onEnd(ok); } };
    const tts = () => {
      try {
        const kn = this.lang !== 'en', vo = kn ? this.kannadaVoice() : this.pickEnglish(who);
        if (!vo) { done(false); return false; }
        const u = new SpeechSynthesisUtterance(kn ? rec.kn : rec.en), p = PROFILE[who] || PROFILE.NARRATOR; u.voice = vo; u.lang = vo.lang; u.pitch = p.pitch; u.rate = p.rate;
        u.onend = () => done(true); u.onerror = () => done(false); setTimeout(() => done(false), 12000 + u.text.length * 120); speechSynthesis.speak(u); return true;
      } catch (e) { done(false); return false; }
    };
    if (this.lang !== 'en' && !this.hasFile(id)) return tts();
    if (this.lang === 'en' && !this.hasFile(id)) return tts();
    // real recording
    try {
      const el = this.el = new Audio(`voice/${this.lang}/${id}.mp3`); el.preload = 'auto';
      if (this.audio && this.audio.ctx) { const src = this.audio.ctx.createMediaElementSource(el); src.connect(this.audio.voiceGain); } else el.volume = 1;
      let started = false;
      el.onplaying = () => { started = true; this.audio && this.audio.duck(true); };
      el.onended = () => done(true);
      el.onerror = () => { if (tok === this.token) { this.el = null; if (!tts()) { /* text only */ } } };
      const pr = el.play(); if (pr && pr.catch) pr.catch(() => { if (tok === this.token && !started) { this.el = null; tts(); } });
      setTimeout(() => { if (tok === this.token && !started && this.el === el) { this.el = null; tts(); } }, 2500);
      return true;
    } catch (e) { return tts(); }
  },
  stop() { this.token++; if (this.el) { try { this.el.pause(); } catch (e) { } this.el = null; } try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { } this.audio && this.audio.duck && this.audio.duck(false); },
};
