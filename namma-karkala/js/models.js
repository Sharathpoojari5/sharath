// Procedural low-poly models. Every model is a few merged, vertex-coloured geometries so a whole
// vehicle or building is one draw call.
import * as THREE from './three.module.min.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _c = new THREE.Color();

/** One coloured piece: geometry + colour + placement. */
export function P(geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) {
  return { geo, color, pos, rot, scl };
}
export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
export const cyl = (rt, rb, h, n = 10) => new THREE.CylinderGeometry(rt, rb, h, n);
export const sph = (r, w = 8, h = 6) => new THREE.SphereGeometry(r, w, h);
export const cone = (r, h, n = 8) => new THREE.ConeGeometry(r, h, n);

/** Merge pieces into one BufferGeometry with a colour attribute. */
export function merge(parts) {
  const pos = [], nor = [], col = [];
  for (const p of parts) {
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
    _e.set(p.rot[0], p.rot[1], p.rot[2]); _q.setFromEuler(_e);
    _m.compose(new THREE.Vector3(...p.pos), _q, new THREE.Vector3(...p.scl));
    g.applyMatrix4(_m);
    _c.set(p.color);
    const a = g.attributes.position.array, n = g.attributes.normal.array;
    for (let i = 0; i < a.length; i++) { pos.push(a[i]); nor.push(n[i]); }
    for (let i = 0; i < a.length / 3; i++) col.push(_c.r, _c.g, _c.b);
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

export const MAT = {
  solid: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05 }),
  shiny: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.25 }),
  glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
};

function mesh(geo, mat = MAT.solid, shadow = true) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = false; return m;
}

/* ------------------------------------------------------------------ text signs */
const signCache = new Map();
export function signTexture(lines, opts = {}) {
  const key = JSON.stringify([lines, opts]);
  if (signCache.has(key)) return signCache.get(key);
  const w = opts.w || 512, h = opts.h || 128;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = opts.bg || '#1d4ed8'; x.fillRect(0, 0, w, h);
  if (opts.border !== false) { x.strokeStyle = opts.edge || '#fff'; x.lineWidth = Math.max(4, h * 0.05); x.strokeRect(6, 6, w - 12, h - 12); }
  x.fillStyle = opts.fg || '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  const n = lines.length;
  lines.forEach((t, i) => {
    let fs = Math.floor((h * 0.8) / n * (i === 0 ? 1 : 0.8));
    x.font = `800 ${fs}px "Noto Sans Kannada","Kannada Sangam MN","Tunga",system-ui,Arial,sans-serif`;
    while (x.measureText(t).width > w * 0.9 && fs > 8) { fs -= 2; x.font = `800 ${fs}px "Noto Sans Kannada","Kannada Sangam MN","Tunga",system-ui,Arial,sans-serif`; }
    x.fillText(t, w / 2, (h / n) * (i + 0.5));
  });
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  signCache.set(key, tex); return tex;
}
export function signMesh(lines, w, h, opts = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: signTexture(lines, opts), toneMapped: false, side: THREE.DoubleSide }));
  return m;
}

/* ------------------------------------------------------------------ people */
const SKIN = ['#8d5a3b', '#a8703f', '#6e4428', '#b9814f', '#7b4b2c'];
const SHIRT = ['#f8fafc', '#2563eb', '#dc2626', '#16a34a', '#f59e0b', '#7c3aed', '#0891b2', '#e11d48', '#fde68a', '#94a3b8'];
const LUNGI = ['#f8fafc', '#e5e7eb', '#1e3a8a', '#065f46', '#7f1d1d'];
const SAREE = ['#db2777', '#f59e0b', '#16a34a', '#7c3aed', '#dc2626', '#0ea5e9', '#ea580c'];
const pick = (a, r = Math.random) => a[Math.floor(r() * a.length)];

/** A person facing +z, feet at y=0, ~1.7 m. Returns group with .legL/.legR for walking. */
export function person(o = {}) {
  const skin = o.skin || pick(SKIN), g = new THREE.Group();
  const kind = o.kind || pick(['shirt', 'shirt', 'lungi', 'saree']);
  const shirt = o.shirt || pick(SHIRT);
  const parts = [
    P(box(0.44, 0.58, 0.26), kind === 'saree' ? (o.saree || pick(SAREE)) : shirt, [0, 1.2, 0]),
    P(box(0.24, 0.27, 0.24), skin, [0, 1.66, 0]),
    P(box(0.26, 0.09, 0.26), o.hair || '#141414', [0, 1.82, -0.01]),
    P(box(0.12, 0.52, 0.13), kind === 'saree' ? skin : shirt, [-0.3, 1.18, 0], [0, 0, 0.06]),
    P(box(0.12, 0.52, 0.13), kind === 'saree' ? skin : shirt, [0.3, 1.18, 0], [0, 0, -0.06]),
    P(box(0.1, 0.1, 0.1), skin, [-0.32, 0.88, 0]), P(box(0.1, 0.1, 0.1), skin, [0.32, 0.88, 0]),
  ];
  if (kind === 'lungi') parts.push(P(box(0.46, 0.5, 0.3), o.lungi || pick(LUNGI), [0, 0.68, 0]));
  if (kind === 'saree') { parts.push(P(box(0.5, 0.82, 0.34), o.saree || pick(SAREE), [0, 0.5, 0])); parts.push(P(box(0.2, 0.5, 0.05), '#facc15', [0.12, 1.25, 0.14], [0, 0, 0.4])); }
  if (o.cap) parts.push(P(box(0.3, 0.08, 0.34), o.cap, [0, 1.86, 0.03]));
  const body = mesh(merge(parts)); g.add(body);
  const legCol = kind === 'shirt' ? (o.pants || pick(['#1f2937', '#334155', '#78350f', '#1e3a8a'])) : skin;
  const legGeo = merge([P(box(0.17, 0.86, 0.18), legCol, [0, -0.43, 0]), P(box(0.18, 0.08, 0.28), '#111827', [0, -0.86, 0.04])]);
  const legL = mesh(legGeo), legR = mesh(legGeo);
  legL.position.set(-0.12, 0.9, 0); legR.position.set(0.12, 0.9, 0);
  if (kind !== 'saree') { g.add(legL); g.add(legR); }
  g.legL = kind !== 'saree' ? legL : null; g.legR = kind !== 'saree' ? legR : null; g.body = body;
  return g;
}

/* ------------------------------------------------------------------ vehicles */
const wheel = (r, w, x, y, z) => P(cyl(r, r, w, 12), '#111111', [x, y, z], [0, 0, Math.PI / 2]);

export const VEHICLES = {
  scooter: { L: 1.8, W: 0.75, H: 1.2, maxV: 17, acc: 7, steer: 2.5, two: true, seat: [0, 0.55, -0.15], cam: 5.5, label: 'Scooter' },
  bike: { L: 2.1, W: 0.8, H: 1.2, maxV: 24, acc: 8.5, steer: 2.3, two: true, seat: [0, 0.62, -0.2], cam: 6, label: 'Motorbike' },
  auto: { L: 2.7, W: 1.4, H: 1.85, maxV: 13, acc: 4.2, steer: 2.0, seat: [0, 0.45, 0.35], cam: 7, label: 'Auto rickshaw' },
  car: { L: 3.8, W: 1.65, H: 1.45, maxV: 27, acc: 7, steer: 1.8, seat: [-0.35, 0.3, 0.1], cam: 8, label: 'Car' },
  jeep: { L: 4.1, W: 1.85, H: 1.95, maxV: 26, acc: 7.5, steer: 1.8, seat: [-0.4, 0.45, 0], cam: 8.5, label: 'Police jeep' },
  tempo: { L: 4.3, W: 1.75, H: 2.2, maxV: 18, acc: 4.5, steer: 1.6, seat: [-0.35, 0.55, 1.2], cam: 9, label: 'Tempo' },
  bus: { L: 10.6, W: 2.5, H: 3.25, maxV: 17, acc: 2.8, steer: 1.05, seat: [-0.8, 1.0, 4.4], cam: 15, label: 'Private bus' },
};

const BUS_NAMES = ['SRI DURGA', 'MAHALAXMI', 'SHREE GANESH', 'BHARATH', 'ANNAPOORNA', 'VIJAYA', 'SURYA', 'JAI HANUMAN', 'NAVARATNA', 'KADRI', 'SRI KRISHNA'];
const BUS_COLS = [['#dc2626', '#facc15'], ['#2563eb', '#f8fafc'], ['#16a34a', '#fde047'], ['#7c3aed', '#fb923c'], ['#ea580c', '#f8fafc'], ['#0f766e', '#facc15'], ['#be123c', '#38bdf8']];
const CAR_COLS = ['#f8fafc', '#e5e7eb', '#9ca3af', '#1f2937', '#b91c1c', '#1d4ed8', '#a16207', '#065f46'];

/** Build a vehicle model facing +z, wheels on y=0. Returns {group, def}. */
export function vehicle(kind, o = {}) {
  const d = VEHICLES[kind], g = new THREE.Group(), parts = [], glow = [];
  const L = d.L, W = d.W, H = d.H;
  if (kind === 'scooter' || kind === 'bike') {
    const c = o.color || (kind === 'bike' ? pick(['#111827', '#7f1d1d', '#1e3a8a']) : pick(['#b91c1c', '#1d4ed8', '#f8fafc', '#4d7c0f', '#6b7280', '#facc15']));
    parts.push(wheel(0.28, 0.12, 0, 0.28, L / 2 - 0.3), wheel(0.28, 0.12, 0, 0.28, -L / 2 + 0.3));
    if (kind === 'scooter') {
      parts.push(P(box(0.5, 0.35, 0.9), c, [0, 0.55, -0.25]), P(box(0.44, 0.75, 0.22), c, [0, 0.72, 0.5]), P(box(0.42, 0.12, 0.7), '#1f2937', [0, 0.78, -0.25]),
        P(box(0.6, 0.06, 0.06), '#374151', [0, 1.12, 0.55]), P(box(0.08, 0.4, 0.08), '#374151', [0, 0.95, 0.58]), P(box(0.36, 0.2, 0.5), c, [0, 0.4, 0.1]));
    } else {
      parts.push(P(box(0.32, 0.28, 0.6), c, [0, 0.82, 0.25]), P(box(0.3, 0.12, 0.7), '#111', [0, 0.86, -0.35]), P(box(0.25, 0.3, 0.5), '#9ca3af', [0, 0.5, 0]),
        P(box(0.7, 0.05, 0.05), '#9ca3af', [0, 1.1, 0.62]), P(box(0.07, 0.6, 0.07), '#6b7280', [0, 0.65, 0.75], [0.35, 0, 0]), P(box(0.12, 0.12, 0.9), '#d1d5db', [0.2, 0.35, -0.3]));
    }
    glow.push(P(box(0.16, 0.12, 0.04), '#fff7cc', [0, kind === 'bike' ? 1.0 : 0.95, L / 2 - 0.12]), P(box(0.14, 0.08, 0.04), '#ff2020', [0, 0.85, -L / 2 + 0.05]));
  } else if (kind === 'auto') {
    const top = o.top || '#facc15', body = o.body || '#15803d';
    parts.push(wheel(0.25, 0.16, 0, 0.25, 1.05), wheel(0.25, 0.16, -0.62, 0.25, -0.75), wheel(0.25, 0.16, 0.62, 0.25, -0.75));
    parts.push(P(box(1.35, 0.55, 1.7), body, [0, 0.62, -0.35]), P(box(0.95, 0.75, 0.7), body, [0, 0.75, 0.9]),
      P(box(1.42, 0.08, 2.2), top, [0, 1.82, -0.1]), P(box(1.36, 0.95, 0.08), top, [0, 1.35, -1.2]),
      P(box(0.06, 0.95, 0.06), '#111', [0.62, 1.35, 0.95]), P(box(0.06, 0.95, 0.06), '#111', [-0.62, 1.35, 0.95]),
      P(box(1.2, 0.6, 0.04), '#9ec5d6', [0, 1.42, 1.0], [-0.15, 0, 0]), P(box(1.1, 0.35, 0.5), '#111827', [0, 1.0, -0.7]),
      P(box(1.36, 0.08, 1.7), '#0f172a', [0, 0.92, -0.35]));
    glow.push(P(box(0.2, 0.15, 0.04), '#fff7cc', [0, 0.95, 1.26]), P(box(0.14, 0.1, 0.04), '#ff2020', [0.5, 0.55, -1.22]), P(box(0.14, 0.1, 0.04), '#ff2020', [-0.5, 0.55, -1.22]));
  } else if (kind === 'car' || kind === 'jeep') {
    const c = kind === 'jeep' ? '#f1f5f9' : (o.color || pick(CAR_COLS));
    const wr = kind === 'jeep' ? 0.38 : 0.32, hx = W / 2 - 0.05, fz = L / 2 - 0.75;
    parts.push(wheel(wr, 0.22, hx, wr, fz), wheel(wr, 0.22, -hx, wr, fz), wheel(wr, 0.22, hx, wr, -fz), wheel(wr, 0.22, -hx, wr, -fz));
    parts.push(P(box(W, 0.62, L), c, [0, wr + 0.32, 0]));
    if (kind === 'car') {
      parts.push(P(box(W - 0.12, 0.55, L * 0.52), c, [0, wr + 0.9, -0.2]), P(box(W - 0.1, 0.45, 0.05), '#1e293b', [0, wr + 0.9, L * 0.06 + 0.05], [-0.35, 0, 0]),
        P(box(W - 0.06, 0.4, L * 0.5), '#1e293b', [0, wr + 0.92, -0.2]), P(box(W + 0.02, 0.12, 0.2), '#475569', [0, wr + 0.12, L / 2]), P(box(W + 0.02, 0.12, 0.2), '#475569', [0, wr + 0.12, -L / 2]));
    } else {
      parts.push(P(box(W - 0.05, 0.85, L * 0.6), '#f1f5f9', [0, wr + 1.05, -0.4]), P(box(W - 0.02, 0.5, L * 0.58), '#1e293b', [0, wr + 1.1, -0.4]),
        P(box(W + 0.01, 0.2, L * 0.98), '#1d4ed8', [0, wr + 0.5, 0]), P(box(0.5, 0.12, 0.25), '#ef4444', [-0.3, wr + 1.55, 0]), P(box(0.5, 0.12, 0.25), '#3b82f6', [0.3, wr + 1.55, 0]));
    }
    glow.push(P(box(0.3, 0.14, 0.04), '#fff7cc', [W / 2 - 0.3, wr + 0.45, L / 2 + 0.01]), P(box(0.3, 0.14, 0.04), '#fff7cc', [-W / 2 + 0.3, wr + 0.45, L / 2 + 0.01]),
      P(box(0.28, 0.12, 0.04), '#ff2020', [W / 2 - 0.25, wr + 0.45, -L / 2 - 0.01]), P(box(0.28, 0.12, 0.04), '#ff2020', [-W / 2 + 0.25, wr + 0.45, -L / 2 - 0.01]));
  } else if (kind === 'tempo') {
    const c = o.color || pick(['#f8fafc', '#facc15', '#0ea5e9']);
    parts.push(wheel(0.33, 0.2, 0.75, 0.33, 1.3), wheel(0.33, 0.2, -0.75, 0.33, 1.3), wheel(0.33, 0.2, 0.75, 0.33, -1.3), wheel(0.33, 0.2, -0.75, 0.33, -1.3));
    parts.push(P(box(W, 1.35, 1.2), c, [0, 1.1, 1.45]), P(box(W - 0.1, 0.55, 0.05), '#1e293b', [0, 1.45, 2.06]), P(box(W, 0.2, 3.0), '#334155', [0, 0.62, -0.6]),
      P(box(0.08, 0.55, 3.0), '#64748b', [W / 2 - 0.04, 0.98, -0.6]), P(box(0.08, 0.55, 3.0), '#64748b', [-W / 2 + 0.04, 0.98, -0.6]),
      P(box(W - 0.2, 0.7, 2.6), pick(['#fb923c', '#a3e635', '#fde047', '#f87171']), [0, 1.08, -0.7]));
    glow.push(P(box(0.25, 0.14, 0.04), '#fff7cc', [0.6, 0.8, 2.06]), P(box(0.25, 0.14, 0.04), '#fff7cc', [-0.6, 0.8, 2.06]));
  } else if (kind === 'bus') {
    const [c1, c2] = o.cols || pick(BUS_COLS);
    const wz = L / 2 - 1.7;
    parts.push(wheel(0.5, 0.3, 1.1, 0.5, wz), wheel(0.5, 0.3, -1.1, 0.5, wz), wheel(0.5, 0.3, 1.1, 0.5, -wz + 0.6), wheel(0.5, 0.3, -1.1, 0.5, -wz + 0.6));
    parts.push(P(box(W, 1.3, L), c1, [0, 1.15, 0]), P(box(W, 1.0, L), c2, [0, 2.3, 0]), P(box(W + 0.02, 0.75, L - 1.2), '#1e293b', [0, 2.25, -0.4]),
      P(box(W - 0.1, 0.9, 0.05), '#1e293b', [0, 2.2, L / 2 + 0.01]), P(box(W, 0.16, L), c1, [0, 2.86, 0]), P(box(W - 0.3, 0.2, L - 1), '#475569', [0, 3.05, 0]),
      P(box(0.04, 1.7, 0.9), '#0f172a', [W / 2 + 0.01, 1.6, L / 2 - 1.2]), P(box(0.04, 1.7, 0.9), '#0f172a', [W / 2 + 0.01, 1.6, -L / 2 + 1.6]),
      P(box(W + 0.03, 0.12, L), '#f8fafc', [0, 1.78, 0]));
    for (let i = 0; i < 7; i++) parts.push(P(box(W + 0.03, 0.06, 0.06), '#e2e8f0', [0, 2.25, -L / 2 + 1.0 + i * 1.3]));
    glow.push(P(box(0.35, 0.18, 0.04), '#fff7cc', [0.85, 0.9, L / 2 + 0.01]), P(box(0.35, 0.18, 0.04), '#fff7cc', [-0.85, 0.9, L / 2 + 0.01]),
      P(box(0.3, 0.2, 0.04), '#ff2020', [0.9, 0.9, -L / 2 - 0.01]), P(box(0.3, 0.2, 0.04), '#ff2020', [-0.9, 0.9, -L / 2 - 0.01]));
    const name = o.name || pick(BUS_NAMES);
    const s = signMesh([name], 2.2, 0.42, { bg: '#111827', fg: '#fde047', border: false, w: 512, h: 96 });
    s.position.set(0, 2.98, L / 2 + 0.03); g.add(s);
    const side = signMesh([name, 'KARKALA - UDUPI'], 4.5, 0.75, { bg: c2, fg: c1, border: false, w: 768, h: 128 });
    side.position.set(W / 2 + 0.03, 1.15, 0.6); side.rotation.y = Math.PI / 2; g.add(side);
    const side2 = side.clone(); side2.position.x = -W / 2 - 0.03; side2.rotation.y = -Math.PI / 2; g.add(side2);
    g.userData.busName = name;
  }
  g.add(mesh(merge(parts), kind === 'car' || kind === 'jeep' ? MAT.shiny : MAT.solid));
  if (glow.length) { const gm = mesh(merge(glow), MAT.glow, false); g.add(gm); }
  if (kind === 'jeep') {
    const s = signMesh(['POLICE'], 1.4, 0.3, { bg: '#1d4ed8', fg: '#fff', border: false, w: 256, h: 64 });
    s.position.set(W / 2 + 0.02, 1.0, 0.5); s.rotation.y = Math.PI / 2; g.add(s);
    const s2 = s.clone(); s2.position.x = -W / 2 - 0.02; s2.rotation.y = -Math.PI / 2; g.add(s2);
  }
  return { group: g, def: d };
}

/* ------------------------------------------------------------------ animals & props */
export function cow() {
  const c = pick(['#f5f5f4', '#e7e5e4', '#78350f', '#a8a29e', '#d6d3d1']);
  const g = new THREE.Group();
  g.add(mesh(merge([
    P(box(0.75, 0.75, 1.6), c, [0, 1.0, 0]), P(box(0.42, 0.42, 0.55), c, [0, 1.3, 1.0]), P(box(0.3, 0.2, 0.22), '#d6a77a', [0, 1.18, 1.3]),
    P(cone(0.05, 0.3, 5), '#e5e7eb', [0.15, 1.6, 0.95], [0, 0, -0.5]), P(cone(0.05, 0.3, 5), '#e5e7eb', [-0.15, 1.6, 0.95], [0, 0, 0.5]),
    P(box(0.38, 0.28, 0.4), c, [0, 1.45, 0.45]), P(box(0.05, 0.6, 0.05), c, [0, 0.9, -0.85], [0.3, 0, 0]),
    ...[[-0.25, 0.55], [0.25, 0.55], [-0.25, -0.55], [0.25, -0.55]].map(([x, z]) => P(box(0.15, 0.65, 0.15), c, [x, 0.33, z])),
  ])));
  return g;
}

/** Coconut palm (trunk + crown) geometries for instancing. Height ~10 m. */
export function palmGeos() {
  const trunk = merge([P(cyl(0.16, 0.24, 9.5, 7), '#8b7355', [0, 4.75, 0])]);
  const fr = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    fr.push(P(box(0.55, 0.05, 3.4), i % 2 ? '#3f7d2c' : '#4d8f32', [Math.sin(a) * 1.5, 9.4, Math.cos(a) * 1.5], [0.5, a, 0]));
  }
  fr.push(P(sph(0.45, 6, 4), '#6b8e23', [0, 9.4, 0]));
  return { trunk, crown: merge(fr) };
}
export function treeGeos() {
  const trunk = merge([P(cyl(0.25, 0.4, 3.2, 7), '#6b4f3a', [0, 1.6, 0])]);
  const crown = merge([P(new THREE.IcosahedronGeometry(3.1, 0), '#2f6b2a', [0, 4.6, 0]), P(new THREE.IcosahedronGeometry(2.3, 0), '#3a7d32', [1.4, 5.6, 0.6]), P(new THREE.IcosahedronGeometry(2.0, 0), '#2a5f25', [-1.3, 5.3, -0.7])]);
  return { trunk, crown };
}

/* ------------------------------------------------------------------ landmarks */
/** Gomateshwara-style monolithic standing figure, ~13 m tall, faces +z. Stylised, granite grey. */
export function statue() {
  const s = '#bdb6a6', d = '#a39c8c', v = '#6f8f4e', g = new THREE.Group();
  const p = [
    P(box(5.4, 1.2, 5.4), '#8c877d', [0, 0.6, 0]), P(box(3.8, 0.7, 3.4), d, [0, 1.55, 0]),
    P(box(0.8, 0.45, 1.4), s, [-0.55, 2.1, 0.2]), P(box(0.8, 0.45, 1.4), s, [0.55, 2.1, 0.2]),
    P(box(0.72, 3.2, 0.82), s, [-0.55, 3.9, 0]), P(box(0.72, 3.2, 0.82), s, [0.55, 3.9, 0]),
    P(box(0.92, 2.7, 1.0), s, [-0.55, 6.8, 0]), P(box(0.92, 2.7, 1.0), s, [0.55, 6.8, 0]),
    P(box(2.0, 1.1, 1.1), s, [0, 8.5, 0]), P(box(1.85, 1.2, 1.05), s, [0, 9.5, 0]),
    P(box(2.6, 1.7, 1.25), s, [0, 10.8, 0]), P(box(3.3, 0.75, 1.2), s, [0, 11.9, 0]),
    P(box(0.62, 2.5, 0.66), s, [-1.62, 10.6, 0]), P(box(0.62, 2.5, 0.66), s, [1.62, 10.6, 0]),
    P(box(0.56, 2.7, 0.6), s, [-1.66, 8.1, 0.02]), P(box(0.56, 2.7, 0.6), s, [1.66, 8.1, 0.02]),
    P(box(0.5, 0.9, 0.5), s, [-1.66, 6.3, 0.05]), P(box(0.5, 0.9, 0.5), s, [1.66, 6.3, 0.05]),
    P(box(0.62, 0.5, 0.6), s, [0, 12.5, 0]), P(box(1.25, 1.5, 1.3), s, [0, 13.45, 0.02]),
    P(box(1.36, 0.55, 1.4), '#7d776b', [0, 14.35, 0]), P(box(0.95, 0.3, 1.0), '#7d776b', [0, 14.7, 0]),
    P(box(0.2, 1.05, 0.35), s, [-0.72, 13.2, 0]), P(box(0.2, 1.05, 0.35), s, [0.72, 13.2, 0]),
    P(box(0.5, 0.12, 0.1), '#8a8476', [0, 13.15, 0.67]), P(box(0.18, 0.08, 0.06), '#5c574d', [-0.25, 13.6, 0.68]), P(box(0.18, 0.08, 0.06), '#5c574d', [0.25, 13.6, 0.68]),
    P(box(1.2, 4.0, 1.0), '#8c877d', [-2.6, 3.2, -0.3]), P(box(1.2, 4.0, 1.0), '#8c877d', [2.6, 3.2, -0.3]),   // ant-hill rocks either side
  ];
  for (let i = 0; i < 9; i++) { const y = 2.6 + i * 0.68; p.push(P(box(0.86, 0.13, 0.95), v, [-0.55, y, 0], [0, 0, i % 2 ? 0.45 : -0.45]), P(box(0.86, 0.13, 0.95), v, [0.55, y + 0.3, 0], [0, 0, i % 2 ? -0.45 : 0.45])); }
  for (let i = 0; i < 6; i++) { const y = 7.0 + i * 0.75; p.push(P(box(0.7, 0.11, 0.72), v, [-1.64, y, 0], [0, 0, 0.5]), P(box(0.7, 0.11, 0.72), v, [1.64, y + 0.35, 0], [0, 0, -0.5])); }
  g.add(mesh(merge(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, emissive: '#57524a', emissiveIntensity: 0.55 }))); return g;
}

/** Chaturmukha (four-faced) basadi: granite hall with pillared porches on all four sides. */
export function basadi(scale = 1) {
  const gr = '#a39b8b', dk = '#857d6e', p = [P(box(24, 1.2, 24), '#8f887a', [0, 0.6, 0]), P(box(15, 6.5, 15), gr, [0, 4.4, 0]), P(box(17, 0.8, 17), dk, [0, 8.0, 0]), P(box(12, 1.6, 12), gr, [0, 9.2, 0]), P(box(8, 1.2, 8), dk, [0, 10.6, 0]), P(box(3, 2.2, 3), gr, [0, 12.3, 0])];
  for (const [dx, dz, rot] of [[0, 1, 0], [0, -1, 0], [1, 0, 1], [-1, 0, 1]]) {
    for (let i = -2; i <= 2; i++) { const ax = rot ? dx * 10 : i * 2.6, az = rot ? i * 2.6 : dz * 10; p.push(P(box(0.9, 6.0, 0.9), '#b5ad9c', [ax, 4.2, az])); }
    p.push(P(box(rot ? 4.5 : 15, 0.7, rot ? 15 : 4.5), dk, [dx * 9.5, 7.4, dz * 9.5]));
    p.push(P(box(rot ? 0.4 : 3.2, 4.5, rot ? 3.2 : 0.4), '#2b2620', [dx * 7.55, 3.6, dz * 7.55]));
  }
  const g = new THREE.Group(); g.add(mesh(merge(p))); g.scale.setScalar(scale); return g;
}

/** South-Indian temple: compound wall, mandapa with tiled roof, small gopura and a flag post. */
export function temple() {
  const p = [P(box(30, 2.2, 0.6), '#f1e6cf', [0, 1.1, 15]), P(box(30, 2.2, 0.6), '#f1e6cf', [0, 1.1, -15]), P(box(0.6, 2.2, 30), '#f1e6cf', [15, 1.1, 0]), P(box(0.6, 2.2, 30), '#f1e6cf', [-15, 1.1, 0]),
    P(box(30.2, 0.25, 0.8), '#b45309', [0, 2.3, 15]), P(box(30.2, 0.25, 0.8), '#b45309', [0, 2.3, -15]), P(box(0.8, 0.25, 30.2), '#b45309', [15, 2.3, 0]), P(box(0.8, 0.25, 30.2), '#b45309', [-15, 2.3, 0]),
    P(box(12, 4.5, 14), '#f3ead8', [0, 2.25, -4]), P(box(14, 0.4, 16), '#9a3412', [0, 4.7, -4]),
    P(cone(9.2, 3.6, 4), '#b4471b', [0, 6.6, -4], [0, Math.PI / 4, 0], [1, 1, 1.15]),
    P(box(5, 3.5, 5), '#e9dcc1', [0, 8.0, -7]), P(box(4, 2.5, 4), '#d8b98a', [0, 10.8, -7]), P(box(3, 2.0, 3), '#e9dcc1', [0, 13.0, -7]), P(sph(1.3, 8, 6), '#d97706', [0, 14.6, -7]),
    P(box(7.4, 5.5, 3.2), '#f5ecd9', [0, 2.75, 15]), P(box(7.8, 0.35, 3.6), '#b45309', [0, 5.65, 15]),
    P(box(6.2, 1.6, 2.8), '#fca5a5', [0, 6.6, 15]), P(box(5.2, 1.5, 2.5), '#fde68a', [0, 8.15, 15]), P(box(4.2, 1.4, 2.2), '#93c5fd', [0, 9.6, 15]), P(box(3.2, 1.3, 1.9), '#86efac', [0, 10.95, 15]),
    P(box(3.6, 0.9, 1.4), '#f97316', [0, 12.0, 15]), P(sph(0.35, 8, 6), '#eab308', [-1.1, 12.8, 15]), P(sph(0.35, 8, 6), '#eab308', [0, 12.8, 15]), P(sph(0.35, 8, 6), '#eab308', [1.1, 12.8, 15]),
    P(box(0.25, 1.2, 0.25), '#dc2626', [-1.6, 6.6, 16.45]), P(box(0.25, 1.2, 0.25), '#16a34a', [1.6, 6.6, 16.45]), P(box(0.25, 1.1, 0.25), '#2563eb', [-1.2, 8.15, 16.3]), P(box(0.25, 1.1, 0.25), '#db2777', [1.2, 8.15, 16.3]),
    P(box(2.6, 4.0, 0.2), '#3b2412', [0, 2.0, 16.65]), P(box(0.5, 0.5, 0.4), '#facc15', [-1.6, 4.6, 16.7]), P(box(0.5, 0.5, 0.4), '#facc15', [1.6, 4.6, 16.7]),
    P(box(1.4, 1.2, 1.4), '#9ca3af', [0, 0.6, 8]), P(cyl(0.18, 0.25, 11, 8), '#d4a017', [0, 6.5, 8]), P(box(0.9, 0.3, 0.9), '#d4a017', [0, 12.1, 8]),
  ];
  const g = new THREE.Group(); g.add(mesh(merge(p))); return g;
}

/** Bus stand: long platform, sheet roof on pillars, a ticket booth. */
export function busStand() {
  const p = [P(box(46, 0.4, 9), '#9ca3af', [0, 0.2, 0]), P(box(48, 0.35, 11), '#64748b', [0, 5.2, 0])];
  for (let i = -5; i <= 5; i++) { p.push(P(box(0.45, 5, 0.45), '#e5e7eb', [i * 4.4, 2.6, 4.6]), P(box(0.45, 5, 0.45), '#e5e7eb', [i * 4.4, 2.6, -4.2])); }
  for (let i = -4; i <= 4; i++) p.push(P(box(3, 0.45, 0.6), '#a16207', [i * 4.4, 0.7, -2.5]));
  p.push(P(box(8, 3.5, 4), '#fde68a', [-16, 2.15, -2]), P(box(48, 0.5, 0.3), '#f8fafc', [0, 5.45, 5.6]));
  const g = new THREE.Group(); g.add(mesh(merge(p)));
  const s = signMesh(['ಕಾರ್ಕಳ ಬಸ್ ನಿಲ್ದಾಣ', 'KARKALA BUS STAND'], 14, 2.4, { bg: '#b91c1c', fg: '#fff', w: 1024, h: 176 });
  s.position.set(0, 6.6, 5.8); g.add(s); return g;
}

/** Market stall with an awning and coloured produce. */
export function stallGeo() {
  return merge([P(box(2.6, 0.9, 1.6), '#7c4a21', [0, 0.45, 0]), P(box(2.4, 0.25, 1.4), '#f59e0b', [0, 1.0, 0]), P(box(0.8, 0.2, 0.6), '#dc2626', [-0.7, 1.15, 0.2]), P(box(0.8, 0.2, 0.6), '#65a30d', [0.6, 1.15, -0.2]),
    P(box(0.08, 2.4, 0.08), '#57534e', [1.25, 1.2, 0.75]), P(box(0.08, 2.4, 0.08), '#57534e', [-1.25, 1.2, 0.75]), P(box(0.08, 2.4, 0.08), '#57534e', [1.25, 1.2, -0.75]), P(box(0.08, 2.4, 0.08), '#57534e', [-1.25, 1.2, -0.75]),
    P(box(3.0, 0.08, 2.0), '#2563eb', [0, 2.45, 0], [0.12, 0, 0])]);
}

/** Street light: pole + arm (solid) and the lamp (glow) for instancing. */
export function lampGeos() {
  return { pole: merge([P(cyl(0.08, 0.12, 7, 6), '#6b7280', [0, 3.5, 0]), P(box(0.1, 0.1, 1.6), '#6b7280', [0, 7, 0.75])]), lamp: merge([P(box(0.4, 0.15, 0.6), '#fff1b8', [0, 6.9, 1.45])]) };
}

/** Floating mission marker. */
export function markerMesh(color = '#facc15') {
  const g = new THREE.Group();
  const cylm = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.15, 32, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: THREE.DoubleSide, toneMapped: false }));
  cylm.position.y = 0.1; g.add(cylm);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.0, 30, 24, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
  beam.position.y = 15; g.add(beam);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.6, 4), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
  arrow.rotation.x = Math.PI; arrow.position.y = 4; g.add(arrow); g.arrow = arrow;
  return g;
}
