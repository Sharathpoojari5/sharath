// Everything that moves: the player on foot, vehicles (player, traffic, police), pedestrians and cows.
import * as THREE from './three.module.min.js';
import * as M from './models.js';

const TAU = Math.PI * 2;
export const wrap = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pickW = (items) => { let s = 0; for (const [, w] of items) s += w; let r = Math.random() * s; for (const [k, w] of items) { if ((r -= w) <= 0) return k; } return items[0][0]; };

/* ================================================================== vehicles */
export class Vehicle {
  constructor(g, kind, x, z, h, o = {}) {
    this.g = g; this.kind = kind;
    const { group, def, wheels, flash } = M.vehicle(kind, o);
    this.mesh = group; this.def = def; this.wheels = wheels; this.flash = flash; this.spin = 0; g.scene.add(group);
    this.x = x; this.z = z; this.h = h; this.v = 0; this.st = 0; this.y = g.world.groundH(x, z);
    this.driver = o.driver || null;      // 'player' | 'ai' | 'police' | 'thief' | null (parked)
    this.r = def.W / 2 + 0.15; this.hp = 100; this.tag = o.tag || null;
    this.n = Math.max(1, Math.round(def.L / def.W)); this.lastHit = 0; this.honkT = 0; this.stuck = 0;
    if (this.driver === 'ai' || this.driver === 'police' || this.driver === 'thief') this.addDriverModel();
    this.sync();
  }
  addDriverModel(isPlayer = false) {
    if (this.dm || !this.def.open) return;
    const p = isPlayer ? M.person({ kind: 'shirt', real: 'Male_Adult_08', shirt: '#0ea5e9', pants: '#1e293b', skin: '#8d5a3b' })
      : M.person({ kind: 'shirt', shirt: this.driver === 'thief' ? '#111827' : undefined, cap: this.driver === 'thief' ? '#dc2626' : undefined });
    p.position.set(...this.def.seat); p.position.y += this.def.two ? -0.25 : -0.4;
    if (p.legL) { p.legL.rotation.x = -1.2; p.legR.rotation.x = -1.2; }
    if (p.armL) { p.armL.rotation.x = -1.15; p.armR.rotation.x = -1.15; }
    if (this.kind === 'cycle') p.position.y += 0.12;
    this.mesh.add(p); this.dm = p;
  }
  removeDriverModel() { if (this.dm) { this.mesh.remove(this.dm); this.dm = null; } }
  get fx() { return Math.sin(this.h); } get fz() { return Math.cos(this.h); }
  dispose() { this.g.scene.remove(this.mesh); this.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }

  /** inp: {thr:-1..1, steer:-1..1 (+ = right), hand:bool} */
  physics(dt, inp) {
    const d = this.def, w = this.g.world;
    let v = this.v;
    if (inp.thr > 0) v += d.acc * inp.thr * dt * (v < 0 ? 2.5 : 1) * (1 - 0.6 * clamp(v / d.maxV, 0, 1) ** 2);
    else if (inp.thr < 0) v -= (v > 0.3 ? d.acc * 2.4 : d.acc * 0.6) * dt * -inp.thr;
    else v -= Math.sign(v) * Math.min(Math.abs(v), (1.2 + Math.abs(v) * 0.08) * dt);
    if (inp.hand) v -= Math.sign(v) * Math.min(Math.abs(v), 10 * dt);
    // slope: rolling down Bahubali betta
    const hb = w.groundH(this.x - this.fx * d.L / 2, this.z - this.fz * d.L / 2), hf = w.groundH(this.x + this.fx * d.L / 2, this.z + this.fz * d.L / 2);
    const slope = (hf - hb) / d.L; v -= slope * 9.8 * 0.6 * dt;
    v = clamp(v, -d.maxV * 0.32, d.maxV * (inp.boost ? 1.15 : 1));
    this.st += (inp.steer - this.st) * Math.min(1, dt * (d.two ? 9 : 7));
    const sp = Math.abs(v), yaw = -this.st * d.steer * clamp(sp / 4.5, 0, 1) * Math.sign(v) * (1 - 0.45 * clamp(sp / d.maxV, 0, 1)) * (inp.hand && sp > 4 ? 1.6 : 1);
    this.h = wrap(this.h + yaw * dt);
    this.x += Math.sin(this.h) * v * dt; this.z += Math.cos(this.h) * v * dt; this.v = v;
    this.pitch = Math.atan2(hb - hf, d.L); this.y = (hb + hf) / 2;
    return this.collide();
  }
  /** Push out of static obstacles and other vehicles. Returns impact speed (0 = no hit). */
  collide() {
    const d = this.def, w = this.g.world; let px = 0, pz = 0;
    for (let i = 0; i < this.n; i++) {
      const off = this.n === 1 ? 0 : -d.L / 2 + this.r + (i * (d.L - 2 * this.r)) / (this.n - 1);
      const cx = this.x + this.fx * off, cz = this.z + this.fz * off, p = w.collide(cx, cz, this.r);
      px += p.x; pz += p.z;
    }
    for (const o of this.g.vehicles) {
      if (o === this || Math.abs(o.x - this.x) > 14 || Math.abs(o.z - this.z) > 14) continue;
      for (let i = 0; i < this.n; i++) for (let j = 0; j < o.n; j++) {
        const a = this.n === 1 ? 0 : -d.L / 2 + this.r + (i * (d.L - 2 * this.r)) / (this.n - 1), b = o.n === 1 ? 0 : -o.def.L / 2 + o.r + (j * (o.def.L - 2 * o.r)) / (o.n - 1);
        const ax = this.x + this.fx * a, az = this.z + this.fz * a, bx = o.x + o.fx * b, bz = o.z + o.fz * b, dx = ax - bx, dz = az - bz, D = Math.hypot(dx, dz), R = this.r + o.r;
        if (D < R && D > 1e-3) {
          const share = o.def.L / (o.def.L + d.L), m = (R - D) / D;
          px += dx * m * share; pz += dz * m * share;
          if (this.driver === 'player' && Math.abs(this.v) > 7 && this.g.now - this.lastHit > 0.8) this.g.onCrash(this, o);
        }
      }
    }
    const b = this.g.world.ext; this.x = clamp(this.x + px, b.x0, b.x1); this.z = clamp(this.z + pz, b.z0, b.z1);
    const pl = Math.hypot(px, pz); if (pl < 0.01) return 0;
    const nx = px / pl, nz = pz / pl, into = -(this.fx * nx + this.fz * nz) * this.v;
    if (into > 0.5) { const before = this.v; this.v *= 0.3; this.lastHit = this.g.now; return Math.abs(before - this.v); }
    return 0;
  }
  sync() {
    const m = this.mesh; m.position.set(this.x, this.y + (this.sink || 0), this.z);
    if (this.wheels) { this.spin += (this.v / this.def.wr) * (this.g.dtLast || 0.016); for (const w of this.wheels) w.rotation.x = this.spin; }
    if (this.flash) this.flash.visible = (this.driver === 'police' && this.g.level >= 1) || (this.kind === 'ambulance' && this.driver) ? ((this.g.now * 3) | 0) % 2 === 0 : false;
    if (this.dm && this.kind === 'cycle' && this.dm.legL) { const ph = this.spin * 0.8; this.dm.legL.rotation.x = -1.0 + Math.sin(ph) * 0.5; this.dm.legR.rotation.x = -1.0 - Math.sin(ph) * 0.5; }
    m.rotation.order = 'YXZ'; m.rotation.y = this.h; m.rotation.x = this.pitch || 0;
    m.rotation.z = this.def.two ? -this.st * clamp(Math.abs(this.v) / 10, 0, 1) * 0.38 : 0;
  }

  /* ------------------------------ traffic AI: drive on the left along the road graph */
  aiInit(from, to) { this.a = from; this.b = to; this.edgeW = (from.adj.find(e => e.n === to) || { w: 6 }).w; }
  aiNext() {
    const opts = this.b.adj.filter(e => e.n !== this.a && (!this.def.big || e.w >= 7));
    const list = opts.length ? opts : this.b.adj;
    let e = null;
    if (this.route) { const i = this.route.indexOf(this.b); if (i >= 0 && i + 1 < this.route.length) e = this.b.adj.find(x => x.n === this.route[i + 1]) || null; }
    if (!e) e = pickW(list.map(e => [e, e.w >= 9 ? 3 : e.w >= 7 ? 1.6 : 1]));
    this.a = this.b; this.b = e.n; this.edgeW = e.w;
  }
  aiTarget() {
    const ux = this.b.x - this.a.x, uz = this.b.z - this.a.z, L = Math.hypot(ux, uz) || 1, lo = this.edgeW / 4 + 0.2;
    return [this.b.x + (uz / L) * lo, this.b.z + (-ux / L) * lo, L];
  }
  ai(dt, speedOverride) {
    if (!this.a) return this.physics(dt, { thr: 0, steer: 0, hand: true });
    let [tx, tz] = this.aiTarget();
    if (Math.hypot(tx - this.x, tz - this.z) < 3.5 + Math.abs(this.v) * 0.25) { this.aiNext(); [tx, tz] = this.aiTarget(); }
    const want = Math.atan2(tx - this.x, tz - this.z), diff = wrap(want - this.h);
    if (this.revT > 0) { this.revT -= dt; return this.physics(dt, { thr: -1, steer: this.escape || 1, hand: false }); }
    const cap = this.edgeW >= 9 ? 20 : this.edgeW >= 7 ? 13 : 9;
    const base = speedOverride ? Math.min(speedOverride, cap) : (this.def.big ? 10 : this.edgeW >= 9 ? 12.5 : this.edgeW >= 7 ? 9.5 : 7);
    let target = Math.min(base, this.def.maxV * (speedOverride ? 0.95 : 0.8)) * (1 - 0.65 * clamp(Math.abs(diff) / 1.2, 0, 1));
    const block = this.g.obstacleAhead(this, 5 + Math.abs(this.v) * 1.3);
    if (!block && Math.abs(this.v) < 0.6 && speedOverride) { this.aiStuck = (this.aiStuck || 0) + dt; if (this.aiStuck > 1.4) { this.aiStuck = 0; this.revT = 1.0; this.escape = wrap(want - this.h) > 0 ? -1 : 1; } } else this.aiStuck = Math.max(0, (this.aiStuck || 0) - dt);
    if (block) { target = block < 4 ? -1 : Math.min(target, (block - 4) * 0.8); if (this.g.now - this.honkT > 4 && block < 8) { this.honkT = this.g.now + Math.random() * 3; this.g.honked(this); } }
    const thr = target < 0 ? -1 : clamp((target - this.v) * 0.6, -1, 1);
    return this.physics(dt, { thr, steer: clamp(-diff * 2.2, -1, 1), hand: target < 0 && this.v > 0 });
  }
  /** Seek a point (police, thief escape) with whiskers at several distances, and reverse-and-turn recovery when jammed. */
  seek(dt, tx, tz, speed, flee = false) {
    let want = Math.atan2(tx - this.x, tz - this.z); if (flee) want = wrap(want + Math.PI);
    const w = this.g.world, look = 7 + Math.abs(this.v) * 0.6;
    const probe = (a) => { for (const d of [2.4, 4.2, 6.5, look]) if (w.blocked(this.x + Math.sin(a) * d, this.z + Math.cos(a) * d, this.r + 0.25)) return true; return false; };
    if (this.revT > 0) {                                        // reversing out of a jam, steering away
      this.revT -= dt; return this.physics(dt, { thr: -1, steer: this.escape || 1, hand: false });
    }
    let blocked = false;
    if (probe(want)) { blocked = true; for (const k of [0.45, -0.45, 0.9, -0.9, 1.4, -1.4]) if (!probe(want + k)) { want += k; blocked = false; break; } }
    const diff = wrap(want - this.h);
    if (Math.abs(this.v) < 0.8) this.stuck = (this.stuck || 0) + dt; else this.stuck = Math.max(0, (this.stuck || 0) - dt * 2);
    if (this.stuck > 0.9) { this.stuck = 0; this.revT = 0.9; this.escape = diff > 0 ? -1 : 1; return this.physics(dt, { thr: -1, steer: this.escape, hand: false }); }
    const target = speed * (1 - 0.5 * clamp(Math.abs(diff) / 1.4, 0, 1)) * (blocked ? 0.35 : 1);
    return this.physics(dt, { thr: clamp((target - this.v) * 0.5, -1, 1), steer: clamp(-diff * 2.4, -1, 1), hand: Math.abs(diff) > 1.4 && this.v > 8 });
  }
}

/* ================================================================== people */
export class Ped {
  constructor(g, x, z, o = {}) {
    this.g = g; this.mesh = M.person(o); g.scene.add(this.mesh);
    this.x = x; this.z = z; this.h = rnd(0, TAU); this.y = g.world.groundH(x, z); this.vy = 0;
    this.speed = rnd(1.1, 1.6); this.state = 'walk'; this.t = 0; this.phase = rnd(0, 6); this.side = Math.random() < 0.5 ? 1 : -1;
    this.idle = !!o.idle;
  }
  dispose() { this.g.scene.remove(this.mesh); }
  pathInit(a, b) { this.a = a; this.b = b; this.ew = (a.adj.find(e => e.n === b) || { w: 6 }).w; }
  target() { const ux = this.b.x - this.a.x, uz = this.b.z - this.a.z, L = Math.hypot(ux, uz) || 1, o = this.ew / 2 + 1.4; return [this.b.x + (uz / L) * o * this.side, this.b.z + (-ux / L) * o * this.side]; }
  knock(dx, dz, power) {
    this.state = 'down'; this.t = 0; this.vx = dx * power * 0.6; this.vz = dz * power * 0.6; this.vy = 2 + power * 0.25; this.spin = rnd(-6, 6);
  }
  update(dt) {
    const w = this.g.world, m = this.mesh;
    if (this.state === 'down') {
      this.t += dt; this.vy -= 9.8 * dt; this.x += this.vx * dt; this.z += this.vz * dt; this.y += this.vy * dt;
      const gh = w.groundH(this.x, this.z); if (this.y < gh) { this.y = gh; this.vx *= 0.5; this.vz *= 0.5; this.vy = 0; }
      m.rotation.set(-Math.PI / 2 * Math.min(1, this.t * 3), this.h, 0); m.position.set(this.x, this.y + 0.25, this.z);
      if (this.t > 3.2) { this.state = 'flee'; this.t = 0; m.rotation.set(0, this.h, 0); this.g.shout(this); }
      return;
    }
    let spd = this.state === 'flee' ? 4.2 : this.idle ? 0 : this.speed;
    if (this.state === 'flee') { this.t += dt; if (this.t > 5) this.state = 'walk'; }
    if (this.dodge > 0) { this.dodge -= dt; spd = 3.5; }
    if (spd > 0 && this.a) {
      const [tx, tz] = this.target();
      if (Math.hypot(tx - this.x, tz - this.z) < 1.5) { const opts = this.b.adj.filter(e => e.n !== this.a); const e = (opts.length ? opts : this.b.adj)[Math.floor(Math.random() * (opts.length || this.b.adj.length))]; this.a = this.b; this.b = e.n; this.ew = e.w; }
      const [ux, uz] = this.target(); const want = Math.atan2(ux - this.x, uz - this.z); this.h += wrap(want - this.h) * Math.min(1, dt * 5);
      const nx = this.x + Math.sin(this.h) * spd * dt, nz = this.z + Math.cos(this.h) * spd * dt;
      const p = w.collide(nx, nz, 0.3); this.x = nx + p.x; this.z = nz + p.z;
    }
    this.y = w.groundH(this.x, this.z);
    this.phase += dt * spd * 4.2; const sw = spd > 0 ? Math.sin(this.phase) * 0.6 : 0;
    if (m.legL) { m.legL.rotation.x = sw; m.legR.rotation.x = -sw; }
    if (m.armL) { m.armL.rotation.x = -sw * 1.1; m.armR.rotation.x = sw * 1.1; }
    m.position.set(this.x, this.y, this.z); m.rotation.y = this.h;
  }
}

export class Cow {
  constructor(g, x, z) { this.g = g; this.mesh = M.cow(); g.scene.add(this.mesh); this.x = x; this.z = z; this.h = rnd(0, TAU); this.t = rnd(0, 8); this.moving = false; this.hit = 0; }
  dispose() { this.g.scene.remove(this.mesh); }
  update(dt) {
    this.t -= dt;
    if (this.t < 0) { this.moving = !this.moving; this.t = this.moving ? rnd(3, 7) : rnd(4, 12); if (this.moving) this.h += rnd(-1.2, 1.2); }
    if (this.hit > 0) { this.hit -= dt; this.moving = true; }
    if (this.moving) {
      const s = this.hit > 0 ? 2.5 : 0.55, nx = this.x + Math.sin(this.h) * s * dt, nz = this.z + Math.cos(this.h) * s * dt;
      const rd = this.g.world.nearestRoad(nx, nz, 20);
      if (!rd || rd.d > rd.w / 2 + 3 || this.g.world.blocked(nx, nz, 0.9)) this.h += Math.PI * 0.7; else { this.x = nx; this.z = nz; }
    }
    this.mesh.position.set(this.x, this.g.world.groundH(this.x, this.z), this.z); this.mesh.rotation.y = this.h;
  }
}

/* ================================================================== the player on foot */
export class Player {
  constructor(g, x, z) {
    this.g = g; this.mesh = M.person({ kind: 'shirt', real: 'Male_Adult_08', shirt: '#0ea5e9', pants: '#1e293b', skin: '#8d5a3b' }); g.scene.add(this.mesh);
    this.x = x; this.z = z; this.y = 0; this.vy = 0; this.h = Math.PI; this.hp = 100; this.phase = 0; this.down = 0; this.vehicle = null; this.lastHurt = -99;
  }
  update(dt, inp, camYaw) {
    const w = this.g.world, m = this.mesh;
    if (this.down > 0) { this.down -= dt; m.rotation.set(-1.3, this.h, 0); m.position.set(this.x, w.groundH(this.x, this.z) + 0.25, this.z); return; }
    let mx = inp.x, mz = inp.y; const L = Math.hypot(mx, mz);
    const run = inp.run ? (this.g.cheats.fast ? 16 : 8.5) : 4.4;
    if (L > 0.01) {
      mx /= L; mz /= L;
      const fx = Math.sin(camYaw), fz = Math.cos(camYaw), rx = -fz, rz = fx;
      const dx = fx * mz + rx * mx, dz = fz * mz + rz * mx;
      const want = Math.atan2(dx, dz), dh = wrap(want - this.h) * Math.min(1, dt * 12); this.turn = -dh * 2; this.h += dh;
      let nx = this.x + dx * run * dt, nz = this.z + dz * run * dt;
      const p = w.collide(nx, nz, 0.35); nx += p.x; nz += p.z;
      for (const v of this.g.vehicles) { const dd = Math.hypot(v.x - nx, v.z - nz); if (dd < v.def.L / 2 + 0.6) { for (let i = 0; i < v.n; i++) { const off = v.n === 1 ? 0 : -v.def.L / 2 + v.r + (i * (v.def.L - 2 * v.r)) / (v.n - 1), cx = v.x + v.fx * off, cz = v.z + v.fz * off, d2 = Math.hypot(nx - cx, nz - cz), R = v.r + 0.35; if (d2 < R && d2 > 1e-3) { nx = cx + (nx - cx) / d2 * R; nz = cz + (nz - cz) / d2 * R; } } } }
      if (!w.inWater(nx, nz)) { const b = w.ext; this.x = clamp(nx, b.x0, b.x1); this.z = clamp(nz, b.z0, b.z1); }
      this.phase += dt * run * 2.2;
    } else { this.phase = 0; this.turn = 0; }
    const gh = w.groundH(this.x, this.z);
    if (inp.jump && this.y <= gh + 0.01) this.vy = this.g.cheats.moon ? 9 : 5.2;
    this.vy -= (this.g.cheats.moon ? 2.5 : 14) * dt; this.y += this.vy * dt; if (this.y < gh) { this.y = gh; this.vy = 0; }
    const sw = Math.sin(this.phase) * (inp.run ? 0.9 : 0.6);
    if (m.legL) { m.legL.rotation.x = sw; m.legR.rotation.x = -sw; }
    if (m.armL) { const air = this.y > gh + 0.2; m.armL.rotation.x = air ? -2.4 : -sw * 1.1; m.armR.rotation.x = air ? -2.4 : sw * 1.1; m.armL.rotation.z = 0.06 + (air ? 0.4 : 0); m.armR.rotation.z = -0.06 - (air ? 0.4 : 0); }
    m.position.set(this.x, this.y, this.z); m.rotation.set(0, this.h, 0); m.rotation.z = (m.userData.lean = (m.userData.lean || 0) + ((this.turn || 0) * 0.25 - (m.userData.lean || 0)) * Math.min(1, dt * 8));
  }
}
