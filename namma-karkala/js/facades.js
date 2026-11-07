// Facade and roof dressing on top of the generated town: shop awnings, floor-line cornices, parapets, split-AC outdoor units,
// rooftop solar water heaters, dishes and water-tank stands, drain pipes, porch steps and potted plants.
import * as THREE from './three.module.min.js';

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

export function buildFacades(world) {
  seed = 777; const B = world.buildings || []; if (!B.length) return {};
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
