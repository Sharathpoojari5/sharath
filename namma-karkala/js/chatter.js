// Street life: pairs of neighbours chatting in a Hinglish / Kannada / Tulu mix (speech bubbles over their heads),
// and the road-rage system: drive in the middle of the road, nearly run people over, block traffic or lean on the horn
// and whoever is closest shouts at you ("Nikk kann ijjaa?", "Can't you see?", "Road tera baap ka hai kya?").
import * as THREE from './three.module.min.js';
import * as M from './models.js';
import { Voice } from './voice.js';
import { CHATTER } from './story.js';

const LOOKS = {
  UNCLE: () => ({ kind: pickOf(['lungi', 'shirt']), shirt: pickOf(['#f8fafc', '#fde68a', '#93c5fd']), lungi: '#f8fafc', skin: pickOf(['#8d5a3b', '#a8703f']) }),
  AUNTY: () => ({ kind: 'saree', saree: pickOf(['#db2777', '#16a34a', '#7c3aed', '#f59e0b']) }),
  STUDENT: () => ({ kind: 'shirt', shirt: pickOf(['#2563eb', '#dc2626', '#0f766e', '#7c3aed']), pants: '#1e3a8a' }),
  BOY: () => ({ kind: 'shirt', shirt: pickOf(['#16a34a', '#facc15', '#ef4444']), pants: '#111827' }),
  FISHERMAN: () => ({ kind: 'lungi', shirt: '#94a3b8', lungi: '#1e3a8a', cap: '#f8fafc', skin: '#6e4428' }),
  CONSTABLE: () => ({ kind: 'shirt', shirt: '#a8a29e', pants: '#78716c', cap: '#78716c', skin: '#8d5a3b' }),
  VENDOR: () => ({ kind: 'shirt', shirt: '#f8fafc', pants: '#1f2937', cap: '#f8fafc' }),
  DRIVER: () => ({ kind: 'shirt', shirt: '#6b7280', pants: '#374151', skin: '#7b4b2c' }),
};
const pickOf = (a) => a[Math.floor(Math.random() * a.length)];

export function bubble(text, tint = '#ffffff') {
  const c = document.createElement('canvas'), W = 768, H = 150; c.width = W; c.height = H; const x = c.getContext('2d');
  x.font = '700 38px "Noto Sans Kannada",system-ui,sans-serif';
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (x.measureText(t).width > W - 70 && cur) { lines.push(cur); cur = w; } else cur = t; } lines.push(cur);
  const n = Math.min(2, lines.length), h = 36 + n * 46; x.fillStyle = 'rgba(255,255,255,.96)'; x.strokeStyle = '#111'; x.lineWidth = 5;
  x.beginPath(); x.roundRect(10, 8, W - 20, h, 26); x.fill(); x.stroke(); x.beginPath(); x.moveTo(W / 2 - 18, h + 6); x.lineTo(W / 2, h + 32); x.lineTo(W / 2 + 18, h + 6); x.fill();
  x.fillStyle = '#111'; x.textAlign = 'center'; x.textBaseline = 'middle'; lines.slice(0, 2).forEach((l, i) => x.fillText(l, W / 2, 8 + 26 + i * 46 + 12));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); sp.scale.set(5.6, 5.6 * H / W, 1); sp.center.set(0.5, 0); sp.renderOrder = 10; return sp;
}

export class Chatter {
  constructor(game) {
    this.g = game; this.groups = []; this.cd = 3; this.blockT = 0; this.horns = []; this.bubbles = []; this.callIds = CHATTER.calls || [];
    const w = game.world;
    for (const cv of CHATTER.convos || []) {
      let base = cv.poi === 'MARKET' ? (w.marketRoad ? w.marketRoad.pts[Math.floor(w.marketRoad.pts.length / 2)] : null) : (w.pois[cv.poi] || null); if (!base) continue;
      const rd = w.nearestRoad(base[0], base[1], 160); if (!rd) continue;
      const nx = -rd.dirz, nz = rd.dirx, sgn = ((base[0] - rd.x) * nx + (base[1] - rd.z) * nz) >= 0 ? 1 : -1; let spot = null;
      for (const d of [3.2, 4.4, 5.8, 7.5]) for (const s of [sgn, -sgn]) { const x = rd.x + nx * s * (rd.w / 2 + d), z = rd.z + nz * s * (rd.w / 2 + d); if (!spot && !w.blocked(x, z, 1.1) && !w.inWater(x, z) && w.roadClearance(x, z) > 0.8) spot = [x, z, rd.dirx, rd.dirz]; }
      if (!spot) continue;
      const people = cv.who.map((k, i) => { const m = M.person((LOOKS[k] || LOOKS.UNCLE)()); const o = (i ? 0.62 : -0.62), x = spot[0] + spot[2] * o, z = spot[1] + spot[3] * o; m.position.set(x, w.groundH(x, z), z); game.scene.add(m); m.rotation.y = Math.atan2(spot[2] * -o, spot[3] * -o) ; return m; });
      const lookAt = (a, b) => { a.rotation.y = Math.atan2(b.position.x - a.position.x, b.position.z - a.position.z); }; lookAt(people[0], people[1]); lookAt(people[1], people[0]);
      w.addObs({ x: spot[0], z: spot[1], r: 1.2 });
      this.groups.push({ cv, people, x: spot[0], z: spot[1], i: 0, t: Math.random() * 3, wait: 0, bub: null, ph: Math.random() * 6 });
    }
  }
  say(mesh, id, sec = 3.4, h = 2.1, k = 1) {
    const sp = bubble(Voice.text(id)); sp.scale.multiplyScalar(k); sp.position.set(0, h, 0); mesh.add(sp); this.bubbles.push({ sp, mesh, t: sec });
  }
  /** A driver or pedestrian shouts at the player. kind: wrong | hit | near | block | horn | cow */
  rage(kind, who) {
    const ids = (CHATTER.rage || {})[kind]; if (!ids || !who || !who.mesh) return; const g = this.g;
    if (this.cd > 0 && kind !== 'hit') return; this.cd = kind === 'hit' ? 4 : 7;
    const id = ids[Math.floor(Math.random() * ids.length)];
    this.say(who.mesh, id, 3.2, who.def ? (who.def.H || 2.3) + 0.4 : 2.1, who.def ? 1.9 : 1.3); g.sayQ(id, 3);
    if (who.def && g.audio.horn) g.audio.horn(who.kind || 'car', 0.2);
  }
  horn() { const now = this.g.now; this.horns = this.horns.filter(t => now - t < 6); this.horns.push(now); if (this.horns.length >= 5) { this.horns = []; const w = this.nearestAi(30) || this.nearestPed(20); if (w) this.rage('horn', w); } }
  nearestAi(r) { const c = this.g.car; if (!c) return null; let b = null, bd = r; for (const o of this.g.vehicles) if (o !== c && o.driver === 'ai') { const d = Math.hypot(o.x - c.x, o.z - c.z); if (d < bd) { bd = d; b = o; } } return b; }
  nearestPed(r) { const p = this.g.carOrPlayer(); let b = null, bd = r; for (const q of this.g.peds) if (q.state !== 'down') { const d = Math.hypot(q.x - p.x, q.z - p.z); if (d < bd) { bd = d; b = q; } } return b; }
  update(dt) {
    const g = this.g, p = g.carOrPlayer(), w = g.world; this.cd -= dt;
    for (let i = this.bubbles.length - 1; i >= 0; i--) { const b = this.bubbles[i]; b.t -= dt; b.sp.material.opacity = Math.min(1, b.t * 2); if (b.t <= 0) { b.mesh.remove(b.sp); b.sp.material.map.dispose(); b.sp.material.dispose(); this.bubbles.splice(i, 1); } }
    // neighbours chatting
    for (const gr of this.groups) {
      const d = Math.hypot(gr.x - p.x, gr.z - p.z), vis = d < 200; gr.people.forEach(m => m.visible = vis); if (!vis) continue;
      gr.ph += dt; gr.people.forEach((m, k) => { const talking = gr.i % 2 === k && gr.wait <= 0; m.rotation.z = Math.sin(gr.ph * (talking ? 4 : 1.2) + k) * (talking ? 0.07 : 0.02); m.position.y = w.groundH(m.position.x, m.position.z) + (talking ? Math.abs(Math.sin(gr.ph * 5)) * 0.03 : 0); });
      if (d > 15 || g.cine.active) continue;
      gr.t -= dt; if (gr.t > 0) continue;
      if (gr.wait > 0) { gr.wait -= dt; if (gr.wait <= 0) gr.i = 0; gr.t = 0.5; continue; }
      const id = gr.cv.lines[gr.i]; this.say(gr.people[gr.i % 2], id, 3.6); gr.i++; gr.t = 3.8;
      if (gr.i >= gr.cv.lines.length) { gr.wait = 12 + Math.random() * 8; gr.t = 0.5; gr.i = gr.cv.lines.length; }
      if (gr.wait > 0) gr.i = 0;
    }
    // road rage
    const c = g.car; if (!c || g.cine.active || g.dlg) { this.blockT = 0; return; }
    const sp = Math.abs(c.v), rd = w.nearestRoad(c.x, c.z, 12);
    if (rd && rd.d < 1.1 && rd.w >= 5 && sp > 3) {
      const o = g.vehicles.find(o => o !== c && o.driver === 'ai' && (() => { const dx = o.x - c.x, dz = o.z - c.z, a = dx * c.fx + dz * c.fz, lat = Math.abs(dx * c.fz - dz * c.fx); return a > 6 && a < 32 && lat < 6; })());
      if (o) this.rage('wrong', o);
    }
    if (sp > 7) for (const q of g.peds) { if (q.state === 'down') continue; const dx = q.x - c.x, dz = q.z - c.z, a = dx * c.fx + dz * c.fz, lat = Math.abs(dx * c.fz - dz * c.fx); if (a > 0.5 && a < 5 && lat > 0.9 && lat < 2.4) { this.rage('near', q); break; } }
    if (sp < 0.8 && rd && rd.d < rd.w / 2) this.blockT += dt; else this.blockT = 0;
    if (this.blockT > 3.5) { this.blockT = 0; const o = g.vehicles.find(o => o !== c && o.driver === 'ai' && (() => { const dx = o.x - c.x, dz = o.z - c.z; return Math.hypot(dx, dz) < 13 && (dx * c.fx + dz * c.fz) < 0; })()); if (o) this.rage('block', o); }
  }
}
