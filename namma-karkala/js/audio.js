// All sound is synthesised with Web Audio, so there are no audio files to license or download.
import { Music } from './music.js';
import { Studio } from './studio.js';
import { SONGS, SCORE } from './songs.js';
import { Voice } from './voice.js';
const clamp01 = (v) => Math.max(0, Math.min(1, v));
export class Audio {
  constructor() { this.ctx = null; this.on = true; }
  init() {
    if (this.ctx) return; const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const c = this.ctx = new C(); this.master = c.createGain(); this.master.gain.value = 0.7; this.master.connect(c.destination);
    // engine: two detuned oscillators through a low-pass
    this.musicGain = c.createGain(); this.musicGain.gain.value = 1.0; this.musicGain.connect(this.master);
    this.music = new Music(c, this.musicGain); this.musicOn = true;        // small helper: bells and birdsong
    this.studio = new Studio(c, this.musicGain, 7); this.curSong = null; if (this.pendingVocals === false || this.vocalsOn === false) this.studio.noVocals = true; this.studio.lyricText = (id) => Voice.text(id);
    this.voiceGain = c.createGain(); this.voiceGain.gain.value = 1.7; this.voiceGain.connect(this.master);
    this.recDest = c.createMediaStreamDestination(); this.master.connect(this.recDest);
    // ambience: crickets (night), distant traffic hum, wind
    this.cric = { o: c.createOscillator(), lfo: c.createOscillator(), lg: c.createGain(), g: c.createGain() };
    this.cric.o.frequency.value = 4350; this.cric.lfo.type = 'square'; this.cric.lfo.frequency.value = 14; this.cric.lg.gain.value = 0.5; this.cric.g.gain.value = 0;
    const cm = c.createGain(); cm.gain.value = 0.5; this.cric.lfo.connect(this.cric.lg); this.cric.lg.connect(cm.gain); this.cric.o.connect(cm); cm.connect(this.cric.g); this.cric.g.connect(this.master); this.cric.o.start(); this.cric.lfo.start();
    this.eng = { o1: c.createOscillator(), o2: c.createOscillator(), f: c.createBiquadFilter(), g: c.createGain() };
    this.eng.o1.type = 'sawtooth'; this.eng.o2.type = 'square'; this.eng.f.type = 'lowpass'; this.eng.f.frequency.value = 500; this.eng.g.gain.value = 0;
    this.eng.o1.connect(this.eng.f); this.eng.o2.connect(this.eng.f); this.eng.f.connect(this.eng.g); this.eng.g.connect(this.master); this.eng.o1.start(); this.eng.o2.start();
    // noise buffer shared by rain, thuds and splashes
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; this.noise = nb;
    const rs = c.createBufferSource(); rs.buffer = nb; rs.loop = true; const rf = c.createBiquadFilter(); rf.type = 'bandpass'; rf.frequency.value = 2500; rf.Q.value = 0.4;
    this.rainG = c.createGain(); this.rainG.gain.value = 0; rs.connect(rf); rf.connect(this.rainG); this.rainG.connect(this.master); rs.start();
    const ts = c.createBufferSource(); ts.buffer = nb; ts.loop = true; const tf = c.createBiquadFilter(); tf.type = 'lowpass'; tf.frequency.value = 260; this.hum = c.createGain(); this.hum.gain.value = 0; ts.connect(tf); tf.connect(this.hum); this.hum.connect(this.master); ts.start();
    // siren
    this.sir = { o: c.createOscillator(), g: c.createGain(), lfo: c.createOscillator(), lg: c.createGain() };
    this.sir.o.type = 'square'; this.sir.o.frequency.value = 700; this.sir.lfo.frequency.value = 0.7; this.sir.lg.gain.value = 260;
    this.sir.lfo.connect(this.sir.lg); this.sir.lg.connect(this.sir.o.frequency); this.sir.o.connect(this.sir.g); this.sir.g.gain.value = 0; this.sir.g.connect(this.master); this.sir.o.start(); this.sir.lfo.start();
    // crowd cheering at the Kambala track: band-passed noise with a slow swell
    const cs = c.createBufferSource(); cs.buffer = nb; cs.loop = true; const cf = c.createBiquadFilter(); cf.type = 'bandpass'; cf.frequency.value = 1100; cf.Q.value = 0.7; this.cheerG = c.createGain(); this.cheerG.gain.value = 0;
    const cl = c.createOscillator(), clg = c.createGain(); cl.frequency.value = 2.3; clg.gain.value = 500; cl.connect(clg); clg.connect(cf.frequency); cl.start(); cs.connect(cf); cf.connect(this.cheerG); this.cheerG.connect(this.master); cs.start();
    // birds/crickets ambience
    this.amb = c.createGain(); this.amb.gain.value = 0.0; this.amb.connect(this.master);
  }
  /** Called every frame: music state + ambience. info = {day:0..1, rain:0..1, templeDist, traffic, chase, mission, scene} */
  update(dt, info) {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    const st = info.scene || (info.chase ? 'chase' : info.rain > 0.5 ? 'rain' : info.day < 0.25 ? 'night' : info.day < 0.55 ? 'evening' : 'day');
    let want = info.scene ? SCORE[info.scene] : (info.song || SCORE[st]); if (!this.musicOn) want = null;
    if (want !== this.curSong) { this.curSong = want; if (want) this.studio.play(SONGS[want], 1.6); else this.studio.stop(0.8); }
    this.vol = info.vol ?? 1; this.musicGain.gain.setTargetAtTime((this.ducked ? 0.4 : 1) * this.vol, t, 0.3); this.cheerG.gain.setTargetAtTime((info.cheer || 0) * 0.16, t, 0.5);
    this.studio.intensity = Math.max(0, Math.min(1, info.intensity || 0)); this.studio.tick();
    const day = info.day, quiet = info.scene ? 0.3 : 1;
    this.cric.g.gain.setTargetAtTime(clamp01(1 - day * 1.6) * (1 - info.rain) * 0.035 * quiet, t, 0.6);
    this.hum.gain.setTargetAtTime(Math.min(0.1, (info.traffic || 0) * 0.012) * quiet, t, 0.6);
    this.ambT = (this.ambT || 0) - dt;
    if (this.ambT <= 0) {
      this.ambT = 1.2 + Math.random() * 3;
      if (day > 0.5 && info.rain < 0.3 && !info.scene) this.music.chirp(t + 0.02, 0.03 + Math.random() * 0.03);
      if (info.templeDist < 140 && !info.scene && Math.random() < 0.6) { const v = 0.1 * (1 - info.templeDist / 140); this.music.bell(t + 0.05, 560 + Math.random() * 90, v); this.bellT = 0; }
    }
  }
  duck(on) { this.ducked = on; if (this.ctx) this.musicGain.gain.setTargetAtTime((on ? 0.4 : 1.0) * (this.vol ?? 1), this.ctx.currentTime, 0.2); }
  setMusic(on) { this.musicOn = on; }
  setVocals(on) { this.vocalsOn = on; if (this.studio) this.studio.noVocals = !on; else this.pendingVocals = on; }
  /** Short syllable-like blips used as a fallback "voice" while text is typed. */
  blip(who, ch) {
    if (!this.ctx || !this.on) return; const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    const base = { RAJU: 150, AMMA: 280, AJJI: 300, ARCHAKARU: 110, PRAMOD: 170, OWNER: 130, CANTEEN: 120, SHWETHA: 270, THIEF: 220, NARRATOR: 130 }[who] || 160;
    o.type = 'triangle'; o.frequency.value = base * (0.8 + ((ch.charCodeAt(0) * 7) % 10) / 14); g.gain.setValueAtTime(0.04, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.07); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.09);
  }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  setMuted(m) { this.on = !m; if (this.master) this.master.gain.value = m ? 0 : 0.7; }
  engine(kind, speed, thr) {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    if (!kind) { this.eng.g.gain.setTargetAtTime(0, t, 0.1); return; }
    if (kind === 'cycle') { this.eng.g.gain.setTargetAtTime(0, t, 0.1); return; }
    const base = { scooter: 70, scooty: 72, moped: 80, sportbike: 44, hatch: 42, sedan: 38, taxi: 36, pickup: 34, minitruck: 40, bike: 48, auto: 55, car: 40, omni: 46, suv: 36, jeep: 38, ambulance: 38, tempo: 42, lorry: 28, tanker: 28, tractor: 24, bus: 30, ksrtc: 30, schoolbus: 32 }[kind] || 45;
    const f = base + Math.abs(speed) * (kind === 'bus' ? 3 : 5.5) + thr * 15;
    this.eng.o1.frequency.setTargetAtTime(f, t, 0.05); this.eng.o2.frequency.setTargetAtTime(f * 0.501, t, 0.05);
    this.eng.f.frequency.setTargetAtTime(300 + f * 6, t, 0.08); this.eng.g.gain.setTargetAtTime(kind === 'auto' || kind === 'tractor' ? 0.11 : 0.07 + Math.min(0.06, Math.abs(speed) * 0.003), t, 0.08);
  }
  tone(f, dur, type = 'square', vol = 0.2, when = 0, slide = 0) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + when, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.linearRampToValueAtTime(f + slide, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  horn(kind = 'car', vol = 0.22) {
    if (kind === 'auto') { this.tone(440, 0.12, 'square', vol); this.tone(440, 0.12, 'square', vol, 0.18); }         // pom pom
    else if (kind === 'cycle') { for (let i = 0; i < 4; i++) this.tone(2400, 0.08, 'sine', vol * 0.6, i * 0.09); }       // tring tring
    else if (kind === 'lorry' || kind === 'tanker') { this.tone(155, 0.9, 'sawtooth', vol); this.tone(185, 0.9, 'sawtooth', vol * 0.8); this.tone(233, 0.9, 'sawtooth', vol * 0.6); }
    else if (kind === 'bus' || kind === 'ksrtc' || kind === 'schoolbus') { this.tone(196, 0.7, 'sawtooth', vol); this.tone(247, 0.7, 'sawtooth', vol * 0.7); this.tone(294, 0.7, 'sawtooth', vol * 0.5); }
    else if (kind === 'scooter' || kind === 'scooty' || kind === 'moped' || kind === 'bike' || kind === 'sportbike') { this.tone(620, 0.3, 'square', vol * 0.8); }
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
  ring() { for (let k = 0; k < 3; k++) { this.tone(880, 0.12, 'sine', 0.12, k * 0.45); this.tone(1175, 0.12, 'sine', 0.12, k * 0.45 + 0.14); } }
  pass() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.2, i * 0.12)); }
  fail() { [392, 330, 262].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.2, i * 0.18)); }
  siren(on) { if (this.ctx) this.sir.g.gain.setTargetAtTime(on ? 0.035 : 0, this.ctx.currentTime, 0.2); }
  rain(level) { if (this.ctx) this.rainG.gain.setTargetAtTime(level * 0.16, this.ctx.currentTime, 0.5); }
  crow() { this.tone(900, 0.18, 'sawtooth', 0.05, 0, -350); this.tone(850, 0.2, 'sawtooth', 0.05, 0.28, -350); }
}
