// Street furniture that makes it look like a coastal Karnataka town: laterite road shoulders,
// black-and-yellow kerbs, electric poles with sagging wires, bus shelters, flex banners, a petrol bunk.
import * as THREE from './three.module.min.js';
import * as M from './models.js';
import { tiled, rand } from './world.js';

const rr = (a, b) => a + rand() * (b - a);

/** A strip running alongside a polyline between offsets inner..outer (both sides when both=true). */
function strip(world, pts, inner, outer, y, both = true, uScale = 1) {
  const pos = [], uv = [], idx = [];
  for (const side of both ? [-1, 1] : [1]) {
    const base = pos.length / 3; let v = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], a = pts[Math.max(0, i - 1)], c = pts[Math.min(pts.length - 1, i + 1)];
      let dx = c[0] - a[0], dz = c[1] - a[1]; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
      const nx = -dz * side, nz = dx * side;
      if (i > 0) v += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) * uScale;
      for (const o of [inner, outer]) { const x = p[0] + nx * o, z = p[1] + nz * o; pos.push(x, world.groundH(x, z) + y, z); uv.push(v, o === inner ? 0 : 1); }
      if (i > 0) { const q = base + (i - 1) * 2; if (side > 0) idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); else idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function walk(pts, step, fn) { let carry = step / 2; for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az); if (L < 0.01) continue; const dx = (bx - ax) / L, dz = (bz - az) / L; let t = carry; for (; t < L; t += step) fn(ax + dx * t, az + dz * t, dx, dz); carry = t - L; } }
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }

export function buildInfra(world) {
  const S = world.scene, roads = world.map.roads.filter(r => r.cls !== 'track');
  // --- laterite shoulders on every road, kerbs on the main roads
  const soil = canvasTex(64, 64, (x) => { x.fillStyle = '#9a5b3c'; x.fillRect(0, 0, 64, 64); for (let i = 0; i < 600; i++) { x.fillStyle = Math.random() < 0.5 ? '#7d472f' : '#b5714c'; x.globalAlpha = 0.5; x.fillRect(Math.random() * 64, Math.random() * 64, 2, 2); } });
  soil.wrapS = soil.wrapT = THREE.RepeatWrapping;
  const shoulderMat = new THREE.MeshStandardMaterial({ map: soil, roughness: 1, polygonOffset: true, polygonOffsetFactor: -0.5, polygonOffsetUnits: -1 });
  const kerbTex = canvasTex(64, 8, (x) => { x.fillStyle = '#111'; x.fillRect(0, 0, 64, 8); x.fillStyle = '#facc15'; x.fillRect(0, 0, 32, 8); });
  kerbTex.wrapS = THREE.RepeatWrapping;
  const kerbMat = new THREE.MeshStandardMaterial({ map: kerbTex, roughness: 0.8 });
  for (const rd of roads) {
    const sh = new THREE.Mesh(strip(world, rd.pts, rd.w / 2 - 0.1, rd.w / 2 + (rd.w >= 9 ? 2.2 : 1.4), 0.018, true, 0.25), shoulderMat); sh.receiveShadow = true; S.add(sh);
    if (rd.w >= 9) { const k = new THREE.Mesh(strip(world, rd.pts, rd.w / 2 + 0.05, rd.w / 2 + 0.45, 0.16, true, 0.5), kerbMat); k.receiveShadow = true; S.add(k); }
  }

  // --- electric poles with wires
  const poleGeo = M.merge([M.P(M.box(0.24, 9, 0.24), '#b8b3a8', [0, 4.5, 0]), M.P(M.box(1.6, 0.12, 0.12), '#6b7280', [0, 8.6, 0]),
    M.P(M.box(0.1, 0.18, 0.1), '#e5e7eb', [-0.65, 8.75, 0]), M.P(M.box(0.1, 0.18, 0.1), '#e5e7eb', [0.65, 8.75, 0]), M.P(M.box(0.1, 0.18, 0.1), '#e5e7eb', [0, 8.75, 0]),
    M.P(M.box(0.5, 0.7, 0.35), '#4b5563', [0, 6.2, 0.2])]);
  const poles = [], wire = [];
  for (const rd of roads) {
    let prev = null;
    walk(rd.pts, rd.w >= 9 ? 34 : 30, (x, z, dx, dz) => {
      const o = rd.w / 2 + 1.5, px = x + dz * o, pz = z - dx * o;            // right-hand side of the road's direction
      if (world.blocked(px, pz, 0.35) || world.inWater(px, pz) || world.groundH(px, pz) > 2) { prev = null; return; }
      const r = Math.atan2(dx, dz), y0 = world.groundH(px, pz);
      poles.push({ x: px, z: pz, m: new THREE.Matrix4().compose(new THREE.Vector3(px, y0, pz), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r + Math.PI / 2), new THREE.Vector3(1, 1, 1)) });
      world.addObs({ x: px, z: pz, r: 0.25 });
      const cur = { x: px, z: pz, y: y0, r };
      if (prev && Math.hypot(prev.x - px, prev.z - pz) < 45) {
        for (const off of [-0.65, 0, 0.65]) {
          const ax = prev.x + Math.cos(prev.r) * off, az = prev.z - Math.sin(prev.r) * off, bx = px + Math.cos(r) * off, bz = pz - Math.sin(r) * off;
          let lx = ax, ly = prev.y + 8.85, lz = az;
          for (let k = 1; k <= 6; k++) { const t = k / 6, sag = Math.sin(Math.PI * t) * 0.9; const nx = ax + (bx - ax) * t, nz = az + (bz - az) * t, ny = prev.y + 8.85 + (y0 - prev.y) * t - sag; wire.push(lx, ly, lz, nx, ny, nz); lx = nx; ly = ny; lz = nz; }
        }
      }
      prev = cur;
    });
  }
  tiled(S, poleGeo, M.MAT.solid, poles, { receive: false });
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3));
  S.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: '#1f2328', transparent: true, opacity: 0.75 })));

  // --- bus shelters along the main roads
  const shelter = M.merge([M.P(M.box(5, 0.18, 2.4), '#e5e7eb', [0, 2.8, 0]), M.P(M.box(5.2, 0.1, 2.6), '#2563eb', [0, 2.95, 0]),
    ...[[-2.3, -1], [2.3, -1], [-2.3, 1], [2.3, 1]].map(([x, z]) => M.P(M.box(0.14, 2.8, 0.14), '#9ca3af', [x, 1.4, z])),
    M.P(M.box(4.4, 0.12, 0.5), '#78350f', [0, 0.5, -0.6]), M.P(M.box(4.6, 1.6, 0.06), '#dbeafe', [0, 1.5, -1.15]), M.P(M.box(5, 0.15, 2.4), '#9ca3af', [0, 0.07, 0])]);
  const sign = M.signTexture(['ಬಸ್ ತಂಗುದಾಣ', 'BUS STOP'], { bg: '#1d4ed8', fg: '#fff', w: 512, h: 160 });
  world.busStops = [];
  for (const rd of roads.filter(r => r.w >= 9)) walk(rd.pts, 330, (x, z, dx, dz) => {
    const o = rd.w / 2 + 2.3, px = x - dz * o, pz = z + dx * o;                // left side: traffic drives on the left
    if (world.blocked(px, pz, 2.4)) return;
    const g = new THREE.Group(), m = new THREE.Mesh(shelter, M.MAT.solid); m.castShadow = true; g.add(m);
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.7), new THREE.MeshBasicMaterial({ map: sign, toneMapped: false })); sg.position.set(0, 3.45, 1.25); g.add(sg);
    g.position.set(px, world.groundH(px, pz), pz); g.rotation.y = Math.atan2(x - px, z - pz); S.add(g);   // open side faces the road
    world.addObs({ x: px, z: pz, hx: 2.5, hz: 0.25, c: Math.cos(-g.rotation.y), s: Math.sin(-g.rotation.y) });
    world.busStops.push([x - dz * (rd.w / 4), z + dx * (rd.w / 4)]);
  });

  // --- flex banners near the big junctions
  const BANNERS = [
    ['KARKALA UTSAVA', 'Yakshagana tonight · Gandhi Maidan · 9 PM', '#7c2d12', '#fde047'],
    ['HAPPY BIRTHDAY', 'Namma Raju Anna · from Friends Circle', '#1e3a8a', '#ffffff'],
    ['GRAND OPENING', 'Karavali Mobiles · 50% OFF covers', '#b91c1c', '#ffffff'],
    ['KAMATH TUTORIALS', 'CET · NEET · 2nd PUC · Results 98%', '#065f46', '#fef08a'],
    ['KAMBALA THIS SUNDAY', 'Buffalo race · Miyar · Free entry', '#a16207', '#ffffff'],
    ['DRIVE SLOW', 'Cows have right of way · Karkala Police', '#0f172a', '#facc15'],
    ['SAVE WATER', 'Ramasamudra is not a swimming pool', '#0369a1', '#ffffff'],
    ['GOLI BAJE FESTIVAL', 'Hotel Raj Mahal · every evening 5 PM', '#9d174d', '#ffffff'],
  ];
  const btex = BANNERS.map(([a, b, bg, fg]) => canvasTex(512, 256, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, bg); g.addColorStop(1, '#000'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 12; i++) { x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 20 + Math.random() * 60, 0, 7); x.fill(); }
    x.fillStyle = fg; x.textAlign = 'center'; x.font = '900 52px system-ui,Arial'; x.fillText(a, w / 2, 110, w - 30); x.font = '700 24px system-ui,Arial'; x.fillStyle = '#fff'; x.fillText(b, w / 2, 168, w - 30);
    x.strokeStyle = fg; x.lineWidth = 8; x.strokeRect(6, 6, w - 12, h - 12);
  }));
  const pole2 = M.merge([M.P(M.cyl(0.07, 0.09, 5.2, 6), '#a16207', [-3.1, 2.6, 0]), M.P(M.cyl(0.07, 0.09, 5.2, 6), '#a16207', [3.1, 2.6, 0])]);
  let bi = 0;
  const big = world.nodes.filter(n => n.adj.length >= 3 && n.adj.some(e => e.w >= 9));
  for (let i = 0; i < big.length && bi < 16; i += Math.max(1, Math.floor(big.length / 16))) {
    const n = big[i], e = n.adj.find(e => e.w >= 9) || n.adj[0], dx = e.n.x - n.x, dz = e.n.z - n.z, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L;
    const o = e.w / 2 + 3, px = n.x + ux * 14 + uz * o, pz = n.z + uz * 14 - ux * o;
    if (world.blocked(px, pz, 3.2) || world.inWater(px, pz)) continue;
    const g = new THREE.Group(); g.add(new THREE.Mesh(pole2, M.MAT.solid));
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshStandardMaterial({ map: btex[bi % btex.length], roughness: 0.7, side: THREE.DoubleSide })); pl.position.y = 3.4; pl.castShadow = true; g.add(pl);
    g.position.set(px, world.groundH(px, pz), pz); g.rotation.y = Math.atan2(-uz, ux) + Math.PI / 2 + 0.5; S.add(g);
    world.addObs({ x: px, z: pz, r: 0.6 }); bi++;
  }
}

/** Petrol bunk: canopy on pillars, two pumps, a price board. */
export function petrolBunk() {
  const p = [M.P(M.box(16, 0.15, 10), '#9ca3af', [0, 0.07, 0]), M.P(M.box(14, 0.8, 8), '#f8fafc', [0, 5.4, 0]), M.P(M.box(14.1, 0.35, 8.1), '#16a34a', [0, 5.0, 0]),
    ...[[-5, -2.5], [5, -2.5], [-5, 2.5], [5, 2.5]].map(([x, z]) => M.P(M.box(0.4, 5, 0.4), '#e5e7eb', [x, 2.5, z])),
    M.P(M.box(0.9, 1.8, 0.6), '#facc15', [-2.5, 0.9, 0]), M.P(M.box(0.9, 1.8, 0.6), '#facc15', [2.5, 0.9, 0]), M.P(M.box(1.2, 0.3, 1), '#6b7280', [-2.5, 0.15, 0]), M.P(M.box(1.2, 0.3, 1), '#6b7280', [2.5, 0.15, 0]),
    M.P(M.box(5, 3.2, 4), '#f1f5f9', [0, 1.6, -7]), M.P(M.box(0.25, 6, 0.25), '#475569', [7.5, 3, 4.5])];
  const g = new THREE.Group(); const m = new THREE.Mesh(M.merge(p), M.MAT.solid); m.castShadow = true; m.receiveShadow = true; g.add(m);
  const s = M.signMesh(['KARAVALI FUELS', 'Petrol ₹103 · Diesel ₹89'], 12, 1.4, { bg: '#15803d', fg: '#fff', w: 1024, h: 120 }); s.position.set(0, 5.4, 4.06); g.add(s);
  const b = M.signMesh(['PETROL', 'DIESEL'], 1.8, 2.6, { bg: '#facc15', fg: '#14532d', w: 160, h: 230 }); b.position.set(7.5, 5.2, 4.65); g.add(b);
  return g;
}
