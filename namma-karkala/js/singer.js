// A small formant "singer": it turns a line of Kannada / Tulu (or Latin letters) into syllables and sings them
// on a melody, with a sawtooth source through vowel formants, vibrato, gamaka slides and consonant bursts.
// It is synthetic (it sounds like a stylised vocal, not a human recording), but the words really are sung.

const SIGN = { 'ಾ': ['a', 1], 'ಿ': ['i', 0], 'ೀ': ['i', 1], 'ು': ['u', 0], 'ೂ': ['u', 1], 'ೃ': ['u', 0], 'ೆ': ['e', 0], 'ೇ': ['e', 1], 'ೈ': ['e', 1], 'ೊ': ['o', 0], 'ೋ': ['o', 1], 'ೌ': ['o', 1] };
const IND = { 'ಅ': ['a', 0], 'ಆ': ['a', 1], 'ಇ': ['i', 0], 'ಈ': ['i', 1], 'ಉ': ['u', 0], 'ಊ': ['u', 1], 'ಋ': ['u', 0], 'ಎ': ['e', 0], 'ಏ': ['e', 1], 'ಐ': ['e', 1], 'ಒ': ['o', 0], 'ಓ': ['o', 1], 'ಔ': ['o', 1] };
const kcls = (ch) => { const c = ch.charCodeAt(0); if (c >= 0xC95 && c <= 0xC98) return 'k'; if (c === 0xC99 || c === 0xC9E || c === 0xCA3 || c === 0xCA8 || c === 0xCAE) return 'n'; if (c >= 0xC9A && c <= 0xCA7) return 't'; if (c >= 0xCAA && c <= 0xCAD) return 'p'; if (c >= 0xCB6 && c <= 0xCB9) return 's'; return 'l'; };
const lcls = (ch) => /[kgcjq]/i.test(ch) ? 'k' : /[tdx]/i.test(ch) ? 't' : /[pbf]/i.test(ch) ? 'p' : /[mn]/i.test(ch) ? 'n' : /[szh]/i.test(ch) ? 's' : 'l';
const isK = (ch) => ch >= 'ಕ' && ch <= 'ಹ' || ch === 'ಳ';

export function syllables(text) {
  const out = []; let cur = null; const s = Array.from(text || '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (isK(ch)) { if (cur && cur.open) { cur.open = false; } cur = { cons: kcls(ch), v: 'a', long: 0, open: true }; out.push(cur); if (s[i + 1] === '್') { cur.v = null; i++; } }
    else if (SIGN[ch] && cur) { cur.v = SIGN[ch][0]; cur.long = SIGN[ch][1]; cur.open = false; }
    else if (IND[ch]) { cur = { cons: null, v: IND[ch][0], long: IND[ch][1], open: false }; out.push(cur); }
    else if (ch === 'ಂ' || ch === 'ಃ') { if (cur) cur.tail = 'n'; }
    else if (/[a-z]/i.test(ch)) { let j = i, c0 = null; while (j < s.length && /[a-z]/i.test(s[j]) && !/[aeiou]/i.test(s[j])) { c0 = c0 || s[j]; j++; } if (j < s.length && /[aeiou]/i.test(s[j])) { const v = s[j].toLowerCase(); let k = j + 1; while (k < s.length && /[aeiou]/i.test(s[k]) && s[k].toLowerCase() === v) k++; out.push({ cons: c0 ? lcls(c0) : null, v, long: k - j > 1 ? 1 : 0 }); i = k - 1; } else i = j; }
  }
  // clusters with a bare consonant (halant, no vowel) are dropped into the next syllable's onset
  return out.filter(x => x.v);
}

const FM = { a: [[800, 1], [1150, 0.5], [2800, 0.25]], e: [[480, 1], [1750, 0.5], [2600, 0.25]], i: [[290, 1], [2200, 0.45], [3000, 0.25]], o: [[500, 1], [820, 0.5], [2700, 0.2]], u: [[320, 1], [760, 0.45], [2400, 0.2]] };

/** Sing one syllable: pitch f, from t for dur seconds. */
function note(st, bus, t, f, dur, vel, sy, o) {
  const c = st.ctx, g = c.createGain(), src = c.createGain(), end = t + dur;
  // consonant onset
  if (sy.cons) {
    const cl = sy.cons, n = st.nz(t - 0.012, cl === 's' ? 0.09 : 0.04, cl === 's' ? 'highpass' : 'bandpass', cl === 's' ? 5500 : cl === 'k' ? 1800 : cl === 't' ? 3200 : cl === 'p' ? 700 : 500, 1.2), ng = st.g(t - 0.012, 0.004, (cl === 'n' || cl === 'l' ? 0.05 : 0.2) * vel, cl === 's' ? 0.08 : 0.035); n.connect(ng); st.send(ng, bus, 0.15);
  }
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5 * vel, t + (sy.cons === 'n' || sy.cons === 'l' ? 0.05 : 0.025)); g.gain.setValueAtTime(0.5 * vel, Math.max(t + 0.06, end - 0.09)); g.gain.exponentialRampToValueAtTime(0.0001, end + 0.06);
  for (const dt of o.chorus ? [-9, 9] : [0]) {
    const os = st.osc(o.wave || 'sawtooth', f, t, dur + 0.15); os.detune.value = dt;
    if (o.slide) { os.frequency.setValueAtTime(f * o.slide, t); os.frequency.exponentialRampToValueAtTime(f, t + 0.07); }
    const lfo = st.osc('sine', o.vibRate || 5.6, t, dur + 0.15), lg = c.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * (o.vib ?? 0.012), t + Math.min(0.35, dur * 0.6)); lfo.connect(lg); lg.connect(os.frequency);
    os.connect(src);
  }
  const fm = FM[sy.v] || FM.a, sh = o.formantShift || 1;
  fm.forEach(([ff, gg], i) => { const bp = c.createBiquadFilter(), x = c.createGain(); bp.type = 'bandpass'; bp.frequency.value = ff * sh; bp.Q.value = o.nasal ? [5, 9, 12][i] : [9, 11, 13][i]; x.gain.value = gg * (o.nasal && i === 1 ? 1.8 : 1) * 2.4; src.connect(bp); bp.connect(x); x.connect(g); });
  if (sy.tail === 'n') { const nb = c.createBiquadFilter(); nb.type = 'lowpass'; nb.frequency.value = 300; src.connect(nb); nb.connect(g); }
  st.send(g, bus, o.wet ?? 0.4);
}

/**
 * Sing `text` across `bars` bars starting at time t0 (step = seconds per 16th). `rng` makes a repeatable melody.
 * deg(d) -> frequency of scale degree d. endDeg = degree to finish on.
 */
export function singLine(st, bus, t0, text, bars, step, deg, o = {}) {
  const sy = syllables(text); if (!sy.length) return;
  const total = bars * 16 * step * 0.93, w = sy.map((x, i) => (x.long ? 1.7 : 1) * (x.cons ? 1 : 0.9) * (i === sy.length - 1 ? 2.8 : 1) * (i === Math.floor(sy.length / 2) ? 1.25 : 1)), W = w.reduce((a, b) => a + b, 0);
  let seed = 7; for (const ch of text) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0; const r = () => { seed = (Math.imul(seed ^ seed >>> 15, 1 | seed) + 0x6D2B79F5) >>> 0; return seed / 4294967296; };
  let d = o.startDeg ?? 2, t = t0, up = 1; const end = o.endDeg ?? 0, top = o.top ?? 6;
  sy.forEach((x, i) => {
    const dur = total * w[i] / W, last = i === sy.length - 1;
    // contour: climb through the first half, come down in the second, finish on endDeg
    const half = i < sy.length / 2; const stepD = r() < 0.55 ? 0 : (r() < 0.5 ? 1 : 2) * (half ? (r() < 0.75 ? 1 : -1) : (r() < 0.75 ? -1 : 1));
    d = last ? end : Math.max(0, Math.min(top, d + stepD));
    note(st, bus, t, deg(d), Math.max(0.12, dur * 0.95), o.vel ?? 1, x, { ...o, slide: (i > 0 && r() < 0.35) ? 1.05 : 0 });
    t += dur;
  });
}
