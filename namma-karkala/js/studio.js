// A small synth studio and song sequencer for the soundtrack and the in-vehicle radio.
// Every sound is generated with Web Audio (no samples, nothing to license). It runs live in the game and also
// on an OfflineAudioContext, which is how the trailer's soundtrack and the song previews are rendered.
//
// Instruments: kick, snare, clap, hats, chenda (Yakshagana drum), dollu (bass drum), tassa and dhol (Pili Vesha tiger
// dance), tabla, 808 sub, saw bass, nadaswaram, supersaw, veena pluck, harmonium, strings, bansuri, vowel choir, riser,
// impact and tiger growl. Mixed through a compressor and a generated hall reverb.

import { singLine } from './singer.js';

const mulberry = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
export const SCALES = {
  mohanam: [0, 2, 4, 7, 9], hamsadhwani: [0, 2, 4, 7, 11], mayamalavagowla: [0, 1, 4, 5, 7, 8, 11], madhyamavathi: [0, 2, 5, 7, 10],
  kharaharapriya: [0, 2, 3, 5, 7, 9, 10], shankarabharana: [0, 2, 4, 5, 7, 9, 11], todi: [0, 1, 3, 6, 7, 8, 11],
};
const FORMANTS = { a: [800, 1150, 2800], o: [450, 800, 2830], e: [400, 1700, 2600], u: [325, 700, 2530], i: [270, 2140, 2950] };

export class Studio {
  constructor(ctx, out, seed = 5) {
    this.ctx = ctx; this.rnd = mulberry(seed); this.intensity = 0; this.song = null; this.cur = null; this.old = [];
    const c = ctx;
    this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -20; this.comp.ratio.value = 6; this.comp.knee.value = 8; this.comp.attack.value = 0.004; this.comp.release.value = 0.16; this.comp.connect(out);
    this.master = c.createGain(); this.master.gain.value = 0.4; this.master.connect(this.comp);
    this.verb = c.createConvolver(); this.verb.buffer = this.makeIR(2.2); this.verbG = c.createGain(); this.verbG.gain.value = 0.55; this.verb.connect(this.verbG); this.verbG.connect(this.master);
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = nb.getChannelData(0); for (let k = 0; k < d.length; k++) d[k] = this.rnd() * 2 - 1; this.noise = nb;
    const sat = c.createWaveShaper(), cv = new Float32Array(1024); for (let k = 0; k < 1024; k++) { const x = k / 512 - 1; cv[k] = Math.tanh(2.2 * x); } sat.curve = cv; this.sat = sat;
    this.analyser = c.createAnalyser(); this.analyser.fftSize = 128; this.master.connect(this.analyser);
  }
  makeIR(sec) {
    const c = this.ctx, n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (this.rnd() * 2 - 1) * Math.pow(1 - i / n, 2.6) * (i < 600 ? i / 600 : 1); }
    return b;
  }
  /* ---------------------------------------------------------------- tiny helpers */
  g(t, a, peak, d, end = 0.0001) { const x = this.ctx.createGain(); x.gain.setValueAtTime(0.0001, t); x.gain.linearRampToValueAtTime(peak, t + a); x.gain.exponentialRampToValueAtTime(end, t + a + d); return x; }
  send(node, bus, wet = 0) { node.connect(bus); if (wet > 0) { const s = this.ctx.createGain(); s.gain.value = wet; node.connect(s); s.connect(this.verb); } }
  osc(type, f, t, dur) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(t + dur); return o; }
  nz(t, dur, type, f, q = 1) { const s = this.ctx.createBufferSource(), b = this.ctx.createBiquadFilter(); s.buffer = this.noise; s.loop = true; b.type = type; b.frequency.value = f; b.Q.value = q; s.connect(b); s.start(t, this.rnd() * 1.5); s.stop(t + dur); return b; }
  /* ---------------------------------------------------------------- drums */
  kick(bus, t, v = 1) { const o = this.osc('sine', 170, t, 0.4), g = this.g(t, 0.002, 0.95 * v, 0.34); o.frequency.exponentialRampToValueAtTime(44, t + 0.13); o.connect(g); this.send(g, bus); const n = this.nz(t, 0.02, 'highpass', 3000), ng = this.g(t, 0.001, 0.2 * v, 0.015); n.connect(ng); this.send(ng, bus); }
  snare(bus, t, v = 1) { const n = this.nz(t, 0.25, 'highpass', 1600), ng = this.g(t, 0.002, 0.5 * v, 0.17); n.connect(ng); this.send(ng, bus, 0.12); const o = this.osc('triangle', 210, t, 0.2), og = this.g(t, 0.001, 0.4 * v, 0.1); o.frequency.exponentialRampToValueAtTime(130, t + 0.08); o.connect(og); this.send(og, bus); }
  clap(bus, t, v = 1) { for (let k = 0; k < 3; k++) { const n = this.nz(t + k * 0.011, 0.14, 'bandpass', 1500, 0.8), g = this.g(t + k * 0.011, 0.001, 0.38 * v, k === 2 ? 0.12 : 0.02); n.connect(g); this.send(g, bus, 0.18); } }
  hat(bus, t, v = 1, open = false) { const n = this.nz(t, open ? 0.3 : 0.06, 'highpass', 7200), g = this.g(t, 0.001, 0.22 * v, open ? 0.22 : 0.035); n.connect(g); this.send(g, bus); }
  chenda(bus, t, v = 1, kind = 'a') {                         // the sharp Yakshagana / Tulunadu stick drum
    if (kind === 'roll') { for (let k = 0; k < 6; k++) this.chenda(bus, t + k * 0.034, v * (0.55 + k * 0.08), 'a'); return; }
    const hi = kind === 'a', o = this.osc('sine', hi ? 660 : 430, t, 0.25), g = this.g(t, 0.001, 0.5 * v, hi ? 0.07 : 0.16); o.frequency.exponentialRampToValueAtTime(hi ? 540 : 320, t + 0.06); o.connect(g); this.send(g, bus, 0.1);
    const n = this.nz(t, 0.12, 'bandpass', hi ? 4300 : 2600, 1.4), ng = this.g(t, 0.001, 0.45 * v, hi ? 0.05 : 0.1); n.connect(ng); this.send(ng, bus, 0.1);
  }
  dollu(bus, t, v = 1) { const o = this.osc('sine', 125, t, 0.5), g = this.g(t, 0.002, 0.9 * v, 0.36); o.frequency.exponentialRampToValueAtTime(70, t + 0.2); o.connect(g); this.send(g, bus, 0.08); const n = this.nz(t, 0.08, 'lowpass', 600), ng = this.g(t, 0.001, 0.4 * v, 0.06); n.connect(ng); this.send(ng, bus); }
  tassa(bus, t, v = 1) { const n = this.nz(t, 0.08, 'bandpass', 3400, 2.2), g = this.g(t, 0.001, 0.4 * v, 0.045); n.connect(g); this.send(g, bus, 0.06); const o = this.osc('triangle', 900, t, 0.08), og = this.g(t, 0.001, 0.2 * v, 0.04); o.frequency.exponentialRampToValueAtTime(650, t + 0.04); o.connect(og); this.send(og, bus); }
  tassaRoll(bus, t, dur, v = 1, n = 8) { for (let k = 0; k < n; k++) this.tassa(bus, t + (dur * k) / n, v * (0.5 + 0.5 * k / n)); }
  tabla(bus, t, v = 1, kind = 'dha') { if (kind !== 'tin') { const o = this.osc('sine', 150, t, 0.35), g = this.g(t, 0.002, 0.5 * v, 0.28); o.frequency.exponentialRampToValueAtTime(76, t + 0.14); o.connect(g); this.send(g, bus, 0.1); } if (kind !== 'ge') { const o = this.osc('sine', 430, t, 0.2), o2 = this.osc('sine', 1000, t, 0.2), g = this.g(t, 0.001, 0.3 * v, 0.1); o.connect(g); o2.connect(g); this.send(g, bus, 0.1); } }
  /* ---------------------------------------------------------------- bass and leads */
  sub(bus, t, f, dur, v = 1) { const o = this.osc('sine', f * 1.35, t, dur + 0.1), g = this.g(t, 0.004, 0.9 * v, dur); o.frequency.exponentialRampToValueAtTime(f, t + 0.05); const sh = this.sat; o.connect(g); g.connect(sh); this.send(sh, bus); }
  bassSaw(bus, t, f, dur, v = 1) { const o = this.osc('sawtooth', f, t, dur + 0.05), o2 = this.osc('square', f * 0.5, t, dur + 0.05), lp = this.ctx.createBiquadFilter(), g = this.g(t, 0.004, 0.45 * v, dur); lp.type = 'lowpass'; lp.Q.value = 5; lp.frequency.setValueAtTime(1500, t); lp.frequency.exponentialRampToValueAtTime(200, t + Math.min(0.4, dur)); o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(this.sat); this.send(this.sat, bus); }
  nadas(bus, t, f, dur, v = 1, gam = 0) {                     // nadaswaram / shehnai-like reed
    const lp = this.ctx.createBiquadFilter(), bp = this.ctx.createBiquadFilter(), g = this.ctx.createGain(), mix = this.ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 3200; bp.type = 'peaking'; bp.frequency.value = 1150; bp.Q.value = 3; bp.gain.value = 9;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.34 * v, t + 0.03); g.gain.setValueAtTime(0.34 * v, t + Math.max(0.05, dur - 0.08)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.06);
    for (const det of [-9, 8]) { const o = this.osc('sawtooth', f * (gam ? 0.944 : 1), t, dur + 0.1); o.detune.value = det; if (gam) o.frequency.exponentialRampToValueAtTime(f, t + 0.07); const lfo = this.osc('sine', 5.6, t, dur + 0.1), lg = this.ctx.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.007, t + 0.2); lfo.connect(lg); lg.connect(o.frequency); o.connect(mix); }
    mix.connect(lp); lp.connect(bp); bp.connect(g); this.send(g, bus, 0.3);
  }
  supersaw(bus, t, f, dur, v = 1) { const lp = this.ctx.createBiquadFilter(), g = this.g(t, 0.01, 0.2 * v, dur + 0.1); lp.type = 'lowpass'; lp.Q.value = 2; lp.frequency.setValueAtTime(5200, t); lp.frequency.exponentialRampToValueAtTime(1400, t + dur); for (const d of [-14, -7, 0, 7, 14]) { const o = this.osc('sawtooth', f, t, dur + 0.15); o.detune.value = d; o.connect(lp); } lp.connect(g); this.send(g, bus, 0.25); }
  pluck(bus, t, f, dur, v = 1) { const o = this.osc('triangle', f, t, dur + 0.5), h = this.osc('sine', f * 2, t, dur + 0.5), lp = this.ctx.createBiquadFilter(), g = this.g(t, 0.004, 0.3 * v, Math.max(0.5, dur * 1.5)), hg = this.ctx.createGain(); hg.gain.value = 0.4; lp.type = 'lowpass'; lp.frequency.setValueAtTime(5200, t); lp.frequency.exponentialRampToValueAtTime(900, t + 0.5); o.frequency.setValueAtTime(f * 0.95, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.05); o.connect(lp); h.connect(hg); hg.connect(lp); lp.connect(g); this.send(g, bus, 0.3); }
  flute(bus, t, f, dur, v = 1) { const o = this.osc('sine', f, t, dur + 0.15), lfo = this.osc('sine', 5.2, t, dur + 0.15), lg = this.ctx.createGain(), g = this.ctx.createGain(); lg.gain.value = f * 0.006; lfo.connect(lg); lg.connect(o.frequency); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.2 * v, t + 0.15); g.gain.setValueAtTime(0.2 * v, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.1); const n = this.nz(t, dur + 0.15, 'bandpass', f * 2, 3), ng = this.ctx.createGain(); ng.gain.value = 0.05 * v; n.connect(ng); ng.connect(g); o.connect(g); this.send(g, bus, 0.35); }
  pad(bus, t, freqs, dur, v = 1, kind = 'harmonium') {
    const lp = this.ctx.createBiquadFilter(), g = this.ctx.createGain(), strings = kind === 'strings'; lp.type = 'lowpass'; lp.frequency.value = strings ? 2400 : 1900; const att = strings ? 0.3 : 0.04;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.1 * v, t + att); g.gain.setValueAtTime(0.1 * v, t + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.1);
    for (const f of freqs) for (const d of [-8, 8]) { const o = this.osc('sawtooth', f, t, dur + 0.2); o.detune.value = d; const lfo = this.osc('sine', strings ? 5.5 : 6.5, t, dur + 0.2), lg = this.ctx.createGain(); lg.gain.value = strings ? f * 0.004 : f * 0.0015; lfo.connect(lg); lg.connect(o.frequency); o.connect(lp); }
    lp.connect(g); this.send(g, bus, 0.3);
  }
  choir(bus, t, f, dur, v = 1, vowel = 'a') {
    const [f1, f2, f3] = FORMANTS[vowel] || FORMANTS.a, g = this.ctx.createGain(), src = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.28 * v, t + 0.12); g.gain.setValueAtTime(0.28 * v, t + dur * 0.75); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.15);
    for (const d of [-14, 0, 12]) { const o = this.osc('sawtooth', f, t, dur + 0.25); o.detune.value = d; const lfo = this.osc('sine', 5.3, t, dur + 0.25), lg = this.ctx.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.01, t + 0.3); lfo.connect(lg); lg.connect(o.frequency); o.connect(src); }
    [[f1, 1, 8], [f2, 0.5, 10], [f3, 0.25, 12]].forEach(([ff, gg, q]) => { const bp = this.ctx.createBiquadFilter(), x = this.ctx.createGain(); bp.type = 'bandpass'; bp.frequency.value = ff; bp.Q.value = q; x.gain.value = gg * 2.2; src.connect(bp); bp.connect(x); x.connect(g); });
    this.send(g, bus, 0.45);
  }
  jhanj(bus, t, v = 1, open = false) {                         // bhajan cymbals (manjira / jhanj)
    for (const f of [2430, 3610, 5070]) { const o = this.osc('square', f, t, 0.5), g = this.g(t, 0.001, 0.045 * v, open ? 0.32 : 0.11); const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 5; o.connect(bp); bp.connect(g); this.send(g, bus, 0.25); }
    const n = this.nz(t, 0.1, 'highpass', 6500), ng = this.g(t, 0.001, 0.08 * v, 0.05); n.connect(ng); this.send(ng, bus);
  }
  maddale(bus, t, v = 1, kind = 'a') {                        // Yakshagana's two-headed barrel drum: round low note + sharp slap
    const o = this.osc('sine', kind === 'b' ? 190 : 150, t, 0.5), g = this.g(t, 0.002, 0.8 * v, 0.3); o.frequency.exponentialRampToValueAtTime(kind === 'b' ? 150 : 95, t + 0.18); o.connect(g); this.send(g, bus, 0.12);
    const n = this.nz(t, 0.05, 'bandpass', 1500, 1.4), ng = this.g(t, 0.001, 0.35 * v, 0.04); n.connect(ng); this.send(ng, bus);
  }
  conch(bus, t, dur = 3, v = 1, f = 233) {                    // shankha: a long, breathy swell
    const src = this.ctx.createGain(), g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.4 * v, t + 0.7); g.gain.setValueAtTime(0.4 * v, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    for (const d of [-6, 6]) { const o = this.osc('sawtooth', f, t, dur + 0.2); o.detune.value = d; o.frequency.setValueAtTime(f * 0.97, t); o.frequency.linearRampToValueAtTime(f, t + 0.5); o.connect(src); }
    [[520, 1], [980, 0.6], [1700, 0.3]].forEach(([ff, gg]) => { const bp = this.ctx.createBiquadFilter(), x = this.ctx.createGain(); bp.type = 'bandpass'; bp.frequency.value = ff; bp.Q.value = 5; x.gain.value = gg * 1.6; src.connect(bp); bp.connect(x); x.connect(g); });
    this.send(g, bus, 0.6);
  }
  gong(bus, t, v = 1, f = 98) {                                // temple gong for the Bahubali feel
    for (const [m, a] of [[1, 1], [2.01, 0.55], [2.76, 0.4], [4.1, 0.25], [5.4, 0.18]]) { const o = this.osc('sine', f * m, t, 5), g = this.g(t, 0.004, 0.22 * a * v, 4.2); o.connect(g); this.send(g, bus, 0.5); }
  }
  /* ---------------------------------------------------------------- fx */
  riser(bus, t, dur, v = 1) { const n = this.nz(t, dur + 0.1, 'bandpass', 500, 2.5); n.frequency.setValueAtTime(400, t); n.frequency.exponentialRampToValueAtTime(7000, t + dur); const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35 * v, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.05); n.connect(g); this.send(g, bus, 0.3); }
  impact(bus, t, v = 1) { const o = this.osc('sine', 90, t, 1.2), g = this.g(t, 0.003, 1.0 * v, 0.9); o.frequency.exponentialRampToValueAtTime(34, t + 0.7); o.connect(g); this.send(g, bus, 0.3); const n = this.nz(t, 1.2, 'highpass', 2500), ng = this.g(t, 0.002, 0.3 * v, 0.9); n.connect(ng); this.send(ng, bus, 0.4); }
  growl(bus, t, dur, v = 1) { const o = this.osc('sawtooth', 70, t, dur + 0.1), o2 = this.osc('square', 105, t, dur + 0.1), bp = this.ctx.createBiquadFilter(), g = this.g(t, 0.05, 0.5 * v, dur), am = this.osc('sine', 26, t, dur + 0.1), ag = this.ctx.createGain(); bp.type = 'bandpass'; bp.Q.value = 4; bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(1100, t + dur * 0.6); bp.frequency.exponentialRampToValueAtTime(260, t + dur); ag.gain.value = 0.5; am.connect(ag); const mod = this.ctx.createGain(); mod.gain.value = 0.5; ag.connect(mod.gain); o.connect(bp); o2.connect(bp); bp.connect(mod); mod.connect(g); g.connect(this.sat); this.send(this.sat, bus, 0.2); }
  vinyl(bus, t, v = 1) { const n = this.nz(t, 0.01, 'highpass', 5000), g = this.g(t, 0.0005, 0.12 * v * (0.3 + this.rnd()), 0.008); n.connect(g); this.send(g, bus); }

  /* ---------------------------------------------------------------- song sequencer */
  /** Switch to a song (crossfade). */
  play(song, fade = 1.4, startAt) {
    const c = this.ctx, t = startAt ?? c.currentTime;
    if (this.cur) { const old = this.cur; old.bus.gain.cancelScheduledValues(t); old.bus.gain.setValueAtTime(old.bus.gain.value, t); old.bus.gain.linearRampToValueAtTime(0, t + fade); this.old.push([old, t + fade + 4]); }
    const bus = c.createGain(); bus.gain.setValueAtTime(fade > 0 ? 0 : 1, t); if (fade > 0) bus.gain.linearRampToValueAtTime(1, t + fade); bus.connect(this.master);
    this.song = song; this.cur = { bus, song }; this.i = 0; this.next = t + 0.05; this.hold = {}; this.rng = mulberry(song.seed || 1);
    let acc = 0; this.secs = song.sections.map(s => { const o = { ...s, start: acc }; acc += s.bars; return o; }); this.totalBars = acc;
    this.onSong && this.onSong(song);
  }
  stop(fade = 1) { if (!this.cur) return; const t = this.ctx.currentTime, old = this.cur; old.bus.gain.cancelScheduledValues(t); old.bus.gain.setValueAtTime(old.bus.gain.value, t); old.bus.gain.linearRampToValueAtTime(0, t + fade); this.old.push([old, t + fade + 4]); this.cur = null; this.song = null; }
  tick() {
    if (!this.cur) return; const c = this.ctx; if (this.next < c.currentTime) this.next = c.currentTime + 0.05;
    while (this.next < c.currentTime + 0.3) this.stepAt(this.next);
    this.old = this.old.filter(([o, end]) => { if (c.currentTime > end) { try { o.bus.disconnect(); } catch (e) { } return false; } return true; });
  }
  /** Offline render: schedule `seconds` of a song from t=0. */
  renderOffline(song, seconds) { this.play(song, 0, 0); this.next = 0.05; while (this.next < seconds) this.stepAt(this.next); }
  /** Index of the current bar within the whole song (for lyrics / HUD). */
  get bar() { return this.song ? Math.floor((this.i - 1) / 16) % this.totalBars : 0; }
  degFreq(deg, oct = 1) { const S = this.song, sc = SCALES[S.scale], n = sc.length, o = Math.floor(deg / n), k = ((deg % n) + n) % n; return S.root * oct * Math.pow(2, (sc[k] + 12 * o) / 12); }
  semiOf(deg) { const S = this.song, sc = SCALES[S.scale], n = sc.length, o = Math.floor(deg / n), k = ((deg % n) + n) % n; return sc[k] + 12 * o; }
  stepAt(t0) {
    const S = this.song, bus = this.cur.bus, i = this.i++, s = i % 16, barAbs = Math.floor(i / 16), bar = barAbs % this.totalBars, dur = 60 / S.bpm / 4;
    this.next += dur;
    const t = t0 + (s % 2 === 1 ? (S.swing || 0) * dur : 0);
    let sec = this.secs[0]; for (const x of this.secs) if (x.start <= bar) sec = x; const bis = bar - sec.start, L = new Set(sec.layers), P = S.pat, inten = this.intensity;
    const hit = (name, alt) => { const p = P[name]; if (!p) return ' '; const pat = Array.isArray(p) ? p[barAbs % p.length] : p; return pat[s] || ' '; };
    const lastBar = bis === sec.bars - 1, chord = S.prog[bar % S.prog.length];
    // section boundaries: crash + impact
    if (s === 0 && bis === 0 && i > 0 && L.has('fx')) { this.impact(bus, t, 0.8); this.hat(bus, t, 1.2, true); }
    if (s === 0 && lastBar && L.has('fx') && sec.bars >= 4) this.riser(bus, t, dur * 16, 0.9);
    // drums
    if (L.has('kick')) { const h = hit('kick'); if (h !== ' ' && h !== '.') this.kick(bus, t, h === 'X' ? 1.15 : 0.95); }
    if (L.has('snare')) { const h = hit('snare'); if (h !== ' ' && h !== '.') this.snare(bus, t, h === 'o' ? 0.4 : 1); }
    if (L.has('clap')) { const h = hit('clap'); if (h !== ' ' && h !== '.') this.clap(bus, t, 1); }
    if (L.has('hat') || inten > 0.5 && L.has('kick')) { const h = hit('hat'); if (h !== ' ' && h !== '.') this.hat(bus, t, h === 'X' ? 1 : h === 'o' ? 0.4 : 0.7, h === 'O'); else if (inten > 0.5 && s % 2 === 1) this.hat(bus, t, 0.35); }
    if (L.has('chenda')) { const h = hit('chenda'); if (h !== ' ' && h !== '.') this.chenda(bus, t, h === 'X' ? 1.15 : h === 'o' ? 0.5 : 0.85, h === 'b' ? 'b' : 'a'); }
    if (L.has('dollu')) { const h = hit('dollu'); if (h !== ' ' && h !== '.') this.dollu(bus, t, h === 'X' ? 1.1 : 0.85); }
    if (L.has('tassa')) { const h = hit('tassa'); if (h !== ' ' && h !== '.') this.tassa(bus, t, h === 'X' ? 1 : h === 'o' ? 0.45 : 0.75); }
    if (L.has('tabla')) { const h = hit('tabla'); if (h !== ' ' && h !== '.') this.tabla(bus, t, 0.9, h === 'g' ? 'ge' : h === 't' ? 'tin' : 'dha'); }
    if (L.has('jhanj')) { const h = hit('jhanj'); if (h !== ' ' && h !== '.') this.jhanj(bus, t, h === 'X' ? 1.1 : h === 'o' ? 0.5 : 0.8, h === 'O'); }
    if (L.has('maddale')) { const h = hit('maddale'); if (h !== ' ' && h !== '.') this.maddale(bus, t, h === 'X' ? 1.1 : h === 'o' ? 0.5 : 0.85, h === 'b' ? 'b' : 'a'); }
    if (L.has('gong') && s === 0 && bis % 4 === 0) this.gong(bus, t, 0.9, S.root * 0.5);
    if (L.has('conch') && s === 0 && bis === 0 && i > 0) this.conch(bus, t, dur * 12, 0.9, S.root * 1.5);
    if (L.has('vinyl') && this.rnd() < 0.5) this.vinyl(bus, t);
    // fills at the end of a section: roll into the next
    if (lastBar && s >= 12 && L.has('fill')) { const v = 0.6 + (s - 12) * 0.12; if (S.fill === 'tassa') this.tassa(bus, t, v); else this.chenda(bus, t, v, s === 15 ? 'b' : 'a'); if (s % 2 === 0) this.snare(bus, t, v * 0.7); }
    if (inten > 0.7 && s === 14 && L.has('tassa')) this.tassaRoll(bus, t, dur * 2, 0.9, 6);
    // bass
    if (L.has('bass')) {
      const h = hit('bass'); if (h !== ' ' && h !== '.') {
        const semi = this.semiOf(chord) + (h === '5' ? 7 : h === '8' ? 12 : 0), f = S.root * 0.5 * Math.pow(2, semi / 12), len = dur * (P.bassLen || 1.7);
        if (S.bass === 'sub') this.sub(bus, t, f, len, 1); else this.bassSaw(bus, t, f, len, 1);
      }
    }
    // chords
    if (L.has('pad') && (s === 0 || (S.padRetrig && s === 8))) { const notes = [chord, chord + 2, chord + 4].map((d, k) => this.degFreq(d, 1 + (k === 0 ? 0 : 0))), len = dur * (S.padRetrig ? 8 : 16); this.pad(bus, t, notes, len, 1, S.padKind || 'harmonium'); }
    if (L.has('drone') && s % 8 === 0) { this.pad(bus, t, [this.degFreq(0, 0.5), this.degFreq(3, 0.5)], dur * 8, 0.8, 'strings'); }
    // motifs: lead hook, counter-melody, choir
    const mel = (motif, inst, oct, vel, choir) => {
      if (!motif) return; const len = motif.len || 32, pos = (bis * 16 + s) % len;
      for (const [st, deg, ln, o] of motif.notes) if (st === pos) {
        const f = this.degFreq(deg, oct), d2 = dur * ln;
        if (choir) { if (ln >= 3) this.choir(bus, t, f, d2, vel, ['a', 'o', 'a', 'e', 'u'][(st >> 2) % 5]); }
        else if (inst === 'nadas') this.nadas(bus, t, f, d2, vel, o === 'g' ? 1 : 0);
        else if (inst === 'supersaw') this.supersaw(bus, t, f, d2, vel);
        else if (inst === 'flute') this.flute(bus, t, f, d2 * 1.2, vel);
        else if (inst === 'strings') this.pad(bus, t, [f, f * 1.5], d2, vel * 0.8, 'strings');
        else this.pluck(bus, t, f, d2, vel);
      }
    };
    const hookKey = sec.hook; if (hookKey && L.has('hook')) mel(S.hooks[hookKey], S.lead, S.leadOct || 2, 1, false);
    if (sec.counter && L.has('counter')) mel(S.hooks[sec.counter], S.counter || 'flute', S.counterOct || 4, 0.8, false);
    if (L.has('choir') && hookKey) mel(S.hooks[hookKey], null, (S.leadOct || 2), 0.9, true);
    if (L.has('pluck')) mel(S.hooks[hookKey || 'A'], 'pluck', (S.leadOct || 2) * 2, 0.7, false);
    // sung lyrics: [bar, lineId, bars?, opts?] - the singer takes the words from `lyricText(id)`
    if (s === 0 && S.lyrics && this.lyricText && !this.noVocals) {
      for (const [lb, id, span = 2, vo] of S.lyrics) if (lb === bar) { const text = this.lyricText(id); if (text) singLine(this, bus, t, text, span, dur, (d2) => this.degFreq(d2, S.voxOct || 2), { ...(S.vox || {}), ...(vo || {}), vel: (S.vox && S.vox.vel || 1) }); }
    }
    // lyric / HUD events
    if (s === 0 && this.onBar) this.onBar(bar, sec.name, i);
  }
}
