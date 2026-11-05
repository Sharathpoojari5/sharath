// Voice-over using the browser's built-in speech synthesis (no audio files, nothing is uploaded).
// Quality and available voices depend on the user's device; Kannada voices are rare, so lines are
// spoken by an Indian-English voice when one exists. When no voice exists the game falls back to blips.
const PROFILE = {
  RAJU: { pitch: 1.0, rate: 1.0, female: false }, AMMA: { pitch: 1.35, rate: 1.0, female: true }, AJJI: { pitch: 1.5, rate: 0.9, female: true },
  ARCHAKARU: { pitch: 0.75, rate: 0.88, female: false }, PRAMOD: { pitch: 1.15, rate: 1.12, female: false }, OWNER: { pitch: 0.85, rate: 1.0, female: false },
  CANTEEN: { pitch: 0.8, rate: 1.0, female: false }, SHWETHA: { pitch: 1.45, rate: 1.08, female: true }, THIEF: { pitch: 1.3, rate: 1.3, female: false },
  NARRATOR: { pitch: 0.85, rate: 0.95, female: false },
};
const FEMALE = /lekha|veena|heera|zira|samantha|karen|moira|tessa|susan|hazel|female|priya|kalpana|sangeeta|raveena|aditi|swara|neerja|google .*(female)?/i;

export const Voice = {
  enabled: true, voices: [], ok: false,
  init() {
    if (!('speechSynthesis' in window)) return;
    const load = () => { this.voices = speechSynthesis.getVoices() || []; this.ok = this.voices.length > 0; };
    load(); speechSynthesis.onvoiceschanged = load;
  },
  pick(who) {
    const want = PROFILE[who] || PROFILE.NARRATOR, v = this.voices;
    const rank = (x) => (/kn/i.test(x.lang) ? 0 : /en[-_]IN/i.test(x.lang) ? 1 : /hi[-_]IN/i.test(x.lang) ? 2 : /^en[-_](GB|AU)/i.test(x.lang) ? 3 : /^en/i.test(x.lang) ? 4 : 9);
    const pool = v.filter(x => rank(x) < 9).sort((a, b) => rank(a) - rank(b));
    if (!pool.length) return null;
    const best = rank(pool[0]), top = pool.filter(x => rank(x) === best);
    const g = top.filter(x => FEMALE.test(x.name) === want.female);
    return (g.length ? g : top)[(who || '').length % (g.length || top.length)];
  },
  speak(text, who, onEnd) {
    if (!this.enabled || !this.ok) { onEnd && onEnd(false); return false; }
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[ಀ-೿]+/g, ' ')), p = PROFILE[who] || PROFILE.NARRATOR, vo = this.pick(who);
      if (vo) { u.voice = vo; u.lang = vo.lang; } else u.lang = 'en-IN';
      u.pitch = p.pitch; u.rate = p.rate; u.volume = 1;
      let done = false; const fin = (ok) => { if (!done) { done = true; onEnd && onEnd(ok); } };
      u.onend = () => fin(true); u.onerror = () => fin(false);
      setTimeout(() => fin(false), 12000 + text.length * 120);   // never wait forever
      speechSynthesis.speak(u); return true;
    } catch (e) { onEnd && onEnd(false); return false; }
  },
  stop() { try { speechSynthesis.cancel(); } catch (e) { } },
};
