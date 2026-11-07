// Street life: stray dogs you can pet, a gully-cricket match you can join, and B = record a 15 second clip.
import * as THREE from './three.module.min.js';
import * as M from './models.js';
import { People } from './people.js';

const { P, box, cyl, sph, merge, MAT } = M;
const rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[Math.floor(Math.random() * a.length)], clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function dogGeo(coat, patch) {
  const parts = [P(box(0.62, 0.3, 0.28), coat, [0, 0.46, 0]), P(sph(0.17, 8, 6), coat, [0.36, 0.58, 0], [0, 0, 0], [1, 0.95, 0.85]), P(box(0.14, 0.09, 0.1), patch, [0.5, 0.54, 0]), P(sph(0.03, 5, 4), '#111', [0.58, 0.56, 0]),
    P(box(0.07, 0.13, 0.05), patch, [0.3, 0.7, 0.1], [0, 0, 0.3]), P(box(0.07, 0.13, 0.05), patch, [0.3, 0.7, -0.1], [0, 0, 0.3]), P(sph(0.1, 6, 4), patch, [-0.1, 0.5, 0.1], [0, 0, 0], [1.6, 0.8, 0.5])];
  const leg = (x, z) => P(cyl(0.04, 0.035, 0.3, 5), coat, [x, 0.15, z]);
  parts.push(leg(0.24, 0.1), leg(0.24, -0.1), leg(-0.24, 0.1), leg(-0.24, -0.1));
  return merge(parts);
}
const TAIL = merge([P(cyl(0.025, 0.015, 0.3, 5), '#a16207', [0, 0.15, 0], [0, 0, 0.5])]);

class Dog {
  constructor(g, x, z) {
    const coat = pick(['#a16207', '#c2933b', '#3f3f46', '#78716c', '#d6c3a0']), patch = pick(['#f5f5f4', '#292524', '#8b5a2b']);
    this.g = g; this.mesh = new THREE.Group(); const body = new THREE.Mesh(dogGeo(coat, patch), MAT.solid); body.castShadow = true; this.mesh.add(body);
    this.tail = new THREE.Mesh(TAIL, MAT.solid); this.tail.position.set(-0.3, 0.5, 0); this.mesh.add(this.tail);
    this.hx = x; this.hz = z; this.x = x; this.z = z; this.h = rnd(0, 6.28); this.t = rnd(0, 5); this.sit = false; this.pet = 0; this.tx = x; this.tz = z; this.spd = 0;
    this.mesh.visible = false; g.scene.add(this.mesh);
  }
  update(dt, p) {
    const g = this.g, w = g.world, d = Math.hypot(p.x - this.x, p.z - this.z); this.mesh.visible = d < 140; if (!this.mesh.visible) return;
    this.t -= dt; this.pet = Math.max(0, this.pet - dt);
    if (this.t < 0) { this.t = rnd(3, 9); this.sit = Math.random() < 0.35; this.tx = this.hx + rnd(-9, 9); this.tz = this.hz + rnd(-9, 9); }
    if (d < 5 && !g.car && this.pet > 0) this.sit = true;
    let dx = this.tx - this.x, dz = this.tz - this.z, L = Math.hypot(dx, dz); this.spd = 0;
    if (g.car && Math.hypot(g.car.x - this.x, g.car.z - this.z) < 9 && Math.abs(g.car.v) > 4) { dx = this.x - g.car.x; dz = this.z - g.car.z; L = Math.hypot(dx, dz) || 1; this.sit = false; this.spd = 6; }   // scatter from traffic
    else if (!this.sit && L > 0.6) this.spd = 1.3;
    if (this.spd) { const nx = this.x + dx / L * this.spd * dt, nz = this.z + dz / L * this.spd * dt; if (!w.blocked(nx, nz, 0.25) && !w.inWater(nx, nz)) { this.x = nx; this.z = nz; } else this.t = 0; const th = Math.atan2(dz, dx); let da = th - this.h; da = Math.atan2(Math.sin(da), Math.cos(da)); this.h += da * Math.min(1, dt * 6); }
    this.mesh.position.set(this.x, w.groundH(this.x, this.z) + (this.spd ? Math.abs(Math.sin(g.now * 14)) * 0.04 : 0), this.z); this.mesh.rotation.y = -this.h;
    this.mesh.scale.y = this.sit ? 0.78 : 1; this.tail.rotation.x = Math.sin(g.now * (this.pet > 0 ? 22 : 6)) * (this.pet > 0 ? 0.9 : 0.25);
  }
}

class Match {
  constructor(g, x, z, face) {
    this.g = g; this.x = x; this.z = z; this.face = face; this.group = new THREE.Group(); this.group.position.set(x, g.world.groundH(x, z), z); this.group.rotation.y = face; g.scene.add(this.group);
    const stump = new THREE.Mesh(merge([P(box(0.05, 0.7, 0.05), '#e5e7eb', [-0.1, 0.35, 0]), P(box(0.05, 0.7, 0.05), '#e5e7eb', [0, 0.35, 0]), P(box(0.05, 0.7, 0.05), '#e5e7eb', [0.1, 0.35, 0])]), MAT.solid); stump.position.set(0, 0, 4.5); this.group.add(stump);
    const mkKid = (z, shirt) => { const k = M.person({ kind: 'shirt', shirt, age: 0 }); k.scale.setScalar(0.78); k.position.set(0, 0, z); this.group.add(k); return k; };
    this.bat = mkKid(3.7, '#2563eb'); this.bowler = mkKid(-4.0, '#dc2626'); this.field = mkKid(9, '#16a34a'); this.field.position.x = 3;
    this.bat.rotation.y = Math.PI; this.field.rotation.y = Math.PI;
    const bt = new THREE.Mesh(merge([P(box(0.1, 0.55, 0.02), '#b7791f', [0, 0, 0]), P(cyl(0.015, 0.015, 0.2, 5), '#4b5563', [0, 0.35, 0])]), MAT.solid); const hand = People.bone(this.bat, 'Bip01_R_Hand'); if (hand) { bt.scale.setScalar(105); bt.position.set(6, 0, 4); bt.rotation.set(0, 0, 1.2); hand.add(bt); } else { bt.position.set(0.3, -0.65, 0.2); this.bat.armR.add(bt); }
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.5 })); this.group.add(this.ball);
    this.t = 0; this.cycle = 3.4; this.runs = 0; this.shot = 0; this.hit = false; this.cool = 0;
  }
  update(dt, p) {
    const d = Math.hypot(p.x - this.x, p.z - this.z); this.group.visible = d < 200; if (!this.group.visible) return;
    this.cool = Math.max(0, this.cool - dt); this.t += dt; const ph = (this.t % this.cycle) / this.cycle;
    if (ph < 0.05 && this.shot === 0) { this.hit = Math.random() < 0.5; this.shot = 1; }
    if (ph > 0.5) this.shot = 0;
    const by = (z0, z1, t) => { const k = clamp(t, 0, 1); return [z0 + (z1 - z0) * k, 0.2 + Math.sin(Math.PI * Math.min(1, k * 1.3)) * 0.6 * (1 - k * 0.3)]; };
    if (ph < 0.4) { const [z, y] = by(-3.7, 3.7, ph / 0.4); this.ball.position.set(0, y + 0.3, z); this.bowler.armR.rotation.x = -3.0 + ph / 0.4 * 2.6; }
    else if (this.hit) { const k = (ph - 0.4) / 0.6; this.ball.position.set(k * 7, 0.4 + Math.sin(Math.PI * k) * 3.2, 3.7 + k * 12); }
    else { const k = (ph - 0.4) / 0.2; this.ball.position.set(0, 0.2 * (1 - clamp(k, 0, 1)), clamp(3.7 + k * 0.6, 3.7, 4.3)); if (k > 1) this.ball.position.y = -5; }
    this.bat.armR.rotation.x = ph > 0.38 && ph < 0.5 ? -1.6 + (ph - 0.38) / 0.12 * 2.2 : -0.2;
    if (d < 6 && !this.g.car) this.g.hint('F  bat a few overs with the boys', 0.2);
  }
  interact() {
    const p = this.g.player; if (this.g.car || Math.hypot(p.x - this.x, p.z - this.z) > 6) return false;
    if (this.cool > 0) { this.g.hint('The boys are fetching the ball...', 1.2); return true; }
    this.cool = 6; const r = pick([0, 0, 1, 1, 2, 4, 4, 6, 'OUT']), g = this.g;
    if (r === 'OUT') g.toast('BOWLED!', 'Out first ball. The boys will tell the whole gully.'); else { this.runs += r; g.toast(r === 6 ? 'SIXER!' : r === 4 ? 'FOUR!' : r ? `${r} RUN${r > 1 ? 'S' : ''}` : 'DOT BALL', r ? `+₹${r * 5} from the pot · gully total ${this.runs}` : 'Good length, no run.'); if (r) g.addMoney(r * 5); }
    g.audio.cheer?.(r === 6 ? 1.2 : 0.6); return true;
  }
}

export class Extras {
  constructor(g) {
    this.g = g; this.dogs = []; this.matches = []; this.rec = null;
    const w = g.world, c = w.pois['Karkala Bus Stand'] || [0, 0], roads = w.map.roads.filter(r => r.cls !== 'track' && r.w >= 4);
    for (let tries = 0, n = 0; tries < 800 && n < 22; tries++) {
      const rd = pick(roads), i = Math.floor(Math.random() * (rd.pts.length - 1)), [ax, az] = rd.pts[i], [bx, bz] = rd.pts[i + 1], L = Math.hypot(bx - ax, bz - az) || 1, t = Math.random(), x0 = ax + (bx - ax) * t, z0 = az + (bz - az) * t;
      if (Math.hypot(x0 - c[0], z0 - c[1]) > 900) continue; const s = Math.random() < 0.5 ? 1 : -1, o = rd.w / 2 + 2.4, x = x0 - (bz - az) / L * o * s, z = z0 + (bx - ax) / L * o * s;
      if (w.blocked(x, z, 0.5) || w.inWater(x, z) || w.groundH(x, z) > 2 || w.roadClearance(x, z, 0) < 0.5) continue; this.dogs.push(new Dog(g, x, z)); if (Math.random() < 0.4) this.dogs.push(new Dog(g, x + 1.2, z + 0.8)); n++;
    }
    for (const name of ['Gandhi Maidan', 'Swaraj Maidan']) { const p = w.pois[name]; if (!p) continue; for (let k = 0; k < 40; k++) { const x = p[0] + rnd(-30, 30), z = p[1] + rnd(-30, 30); if (!w.blocked(x, z, 6) && !w.inWater(x, z) && w.roadClearance(x, z, 0) > 8 && w.groundH(x, z) < 1) { this.matches.push(new Match(g, x, z, rnd(0, 6.28))); break; } } }
  }
  update(dt) {
    const p = this.g.carOrPlayer(); for (const d of this.dogs) d.update(dt, p); for (const m of this.matches) m.update(dt, p);
    if (!this.g.car) { const q = this.g.player; for (const d of this.dogs) if (d.mesh.visible && Math.hypot(d.x - q.x, d.z - q.z) < 2.4) { this.g.hint('F  pet the dog', 0.2); break; } }
    if (this.rec) { this.rec.t -= dt; if (this.rec.t <= 0) this.clip(); }
  }
  interact() {
    const g = this.g; if (g.car) return false; const q = g.player;
    for (const m of this.matches) if (m.interact()) return true;
    let best = null, bd = 2.6; for (const d of this.dogs) { const k = Math.hypot(d.x - q.x, d.z - q.z); if (d.mesh.visible && k < bd) { bd = k; best = d; } }
    if (!best) return false;
    best.pet = 4; best.sit = true; best.t = 5; g.player.hp = Math.min(100, g.player.hp + 4); g.toast('GOOD BOY', pick(['A stray from Bunts Hostel road. He has not paid rent.', 'The tail says everything.', 'Tindi-hotel dogs know every regular by name.', '+4 health. Dogs are free therapy.'])); this.bark(true); return true;
  }
  bark(soft) {
    const a = this.g.audio, c = a.ctx; if (!c || !a.on) return; const t = c.currentTime, o = c.createOscillator(), gn = c.createGain(), f = c.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(soft ? 520 : 380, t); o.frequency.exponentialRampToValueAtTime(soft ? 340 : 210, t + 0.14); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1.2;
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(soft ? 0.12 : 0.3, t + 0.02); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); o.connect(f); f.connect(gn); gn.connect(a.master); o.start(t); o.stop(t + 0.2);
  }
  /** B: start/stop a 15 s clip of the game (with sound) and save it as a .webm file. */
  clip() {
    const g = this.g;
    if (this.rec) { try { this.rec.mr.stop(); } catch (e) { } return; }
    if (!window.MediaRecorder || !g.renderer.domElement.captureStream) { g.toast('CLIP', 'This browser cannot record clips.'); return; }
    const stream = g.renderer.domElement.captureStream(30); try { g.audio.recDest?.stream.getAudioTracks().forEach(t => stream.addTrack(t)); } catch (e) { }
    const type = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t)) || '', chunks = [];
    const mr = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 5e6 } : { videoBitsPerSecond: 5e6 });
    mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    mr.onstop = () => { this.rec = null; document.getElementById('menubtn')?.classList.remove('rec'); const url = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' })), a = document.createElement('a'); a.href = url; a.download = 'namma-karkala-clip.webm'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 20000); g.toast('CLIP SAVED', 'Ready for the family group.'); };
    mr.start(500); this.rec = { mr, t: 15 }; document.getElementById('menubtn')?.classList.add('rec'); g.toast('RECORDING', 'Press B again to stop. Auto-stops at 15 seconds.');
  }
}
