// Living Tulunadu culture: Pili Vesha (tiger dance), Yakshagana, a bhajane circle and Kordha Tukatta Kambala (the twin-buffalo
// mud race). Each show has its own place in town and its own hours, with performers, crowd, lights and music that gets
// louder as you walk or ride up to it. Everything is built from low-poly parts so it matches the rest of the game.
import * as THREE from './three.module.min.js';
import * as M from './models.js';

const { P, box, cyl, sph, cone, merge, MAT } = M;
const mk = (geo, mat = MAT.solid) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m; };
const grp = (...c) => { const g = new THREE.Group(); c.forEach(x => g.add(x)); return g; };
let seed = 91;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const TAU = Math.PI * 2;

/* ============================================================================ performers */
function tiger() {
  const g = M.person({ kind: 'shirt', shirt: '#f59e0b', pants: '#ea580c', skin: '#f59e0b', hair: '#f59e0b' });
  const p = [];
  for (let k = 0; k < 6; k++) { p.push(P(box(0.455, 0.04, 0.275), '#111', [0, 0.98 + k * 0.1, 0])); p.push(P(box(0.14, 0.035, 0.15), '#111', [-0.3, 0.98 + k * 0.1, 0], [0, 0, 0.06])); p.push(P(box(0.14, 0.035, 0.15), '#111', [0.3, 0.98 + k * 0.1, 0], [0, 0, -0.06])); }
  p.push(P(box(0.34, 0.32, 0.32), '#f59e0b', [0, 1.68, 0]), P(box(0.22, 0.14, 0.14), '#fff7ed', [0, 1.6, 0.2]), P(box(0.08, 0.05, 0.04), '#be123c', [0, 1.66, 0.275]),
    P(box(0.08, 0.06, 0.02), '#fff', [-0.09, 1.74, 0.165]), P(box(0.08, 0.06, 0.02), '#fff', [0.09, 1.74, 0.165]), P(box(0.035, 0.05, 0.02), '#111', [-0.09, 1.74, 0.175]), P(box(0.035, 0.05, 0.02), '#111', [0.09, 1.74, 0.175]),
    P(box(0.07, 0.11, 0.02), '#ef4444', [0, 1.5, 0.255]), P(cone(0.08, 0.14, 4), '#f59e0b', [-0.15, 1.88, 0]), P(cone(0.08, 0.14, 4), '#f59e0b', [0.15, 1.88, 0]), P(cone(0.04, 0.08, 4), '#fecdd3', [-0.15, 1.87, 0.03]), P(cone(0.04, 0.08, 4), '#fecdd3', [0.15, 1.87, 0.03]));
  for (const x of [-0.1, 0, 0.1]) p.push(P(box(0.035, 0.12, 0.02), '#111', [x, 1.82, 0.17])); for (const s of [-1, 1]) { p.push(P(box(0.04, 0.1, 0.02), '#111', [s * 0.17, 1.66, 0.165])); p.push(P(box(0.02, 0.05, 0.02), '#fff', [s * 0.05, 1.55, 0.26])); }
  p.push(P(box(0.5, 0.2, 0.3), '#7f1d1d', [0, 0.92, 0]));                // red-and-black shorts
  g.add(mk(merge(p)));
  const tail = grp(mk(merge([P(box(0.07, 0.07, 0.55), '#f59e0b', [0, 0.1, -0.28], [0.5, 0, 0]), P(box(0.075, 0.075, 0.12), '#111', [0, 0.28, -0.52], [0.5, 0, 0]), P(box(0.075, 0.075, 0.1), '#111', [0, 0.14, -0.3], [0.5, 0, 0])]))); tail.position.set(0, 0.95, -0.14); g.add(tail); g.tail = tail;
  return g;
}
function drummer(kind = 'tasa') {
  const g = M.person({ kind: 'lungi', shirt: pick(['#dc2626', '#facc15', '#16a34a']), lungi: '#f8fafc', skin: pick(['#8d5a3b', '#a8703f']), cap: '#dc2626' });
  const p = [P(cyl(0.24, 0.24, 0.1, 14), '#fde68a', [0, 1.0, 0.32], [Math.PI / 2, 0, 0]), P(cyl(0.255, 0.255, 0.06, 14), '#b91c1c', [0, 1.0, 0.3], [Math.PI / 2, 0, 0]), P(box(0.5, 0.04, 0.02), '#78350f', [0, 1.35, 0.14], [0, 0, 0.7])];
  if (kind === 'chende') { p.length = 0; p.push(P(cyl(0.16, 0.16, 0.5, 14), '#b45309', [0.05, 1.0, 0.34], [0, 0, 0]), P(cyl(0.17, 0.17, 0.03, 14), '#fef3c7', [0.05, 1.26, 0.34]), P(box(0.5, 0.04, 0.02), '#7f1d1d', [0, 1.35, 0.14], [0, 0, 0.7])); }
  g.add(mk(merge(p)));
  const st = grp(mk(merge([P(box(0.025, 0.025, 0.42), '#d6d3d1', [0, 0, 0.2])]))); st.position.set(0.22, 1.12, 0.36); g.add(st); g.stick = st;
  const st2 = st.clone(); st2.position.x = -0.18; g.add(st2); g.stick2 = st2;
  return g;
}
function yakshaDancer(face, dress, trim) {
  const g = M.person({ kind: 'saree', saree: dress, skin: face });
  const p = [
    P(box(0.5, 0.32, 0.3), trim, [0, 1.3, 0]), P(box(0.34, 0.05, 0.31), dress, [0, 1.12, 0]),
    P(cyl(0.32, 0.32, 0.05, 14), trim, [-0.4, 1.46, 0], [0, 0, 1.15]), P(cyl(0.32, 0.32, 0.05, 14), trim, [0.4, 1.46, 0], [0, 0, -1.15]),
    P(cyl(0.07, 0.07, 0.1, 8), trim, [-0.3, 1.2, 0]), P(cyl(0.07, 0.07, 0.1, 8), trim, [0.3, 1.2, 0]),
    P(cyl(0.22, 0.24, 0.1, 12), '#facc15', [0, 1.9, 0]), P(cyl(0.2, 0.22, 0.18, 12), '#dc2626', [0, 2.03, 0]), P(cyl(0.16, 0.2, 0.18, 12), '#facc15', [0, 2.2, 0]), P(cone(0.14, 0.4, 10), '#dc2626', [0, 2.5, 0]), P(sph(0.06), '#facc15', [0, 2.75, 0]),
    P(cyl(0.46, 0.46, 0.04, 22), '#f8fafc', [0, 2.0, -0.17], [Math.PI / 2, 0, 0]), P(cyl(0.5, 0.5, 0.03, 22), '#dc2626', [0, 2.0, -0.19], [Math.PI / 2, 0, 0]), P(cyl(0.4, 0.4, 0.03, 22), '#facc15', [0, 2.0, -0.2], [Math.PI / 2, 0, 0]),
    P(box(0.26, 0.04, 0.02), '#fff', [0, 1.73, 0.126]), P(box(0.2, 0.025, 0.02), '#111', [0, 1.58, 0.126]), P(box(0.03, 0.05, 0.02), '#dc2626', [0, 1.81, 0.126]), P(box(0.1, 0.1, 0.1), '#f8fafc', [0, 1.5, 0.1]),
  ];
  g.add(mk(merge(p)));
  const skirt = mk(merge([P(cyl(0.3, 0.64, 0.95, 18), dress, [0, 0.52, 0]), P(cyl(0.66, 0.66, 0.07, 18), '#facc15', [0, 0.1, 0]), P(cyl(0.58, 0.58, 0.05, 18), '#f8fafc', [0, 0.24, 0]), P(cyl(0.45, 0.45, 0.05, 18), trim, [0, 0.45, 0])]));
  g.add(skirt); g.skirt = skirt;
  return g;
}
function seated(skin, shirt) { const g = M.person({ kind: pick(['shirt', 'lungi', 'saree']), skin: skin || pick(['#8d5a3b', '#a8703f', '#6e4428', '#b9814f']), shirt: shirt || pick(['#f8fafc', '#2563eb', '#dc2626', '#16a34a', '#f59e0b', '#7c3aed', '#0891b2']) }); g.scale.set(1, 0.68, 1); return g; }
const standing = () => M.person({});

/* ============================================================================ place finder */
function fits(w, x, z, rot, hw, hd) {
  const c = Math.cos(rot), s = Math.sin(rot);
  for (let a = -hw; a <= hw + 0.1; a += Math.max(3, hw / 4)) for (let b = -hd; b <= hd + 0.1; b += Math.max(3, hd / 4)) {
    const px = x + a * c + b * s, pz = z - a * s + b * c;
    if (w.roadClearance(px, pz) < 2 || w.blocked(px, pz, 1.0) || w.inWater(px, pz) || w.groundH(px, pz) > 0.4) return false;
  }
  return true;
}
function findSpot(w, poi, hw, hd, R = 320) {
  const base = w.pois[poi] || [0, 0], faces = [0, Math.PI / 2];
  for (let r = 0; r <= R; r += 8) for (let k = 0; k < (r ? 16 : 1); k++) {
    const a = k / 16 * TAU, x = base[0] + Math.cos(a) * r, z = base[1] + Math.sin(a) * r, road = w.nearestRoad(x, z, 120);
    const rots = road ? [Math.atan2(road.x - x, road.z - z), Math.atan2(road.x - x, road.z - z) + Math.PI / 2, ...faces] : faces;
    for (const rot of rots) if (fits(w, x, z, rot, hw, hd)) return { x, z, rot };
  }
  return { x: base[0], z: base[1], rot: 0, bad: true };
}

/* ============================================================================ sites */
class Site {
  constructor(culture, def) {
    this.c = culture; this.def = def; this.id = def.id; this.group = new THREE.Group(); this.group.visible = false; this.t = rnd() * 10; this.on = false; this.shown = false;
    culture.g.scene.add(this.group);
  }
  place(spot, hw, hd) {
    this.x = spot.x; this.z = spot.z; this.rot = spot.rot; this.group.position.set(spot.x, 0, spot.z); this.group.rotation.y = spot.rot;
    const w = this.c.g.world, r = this.def.obs || 0; if (r) w.addObs({ x: spot.x, z: spot.z, r });
  }
  local(x, z) { const c = Math.cos(this.rot), s = Math.sin(this.rot); return [this.x + x * c + z * s, this.z - x * s + z * c]; }
}

function banner(lines, w, h, bg, fg, edge) { return M.signMesh(lines, w, h, { bg, fg, edge, w: 1024, h: Math.round(1024 * h / w) }); }
function garland(x0, x1, y, z, n = 14, cols = ['#f97316', '#facc15']) { const p = []; for (let i = 0; i < n; i++) { const u = i / (n - 1), x = x0 + (x1 - x0) * u; p.push(P(sph(0.1, 6, 4), cols[i % cols.length], [x, y - Math.sin(u * Math.PI) * 0.45, z])); } return p; }
const lamp = (x, y, z) => { const p = P(sph(0.1, 6, 4), '#fff1b8', [x, y, z]); p.glow = true; return p; };
function put(g, st) { const a = st.filter(p => !p.glow), b = st.filter(p => p.glow); g.add(mk(merge(a))); if (b.length) g.add(mk(merge(b), MAT.glow)); }

/* ---------------------------------------------------------------------------- Pili Vesha */
function buildPili(site) {
  const g = site.group, st = [];
  // marigold arch and loudspeakers at the entrance, banner over the tigers
  st.push(P(cyl(0.1, 0.1, 5, 6), '#78350f', [-5, 2.5, 8]), P(cyl(0.1, 0.1, 5, 6), '#78350f', [5, 2.5, 8]), P(box(10.4, 0.2, 0.2), '#78350f', [0, 5, 8]), ...garland(-5, 5, 4.9, 8, 22), ...garland(-5, 5, 4.4, 8, 22, ['#facc15', '#dc2626']), ...Array.from({ length: 12 }, (_, i) => lamp(-5 + i * 0.9, 5.2, 8.1)));
  for (const s of [-1, 1]) { st.push(P(cyl(0.06, 0.06, 3.4, 6), '#374151', [s * 7.5, 1.7, -6]), P(box(0.6, 0.9, 0.5), '#111827', [s * 7.5, 3.5, -6]), P(cyl(0.2, 0.2, 0.1, 10), '#6b7280', [s * 7.5, 3.5, -5.72], [Math.PI / 2, 0, 0])); }
  st.push(P(box(8, 0.12, 1.2), '#dc2626', [0, 0.06, -3]));                                           // red carpet for the drummers
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; st.push(P(box(0.35, 0.18, 0.35), pick(['#f59e0b', '#dc2626', '#fde047', '#f8fafc']), [Math.sin(a) * 7.2, 0.09, Math.cos(a) * 7.2 + 0.5])); }   // chalk rangoli ring
  put(g, st);
  const bn = banner(['ಪಿಲಿ ವೇಷ', 'ತುಳುನಾಡ ಹೆಮ್ಮೆ'], 7, 1.9, '#ea580c', '#111827', '#facc15'); bn.position.set(0, 6.4, -6.4); g.add(bn);
  site.tigers = [], site.drum = [], site.crowd = [];
  for (let i = 0; i < 4; i++) { const t = tiger(); t.position.set((i - 1.5) * 2.2, 0, 1.5 + (i % 2) * 1.4); t.userData = { bx: t.position.x, bz: t.position.z, ph: i * 1.7 }; g.add(t); site.tigers.push(t); }
  for (let i = 0; i < 5; i++) { const d = drummer(i < 3 ? 'tasa' : 'chende'); d.position.set((i - 2) * 1.4, 0, -3); d.rotation.y = 0.1 * (i - 2); d.userData = { ph: i }; g.add(d); site.drum.push(d); }
  for (let i = 0; i < 20; i++) { const a = (i + rnd() * 0.5) / 20 * TAU, r = 8.6 + rnd() * 1.4, p = standing(); const x = Math.sin(a) * r, z = Math.cos(a) * r + 0.5; if (z > 6 && Math.abs(x) < 5.5) continue; p.position.set(x, 0, z); p.rotation.y = Math.atan2(-x, -(z - 0.5)); p.userData = { ph: rnd() * 6 }; g.add(p); site.crowd.push(p); }
  site.anim = (dt, active, d) => {
    site.t += dt; const t = site.t;
    site.tigers.forEach((k, i) => {
      const u = k.userData, ph = t * 1.4 + u.ph, jump = Math.pow(Math.max(0, Math.sin(ph * 0.9)), 8), cr = 0.5 + 0.5 * Math.sin(t * 7 + u.ph);
      k.position.x = u.bx + Math.sin(ph * 0.7) * 1.2; k.position.z = u.bz + Math.cos(ph * 0.5) * 0.9; k.position.y = jump * 0.9 + Math.abs(Math.sin(t * 7 + u.ph)) * 0.08;
      k.rotation.y = Math.sin(ph * 0.6) * 1.2 + (i % 2 ? 3.14 * Math.floor(ph / 6.28 % 2) : 0); k.rotation.x = 0.22 + 0.2 * cr - jump * 0.3;
      if (k.legL) { k.legL.rotation.x = Math.sin(t * 7 + u.ph) * 0.8; k.legR.rotation.x = -Math.sin(t * 7 + u.ph) * 0.8; } if (k.tail) k.tail.rotation.x = Math.sin(t * 5 + u.ph) * 0.5;
    });
    site.drum.forEach((k, i) => { const s = Math.sin(t * 14 + i * 1.3); k.position.y = Math.abs(Math.sin(t * 7 + i)) * 0.05; if (k.stick) { k.stick.rotation.x = -0.5 + s * 0.7; k.stick2.rotation.x = -0.5 - s * 0.7; } k.rotation.z = Math.sin(t * 3.5 + i) * 0.05; });
    site.crowd.forEach((k) => { k.position.y = Math.abs(Math.sin(t * 5 + k.userData.ph)) * 0.09; });
  };
  return { hw: 12, hd: 12 };
}

/* ---------------------------------------------------------------------------- Yakshagana */
function buildYaksha(site) {
  const g = site.group, st = [];
  st.push(P(box(11, 1, 6.4), '#7c4a21', [0, 0.5, 0]), P(box(11.2, 0.12, 6.6), '#fbbf24', [0, 1.02, 0]), P(box(10, 0.04, 5.4), '#b91c1c', [0, 1.06, 0.1]));
  for (const [x, z] of [[-5.4, -3], [5.4, -3], [-5.4, 3], [5.4, 3]]) st.push(P(cyl(0.1, 0.1, 6.6, 6), '#78350f', [x, 4.3, z]));
  st.push(P(box(11, 0.2, 0.2), '#78350f', [0, 7.6, 3]), P(box(11, 0.2, 0.2), '#78350f', [0, 7.6, -3]));
  for (let i = 0; i < 11; i++) st.push(P(box(1, 0.06, 6.2), ['#dc2626', '#facc15', '#16a34a', '#2563eb'][i % 4], [-5 + i, 7.4, 0], [0.12, 0, 0]));   // coloured cloth canopy
  st.push(...garland(-5.4, 5.4, 7.0, 3.1, 24, ['#f97316', '#facc15', '#dc2626']));
  for (let i = 0; i < 18; i++) st.push(lamp(-5.4 + i * 0.64, 7.15, 3.2));
  for (const s of [-1, 1]) st.push(P(cyl(0.05, 0.05, 1.3, 6), '#6b7280', [s * 4.3, 1.7, 2.3]), lamp(s * 4.3, 2.6, 2.3), lamp(s * 4.3, 2.4, 2.3));   // petromax lamps
  // plastic chairs for the audience
  for (let r = 0; r < 4; r++) for (let c = -5; c <= 5; c++) { const x = c * 1.05, z = 5.8 + r * 1.35; st.push(P(box(0.5, 0.05, 0.5), '#dc2626', [x, 0.45, z]), P(box(0.5, 0.5, 0.05), '#dc2626', [x, 0.7, z + 0.22]), P(box(0.05, 0.45, 0.05), '#6b7280', [x - 0.2, 0.22, z - 0.2]), P(box(0.05, 0.45, 0.05), '#6b7280', [x + 0.2, 0.22, z - 0.2])); }
  put(g, st);
  const bk = banner(['ಯಕ್ಷಗಾನ ಬಯಲಾಟ', 'ಇಂದು ರಾತ್ರಿ'], 8.4, 2.2, '#7f1d1d', '#fde047', '#facc15'); bk.position.set(0, 5.4, -2.9); g.add(bk);
  const bk2 = banner(['ಶ್ರೀ ದೇವಿ ಮಹಾತ್ಮೆ'], 5, 1, '#1e3a8a', '#fff', '#facc15'); bk2.position.set(0, 3.2, -2.88); g.add(bk2);
  site.act = [yakshaDancer('#2f9e44', '#dc2626', '#facc15'), yakshaDancer('#dc2626', '#1d4ed8', '#fde047'), yakshaDancer('#f8d6b3', '#16a34a', '#facc15')];
  site.act.forEach((a, i) => { a.position.set((i - 1) * 2.8, 1.06, 0.4); a.userData = { ph: i * 2 }; g.add(a); });
  site.band = [];
  const bh = drummer('chende'); bh.position.set(-3.2, 1.06, -2.2); g.add(bh); site.band.push(bh); const md = drummer('tasa'); md.position.set(3.2, 1.06, -2.2); g.add(md); site.band.push(md);
  const bg = M.person({ kind: 'lungi', shirt: '#f8fafc', lungi: '#f8fafc', skin: '#8d5a3b', cap: '#dc2626' }); bg.position.set(0, 1.06, -2.3); g.add(bg); site.bag = bg;
  site.crowd = [];
  for (let r = 0; r < 4; r++) for (let c = -5; c <= 5; c++) { if (rnd() < 0.3) continue; const p = seated(); p.position.set(c * 1.05, 0.28, 5.8 + r * 1.35); p.rotation.y = Math.PI + (rnd() - 0.5) * 0.3; p.userData = { ph: rnd() * 6 }; g.add(p); site.crowd.push(p); }
  site.anim = (dt) => {
    site.t += dt; const t = site.t;
    site.act.forEach((a, i) => {
      const u = a.userData, ph = t * 1.8 + u.ph, spin = Math.floor(t / 5 + i) % 3 === 0;
      a.position.x = (i - 1) * 2.8 + Math.sin(ph * 0.5) * 0.9; a.position.y = 1.06 + Math.abs(Math.sin(ph * 2)) * 0.18; a.rotation.y = spin ? t * 5 + i : Math.sin(ph * 0.6) * 0.6;
      a.skirt.scale.set(1 + (spin ? 0.25 : 0.08) * Math.sin(ph * 4), 1, 1 + (spin ? 0.25 : 0.08) * Math.sin(ph * 4)); a.rotation.z = Math.sin(ph * 2) * 0.06;
    });
    site.band.forEach((k, i) => { const s = Math.sin(t * 15 + i * 1.7); if (k.stick) { k.stick.rotation.x = -0.5 + s * 0.7; k.stick2.rotation.x = -0.5 - s * 0.7; } k.position.y = 1.06 + Math.abs(Math.sin(t * 7.5 + i)) * 0.03; });
    site.bag.rotation.z = Math.sin(t * 2.2) * 0.06;
    site.crowd.forEach((k) => { k.position.y = 0.28 + Math.abs(Math.sin(t * 3 + k.userData.ph)) * 0.025; k.rotation.z = Math.sin(t * 1.2 + k.userData.ph) * 0.03; });
  };
  return { hw: 8, hd: 12 };
}

/* ---------------------------------------------------------------------------- Bhajane */
function buildBhajane(site) {
  const g = site.group, st = [];
  st.push(P(box(8, 0.05, 6), '#be185d', [0, 0.03, 0]), P(box(7.4, 0.06, 5.4), '#f59e0b', [0, 0.05, 0]), P(box(6.4, 0.07, 4.4), '#16a34a', [0, 0.07, 0]));    // layered mats
  for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; st.push(P(box(0.3, 0.09, 0.3), pick(['#dc2626', '#facc15', '#f8fafc', '#2563eb']), [Math.sin(a) * 1.5, 0.12, Math.cos(a) * 1.5])); }   // rangoli round the lamp
  // brass nilavilakku
  st.push(P(cyl(0.3, 0.38, 0.12, 12), '#d4a017', [0, 0.18, 0]), P(cyl(0.07, 0.1, 0.9, 8), '#d4a017', [0, 0.7, 0]));
  for (let k = 0; k < 4; k++) st.push(P(cyl(0.34 - k * 0.03, 0.22, 0.07, 10), '#d4a017', [0, 0.35 + k * 0.2, 0]), P(sph(0.07, 6, 4), '#fff1b8', [0.3 - k * 0.02, 0.43 + k * 0.2, 0]), P(sph(0.07, 6, 4), '#fff1b8', [-0.3 + k * 0.02, 0.43 + k * 0.2, 0]));
  st.push(P(sph(0.12, 6, 5), '#fff7c2', [0, 1.28, 0], [0, 0, 0], [1, 1.6, 1]));
  // pandal: four poles, cloth roof, marigold garlands, a framed picture of the Devi
  for (const [x, z] of [[-3.8, -2.8], [3.8, -2.8], [-3.8, 2.8], [3.8, 2.8]]) st.push(P(cyl(0.07, 0.07, 3.6, 6), '#78350f', [x, 1.8, z]));
  for (let i = 0; i < 8; i++) st.push(P(box(1, 0.05, 6.2), ['#f97316', '#f8fafc', '#dc2626', '#facc15'][i % 4], [-3.5 + i, 3.62, 0], [0.05, 0, 0]));
  st.push(...garland(-3.8, 3.8, 3.5, 2.85, 18), ...garland(-3.8, 3.8, 3.5, -2.85, 18), ...garland(-3.4, 3.4, 2.9, -2.78, 16, ['#facc15', '#f97316', '#dc2626']));
  st.push(P(box(1.9, 2.3, 0.12), '#78350f', [0, 1.55, -2.7]), P(box(0.8, 0.5, 0.5), '#facc15', [-1.3, 0.28, -2.4]), P(box(0.8, 0.5, 0.5), '#facc15', [1.3, 0.28, -2.4]));
  for (let i = 0; i < 12; i++) st.push(lamp(-3.6 + i * 0.65, 3.4, 2.9));
  put(g, st);
  const pic = banner(['ಶ್ರೀ ದುರ್ಗಾ ಪರಮೇಶ್ವರಿ'], 1.6, 2.0, '#be123c', '#fde047', '#facc15'); pic.position.set(0, 1.55, -2.63); g.add(pic);
  const bn = banner(['ಭಜನಾ ಸಪ್ತಾಹ', 'ಎಲ್ಲರಿಗೂ ಸ್ವಾಗತ'], 5, 1.2, '#7c2d12', '#fde047', '#facc15'); bn.position.set(0, 4.2, 2.95); g.add(bn);
  site.sit = [];
  for (let i = 0; i < 9; i++) { const a = (i + 0.5) / 9 * TAU, r = 2.45, p = seated(i < 4 ? '#8d5a3b' : undefined, i % 2 ? '#f8fafc' : '#fde68a'); p.position.set(Math.sin(a) * r, 0.1, Math.cos(a) * r); p.rotation.y = a + Math.PI; p.userData = { ph: i * 0.9 }; g.add(p); site.sit.push(p); }
  // harmonium and tabla, small boxes in front of two of them
  const inst = merge([P(box(0.6, 0.22, 0.32), '#7c4a21', [0, 0.28, 0]), P(box(0.5, 0.03, 0.26), '#f8fafc', [0, 0.41, 0.02]), P(cyl(0.12, 0.14, 0.26, 10), '#92400e', [0.5, 0.25, 0.05])]);
  for (const a of [0.7, 3.7]) { const m = mk(inst); m.position.set(Math.sin(a) * 1.65, 0.1, Math.cos(a) * 1.65); m.rotation.y = a + Math.PI; g.add(m); }
  site.anim = (dt) => { site.t += dt; const t = site.t; site.sit.forEach((p) => { p.rotation.z = Math.sin(t * 1.6 + p.userData.ph) * 0.09; p.position.y = 0.1 + Math.abs(Math.sin(t * 3.2 + p.userData.ph)) * 0.02; }); };
  return { hw: 7, hd: 6 };
}

/* ---------------------------------------------------------------------------- Kambala */
function buffalo(fill) {
  const g = new THREE.Group(), body = merge([
    P(box(0.78, 0.85, 1.8), '#1c1917', [0, 1.1, 0]), P(box(0.72, 0.25, 0.9), '#292524', [0, 0.78, 0.2]), P(box(0.34, 0.3, 0.5), '#1c1917', [0, 1.62, 0.55]),
    P(box(0.46, 0.5, 0.6), '#292524', [0, 1.28, 1.2], [0.2, 0, 0]), P(box(0.4, 0.3, 0.28), '#44403c', [0, 1.06, 1.55]), P(box(0.08, 0.08, 0.04), '#000', [-0.1, 1.12, 1.7]), P(box(0.08, 0.08, 0.04), '#000', [0.1, 1.12, 1.7]),
    P(box(0.62, 0.06, 0.06), '#e7e5e4', [-0.36, 1.58, 1.05], [0, 0, 0.55]), P(box(0.62, 0.06, 0.06), '#e7e5e4', [0.36, 1.58, 1.05], [0, 0, -0.55]), P(box(0.4, 0.05, 0.05), '#e7e5e4', [-0.66, 1.78, 0.9], [0, -0.5, 0.4]), P(box(0.4, 0.05, 0.05), '#e7e5e4', [0.66, 1.78, 0.9], [0, 0.5, -0.4]),
    P(box(0.05, 0.7, 0.05), '#1c1917', [0, 0.95, -0.95], [0.25, 0, 0]), P(box(0.16, 0.05, 0.2), '#44403c', [-0.3, 1.48, 0.95]), P(box(0.16, 0.05, 0.2), '#44403c', [0.3, 1.48, 0.95]),
    P(box(0.8, 0.12, 0.7), '#dc2626', [0, 1.55, -0.1]), P(box(0.82, 0.05, 0.72), '#facc15', [0, 1.62, -0.1]), P(box(0.6, 0.18, 0.1), '#facc15', [0, 1.1, 1.28]),   // decorated cloth, garland
  ]);
  g.add(mk(body));
  g.legs = []; for (const [x, z] of [[-0.25, 0.7], [0.25, 0.7], [-0.25, -0.7], [0.25, -0.7]]) { const l = mk(merge([P(box(0.17, 0.78, 0.17), '#1c1917', [0, -0.39, 0]), P(box(0.19, 0.1, 0.2), '#292524', [0, -0.78, 0.02])])); l.position.set(x, 0.78, z); g.add(l); g.legs.push(l); }
  return g;
}
function racePair() {
  const g = new THREE.Group(), a = buffalo(), b = buffalo(); a.position.x = -0.55; b.position.x = 0.55; g.add(a, b); g.bf = [a, b];
  g.add(mk(merge([P(box(1.9, 0.12, 0.14), '#7c4a21', [0, 1.62, 0.7]), P(box(0.02, 0.02, 2.2), '#d6d3d1', [-0.55, 1.12, 2.5]), P(box(0.02, 0.02, 2.2), '#d6d3d1', [0.55, 1.12, 2.5]),
    P(box(1.5, 0.07, 0.4), '#7c4a21', [0, 0.1, -2.4]), P(box(0.05, 0.05, 2.9), '#78350f', [-0.4, 0.5, -0.9], [0.12, 0, 0]), P(box(0.05, 0.05, 2.9), '#78350f', [0.4, 0.5, -0.9], [0.12, 0, 0])])));       // yoke, nose ropes, plough plank, drawbars
  const r = M.person({ kind: 'shirt', shirt: '#a8703f', skin: '#a8703f', pants: '#f97316', cap: '#dc2626' }); r.position.set(0, 0.16, -2.4); r.rotation.x = 0.28; g.add(r); g.runner = r;
  const whip = mk(merge([P(box(0.025, 0.025, 0.9), '#451a03', [0, 0, 0.4])])); whip.position.set(0.28, 1.2, -2.2); whip.rotation.x = -0.9; g.add(whip); g.whip = whip;
  return g;
}
function buildKambala(site) {
  const L = 118, g = site.group, st = [];
  const mud = new THREE.Mesh(new THREE.PlaneGeometry(14, L + 14), new THREE.MeshStandardMaterial({ color: '#6b4a2b', roughness: 0.22, metalness: 0.2 })); mud.rotation.x = -Math.PI / 2; mud.position.y = 0.045; mud.receiveShadow = true; g.add(mud);
  for (const x of [-7, 0, 7]) st.push(P(box(0.9, 0.5, L + 14), '#4d7c0f', [x, 0.25, 0]));
  for (const x of [-7.5, 7.5]) for (let z = -L / 2; z <= L / 2; z += 15) { st.push(P(cyl(0.06, 0.06, 3.6, 6), '#78350f', [x, 1.8, z])); for (let k = 0; k < 5; k++) st.push(P(cone(0.28, 0.5, 3), ['#dc2626', '#facc15', '#16a34a', '#2563eb', '#f8fafc'][k], [x, 3.3 - 0.0, z + 1.5 + k * 2.2], [Math.PI, 0, 0])); }
  const sz = -L / 2 + 5, fz = L / 2 - 10;
  st.push(P(cyl(0.12, 0.12, 4.6, 6), '#78350f', [-7, 2.3, sz]), P(cyl(0.12, 0.12, 4.6, 6), '#78350f', [7, 2.3, sz]), P(box(14.3, 0.2, 0.2), '#78350f', [0, 4.6, sz]), ...garland(-7, 7, 4.4, sz, 20, ['#f97316', '#facc15']));
  st.push(P(cyl(0.15, 0.15, 5.4, 6), '#78350f', [-7, 2.7, fz]), P(cyl(0.15, 0.15, 5.4, 6), '#78350f', [7, 2.7, fz]), P(box(14.3, 0.3, 0.3), '#7f1d1d', [0, 5.4, fz]));
  // finish-line flags and bleachers for the crowd
  for (let i = 0; i < 4; i++) st.push(P(box(3.2, 0.5, 20), '#a8a29e', [10.5 + i * 1.2, 0.25 + i * 0.5, fz - 6]), P(box(3.2, 0.06, 20.4), '#dc2626', [10.5 + i * 1.2, 0.54 + i * 0.5, fz - 6]));
  put(g, st);
  const bn = banner(['ಕೋರ್ದ ತುಕಟ್ಟ ಕಂಬಳ'], 12, 1.7, '#7f1d1d', '#fde047', '#facc15'); bn.position.set(0, 4.5, sz + 0.1); g.add(bn);
  const sb = document.createElement('canvas'); sb.width = 512; sb.height = 192; site.sbc = sb; site.sbt = new THREE.CanvasTexture(sb); site.sbt.colorSpace = THREE.SRGBColorSpace;
  const sbm = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.4), new THREE.MeshBasicMaterial({ map: site.sbt, toneMapped: false, side: THREE.DoubleSide })); sbm.position.set(0, 7.2, fz); g.add(sbm);
  site.pairs = [racePair(), racePair()]; site.pairs.forEach((p, i) => { p.position.set(i ? 2.6 : -2.6, 0.05, sz + 2); g.add(p); });
  site.crowd = []; site.L = L; site.sz = sz; site.fz = fz;
  for (let i = 0; i < 46; i++) { const p = standing(); const side = i % 2 ? 1 : -1; if (i < 18) p.position.set(10.5 + (i % 4) * 1.2 + (rnd() - 0.5) * 0.6, 0.6 + (i % 4) * 0.5, fz - 15 + (i >> 2) * 3.5); else p.position.set(side * (9.2 + rnd() * 2.5), 0, sz + rnd() * (L - 14)); p.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2; p.userData = { ph: rnd() * 6 }; g.add(p); site.crowd.push(p); }
  // flying mud
  const N = 220, pos = new Float32Array(N * 3), vel = new Float32Array(N * 3), life = new Float32Array(N); site.mud = { N, pos, vel, life };
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); site.mudPts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#5b3a1e', size: 0.2, transparent: true, opacity: 0.9, depthWrite: false })); site.mudPts.frustumCulled = false; g.add(site.mudPts);
  site.cycle = rnd() * 20; site.res = [0, 0]; site.dur = [10, 10]; site.running = false;
  const board = (extra) => { const x = sb.getContext('2d'); x.fillStyle = '#111827'; x.fillRect(0, 0, 512, 192); x.strokeStyle = '#facc15'; x.lineWidth = 8; x.strokeRect(6, 6, 500, 180); x.fillStyle = '#fde047'; x.textAlign = 'center'; x.font = '800 34px "Noto Sans Kannada",system-ui,sans-serif'; x.fillText('ಕಂಬಳ · ಕೋರ್ದ ತುಕಟ್ಟ', 256, 52); x.font = '800 30px system-ui,sans-serif'; x.fillStyle = '#fff'; x.fillText(extra[0], 256, 108); x.fillText(extra[1], 256, 158); site.sbt.needsUpdate = true; };
  site.board = board; board(['Lane A  --.--', 'Lane B  --.--']);
  const emit = (x, z, lane, sp) => { const m = site.mud; for (let k = 0; k < 4; k++) { const i = (m.cur = ((m.cur || 0) + 1) % m.N); m.pos[i * 3] = x + (rnd() - 0.5) * 1.6; m.pos[i * 3 + 1] = 0.2; m.pos[i * 3 + 2] = z - 1.4; m.vel[i * 3] = (rnd() - 0.5) * 3; m.vel[i * 3 + 1] = 2 + rnd() * 3.5; m.vel[i * 3 + 2] = -sp * 0.25 * rnd(); m.life[i] = 0.9 + rnd() * 0.6; } };
  site.anim = (dt) => {
    site.t += dt; const t = site.t; site.cycle += dt; const c = site.cycle % 64, runStart = 12, countdown = 8;
    const pu = (i, u) => (u * u * (3 - 2 * u)) * 0.3 + u * 0.7;
    site.pairs.forEach((p, i) => {
      const dur = site.dur[i], runLen = fz - sz + 8; let z, sp = 0, gait = 0.7;
      if (c < countdown) { z = sz + 2; gait = 0.5; } else if (c < runStart) { z = sz + 2 + Math.sin(t * 30) * 0.05; gait = 1.8; }
      else if (c < runStart + dur) { const u = (c - runStart) / dur; z = sz + 2 + runLen * pu(i, u); sp = runLen / dur; gait = 9; }
      else if (c < runStart + dur + 5) { const u = (c - runStart - dur) / 5; z = sz + 2 + runLen + 8 * (1 - (1 - u) * (1 - u)); gait = 5 * (1 - u); }
      else if (c < 50) { z = sz + 2 + runLen + 8 - (c - runStart - dur - 5) / (50 - runStart - dur - 5) * (runLen + 8); gait = 1.6; }
      else { z = sz + 2; gait = 0.4; }
      p.position.z = z; p.position.y = 0.05 + Math.abs(Math.sin(t * gait * 1.1)) * (gait > 6 ? 0.18 : 0.04);
      p.bf.forEach((b, j) => b.legs.forEach((l, k) => { l.rotation.x = Math.sin(t * gait + (k < 2 ? 0 : Math.PI * 0.7) + (k % 2) * (gait > 6 ? 0.9 : Math.PI) + j * 0.3) * (gait > 6 ? 0.95 : 0.4); }));
      p.runner.position.y = 0.16 + Math.abs(Math.sin(t * gait * 1.1)) * (gait > 6 ? 0.1 : 0.02); p.runner.rotation.x = gait > 6 ? 0.5 : 0.18; if (p.whip) p.whip.rotation.x = -0.9 + Math.sin(t * gait * 1.3) * (gait > 6 ? 0.8 : 0.1);
      if (sp > 1) emit(p.position.x, z, i, sp);
    });
    const runningNow = c >= runStart && c < runStart + Math.max(...site.dur) + 5; site.running = c >= runStart && c < runStart + Math.max(...site.dur);
    if (c < 0.2 && site.cycle > 1) { site.dur = [9 + rnd() * 2.4, 9 + rnd() * 2.4]; site.board(['Lane A  --.--', 'Lane B  --.--']); }
    if (c >= runStart + site.dur[0] && c < runStart + site.dur[0] + 0.3 || c >= runStart + site.dur[1] && c < runStart + site.dur[1] + 0.3) site.board([`Lane A  ${site.dur[0].toFixed(2)} s`, `Lane B  ${site.dur[1].toFixed(2)} s`]);
    const m = site.mud; for (let i = 0; i < m.N; i++) { if (m.life[i] > 0) { m.life[i] -= dt; m.vel[i * 3 + 1] -= 9 * dt; m.pos[i * 3] += m.vel[i * 3] * dt; m.pos[i * 3 + 1] += m.vel[i * 3 + 1] * dt; m.pos[i * 3 + 2] += m.vel[i * 3 + 2] * dt; if (m.pos[i * 3 + 1] < 0.05) m.life[i] = 0; } else m.pos[i * 3 + 1] = -50; } site.mudPts.geometry.attributes.position.needsUpdate = true;
    site.crowd.forEach((k) => { k.position.y = (k.userData.by ??= k.position.y) + (site.running ? Math.abs(Math.sin(t * 8 + k.userData.ph)) * 0.25 : Math.abs(Math.sin(t * 2 + k.userData.ph)) * 0.02); });
    site.cheer = site.running ? 1 : runningNow ? 0.5 : 0.1;
  };
  return { hw: 8, hd: L / 2 + 8 };
}

/* ============================================================================ the manager */
const HOURS = (a, b) => [a * 60, b * 60];
const DEFS = [
  { id: 'pili', poi: 'Swaraj Maidan', name: 'Pili Vesha', where: 'Swaraj Maidan', hours: [HOURS(15.5, 21.5)], song: 'pili', color: '#f97316', R: 80, build: buildPili, line: 'The Pili Vesha tigers are dancing' },
  { id: 'yaksha', poi: 'Gandhi Maidan', name: 'Yakshagana Bayalata', where: 'Gandhi Maidan', hours: [HOURS(18.5, 24)], song: 'yaksha', obs: 3.5, color: '#ef4444', R: 90, build: buildYaksha, line: 'Yakshagana is on tonight' },
  { id: 'bhajane', poi: 'Hanuman Temple', name: 'Bhajane', where: 'the Hanuman Temple', hours: [HOURS(17.5, 20.5), HOURS(5.5, 8)], song: 'bhajane', obs: 2.4, color: '#fbbf24', R: 65, build: buildBhajane, line: 'The bhajane mandali is singing' },
  { id: 'kambala', poi: 'Aanekere', name: 'Kordha Tukatta Kambala', where: 'the fields beside Aanekere', hours: [HOURS(7, 17.5)], song: 'kambala', color: '#a16207', R: 100, build: buildKambala, line: 'Kambala races are on' },
];

export class Culture {
  constructor(game) {
    this.g = game; this.sites = []; this.force = false; this.near = null; this.cheer = 0;
    this.light = new THREE.PointLight('#ffcf8a', 0, 60, 1.3); this.light.position.set(0, -50, 0); game.scene.add(this.light);
    for (const def of DEFS) {
      const s = new Site(this, def), sz = def.build(s); const spot = findSpot(game.world, def.poi, sz.hw, sz.hd); s.place(spot, sz.hw, sz.hd); s.spot = spot; this.sites.push(s);
    }
  }
  inHours(s, minutes) { const t = ((minutes % 1440) + 1440) % 1440; return s.def.hours.some(([a, b]) => t >= a && t < b); }
  update(dt) {
    const g = this.g, p = g.carOrPlayer(); let best = null, bv = 0, cheer = 0;
    for (const s of this.sites) {
      const d = Math.hypot(s.x - p.x, s.z - p.z), on = this.force || this.inHours(s, g.time);
      if (on !== s.on) { s.on = on; if (on && d < 700 && !this.force && g.toast) g.toast(s.def.name.toUpperCase(), `${s.def.line}, at ${s.def.where}.`); }
      const vis = on && d < 230; s.group.visible = vis;
      if (vis) { s.anim(dt); if (s.cheer && d < s.def.R) cheer = Math.max(cheer, s.cheer * (1 - d / s.def.R)); }
      if (on && d < s.def.R) { const v = Math.pow(1 - d / s.def.R, 1.4); if (v > bv) { bv = v; best = s; } }
    }
    this.near = best ? { site: best, vol: bv } : null; this.cheer = cheer;
    // one warm light follows the nearest active show (a constant light count avoids shader recompiles)
    let ls = null, ld = 1e9; for (const s of this.sites) if (s.group.visible) { const d = Math.hypot(s.x - p.x, s.z - p.z); if (d < ld) { ld = d; ls = s; } }
    const night = 1 - Math.max(0, Math.min(1, (g.dayAmt ?? 1))), tgt = ls ? 45 + 330 * Math.pow(night, 0.8) : 0;
    if (ls) { const [lx, lz] = ls.local(0, ls.id === 'kambala' ? 0 : 2.2); this.light.position.set(lx, ls.id === 'yaksha' ? 5.6 : ls.id === 'kambala' ? 8 : 4.5, lz); }
    this.light.intensity += (tgt - this.light.intensity) * Math.min(1, dt * 3);
  }
}
