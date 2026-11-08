// Facade and roof dressing on top of the generated town: shop awnings, floor-line cornices, parapets, split-AC outdoor units,
// rooftop solar water heaters, dishes and water-tank stands, drain pipes, porch steps and potted plants.
import * as THREE from './three.module.min.js';
import { atlas, atlasMat, tiledAttr } from './posters.js';

let seed = 777; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647), rr = (a, b) => a + rnd() * (b - a), pick = (a) => a[Math.floor(rnd() * a.length)];
const TILE = 180;

function canvasTex(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function inst(world, geo, mat, items, o = {}) {
  const groups = new Map(); for (const it of items) { const k = Math.floor(it.x / TILE) * 1000 + Math.floor(it.z / TILE); (groups.get(k) || groups.set(k, []).get(k)).push(it); }
  for (const list of groups.values()) {
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((it, i) => { im.setMatrixAt(i, it.m); if (it.c) im.setColorAt(i, it.c); });
    if (list[0].c) im.instanceColor.needsUpdate = true; im.computeBoundingSphere(); im.castShadow = o.cast !== false; im.receiveShadow = true; world.scene.add(im);
  }
}


/* ------------------------------------------------------------------ lit shop interiors (front-on view through the open shutter) */
const IW = 512, IH = 256;
function shelf(x, y0, y1, rows, cols, pal) { const rh = (y1 - y0) / rows; for (let r = 0; r < rows; r++) { x.fillStyle = '#5b4026'; x.fillRect(0, y0 + (r + 1) * rh - 3, IW, 4); for (let c = 0; c < cols; c++) { const w = IW / cols; x.fillStyle = pick(pal); x.fillRect(c * w + 3, y0 + r * rh + rh * rnd() * 0.35, w - 6, rh * (0.45 + rnd() * 0.3)); if (rnd() < 0.5) { x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(c * w + 7, y0 + r * rh + rh * 0.5, w - 14, 3); } } } }
function shopBase(x, wall) { x.fillStyle = wall; x.fillRect(0, 0, IW, IH); const g = x.createLinearGradient(0, 0, 0, IH); g.addColorStop(0, 'rgba(255,255,230,.55)'); g.addColorStop(0.35, 'rgba(255,255,230,0)'); g.addColorStop(1, 'rgba(0,0,0,.35)'); x.fillStyle = g; x.fillRect(0, 0, IW, IH); x.fillStyle = '#fffbe8'; x.fillRect(60, 6, IW - 120, 7); }
function counter(x, col = '#6b4a2b') { x.fillStyle = col; x.fillRect(0, IH - 46, IW, 46); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, IH - 46, IW, 5); x.fillStyle = '#e8e2d0'; x.fillRect(0, IH - 50, IW, 5); }
function keeper(x, cx, shirt) { x.fillStyle = pick(['#8d5a3b', '#a8703f', '#7a4a2d']); x.beginPath(); x.arc(cx, IH - 108, 15, 0, 7); x.fill(); x.fillStyle = '#141414'; x.beginPath(); x.arc(cx, IH - 114, 15, Math.PI, 7); x.fill(); x.fillStyle = shirt; x.fillRect(cx - 24, IH - 94, 48, 52); }
const INTERIORS = [
  (x) => { shopBase(x, '#d9cfae'); shelf(x, 22, 150, 4, 16, ['#dc2626', '#f59e0b', '#16a34a', '#2563eb', '#f8fafc', '#a855f7', '#fb923c']); for (let i = 0; i < 12; i++) { x.fillStyle = pick(['#fde047', '#fb7185', '#38bdf8']); x.fillRect(30 + i * 40, 16, 22, 34); } counter(x); for (const cx of [90, 200, 330]) { x.fillStyle = '#d6c7a0'; x.beginPath(); x.ellipse(cx, IH - 56, 36, 14, 0, 0, 7); x.fill(); } keeper(x, 420, '#2563eb'); },
  (x) => { shopBase(x, '#e8dcc0'); x.fillStyle = '#1f2937'; x.fillRect(30, 30, 190, 80); x.fillStyle = '#fde047'; x.font = '700 18px sans-serif'; x.fillText('IDLI 30  VADA 30', 42, 62); x.fillText('DOSA 60  TEA 15', 42, 92); x.fillStyle = 'rgba(180,220,235,.8)'; x.fillRect(260, 120, 230, 84); for (let i = 0; i < 12; i++) { x.fillStyle = pick(['#a16207', '#d97706', '#92400e', '#f59e0b']); x.beginPath(); x.arc(278 + (i % 6) * 36, 140 + Math.floor(i / 6) * 34, 13, 0, 7); x.fill(); } x.fillStyle = '#9ca3af'; x.beginPath(); x.ellipse(110, 150, 40, 36, 0, 0, 7); x.fill(); x.fillRect(80, 100, 60, 30); for (let i = 0; i < 8; i++) { x.fillStyle = '#d1d5db'; x.fillRect(30 + i * 10, 190, 7, 16); } counter(x, '#4b5563'); keeper(x, 200, '#f8fafc'); },
  (x) => { shopBase(x, '#d4e3c1'); for (let r = 0; r < 3; r++) { x.fillStyle = '#7c4a21'; x.fillRect(0, 70 + r * 52, IW, 8); for (let c = 0; c < 14; c++) { x.fillStyle = pick(['#dc2626', '#facc15', '#16a34a', '#fb923c', '#84cc16', '#a3e635', '#ef4444']); x.beginPath(); x.arc(20 + c * 36, 62 + r * 52 + (c % 2) * 3, 15, 0, 7); x.fill(); } } for (let i = 0; i < 6; i++) { x.strokeStyle = '#4d7c0f'; x.lineWidth = 10; x.beginPath(); x.moveTo(40 + i * 80, 8); x.lineTo(40 + i * 80 + (i % 2 ? 14 : -14), 56); x.stroke(); x.strokeStyle = '#facc15'; x.lineWidth = 7; x.beginPath(); x.moveTo(40 + i * 80, 24); x.lineTo(40 + i * 80 + (i % 2 ? 14 : -14), 62); x.stroke(); } counter(x, '#5b3a1e'); keeper(x, 360, '#16a34a'); },
  (x) => { shopBase(x, '#eef5f5'); shelf(x, 20, 150, 4, 18, ['#f8fafc', '#16a34a', '#38bdf8', '#e5e7eb', '#fde68a', '#fca5a5']); x.fillStyle = '#16a34a'; x.fillRect(IW / 2 - 18, 6, 36, 14); x.fillStyle = '#fff'; x.fillRect(IW / 2 - 3, 8, 6, 10); x.fillRect(IW / 2 - 8, 11, 16, 4); counter(x, '#cbd5e1'); keeper(x, 150, '#f8fafc'); },
  (x) => { shopBase(x, '#fbe9d0'); for (let i = 0; i < 18; i++) { x.fillStyle = pick(['#be123c', '#15803d', '#7c3aed', '#f59e0b', '#0e7490', '#db2777', '#1d4ed8', '#ea580c']); x.beginPath(); x.moveTo(14 + i * 27, 14); x.lineTo(34 + i * 27, 14); x.lineTo(30 + i * 27, 170); x.lineTo(10 + i * 27, 170); x.fill(); x.fillStyle = '#facc15'; x.fillRect(14 + i * 27, 150, 20, 5); } counter(x, '#7f1d1d'); for (let i = 0; i < 5; i++) { x.fillStyle = pick(['#be123c', '#15803d', '#7c3aed']); x.fillRect(30 + i * 90, IH - 66, 70, 14); } keeper(x, 450, '#9f1239'); },
  (x) => { shopBase(x, '#d8d8d2'); for (let i = 0; i < 8; i++) { x.fillStyle = '#9ca3af'; x.fillRect(20 + i * 20, 20, 9, 140); } for (let i = 0; i < 7; i++) { x.fillStyle = pick(['#1d4ed8', '#dc2626', '#f59e0b', '#16a34a']); x.fillRect(240 + (i % 4) * 62, 40 + Math.floor(i / 4) * 54, 48, 44); x.fillStyle = '#e5e7eb'; x.fillRect(246 + (i % 4) * 62, 54 + Math.floor(i / 4) * 54, 36, 6); } for (let i = 0; i < 6; i++) { x.fillStyle = '#374151'; x.fillRect(190 + i * 8, 130 + (i % 2) * 6, 5, 40); } counter(x, '#3f3f46'); keeper(x, 120, '#1d4ed8'); },
  (x) => { shopBase(x, '#dbe4ee'); x.fillStyle = 'rgba(170,200,230,.85)'; x.fillRect(20, 100, IW - 40, 100); for (let i = 0; i < 11; i++) { x.fillStyle = '#111827'; x.fillRect(34 + i * 42, 112, 28, 50); x.fillStyle = pick(['#22d3ee', '#f472b6', '#a3e635', '#facc15']); x.fillRect(38 + i * 42, 116, 20, 38); } x.fillStyle = '#0f172a'; x.fillRect(300, 22, 180, 62); x.fillStyle = '#38bdf8'; x.fillRect(306, 28, 168, 50); x.fillStyle = '#111'; x.fillRect(40, 30, 120, 60); x.fillStyle = '#f59e0b'; x.fillRect(46, 36, 108, 48); counter(x, '#1f2937'); keeper(x, 240, '#0ea5e9'); },
  (x) => { shopBase(x, '#e8ddd0'); x.fillStyle = 'rgba(190,215,235,.9)'; x.fillRect(40, 20, 180, 140); x.strokeStyle = '#6b7280'; x.lineWidth = 6; x.strokeRect(40, 20, 180, 140); x.fillStyle = '#7f1d1d'; x.fillRect(280, 110, 70, 80); x.fillRect(300, 70, 30, 50); x.fillStyle = '#111'; x.fillRect(290, 190, 50, 8); x.fillStyle = '#e5e7eb'; x.fillRect(400, 40, 80, 130); for (let i = 0; i < 4; i++) { x.fillStyle = pick(['#38bdf8', '#f472b6', '#a3e635']); x.fillRect(408, 50 + i * 30, 64, 20); } keeper(x, 140, '#fde047'); counter(x, '#52525b'); },
];

export function buildFacades(world) {
  seed = 777; const B = world.buildings || []; if (!B.length) return {};
  const unit0 = new THREE.BoxGeometry(1, 1, 1), std0 = (r) => new THREE.MeshStandardMaterial({ roughness: r });
  const up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(), e = new THREE.Euler();
  const loc = (b, lx, ly, lz) => { const cs = Math.cos(b.rot), sn = Math.sin(b.rot); return new THREE.Vector3(b.x + lx * cs + lz * sn, ly, b.z - lx * sn + lz * cs); };
  const M = (b, lx, ly, lz, sx, sy, sz, tx = 0, ry = 0) => new THREE.Matrix4().compose(loc(b, lx, ly, lz), new THREE.Quaternion().setFromEuler(e.set(tx, b.rot + ry, 0, 'YXZ')), sc.set(sx, sy, sz).clone());
  const L = { awning: [], band: [], parapet: [], ac: [], solar: [], tank: [], dish: [], pipe: [], step: [], pot: [], soil: [] };
  const AWN = ['#dc2626', '#2563eb', '#16a34a', '#f59e0b', '#7c3aed', '#0891b2', '#ea580c'];
  for (const b of B) {
    const h = b.floors * 3.2, fz = b.dd / 2;
    if (b.shop) {
      if (rnd() < 0.7) L.awning.push({ x: b.x, z: b.z, m: M(b, 0, 2.95, fz + 0.62, b.fw * 0.9, 1, 1.35, 0.5), c: new THREE.Color(pick(AWN)) });
    }
    for (let f = 1; f <= b.floors; f++) L.band.push({ x: b.x, z: b.z, m: M(b, 0, f * 3.2 - 0.12, 0, b.fw + 0.28, 0.2, b.dd + 0.28), c: new THREE.Color(f === b.floors ? '#d6d3d1' : '#e7e5e4') });
    if (!b.tiled) {                                                      // flat roof: parapet walls, tank stand, solar heater, dish
      for (const [lx, lz, sx, sz] of [[0, fz + 0.1, b.fw + 0.3, 0.2], [0, -fz - 0.1, b.fw + 0.3, 0.2], [b.fw / 2 + 0.1, 0, 0.2, b.dd + 0.3], [-b.fw / 2 - 0.1, 0, 0.2, b.dd + 0.3]])
        L.parapet.push({ x: b.x, z: b.z, m: M(b, lx, h + 0.45, lz, sx, 0.75, sz), c: new THREE.Color('#d6d3d1') });
      if (rnd() < 0.55) { const sx = rnd() < 0.5 ? -1 : 1; L.solar.push({ x: b.x, z: b.z, m: M(b, sx * (b.fw / 2 - 1.6), h + 0.95, 0.4, 1.5, 0.07, 1.9, -0.5), c: new THREE.Color('#1e3a5f') }); L.tank.push({ x: b.x, z: b.z, m: M(b, sx * (b.fw / 2 - 1.6), h + 1.5, -0.7, 0.55, 1.0, 0.55, 0, 0).multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2)), c: new THREE.Color('#e5e7eb') }); }
      if (rnd() < 0.5) L.dish.push({ x: b.x, z: b.z, m: M(b, rr(-1, 1) * b.fw * 0.3, h + 1.0, rr(-1, 1) * b.dd * 0.25, 0.75, 0.75, 0.3, -1.0), c: new THREE.Color('#e5e7eb') });
    } else if (rnd() < 0.4) L.dish.push({ x: b.x, z: b.z, m: M(b, rr(-1, 1) * b.fw * 0.25, h + 1.2, fz * 0.3, 0.7, 0.7, 0.28, -1.0), c: new THREE.Color('#d4d4d8') });
    if (b.floors >= 2) { const n = Math.floor(rnd() * 3); for (let i = 0; i < n; i++) L.ac.push({ x: b.x, z: b.z, m: M(b, rr(-0.4, 0.4) * b.fw, 2 + rr(0, b.floors - 1) * 3.2 + 1.0, fz + 0.2, 0.85, 0.62, 0.38), c: new THREE.Color(pick(['#f1f5f9', '#e2e8f0', '#d1d5db'])) }); }
    L.pipe.push({ x: b.x, z: b.z, m: M(b, (b.fw / 2 - 0.12) * (rnd() < 0.5 ? 1 : -1), h / 2, fz + 0.08, 1, h, 1), c: new THREE.Color('#9ca3af') });
    if (!b.shop && b.yard > 2.2) {
      L.step.push({ x: b.x, z: b.z, m: M(b, 0, 0.1, fz + 0.45, 2.0, 0.2, 0.9), c: new THREE.Color('#a8a29e') }, { x: b.x, z: b.z, m: M(b, 0, 0.2, fz + 0.22, 1.7, 0.2, 0.45), c: new THREE.Color('#b4b0a8') });
      for (const sx of [-1, 1]) { L.pot.push({ x: b.x, z: b.z, m: M(b, sx * 1.55, 0.3, fz + 0.5, 1, 1, 1), c: new THREE.Color('#b4532a') }); L.soil.push({ x: b.x, z: b.z, m: M(b, sx * 1.55, 0.75, fz + 0.5, 0.65, 0.5, 0.65), c: new THREE.Color(pick(['#15803d', '#166534', '#4d7c0f'])) }); }
    }
  }
  // lit shop interiors seen through the open shutters, plus goods stacked outside
  const IA = atlas(INTERIORS, IW, IH, 2, 0.6), im = atlasMat(IA, 0.7); im.emissiveMap = IA.tex; im.emissive = new THREE.Color('#ffffff'); im.emissiveIntensity = 0.12; im.alphaTest = 0; world.shopInterior = im;
  const interior = [], goods = { crate: [], fruit: [], hang: [], chair: [] };
  for (const b of B) if (b.shop && rnd() < 0.8) {
    const row = Math.floor(rnd() * INTERIORS.length), w = b.fw * 0.8, h = w / 2 > 2.5 ? 2.5 : w / 2;
    interior.push({ x: b.x, z: b.z, row, m: M(b, 0, 1.3, b.dd / 2 + 0.095, w, 2.5, 1) });
    if (row <= 2 || rnd() < 0.3) { const n = 2 + Math.floor(rnd() * 3); for (let i = 0; i < n; i++) { const lx = rr(-b.fw * 0.35, b.fw * 0.35); goods.crate.push({ x: b.x, z: b.z, m: M(b, lx, 0.22, b.dd / 2 + 0.9, 0.7, 0.44, 0.5), c: new THREE.Color(pick(['#8a5a2b', '#6b4a2b', '#a16207'])) }); for (let k = 0; k < 4; k++) goods.fruit.push({ x: b.x, z: b.z, m: M(b, lx + rr(-0.22, 0.22), 0.5, b.dd / 2 + 0.9 + rr(-0.12, 0.12), 0.2, 0.2, 0.2), c: new THREE.Color(pick(['#dc2626', '#facc15', '#16a34a', '#fb923c', '#84cc16'])) }); } }
    if (rnd() < 0.5) for (let i = 0; i < 3; i++) goods.hang.push({ x: b.x, z: b.z, m: M(b, rr(-b.fw * 0.4, b.fw * 0.4), 2.6, b.dd / 2 + 0.7, 0.14, 0.5, 0.14), c: new THREE.Color('#e6c229') });
    if (row === 1 && rnd() < 0.8) for (let i = 0; i < 2; i++) goods.chair.push({ x: b.x, z: b.z, m: M(b, -b.fw * 0.3 + i * 0.9, 0.3, b.dd / 2 + 1.6 + i * 0.3, 0.45, 0.6, 0.45), c: new THREE.Color(pick(['#1d4ed8', '#dc2626', '#16a34a', '#e5e7eb'])) });
  }
  tiledAttr(world, new THREE.PlaneGeometry(1, 1), im, interior);
  inst(world, unit0, std0(0.9), goods.crate, { cast: false }); inst(world, new THREE.SphereGeometry(0.5, 6, 5), std0(0.7), goods.fruit, { cast: false }); inst(world, new THREE.SphereGeometry(0.5, 7, 6), std0(0.6), goods.hang, { cast: false }); inst(world, unit0, std0(0.8), goods.chair, { cast: false });
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const stripes = canvasTex(64, 64, (x) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#ffffff' : '#9a9a9a'; x.fillRect(i * 8, 0, 8, 64); } x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, 56, 64, 8); });
  const awnGeo = new THREE.PlaneGeometry(1, 1); awnGeo.rotateX(-Math.PI / 2);
  inst(world, awnGeo, new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.9, side: THREE.DoubleSide }), L.awning, { cast: true });
  const std = (r) => new THREE.MeshStandardMaterial({ roughness: r });
  inst(world, unit, std(0.9), L.band, { cast: false }); inst(world, unit, std(0.9), L.parapet);
  const fan = canvasTex(64, 64, (x) => { x.fillStyle = '#fff'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#9ca3af'; x.beginPath(); x.arc(32, 32, 26, 0, 7); x.fill(); x.fillStyle = '#4b5563'; x.beginPath(); x.arc(32, 32, 22, 0, 7); x.fill(); x.strokeStyle = '#9ca3af'; x.lineWidth = 2; for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(32, 32); x.lineTo(32 + Math.cos(i * 1.57 + .5) * 21, 32 + Math.sin(i * 1.57 + .5) * 21); x.stroke(); } });
  const acMat = [std(0.7), std(0.7), std(0.7), std(0.7), std(0.7), new THREE.MeshStandardMaterial({ roughness: 0.7, map: fan })];
  const acGroups = new Map(); for (const it of L.ac) { const k = Math.floor(it.x / TILE) * 1000 + Math.floor(it.z / TILE); (acGroups.get(k) || acGroups.set(k, []).get(k)).push(it); }
  for (const list of acGroups.values()) { const im = new THREE.InstancedMesh(unit, acMat, list.length); list.forEach((it, i) => { im.setMatrixAt(i, it.m); im.setColorAt(i, it.c); }); im.instanceColor.needsUpdate = true; im.computeBoundingSphere(); world.scene.add(im); }
  inst(world, unit, new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.4 }), L.solar, { cast: false });
  inst(world, new THREE.CylinderGeometry(0.5, 0.5, 1.2, 12), std(0.5), L.tank);
  const dish = new THREE.SphereGeometry(0.5, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.45); dish.rotateX(Math.PI / 2); inst(world, dish, new THREE.MeshStandardMaterial({ roughness: 0.4, side: THREE.DoubleSide }), L.dish, { cast: false });
  inst(world, new THREE.CylinderGeometry(0.05, 0.05, 1, 6), std(0.6), L.pipe, { cast: false });
  inst(world, unit, std(1), L.step, { cast: false });
  inst(world, new THREE.CylinderGeometry(0.28, 0.2, 0.6, 8), std(0.9), L.pot, { cast: false });
  inst(world, new THREE.SphereGeometry(0.5, 7, 5), std(0.95), L.soil, { cast: false });
  return Object.fromEntries(Object.entries(L).map(([k, v]) => [k, v.length]));
}
