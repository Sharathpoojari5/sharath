// All sound is synthesised with Web Audio, so there are no audio files to license or download.
export class Audio {
  constructor() { this.ctx = null; this.on = true; }
  init() {
    if (this.ctx) return; const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const c = this.ctx = new C(); this.master = c.createGain(); this.master.gain.value = 0.7; this.master.connect(c.destination);
    // engine: two detuned oscillators through a low-pass
    this.eng = { o1: c.createOscillator(), o2: c.createOscillator(), f: c.createBiquadFilter(), g: c.createGain() };
    this.eng.o1.type = 'sawtooth'; this.eng.o2.type = 'square'; this.eng.f.type = 'lowpass'; this.eng.f.frequency.value = 500; this.eng.g.gain.value = 0;
    this.eng.o1.connect(this.eng.f); this.eng.o2.connect(this.eng.f); this.eng.f.connect(this.eng.g); this.eng.g.connect(this.master); this.eng.o1.start(); this.eng.o2.start();
    // noise buffer shared by rain, thuds and splashes
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; this.noise = nb;
    const rs = c.createBufferSource(); rs.buffer = nb; rs.loop = true; const rf = c.createBiquadFilter(); rf.type = 'bandpass'; rf.frequency.value = 2500; rf.Q.value = 0.4;
    this.rainG = c.createGain(); this.rainG.gain.value = 0; rs.connect(rf); rf.connect(this.rainG); this.rainG.connect(this.master); rs.start();
    // siren
    this.sir = { o: c.createOscillator(), g: c.createGain(), lfo: c.createOscillator(), lg: c.createGain() };
    this.sir.o.type = 'square'; this.sir.o.frequency.value = 700; this.sir.lfo.frequency.value = 0.7; this.sir.lg.gain.value = 260;
    this.sir.lfo.connect(this.sir.lg); this.sir.lg.connect(this.sir.o.frequency); this.sir.o.connect(this.sir.g); this.sir.g.gain.value = 0; this.sir.g.connect(this.master); this.sir.o.start(); this.sir.lfo.start();
    // birds/crickets ambience
    this.amb = c.createGain(); this.amb.gain.value = 0.0; this.amb.connect(this.master);
  }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  setMuted(m) { this.on = !m; if (this.master) this.master.gain.value = m ? 0 : 0.7; }
  engine(kind, speed, thr) {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    if (!kind) { this.eng.g.gain.setTargetAtTime(0, t, 0.1); return; }
    const base = { scooter: 70, bike: 48, auto: 55, car: 40, jeep: 38, tempo: 42, bus: 30 }[kind] || 45;
    const f = base + Math.abs(speed) * (kind === 'bus' ? 3 : 5.5) + thr * 15;
    this.eng.o1.frequency.setTargetAtTime(f, t, 0.05); this.eng.o2.frequency.setTargetAtTime(f * 0.501, t, 0.05);
    this.eng.f.frequency.setTargetAtTime(300 + f * 6, t, 0.08); this.eng.g.gain.setTargetAtTime(kind === 'auto' ? 0.11 : 0.07 + Math.min(0.06, Math.abs(speed) * 0.003), t, 0.08);
  }
  tone(f, dur, type = 'square', vol = 0.2, when = 0, slide = 0) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + when, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.linearRampToValueAtTime(f + slide, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  horn(kind = 'car', vol = 0.22) {
    if (kind === 'auto') { this.tone(440, 0.12, 'square', vol); this.tone(440, 0.12, 'square', vol, 0.18); }         // pom pom
    else if (kind === 'bus') { this.tone(196, 0.7, 'sawtooth', vol); this.tone(247, 0.7, 'sawtooth', vol * 0.7); this.tone(294, 0.7, 'sawtooth', vol * 0.5); }
    else if (kind === 'scooter' || kind === 'bike') { this.tone(620, 0.3, 'square', vol * 0.8); }
    else { this.tone(392, 0.45, 'square', vol); this.tone(494, 0.45, 'square', vol * 0.7); }
  }
  noiseHit(vol = 0.5, freq = 400, dur = 0.25) {
    if (!this.ctx) return; const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime;
    s.buffer = this.noise; f.type = 'lowpass'; f.frequency.value = freq; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + dur);
  }
  thud(power = 1) { this.noiseHit(Math.min(0.9, 0.25 + power * 0.05), 300); this.tone(70, 0.2, 'sine', 0.3); }
  splash() { this.noiseHit(0.8, 1800, 0.9); }
  coin() { this.tone(988, 0.08, 'square', 0.12); this.tone(1319, 0.25, 'square', 0.12, 0.08); }
  pass() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.2, i * 0.12)); }
  fail() { [392, 330, 262].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.2, i * 0.18)); }
  siren(on) { if (this.ctx) this.sir.g.gain.setTargetAtTime(on ? 0.035 : 0, this.ctx.currentTime, 0.2); }
  rain(level) { if (this.ctx) this.rainG.gain.setTargetAtTime(level * 0.16, this.ctx.currentTime, 0.5); }
  crow() { this.tone(900, 0.18, 'sawtooth', 0.05, 0, -350); this.tone(850, 0.2, 'sawtooth', 0.05, 0.28, -350); }
}
