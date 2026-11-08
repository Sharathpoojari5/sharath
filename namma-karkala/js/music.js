// Procedural South Indian soundtrack: tanpura drone, tabla (Adi tala), veena pluck melody, bansuri flute,
// and a driving bass for chases. Everything is synthesised, so there are no audio files and no licences.
// Works on a live AudioContext (the game) and on an OfflineAudioContext (rendering the trailer's audio).

const mulberry = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

const SCALES = {
  mohanam: [0, 2, 4, 7, 9],              // bright, open: daytime Karkala
  hamsadhwani: [0, 2, 4, 7, 11],         // auspicious: title and temple
  mayamalavagowla: [0, 1, 4, 5, 7, 8, 11], // earthy, tense: chases
  madhyamavathi: [0, 2, 5, 7, 10],       // evening and rain
  bhoopali: [0, 2, 4, 7, 9],
};
export const STATES = {
  title:   { bpm: 74, scale: 'hamsadhwani', tabla: 'none', veena: 0.55, flute: true, bass: false, drone: 1.0 },
  day:     { bpm: 98, scale: 'mohanam', tabla: 'adi', veena: 0.22, flute: false, bass: false, drone: 0.8 },
  evening: { bpm: 84, scale: 'madhyamavathi', tabla: 'sparse', veena: 0.35, flute: true, bass: false, drone: 0.9 },
  night:   { bpm: 68, scale: 'madhyamavathi', tabla: 'sparse', veena: 0.5, flute: true, bass: false, drone: 1.0 },
  rain:    { bpm: 76, scale: 'madhyamavathi', tabla: 'none', veena: 0.4, flute: true, bass: false, drone: 1.0 },
  chase:   { bpm: 142, scale: 'mayamalavagowla', tabla: 'fast', veena: 0.08, flute: false, bass: true, drone: 0.5 },
  trailer: { bpm: 104, scale: 'mohanam', tabla: 'adi', veena: 0.15, flute: true, bass: false, drone: 0.8 },
  build:   { bpm: 120, scale: 'mayamalavagowla', tabla: 'fast', veena: 0.12, flute: false, bass: true, drone: 0.6 },
  ending:  { bpm: 64, scale: 'hamsadhwani', tabla: 'none', veena: 0.5, flute: true, bass: false, drone: 1.0 },
  silent:  { bpm: 80, scale: 'mohanam', tabla: 'none', veena: 1, flute: false, bass: false, drone: 0 },
};

export class Music {
  constructor(ctx, out, seed = 7) {
    this.ctx = ctx; this.out = out; this.rnd = mulberry(seed); this.state = 'silent'; this.cfg = STATES.silent;
    this.i = 0; this.next = ctx.currentTime + 0.1; this.deg = 2; this.hold = 0; this.fluteHold = 0; this.fluteDeg = 2; this.SA = 146.83;
    const nb = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate), d = nb.getChannelData(0); for (let k = 0; k < d.length; k++) d[k] = this.rnd() * 2 - 1; this.noise = nb;
  }
  set(state) { if (STATES[state] && state !== this.state) { this.state = state; this.cfg = STATES[state]; } }
  freq(deg, oct = 1) { const sc = SCALES[this.cfg.scale], n = sc.length, o = Math.floor(deg / n), k = ((deg % n) + n) % n; return this.SA * oct * Math.pow(2, (sc[k] + 12 * o) / 12); }
  /** Live: call every frame. Schedules about 0.3 s ahead. */
  tick() { const c = this.ctx; if (this.next < c.currentTime) this.next = c.currentTime + 0.05; while (this.next < c.currentTime + 0.3) this.stepAt(this.next); }
  /** Offline: schedule everything for `seconds`, with timeline [[t, state], ...]. */
  renderOffline(seconds, timeline) {
    this.next = 0.05; this.i = 0;
    while (this.next < seconds) { let st = timeline[0][1]; for (const [t, s] of timeline) if (t <= this.next) st = s; this.set(st); this.stepAt(this.next); }
  }
  stepAt(t) {
    const cfg = this.cfg, i = this.i++, s = i % 16, dur = 60 / cfg.bpm / 2; this.next += dur;
    if (cfg.drone > 0 && s % 4 === 0) this.tanpura(t, [0.5, 1, 1, 0.5][(s / 4) | 0] * (s === 0 || s === 8 ? 0.75 : 1), cfg.drone * 0.07, dur * 4);
    this.tabla(t, s, cfg.tabla);
    if (cfg.bass) this.bass(t, s, dur);
    // veena melody: random walk on the scale, drawn towards the tonic at the end of the bar
    if (this.hold > 0) this.hold--;
    else if (this.rnd() < (s % 2 === 0 ? 0.8 : 0.5) * (1 - cfg.veena) + (cfg.veena >= 1 ? 1 : 0) * 0) {
      const step = [-2, -1, -1, 0, 1, 1, 2, 3][(this.rnd() * 8) | 0], n = SCALES[cfg.scale].length;
      this.deg = Math.max(-2, Math.min(n + 3, this.deg + step));
      if (s >= 14) this.deg += this.deg > n ? -1 : this.deg > 0 && this.rnd() < 0.5 ? -1 : 0;
      this.pluck(t, this.freq(this.deg, 2), 0.13 + this.rnd() * 0.05, dur * (1 + (this.rnd() < 0.3 ? 2 : 0)), this.rnd() < 0.35);
      this.hold = [0, 0, 1, 1, 2][(this.rnd() * 5) | 0];
    }
    if (cfg.flute) { if (this.fluteHold > 0) this.fluteHold--; else if (s % 8 === 0 && this.rnd() < 0.7) { const n = SCALES[cfg.scale].length; this.fluteDeg = Math.max(0, Math.min(n + 2, this.fluteDeg + [-2, -1, 0, 1, 2][(this.rnd() * 5) | 0])); this.flute(t, this.freq(this.fluteDeg, 4), dur * 6); this.fluteHold = 5; } }
  }
  /* ---------------------------------------------------------------- instruments */
  env(g, t, a, peak, d, end = 0.0001) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(end, t + a + d); }
  tanpura(t, mult, vol, dur) {
    const c = this.ctx, o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o2.type = 'sawtooth'; o.frequency.value = this.SA * mult; o2.frequency.value = this.SA * mult * 1.004; f.type = 'lowpass'; f.frequency.setValueAtTime(2400, t); f.frequency.exponentialRampToValueAtTime(500, t + dur);
    this.env(g, t, 0.01, vol, dur * 1.4); o.connect(f); o2.connect(f); f.connect(g); g.connect(this.out); o.start(t); o2.start(t); o.stop(t + dur * 1.5); o2.stop(t + dur * 1.5);
  }
  pluck(t, f, vol, dur, gamaka) {
    const c = this.ctx, o = c.createOscillator(), h = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain(), hg = c.createGain();
    o.type = 'triangle'; h.type = 'sine'; hg.gain.value = 0.4; lp.type = 'lowpass'; lp.frequency.setValueAtTime(5200, t); lp.frequency.exponentialRampToValueAtTime(900, t + 0.5);
    o.frequency.setValueAtTime(gamaka ? f * 0.94 : f, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.06); h.frequency.value = f * 2;
    this.env(g, t, 0.004, vol, Math.max(0.5, dur * 1.6)); o.connect(lp); h.connect(hg); hg.connect(lp); lp.connect(g); g.connect(this.out);
    o.start(t); h.start(t); o.stop(t + Math.max(0.6, dur * 1.7)); h.stop(t + Math.max(0.6, dur * 1.7));
  }
  flute(t, f, dur) {
    const c = this.ctx, o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain(), ns = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain();
    o.type = 'sine'; o.frequency.value = f; lfo.frequency.value = 5.2; lg.gain.value = f * 0.006; lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.085, t + 0.22); g.gain.setValueAtTime(0.085, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    ns.buffer = this.noise; ns.loop = true; nf.type = 'bandpass'; nf.frequency.value = f * 2; nf.Q.value = 3; ng.gain.value = 0.02; ns.connect(nf); nf.connect(ng); ng.connect(g);
    o.connect(g); g.connect(this.out); o.start(t); lfo.start(t); ns.start(t); o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1); ns.stop(t + dur + 0.1);
  }
  bayan(t, vol) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.14); this.env(g, t, 0.002, vol, 0.26); o.connect(g); g.connect(this.out); o.start(t); o.stop(t + 0.32); }
  dayan(t, vol, f = 420) { const c = this.ctx, o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(); o.frequency.value = f; o2.frequency.value = f * 2.4; this.env(g, t, 0.001, vol, 0.12); o.connect(g); o2.connect(g); g.connect(this.out); o.start(t); o2.start(t); o.stop(t + 0.16); o2.stop(t + 0.16); this.click(t, vol * 0.5, 3000); }
  click(t, vol, f = 2500, d = 0.04) { const c = this.ctx, s = c.createBufferSource(), b = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.noise; b.type = 'bandpass'; b.frequency.value = f; b.Q.value = 1.2; this.env(g, t, 0.001, vol, d); s.connect(b); b.connect(g); g.connect(this.out); s.start(t, this.rnd() * 0.3); s.stop(t + d + 0.02); }
  bass(t, s, dur) {
    const c = this.ctx, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = this.SA * (s % 8 === 6 ? 0.75 : 0.5);
    f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(180, t + dur * 0.9); this.env(g, t, 0.005, s % 4 === 0 ? 0.2 : 0.11, dur * 0.9); o.connect(f); f.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur);
  }
  tabla(t, s, kind) {
    if (kind === 'none') return;
    if (kind === 'adi') {   // dha dhin dhin dha | dha tin tin ta
      if (s === 0 || s === 6 || s === 8) { this.bayan(t, 0.34); this.dayan(t, 0.2); } else if (s === 2 || s === 4 || s === 10) this.dayan(t, 0.16, 460);
      else if (s === 12) this.dayan(t, 0.18, 620); else if (s === 7 || s === 13) this.click(t, 0.1, 1800); else if (s === 14 || s === 15) this.dayan(t, 0.1, 540);
    } else if (kind === 'sparse') { if (s === 0 || s === 8) this.bayan(t, 0.26); if (s === 4 || s === 12) this.dayan(t, 0.1, 400); if (s === 15) this.click(t, 0.05, 2200); }
    else if (kind === 'fast') {
      if ([0, 3, 6, 8, 11, 14].includes(s)) { this.bayan(t, 0.38); this.dayan(t, 0.14); } else this.dayan(t, s % 2 ? 0.08 : 0.15, s % 4 === 1 ? 640 : 480); if (s % 4 === 2) this.click(t, 0.12, 3000);
    }
  }
  bell(t, f = 520, vol = 0.12) {
    const c = this.ctx; for (const [m, v, d] of [[1, 1, 3.2], [2.76, 0.6, 2.2], [5.4, 0.35, 1.4], [8.93, 0.2, 0.8]]) {
      const o = c.createOscillator(), g = c.createGain(); o.frequency.value = f * m; this.env(g, t, 0.002, vol * v, d); o.connect(g); g.connect(this.out); o.start(t); o.stop(t + d + 0.1);
    }
  }
  chirp(t, vol = 0.05) {
    const c = this.ctx, n = 2 + ((this.rnd() * 3) | 0), base = 2600 + this.rnd() * 1800;
    for (let k = 0; k < n; k++) { const o = c.createOscillator(), g = c.createGain(), tt = t + k * 0.09; o.frequency.setValueAtTime(base, tt); o.frequency.exponentialRampToValueAtTime(base * (1.2 + this.rnd() * 0.5), tt + 0.07); this.env(g, tt, 0.005, vol, 0.07); o.connect(g); g.connect(this.out); o.start(tt); o.stop(tt + 0.1); }
  }
}
