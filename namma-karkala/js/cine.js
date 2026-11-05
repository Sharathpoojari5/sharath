// The intro trailer: scripted camera shots over the live game world (real traffic, real weather), with
// music, narration and title cards. It can be watched in the game or recorded to a video file.
import { Vehicle, Cow } from './actors.js';
import { Voice } from './voice.js';

const sm = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const L3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const f2 = (h) => [Math.sin(h), Math.cos(h)];

export class Cinematic {
  constructor(game) { this.g = game; this.active = false; this.t = 0; this.shot = -1; this.cc = null; this.rec = null; }

  /** Build the shot list from the real positions of things in this world. */
  shots() {
    const g = this.g, w = g.world, h = w.hill, f = w.hillFace || 0, [fx, fz] = f2(f), bs = w.busStand || { x: 150, z: 38, n: [0, 1], rot: 0 };
    const kb = w.kereBasadi || [112, 360], mr = w.marketRoad, mi = mr ? Math.floor(mr.pts.length / 2) : 0;
    const q = mr ? mr.pts[mi] : [bs.x, bs.z], q2 = mr ? mr.pts[Math.min(mr.pts.length - 1, mi + 1)] : [bs.x + 5, bs.z];
    let dx = q2[0] - q[0], dz = q2[1] - q[1]; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
    const big = w.bigNodes[Math.floor(w.bigNodes.length * 0.4)] || w.nodes[0];
    const bigE = big.adj.find(e => e.w >= 9) || big.adj[0], bx = bigE.n.x - big.x, bz = bigE.n.z - big.z, bl = Math.hypot(bx, bz) || 1, bdx = bx / bl, bdz = bz / bl;
    const H = h.H, temple = w.temple;
    return [
      { dur: 7, tod: 5.9 * 60, rain: false, music: 'title', focus: [h.x + fx * 30, h.z + fz * 30], cap: 'Karkala. Udupi district. Population: small. Opinions: many.', title: 'dawn',
        cam: (u) => { const d = lerp(78, 44, sm(u)), x = h.x + fx * d, z = h.z + fz * d; return { p: [x, w.groundH(x, z) + lerp(3, 6, u), z], l: [h.x, H + 9, h.z], fov: 50 }; } },
      { dur: 8, tod: 6.6 * 60, rain: false, music: 'trailer', focus: [bs.x, bs.z], cap: 'A hill older than the traffic.',
        cam: (u) => { const p = L3([h.x + fx * 55, H + 26, h.z + fz * 55], [bs.x + 30, 38, bs.z + 40], sm(u)); return { p, l: L3([h.x, H + 6, h.z], [bs.x, 0, bs.z], sm(u)), fov: 62 }; } },
      { dur: 7, tod: 17.1 * 60, rain: false, music: 'trailer', focus: [kb[0], kb[1] + 40], cap: 'A basadi in the middle of a lake.',
        cam: (u) => { const a = lerp(-0.9, 0.2, sm(u)), r = lerp(60, 44, u); return { p: [kb[0] + Math.sin(a) * r, 5.5, kb[1] + 8 + Math.cos(a) * r * 0.9], l: [kb[0], 6, kb[1]], fov: 50 }; } },
      { dur: 8, tod: 11 * 60, rain: false, music: 'trailer', focus: [q[0], q[1]], cap: 'Buses named after gods. Drivers named after nobody.',
        setup: (g, d) => { d.veh = this.spawnRoad('bus', q[0] + dx * 80, q[1] + dz * 80, -dx, -dz); d.veh2 = this.spawnRoad('auto', q[0] + dx * 22, q[1] + dz * 22, -dx, -dz); },
        cam: (u) => { const s = u * 46; return { p: [q[0] + dx * s - dz * 1.8, 2.3, q[1] + dz * s + dx * 1.8], l: [q[0] + dx * (s + 24), 1.8, q[1] + dz * (s + 24)], fov: 62 }; },
        beats: [[3.2, (g) => g.audio.horn('bus', 0.3)], [5.5, (g) => g.audio.horn('auto', 0.25)]] },
      { dur: 7, tod: 15.4 * 60, rain: false, music: 'trailer', focus: [bs.x, bs.z], cap: 'Autos that say pom pom.',
        cam: (u) => { const al = [Math.cos(bs.rot), -Math.sin(bs.rot)], k = lerp(-34, 34, sm(u)); return { p: [bs.x - bs.n[0] * 26 + al[0] * k, 3.4, bs.z - bs.n[1] * 26 + al[1] * k], l: [bs.x - bs.n[0] * 4, 2.4, bs.z - bs.n[1] * 4], fov: 56 }; },
        beats: [[1.5, (g) => g.audio.horn('auto', 0.3)], [2.6, (g) => g.audio.horn('auto', 0.3)], [4.5, (g) => g.audio.horn('bus', 0.25)]] },
      { dur: 8, tod: 15.2 * 60, rain: true, music: 'rain', focus: [big.x, big.z], cap: 'It will rain at four. Karkala is punctual only about rain.',
        setup: (g, d) => { d.veh = this.spawnRoad('scooter', big.x + bdx * 6, big.z + bdz * 6, bdx, bdz, 'ai', true); },
        follow: (d) => d.veh, back: 6.5, up: 2.6 },
      { dur: 8, tod: 14 * 60, rain: false, music: 'chase', focus: [big.x + bdx * 40, big.z + bdz * 40], cap: 'Jeep chases. Gossip first, fine later.',
        setup: (g, d) => { d.veh = this.spawnRoad('scooter', big.x + bdx * 50, big.z + bdz * 50, bdx, bdz, 'ai', true); d.veh.v = 9; d.jeep = this.spawnRoad('jeep', big.x + bdx * 20, big.z + bdz * 20, bdx, bdz, 'cine', true); d.jeep.police = true; d.jeep.v = 10; },
        follow: (d) => d.jeep, back: 9, up: 3.2, chase: true },
      { dur: 6, tod: 12 * 60, rain: false, music: 'trailer', focus: [q[0] - dx * 10, q[1] - dz * 10], cap: 'Right of way: cow.',
        setup: (g, d) => { const cow = new Cow(g, q[0] + dx * 18 - dz * 1.0, q[1] + dz * 18 + dx * 1.0); cow.keep = true; cow.h = Math.atan2(dx, dz) + 1.5; cow.t = 99; cow.moving = false; g.cows.push(cow); d.cow = cow; d.veh = this.spawnRoad('bus', q[0] - dx * 40, q[1] - dz * 40, dx, dz); },
        cam: (u, g, d) => ({ p: [d.cow.x - dx * 8 + dz * 3.2, 1.3, d.cow.z - dz * 8 - dx * 3.2], l: [d.cow.x, 1.1, d.cow.z], fov: 48 }),
        beats: [[2.0, (g) => g.audio.horn('bus', 0.35)], [4.0, (g) => g.audio.horn('bus', 0.35)]] },
      { dur: 7, tod: 20.7 * 60, rain: false, music: 'night', focus: [q[0], q[1]], cap: 'Goli baje at five. Always.',
        cam: (u) => ({ p: [q[0] - dx * 14 + dz * 4, lerp(2.2, 24, sm(u)), q[1] - dz * 14 - dx * 4], l: [q[0] + dx * 30, lerp(2, 4, u), q[1] + dz * 30], fov: 60 }) },
      { dur: 9, tod: 17.8 * 60, rain: false, music: 'ending', focus: [h.x + fx * 30, h.z + fz * 30], title: 'logo', cap: '',
        cam: (u) => { const a = lerp(0.9, -0.15, sm(u)) + f; return { p: [h.x + Math.sin(a) * 24, H + 8 - u * 2, h.z + Math.cos(a) * 24], l: [h.x, H + 8.5, h.z], fov: 54 }; } },
    ];
  }

  /** Spawn an AI vehicle on the road nearest to (x,z) driving in direction (dx,dz). */
  spawnRoad(kind, x, z, dx, dz, driver = 'ai', fast = false) {
    const g = this.g, w = g.world, near = w.nodesNear(x, z, 60); if (!near.length) return null;
    let n = near.sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0], best = null, bs = -2;
    for (const e of n.adj) { const ex = e.n.x - n.x, ez = e.n.z - n.z, l = Math.hypot(ex, ez) || 1, s = (ex * dx + ez * dz) / l; if (s > bs) { bs = s; best = e; } }
    const e = best, h = Math.atan2(e.n.x - n.x, e.n.z - n.z), L = Math.hypot(e.n.x - n.x, e.n.z - n.z) || 1, lo = e.w / 4 + 0.2;
    const v = new Vehicle(g, kind, n.x + ((e.n.z - n.z) / L) * lo, n.z - ((e.n.x - n.x) / L) * lo, h, { driver }); v.keep = true; v.v = fast ? 8 : 4;
    if (driver === 'ai') v.aiInit(n, e.n); g.vehicles.push(v); (this.spawned = this.spawned || []).push(v); return v;
  }

  /* ---------------------------------------------------------------- playback */
  play(o = {}) {
    const g = this.g; if (this.active) return;
    this.list = this.shots(); this.t = 0; this.shot = -1; this.active = true; this.opts = o; this.spawned = []; this.onEnd = o.onEnd; this.total = this.list.reduce((a, s) => a + s.dur, 0);
    this.saved = { time: g.time, rainOn: g.rainOn, raining: g.raining, cheatWeather: g.cheatWeather, px: g.player.x, pz: g.player.z, vis: g.player.mesh.visible };
    g.cheatWeather = true; g.inputLock = true; g.player.mesh.visible = false; document.body.classList.add('cine'); g.audio.init(); g.audio.resume();
    g.setPaused && g.setPaused(false);
    this.makeOverlay(); if (o.record) this.startRecord();
    this.nextShot();
  }
  nextShot() {
    const g = this.g; this.shot++;
    for (const v of this.spawned) { const i = g.vehicles.indexOf(v); if (i >= 0) { v.dispose(); g.vehicles.splice(i, 1); } } this.spawned = [];
    for (const c of g.cows.filter(c => c.keep)) { c.dispose(); g.cows.splice(g.cows.indexOf(c), 1); }
    if (this.shot >= this.list.length) return this.stop(true);
    const s = this.list[this.shot]; this.sT = 0; this.d = {}; this.fired = new Set();
    g.time = s.tod; g.rainOn = s.rain; g.raining = s.rain ? 1 : 0; g.envT = 0;
    g.player.x = s.focus[0]; g.player.z = s.focus[1]; g.player.y = 0;
    for (const v of g.vehicles.filter(v => !v.keep && !v.parked)) { v.dispose(); g.vehicles.splice(g.vehicles.indexOf(v), 1); }
    for (const q of g.peds) q.dispose(); g.peds.length = 0;
    for (let i = 0; i < 12; i++) g.populate();
    for (let i = 0; i < 40; i++) g.update(1 / 30);                       // let traffic start rolling
    s.setup && s.setup(g, this.d);
    this.camPos = null;
    if (s.cap) Voice.speak(s.cap, 'NARRATOR');
    g.audio.music.set(s.music);
  }
  stop(finished) {
    const g = this.g; if (!this.active) return; this.active = false; Voice.stop();
    for (const v of this.spawned) { const i = g.vehicles.indexOf(v); if (i >= 0) { v.dispose(); g.vehicles.splice(i, 1); } } this.spawned = [];
    for (const c of g.cows.filter(c => c.keep)) { c.dispose(); g.cows.splice(g.cows.indexOf(c), 1); }
    const sv = this.saved; g.time = sv.time; g.rainOn = sv.rainOn; g.raining = sv.raining; g.cheatWeather = sv.cheatWeather; g.player.x = sv.px; g.player.z = sv.pz; g.player.mesh.visible = sv.vis;
    g.inputLock = false; document.body.classList.remove('cine'); g.cinCam = null; if (this.cc) this.cc.style.display = 'none';
    if (this.recorder) this.stopRecord();
    this.onEnd && this.onEnd(finished);
  }
  update(dt) {
    if (!this.active) return; const g = this.g, s = this.list[this.shot];
    this.t += dt; this.sT += dt;
    if (s.beats) for (const [bt, fn] of s.beats) if (this.sT >= bt && !this.fired.has(bt)) { this.fired.add(bt); fn(g); }
    if (s.chase && this.d.jeep && this.d.veh) { const j = this.d.jeep, v = this.d.veh; j.seek(dt, v.x, v.z, 20); j.sync(); }
    const u = Math.min(1, this.sT / s.dur); let cam;
    if (s.follow) {
      const v = s.follow(this.d); if (v) { const fx = Math.sin(v.h), fz = Math.cos(v.h), tp = [v.x - fx * s.back - fz * (s.chase ? 2.5 : 0), v.y + s.up, v.z - fz * s.back + fx * (s.chase ? 2.5 : 0)];
        this.camPos = this.camPos ? L3(this.camPos, tp, Math.min(1, dt * 4)) : tp; cam = { p: this.camPos, l: [v.x + fx * 3, v.y + 1, v.z + fz * 3], fov: 64 }; }
    } else cam = s.cam(u, g, this.d);
    if (cam) g.cinCam = cam;
    if (this.sT >= s.dur) this.nextShot();
  }

  /* ---------------------------------------------------------------- 2D overlay: bars, captions, titles */
  makeOverlay() {
    if (!this.cc) { this.cc = document.createElement('canvas'); this.cc.id = 'cc'; Object.assign(this.cc.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', zIndex: 8, pointerEvents: 'none' }); document.body.appendChild(this.cc); }
    this.cc.style.display = 'block'; this.cc.width = innerWidth; this.cc.height = innerHeight;
  }
  drawOverlay(target) {
    const g = this.g, cv = this.cc, W = target ? target.width : cv.width, H = target ? target.height : cv.height, x = target ? target.getContext('2d') : cv.getContext('2d');
    if (!target) x.clearRect(0, 0, W, H);
    if (!this.active) return; const s = this.list[this.shot]; if (!s) return;
    const bar = H * 0.11; x.fillStyle = '#000'; x.fillRect(0, 0, W, bar); x.fillRect(0, H - bar, W, bar);
    const fs = Math.round(H * 0.044), a = Math.min(1, this.sT / 0.5, (s.dur - this.sT) / 0.4);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    if (s.cap) { x.globalAlpha = Math.max(0, a); x.font = `800 ${fs}px "Noto Sans Kannada","Kannada Sangam MN",Inter,system-ui,sans-serif`; x.fillStyle = '#fff'; x.shadowColor = '#000'; x.shadowBlur = 14; x.fillText(s.cap, W / 2, H - bar - fs * 1.5, W * 0.88); x.shadowBlur = 0; x.globalAlpha = 1; }
    if (s.title === 'dawn') {
      const ua = Math.min(1, Math.max(0, (this.sT - 1.2) / 1.2)) * Math.min(1, (s.dur - this.sT) / 0.8); x.globalAlpha = ua;
      x.font = `900 ${Math.round(H * 0.13)}px "Noto Sans Kannada","Kannada Sangam MN",system-ui,sans-serif`; x.fillStyle = '#fde047'; x.shadowColor = '#000'; x.shadowBlur = 24; x.fillText('ಕಾರ್ಕಳ', W / 2, H * 0.3);
      x.font = `900 ${Math.round(H * 0.06)}px Inter,system-ui,sans-serif`; x.fillStyle = '#fff'; x.fillText('K A R K A L A', W / 2, H * 0.42); x.shadowBlur = 0; x.globalAlpha = 1;
    }
    if (s.title === 'logo') {
      const ua = Math.min(1, Math.max(0, (this.sT - 0.8) / 1.4)); x.globalAlpha = ua; x.shadowColor = '#000'; x.shadowBlur = 26;
      x.font = `900 ${Math.round(H * 0.045)}px "Noto Sans Kannada","Kannada Sangam MN",system-ui,sans-serif`; x.fillStyle = '#fde047'; x.fillText('ನಮ್ಮ', W / 2, H * 0.27);
      const ts = Math.round(H * 0.15), grd = x.createLinearGradient(0, H * 0.3, 0, H * 0.46); grd.addColorStop(0, '#fde047'); grd.addColorStop(0.5, '#fde047'); grd.addColorStop(0.5, '#ef4444'); grd.addColorStop(1, '#ef4444');
      x.font = `900 ${ts}px Inter,system-ui,sans-serif`; x.fillStyle = grd; x.fillText('KARKALA', W / 2, H * 0.4); x.shadowBlur = 8;
      x.font = `700 ${Math.round(H * 0.03)}px Inter,system-ui,sans-serif`; x.fillStyle = '#fff'; x.globalAlpha = Math.min(1, Math.max(0, (this.sT - 2.4) / 1)); x.fillText('Free · No download · Chapter 1: Karkala', W / 2, H * 0.52); x.shadowBlur = 0; x.globalAlpha = 1;
    }
    const fade = this.shot === 0 ? Math.max(0, 1 - this.sT / 1.2) : this.shot === this.list.length - 1 ? Math.max(0, (this.sT - (s.dur - 1.6)) / 1.6) : Math.max(0, 1 - this.sT / 0.25) * 0.8;
    if (fade > 0) { x.fillStyle = `rgba(0,0,0,${fade})`; x.fillRect(0, 0, W, H); }
    if (!target) { x.font = `600 ${Math.round(H * 0.018)}px Inter,system-ui,sans-serif`; x.fillStyle = 'rgba(255,255,255,.6)'; x.textAlign = 'right'; x.fillText('Space · skip', W - 18, H - bar - 14); }
  }

  /* ---------------------------------------------------------------- recording to a video file */
  startRecord() {
    const g = this.g; if (!window.MediaRecorder) return;
    const rc = this.rc = document.createElement('canvas'); rc.width = 1280; rc.height = 720;
    this.ctxRc = rc.getContext('2d'); const stream = rc.captureStream(30);
    for (const t of g.audio.recDest.stream.getAudioTracks()) stream.addTrack(t);
    const types = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    const type = types.find(t => MediaRecorder.isTypeSupported(t)) || ''; this.chunks = [];
    this.recorder = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 8e6 } : { videoBitsPerSecond: 8e6 });
    this.recorder.ondataavailable = (e) => e.data && e.data.size && this.chunks.push(e.data);
    this.recorder.onstop = () => { const blob = new Blob(this.chunks, { type: (this.recorder.mimeType || 'video/webm').split(';')[0] }); this.recorder = null; this.opts.onVideo && this.opts.onVideo(blob); };
    this.recorder.start(250);
  }
  /** Called right after the WebGL frame is rendered, while recording. */
  captureFrame(glCanvas) {
    if (!this.recorder) return; const W = 1280, H = 720, x = this.ctxRc, r = Math.max(W / glCanvas.width, H / glCanvas.height);
    x.drawImage(glCanvas, (W - glCanvas.width * r) / 2, (H - glCanvas.height * r) / 2, glCanvas.width * r, glCanvas.height * r);
    this.drawOverlay(this.rc);
  }
  stopRecord() { if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop(); }
}
