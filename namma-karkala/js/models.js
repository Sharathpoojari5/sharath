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
  const pos = [], nor = [], col = [], uv = [];
  for (const p of parts) {
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
    _e.set(p.rot[0], p.rot[1], p.rot[2], p.rot[3] || 'XYZ'); _q.setFromEuler(_e);
    _m.compose(new THREE.Vector3(...p.pos), _q, new THREE.Vector3(...p.scl));
    g.applyMatrix4(_m);
    _c.set(p.color);
    const a = g.attributes.position.array, n = g.attributes.normal.array;
    for (let i = 0; i < a.length; i++) { pos.push(a[i]); nor.push(n[i]); }
    for (let i = 0; i < a.length / 3; i++) col.push(_c.r, _c.g, _c.b);
    const u = g.attributes.uv ? g.attributes.uv.array : null;
    for (let i = 0; i < a.length / 3; i++) uv.push(u ? u[i * 2] : 0, u ? u[i * 2 + 1] : 0);
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  out.computeBoundingSphere();
  return out;
}

/** 1 = full surface detail (weathering, grass patches); the quality governor sets 0 on slow machines. */
export const DETAIL = { value: 1 };
export const GLSL_NOISE = `
  float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
  float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + 11.7; a *= .5; } return s; }
`;
/** Procedural stone: dressed-stone courses with mortar lines (basadi) or speckled weathered granite (the statue), with lichen at the base and rain streaks. */
function stoneMat(kind) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93 });
  m.customProgramCacheKey = () => 'stone2-' + kind;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uDetail = DETAIL;
    sh.vertexShader = 'varying vec3 vP; varying vec3 vN;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vP = position; vN = normal;');
    sh.fragmentShader = GLSL_NOISE + 'uniform float uDetail; varying vec3 vP; varying vec3 vN;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      if (uDetail > 0.5) {
      vec3 an = abs(vN); vec2 q = an.y > 0.7 ? vP.xz : (an.x > an.z ? vP.zy : vP.xy);
      ${kind === 'block' ? `
      float rowH = 0.55, row = floor(q.y / rowH); float off = mod(row, 2.0) * 0.5; vec2 cell = vec2(q.x / 1.3 + off, q.y / rowH); vec2 id = floor(cell), f = fract(cell);
      float mortar = clamp(step(f.x, 0.035) + step(f.y, 0.06), 0., 1.);
      diffuseColor.rgb *= (0.88 + 0.24 * h2(id)) * (0.84 + 0.32 * fbm(q * 1.7));
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.45, mortar);` : `
      float speck = fbm(vP.xy * 14. + vP.z * 9.), grain = fbm(vP.xz * 3.5 + vP.y * 2.); diffuseColor.rgb *= (0.7 + 0.6 * speck) * (0.86 + 0.28 * grain);
      float tone = fbm(vP.xy * 0.35 + vP.z * 0.25); diffuseColor.rgb *= mix(vec3(1.06, 0.99, 0.9), vec3(0.88, 0.92, 1.02), tone) * (0.82 + 0.36 * tone);
      diffuseColor.rgb *= 1. - 0.5 * smoothstep(0.012, 0.0, abs(fbm(vP.xz * 0.6 + vP.y * 0.4) - 0.5));      // joints in the rock`}
      float lichen = (1. - smoothstep(0., 3.2, vP.y)) * smoothstep(0.45, 0.78, fbm(q * 0.9 + 3.)); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.25, 0.33, 0.17), lichen * 0.5);
      float streak = smoothstep(0.55, 0.9, fbm(vec2(q.x * 3.0, q.y * 0.15))); diffuseColor.rgb *= 1. - 0.22 * streak;
      }`);
  };
  return m;
}
export const MAT = {
  solid: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05 }),
  shiny: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.25 }),
  glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
  gold: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.26, metalness: 0.92 }),
  stone: stoneMat('block'),
  granite: stoneMat('granite'),
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
  const older = o.age != null ? o.age > 0.6 : Math.random() < 0.22, shirt = o.shirt || pick(SHIRT), hair = o.hair || (older ? pick(['#9ca3af', '#d1d5db', '#6b7280']) : '#141414'), saree = o.saree || pick(SAREE);
  const top = kind === 'saree' ? saree : shirt, TAU = Math.PI * 2;
  const parts = [
    // torso with rounded shoulders and a neck
    P(cyl(0.2, 0.165, 0.64, 12), top, [0, 1.19, 0], [0, 0, 0], [1.12, 1, 0.76]), P(sph(0.205, 12, 6), top, [0, 1.47, 0], [0, 0, 0], [1.12, 0.4, 0.72]),
    P(cyl(0.052, 0.06, 0.11, 8), skin, [0, 1.56, 0]),
    // head: egg shape, ears, nose, eyes with whites, brows, mouth, hair cap
    P(sph(0.125, 14, 10), skin, [0, 1.69, 0], [0, 0, 0], [0.94, 1.13, 1.0]), P(sph(0.03, 6, 4), skin, [-0.118, 1.69, 0], [0, 0, 0], [0.5, 1, 0.8]), P(sph(0.03, 6, 4), skin, [0.118, 1.69, 0], [0, 0, 0], [0.5, 1, 0.8]),
    P(cone(0.024, 0.055, 4), skin, [0, 1.665, 0.126], [Math.PI / 2, 0, 0]),
    P(sph(0.019, 6, 4), '#f8fafc', [-0.046, 1.71, 0.112], [0, 0, 0], [1.2, 0.7, 0.5]), P(sph(0.019, 6, 4), '#f8fafc', [0.046, 1.71, 0.112], [0, 0, 0], [1.2, 0.7, 0.5]),
    P(sph(0.0105, 6, 4), '#0b0b0b', [-0.046, 1.71, 0.121]), P(sph(0.0105, 6, 4), '#0b0b0b', [0.046, 1.71, 0.121]),
    P(box(0.055, 0.011, 0.012), hair, [-0.046, 1.745, 0.115], [0, 0, 0.1]), P(box(0.055, 0.011, 0.012), hair, [0.046, 1.745, 0.115], [0, 0, -0.1]),
    P(box(0.05, 0.011, 0.012), '#7a2e2a', [0, 1.625, 0.117]),
    P(new THREE.SphereGeometry(0.133, 12, 8, 0, TAU, 0, Math.PI * 0.56), hair, [0, 1.705, -0.012], [-0.32, 0, 0], [0.97, 1.08, 1.02]),
  ];
  if (o.beard) parts.push(P(sph(0.1, 8, 6), o.beard, [0, 1.62, 0.03], [0, 0, 0], [0.9, 0.55, 0.8]));
  if (kind === 'lungi') { parts.push(P(cyl(0.245, 0.3, 0.64, 14), o.lungi || pick(LUNGI), [0, 0.64, 0], [0, 0, 0], [1.0, 1, 0.78]), P(cyl(0.225, 0.225, 0.045, 12), '#7f1d1d', [0, 0.96, 0], [0, 0, 0], [1.0, 1, 0.78])); }
  else if (kind === 'saree') { parts.push(P(cyl(0.2, 0.36, 0.95, 16), saree, [0, 0.48, 0], [0, 0, 0], [1, 1, 0.85]), P(cyl(0.37, 0.37, 0.05, 16), '#facc15', [0, 0.04, 0], [0, 0, 0], [1, 1, 0.85]), P(box(0.17, 0.62, 0.06), '#facc15', [0.1, 1.24, 0.13], [0, 0, 0.5]), P(box(0.1, 0.5, 0.05), saree, [-0.14, 1.12, -0.17], [0, 0, 0.1])); }
  else parts.push(P(cyl(0.18, 0.18, 0.04, 12), '#1f1f1f', [0, 0.93, 0], [0, 0, 0], [1.12, 1, 0.76]), P(box(0.1, 0.05, 0.05), '#f8fafc', [0, 1.52, 0.1]));
  if (o.cap) parts.push(P(new THREE.SphereGeometry(0.142, 12, 6, 0, TAU, 0, Math.PI * 0.5), o.cap, [0, 1.75, 0.0], [-0.08, 0, 0], [1, 0.9, 1.05]), P(box(0.26, 0.012, 0.13), o.cap, [0, 1.76, 0.14]));
  // --- individuality: age, build, hairstyle, facial hair, glasses, jewellery, small clothing details (all cheap merged geometry)
  const R = Math.random, fem = kind === 'saree' || o.female;
  const hcol = hair;
  if (!fem) {
    const style = o.style != null ? o.style : Math.floor(R() * 4);
    if (style === 0) parts.push(P(box(0.2, 0.03, 0.04), hcol, [0, 1.8, 0.07], [0.3, 0, 0]));                                                                          // front quiff
    if (style === 1) parts.push(P(sph(0.1, 8, 6), skin, [0, 1.78, -0.04], [0, 0, 0], [1.1, 0.35, 1.0]));                                                                // receding / balding crown
    if (R() < 0.45) parts.push(P(box(0.1, 0.018, 0.02), older ? '#d1d5db' : '#0b0b0b', [0, 1.643, 0.122]), P(sph(0.012, 5, 4), older ? '#d1d5db' : '#0b0b0b', [-0.05, 1.64, 0.118]), P(sph(0.012, 5, 4), older ? '#d1d5db' : '#0b0b0b', [0.05, 1.64, 0.118]));   // moustache
    if (R() < 0.18) parts.push(P(box(0.11, 0.012, 0.012), '#f59e0b', [0, 1.76, 0.12]), P(box(0.014, 0.034, 0.012), '#dc2626', [0, 1.757, 0.121]));                      // tilaka
    if (R() < 0.16) parts.push(P(box(0.1, 0.02, 0.008), '#111', [-0.046, 1.705, 0.123]), P(box(0.1, 0.02, 0.008), '#111', [0.046, 1.705, 0.123]), P(box(0.025, 0.012, 0.008), '#111', [0, 1.71, 0.123]));      // spectacles
    if (kind === 'shirt') { for (let i = 0; i < 4; i++) parts.push(P(sph(0.011, 4, 3), '#e5e7eb', [0, 1.4 - i * 0.14, 0.1])); parts.push(P(box(0.07, 0.07, 0.03), top, [-0.07, 1.5, 0.108], [0, 0, 0.2]), P(box(0.07, 0.07, 0.03), top, [0.07, 1.5, 0.108], [0, 0, -0.2]), P(box(0.05, 0.06, 0.02), '#3a3a3a', [0.1, 1.33, 0.108])); }   // collar, buttons, pocket
    if (kind === 'lungi' || kind === 'shirt') parts.push(P(box(0.16, 0.03, 0.02), '#d4a017', [0, 0.93, 0.12]));                                                          // belt buckle
  } else {
    parts.push(P(sph(0.013, 5, 4), '#dc2626', [0, 1.745, 0.121]));                                                                                                      // bindi
    parts.push(P(sph(0.1, 8, 6), hair, [0, 1.52, -0.12], [0, 0, 0], [0.9, 2.4, 0.6]), P(cyl(0.028, 0.02, 0.5, 6), hair, [0.02, 1.2, -0.15]));                          // thick plait down the back
    for (let i = 0; i < 6; i++) parts.push(P(sph(0.017, 4, 3), '#f8fafc', [-0.08 + i * 0.03, 1.62 - i * 0.07, -0.16]));                                                  // jasmine strand
    parts.push(P(sph(0.014, 5, 4), '#facc15', [-0.12, 1.66, 0.01]), P(sph(0.014, 5, 4), '#facc15', [0.12, 1.66, 0.01]));                                                // ear studs
    parts.push(P(cyl(0.062, 0.062, 0.012, 10), '#facc15', [0, 1.55, 0.015], [Math.PI / 2, 0, 0], [1, 1, 1.2]));                                                         // gold necklace
    parts.push(P(box(0.052, 0.012, 0.012), '#9f1239', [0, 1.625, 0.119]));
  }
  if (older) { parts.push(P(box(0.05, 0.008, 0.01), '#5b3a29', [-0.046, 1.678, 0.122]), P(box(0.05, 0.008, 0.01), '#5b3a29', [0.046, 1.678, 0.122])); }       // crow's feet
  const body = mesh(merge(parts)); g.add(body);
  const legCol = kind === 'shirt' ? (o.pants || pick(['#1f2937', '#334155', '#78350f', '#1e3a8a'])) : skin;
  const legGeo = merge([P(cyl(0.085, 0.07, 0.86, 8), legCol, [0, -0.43, 0]), P(box(0.125, 0.07, 0.27), kind === 'shirt' ? '#111827' : '#292524', [0, -0.855, 0.05]), P(sph(0.07, 6, 4), legCol, [0, -0.43, 0.01], [0, 0, 0], [1, 0.4, 1])]);
  const legL = mesh(legGeo), legR = mesh(legGeo);
  legL.position.set(-0.115, 0.9, 0); legR.position.set(0.115, 0.9, 0);
  if (kind !== 'saree') { g.add(legL); g.add(legR); }
  // arms hang from the shoulder so they can swing when walking
  const sleeve = kind === 'saree' ? saree : shirt;
  const armParts = [P(sph(0.058, 8, 6), sleeve, [0, 0, 0]), P(cyl(0.052, 0.046, 0.3, 8), sleeve, [0, -0.15, 0]), P(sph(0.047, 7, 5), kind === 'shirt' ? sleeve : skin, [0, -0.3, 0]), P(cyl(0.042, 0.037, 0.27, 8), skin, [0, -0.43, 0]), P(sph(0.046, 8, 6), skin, [0, -0.59, 0.005], [0, 0, 0], [1, 1.15, 0.8]), P(box(0.014, 0.05, 0.025), skin, [0.035, -0.58, 0.03], [0, 0, 0.3])];
  if (fem) armParts.push(P(cyl(0.045, 0.045, 0.012, 8), '#dc2626', [0, -0.5, 0]), P(cyl(0.045, 0.045, 0.012, 8), '#facc15', [0, -0.52, 0]), P(cyl(0.045, 0.045, 0.012, 8), '#16a34a', [0, -0.54, 0]));
  else if (R() < 0.5) armParts.push(P(cyl(0.043, 0.043, 0.02, 8), '#374151', [0, -0.53, 0]), P(box(0.03, 0.005, 0.03), '#e5e7eb', [0, -0.53, 0.04]));
  const armGeo = merge(armParts);
  const armL = mesh(armGeo), armR = mesh(armGeo); armL.position.set(-0.285, 1.47, 0); armR.position.set(0.285, 1.47, 0); armL.rotation.z = 0.06; armR.rotation.z = -0.06; g.add(armL); g.add(armR); g.armL = armL; g.armR = armR;
  g.legL = kind !== 'saree' ? legL : null; g.legR = kind !== 'saree' ? legR : null; g.body = body;
  return g;
}

/* ------------------------------------------------------------------ vehicles */
export const VEHICLES = {
  cycle: { L: 1.75, W: 0.6, H: 1.1, maxV: 7.5, acc: 2.6, steer: 2.6, two: true, open: true, seat: [0, 0.55, -0.15], cam: 5, label: 'Bicycle', wr: 0.33 },
  scooter: { L: 1.8, W: 0.75, H: 1.2, maxV: 17, acc: 7, steer: 2.5, two: true, open: true, seat: [0, 0.55, -0.15], cam: 5.5, label: 'Scooter', wr: 0.27 },
  bike: { L: 2.1, W: 0.8, H: 1.2, maxV: 24, acc: 8.5, steer: 2.3, two: true, open: true, seat: [0, 0.62, -0.2], cam: 6, label: 'Motorbike', wr: 0.32 },
  scooty: { L: 1.75, W: 0.72, H: 1.2, maxV: 19, acc: 7.5, steer: 2.6, two: true, open: true, seat: [0, 0.55, -0.15], cam: 5.5, label: 'Scooty', wr: 0.25 },
  moped: { L: 1.7, W: 0.6, H: 1.1, maxV: 12, acc: 4.5, steer: 2.7, two: true, open: true, seat: [0, 0.55, -0.15], cam: 5.2, label: 'Moped', wr: 0.24 },
  sportbike: { L: 2.0, W: 0.75, H: 1.15, maxV: 31, acc: 10, steer: 2.2, two: true, open: true, seat: [0, 0.6, -0.15], cam: 6, label: 'Sports bike', wr: 0.3 },
  auto: { L: 2.7, W: 1.4, H: 1.85, maxV: 13, acc: 4.2, steer: 2.0, open: true, seat: [0, 0.45, 0.35], cam: 7, label: 'Auto rickshaw', wr: 0.25 },
  car: { L: 3.8, W: 1.65, H: 1.45, maxV: 27, acc: 7, steer: 1.8, seat: [-0.35, 0.3, 0.1], cam: 8, label: 'Car', wr: 0.31 },
  hatch: { L: 3.6, W: 1.6, H: 1.5, maxV: 25, acc: 7, steer: 1.9, seat: [-0.35, 0.3, 0.1], cam: 8, label: 'Hatchback', wr: 0.29 },
  sedan: { L: 4.3, W: 1.7, H: 1.42, maxV: 29, acc: 7.2, steer: 1.8, seat: [-0.35, 0.3, 0.1], cam: 8.5, label: 'Sedan', wr: 0.31 },
  taxi: { L: 4.2, W: 1.7, H: 1.5, maxV: 22, acc: 5.5, steer: 1.8, seat: [-0.35, 0.3, 0.1], cam: 8.5, label: 'Taxi (Ambassador)', wr: 0.32 },
  pickup: { L: 4.9, W: 1.8, H: 1.85, maxV: 21, acc: 5, steer: 1.6, seat: [-0.4, 0.5, 0.9], cam: 9, label: 'Pickup', wr: 0.35 },
  minitruck: { L: 3.9, W: 1.55, H: 2.05, maxV: 17, acc: 4.2, steer: 1.7, seat: [-0.35, 0.5, 0.9], cam: 8.5, label: 'Mini truck', wr: 0.28 },
  omni: { L: 3.5, W: 1.45, H: 1.85, maxV: 21, acc: 5.2, steer: 1.9, seat: [-0.35, 0.4, 0.9], cam: 8, label: 'Omni van', wr: 0.28 },
  suv: { L: 4.6, W: 1.85, H: 1.85, maxV: 27, acc: 6.8, steer: 1.7, seat: [-0.4, 0.45, 0.3], cam: 9, label: 'SUV', wr: 0.38 },
  jeep: { L: 4.1, W: 1.85, H: 1.95, maxV: 26, acc: 7.5, steer: 1.8, seat: [-0.4, 0.45, 0], cam: 8.5, label: 'Police jeep', wr: 0.38 },
  ambulance: { L: 4.9, W: 1.95, H: 2.45, maxV: 25, acc: 5.8, steer: 1.6, seat: [-0.45, 0.6, 1.5], cam: 10, label: 'Ambulance', wr: 0.38 },
  tempo: { L: 4.3, W: 1.75, H: 2.2, maxV: 18, acc: 4.5, steer: 1.6, seat: [-0.35, 0.55, 1.2], cam: 9, label: 'Tempo', wr: 0.33 },
  lorry: { L: 7.4, W: 2.35, H: 3.0, maxV: 16, acc: 2.6, steer: 1.15, seat: [-0.6, 1.3, 2.7], cam: 13, label: 'Lorry', wr: 0.5, big: true },
  tanker: { L: 7.4, W: 2.35, H: 3.0, maxV: 15, acc: 2.4, steer: 1.15, seat: [-0.6, 1.3, 2.7], cam: 13, label: 'Water tanker', wr: 0.5, big: true },
  tractor: { L: 3.7, W: 1.9, H: 2.6, maxV: 9, acc: 3, steer: 1.7, open: true, seat: [0, 1.25, -0.55], cam: 8, label: 'Tractor', wr: 0.7 },
  bus: { L: 10.6, W: 2.5, H: 3.25, maxV: 17, acc: 2.8, steer: 1.05, seat: [-0.8, 1.0, 4.4], cam: 15, label: 'Private bus', wr: 0.5, big: true },
  ksrtc: { L: 11.0, W: 2.6, H: 3.3, maxV: 17, acc: 2.7, steer: 1.0, seat: [-0.8, 1.0, 4.6], cam: 15, label: 'State bus', wr: 0.52, big: true },
  schoolbus: { L: 8.6, W: 2.35, H: 3.0, maxV: 15, acc: 2.8, steer: 1.15, seat: [-0.75, 0.95, 3.4], cam: 13, label: 'School bus', wr: 0.46, big: true },
};

const BUS_NAMES = ['SRI DURGA', 'MAHALAXMI', 'SHREE GANESH', 'BHARATH', 'ANNAPOORNA', 'VIJAYA', 'SURYA', 'JAI HANUMAN', 'NAVARATNA', 'KADRI', 'SRI KRISHNA', 'MOOKAMBIKA', 'SHAMBHAVI'];
const BUS_COLS = [['#dc2626', '#facc15'], ['#2563eb', '#f8fafc'], ['#16a34a', '#fde047'], ['#7c3aed', '#fb923c'], ['#ea580c', '#f8fafc'], ['#0f766e', '#facc15'], ['#be123c', '#38bdf8']];
const CAR_COLS = ['#f8fafc', '#e5e7eb', '#9ca3af', '#1f2937', '#b91c1c', '#1d4ed8', '#a16207', '#065f46', '#7f1d1d', '#334155'];
export const GLASS = new THREE.MeshStandardMaterial({ color: '#1b2a3a', roughness: 0.08, metalness: 0.6 });
const RIM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.4 });

/** A box whose top face is narrower / shifted: cabins, bonnets, windscreens. */
export function taper(wb, db, wt, dt, h, shiftZ = 0) {
  const g = new THREE.BoxGeometry(1, 1, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const top = p.getY(i) > 0; p.setXYZ(i, p.getX(i) * (top ? wt : wb), p.getY(i) * h, p.getZ(i) * (top ? dt : db) + (top ? shiftZ : 0)); }
  g.computeVertexNormals(); return g;
}
const wheelGeoCache = new Map();
function wheelGeo(r, w, spokes) {
  const k = r + '|' + w + '|' + spokes; if (wheelGeoCache.has(k)) return wheelGeoCache.get(k);
  const parts = [P(cyl(r, r, w, 16), '#121212', [0, 0, 0], [0, 0, Math.PI / 2]), P(cyl(r * 0.62, r * 0.62, w + 0.02, 12), spokes ? '#9ca3af' : '#b8bec7', [0, 0, 0], [0, 0, Math.PI / 2]),
    P(cyl(r * 0.2, r * 0.2, w + 0.04, 8), '#4b5563', [0, 0, 0], [0, 0, Math.PI / 2])];
  if (spokes) for (let i = 0; i < 6; i++) parts.push(P(box(w * 0.6, r * 1.6, 0.03), '#d1d5db', [0, 0, 0], [i * Math.PI / 6, 0, 0]));
  else for (let i = 0; i < 5; i++) parts.push(P(box(w + 0.03, r * 0.9, 0.06), '#e5e7eb', [0, 0, 0], [i * Math.PI / 5 * 2, 0, 0]));
  const g = merge(parts); wheelGeoCache.set(k, g); return g;
}
const PLATES = [];
function plate(yellow) {
  const want = yellow ? 1 : 0; const pool = PLATES.filter(p => p.y === want);
  if (pool.length < 6) { const L = 'ABCDEFGHJKMNPRSTUVWXYZ', t = `KA 20 ${L[Math.random() * L.length | 0]}${L[Math.random() * L.length | 0]} ${1000 + (Math.random() * 8999 | 0)}`; const tex = signTexture([t], { bg: yellow ? '#facc15' : '#f8fafc', fg: '#111', edge: '#111', w: 256, h: 64 }); PLATES.push({ y: want, tex }); return tex; }
  return pool[Math.random() * pool.length | 0].tex;
}
function plateMesh(g, tex, x, y, z, ry, w = 0.5) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: tex, toneMapped: true })); m.position.set(x, y, z); m.rotation.y = ry; g.add(m); }

/** Build a vehicle model facing +z, wheels on y=0. Returns {group, def, wheels, flash}. */
export function vehicle(kind, o = {}) {
  const d = VEHICLES[kind], g = new THREE.Group(), parts = [], glass = [], glow = [], wheels = [], flash = [];
  const L = d.L, W = d.W, H = d.H, wr = d.wr;
  const wheel = (x, z, r = wr, w = 0.22, spokes = false) => { const m = new THREE.Mesh(wheelGeo(r, w, spokes), RIM); m.position.set(x, r, z); m.castShadow = true; g.add(m); wheels.push(m); };
  const lights = (y, hw, z, rz, col = '#fff7cc', sz = [0.3, 0.16]) => { glow.push(P(box(sz[0], sz[1], 0.04), col, [hw, y, z]), P(box(sz[0], sz[1], 0.04), col, [-hw, y, z])); glow.push(P(box(0.26, 0.12, 0.04), '#ff2020', [hw, y, rz]), P(box(0.26, 0.12, 0.04), '#ff2020', [-hw, y, rz])); };
  let yellowPlate = ['auto', 'tempo', 'lorry', 'tanker', 'bus', 'ksrtc', 'schoolbus', 'tractor', 'taxi', 'pickup', 'minitruck'].includes(kind) || (kind === 'car' && Math.random() < 0.25);
  if (kind === 'cycle') {
    const c = o.color || pick(['#111827', '#b91c1c', '#1d4ed8', '#15803d']);
    wheel(0, 0.62, 0.33, 0.05, true); wheel(0, -0.62, 0.33, 0.05, true);
    parts.push(P(box(0.05, 0.05, 1.0), c, [0, 0.62, 0.05], [0.25, 0, 0]), P(box(0.05, 0.6, 0.05), c, [0, 0.62, -0.25], [-0.25, 0, 0]), P(box(0.05, 0.55, 0.05), c, [0, 0.55, 0.45], [0.35, 0, 0]),
      P(box(0.05, 0.05, 0.7), c, [0, 0.36, -0.3]), P(box(0.22, 0.06, 0.28), '#111', [0, 0.95, -0.3]), P(box(0.56, 0.04, 0.04), '#444', [0, 1.02, 0.58]), P(box(0.06, 0.06, 0.06), '#9ca3af', [0, 0.36, 0]),
      P(box(0.35, 0.03, 0.3), '#9ca3af', [0, 0.72, -0.72]));
    yellowPlate = null;
  } else if (['scooter', 'scooty', 'moped', 'bike', 'sportbike'].includes(kind)) {
    const sc = kind === 'scooter' || kind === 'scooty' || kind === 'moped', c = o.color || (kind === 'sportbike' ? pick(['#dc2626', '#1d4ed8', '#f8fafc', '#facc15', '#111827']) : kind === 'bike' ? pick(['#111827', '#7f1d1d', '#1e3a8a', '#4b5563']) : pick(['#b91c1c', '#1d4ed8', '#f8fafc', '#4d7c0f', '#6b7280', '#facc15', '#0e7490', '#111827']));
    wheel(0, L / 2 - 0.3, wr, 0.12); wheel(0, -L / 2 + 0.3, wr, 0.12);
    if (sc) {
      parts.push(P(taper(0.48, 0.95, 0.4, 0.75, 0.42, -0.05), c, [0, 0.62, -0.3]), P(taper(0.46, 0.2, 0.4, 0.16, 0.75), c, [0, 0.72, 0.52], [0.18, 0, 0]),
        P(box(0.4, 0.06, 0.55), '#374151', [0, 0.34, 0.15]), P(box(0.38, 0.11, 0.72), '#1f2937', [0, 0.88, -0.28]), P(box(0.62, 0.06, 0.06), '#374151', [0, 1.14, 0.58]),
        P(box(0.08, 0.42, 0.08), '#374151', [0, 0.95, 0.6]), P(box(0.34, 0.18, 0.2), c, [0, 1.12, 0.6]), P(box(0.05, 0.22, 0.05), '#111', [0.3, 1.26, 0.56]), P(box(0.05, 0.22, 0.05), '#111', [-0.3, 1.26, 0.56]),
        P(box(0.16, 0.1, 0.06), '#d1d5db', [0.3, 1.38, 0.56]), P(box(0.16, 0.1, 0.06), '#d1d5db', [-0.3, 1.38, 0.56]), P(box(0.28, 0.16, 0.5), '#9ca3af', [0.12, 0.34, -0.45]));
    } else {
      parts.push(P(taper(0.34, 0.62, 0.28, 0.5, 0.26), c, [0, 0.86, 0.2]), P(box(0.3, 0.12, 0.7), '#111', [0, 0.88, -0.38]), P(box(0.3, 0.34, 0.45), '#6b7280', [0, 0.52, 0.02]),
        P(box(0.72, 0.05, 0.05), '#9ca3af', [0, 1.12, 0.62]), P(box(0.07, 0.62, 0.07), '#6b7280', [0.08, 0.66, 0.74], [0.35, 0, 0]), P(box(0.07, 0.62, 0.07), '#6b7280', [-0.08, 0.66, 0.74], [0.35, 0, 0]),
        P(cyl(0.06, 0.07, 0.9, 8), '#d1d5db', [0.2, 0.36, -0.32], [Math.PI / 2 - 0.1, 0, 0]), P(cyl(0.12, 0.12, 0.08, 12), '#d1d5db', [0, 1.0, 0.74], [Math.PI / 2, 0, 0]),
        P(box(0.32, 0.06, 0.55), c, [0, 0.62, -0.75]), P(box(0.3, 0.06, 0.35), c, [0, 0.68, 0.82]));
    }
    // shared detail: mudguards, mirrors, grab rail / pillion seat, exhaust, kickstand, indicators, chain guard
    parts.push(P(taper(0.2, 0.55, 0.16, 0.5, 0.08), c, [0, wr * 2 + 0.06, L / 2 - 0.3], [0.1, 0, 0]), P(taper(0.2, 0.5, 0.16, 0.46, 0.08), c, [0, wr * 2 + 0.04, -L / 2 + 0.28], [-0.1, 0, 0]),
      P(box(0.02, 0.15, 0.02), '#111', [0.3, 1.2, 0.55], [0, 0, -0.3]), P(box(0.02, 0.15, 0.02), '#111', [-0.3, 1.2, 0.55], [0, 0, 0.3]), P(box(0.1, 0.06, 0.02), '#1f2937', [0.34, 1.29, 0.55]), P(box(0.1, 0.06, 0.02), '#1f2937', [-0.34, 1.29, 0.55]),
      P(box(0.04, 0.2, 0.04), '#6b7280', [0.1, 0.12, 0.1], [0.3, 0, 0]));
    if (sc) parts.push(P(box(0.34, 0.04, 0.04), '#9ca3af', [0, 0.96, -0.72]), P(cyl(0.05, 0.06, 0.4, 8), '#9ca3af', [0.18, 0.34, -0.55], [Math.PI / 2, 0, 0]), P(box(0.5, 0.03, 0.34), '#1f2937', [0, 0.28, 0.1]));
    if (kind === 'bike') parts.push(P(box(0.3, 0.26, 0.4), '#9ca3af', [0, 0.46, -0.05]), P(box(0.04, 0.32, 0.5), '#e5e7eb', [0.2, 0.32, -0.48], [0, 0, 0]), P(cyl(0.04, 0.04, 0.5, 8), '#d1d5db', [-0.2, 0.34, -0.5], [Math.PI / 2, 0, 0]));
    if (kind === 'moped') parts.push(P(cyl(0.12, 0.12, 0.3, 10), c, [0, 0.9, 0.12], [0, 0, Math.PI / 2]), P(box(0.06, 0.5, 0.06), '#6b7280', [0, 0.6, 0.0], [0.5, 0, 0]));
    if (kind === 'sportbike') { parts.push(P(taper(0.46, 0.95, 0.28, 0.6, 0.55), c, [0, 0.95, 0.35], [-0.12, 0, 0]), P(taper(0.34, 0.55, 0.2, 0.3, 0.2), c, [0, 1.0, -0.62], [0.18, 0, 0]), P(box(0.42, 0.04, 0.04), '#111', [0, 1.16, 0.5]), P(cyl(0.07, 0.06, 0.8, 10), '#9ca3af', [0.2, 0.42, -0.45], [Math.PI / 2 - 0.12, 0, 0]), P(box(0.3, 0.16, 0.3), '#374151', [0, 0.5, 0.0])); glass.push(P(box(0.32, 0.26, 0.03), '#000', [0, 1.28, 0.72], [-0.7, 0, 0])); }
    glow.push(P(box(0.07, 0.05, 0.04), '#fb923c', [0.34, 1.22, 0.58]), P(box(0.07, 0.05, 0.04), '#fb923c', [-0.34, 1.22, 0.58]), P(box(0.07, 0.05, 0.04), '#fb923c', [0.14, 0.82, -L / 2 + 0.06]), P(box(0.07, 0.05, 0.04), '#fb923c', [-0.14, 0.82, -L / 2 + 0.06]));
    glow.push(P(box(0.16, 0.12, 0.04), '#fff7cc', [0, kind === 'bike' ? 1.0 : 1.12, L / 2 - (kind === 'bike' ? 0.22 : 0.18)]), P(box(0.14, 0.08, 0.04), '#ff2020', [0, 0.86, -L / 2 + 0.05]));
    plateMesh(g, plate(false), 0, 0.62, -L / 2 + 0.02, Math.PI, 0.28);
  } else if (kind === 'auto') {
    const top = o.top || '#facc15', body = o.body || pick(['#15803d', '#15803d', '#166534', '#0f766e']);
    wheel(0, 1.05); wheel(-0.62, -0.75); wheel(0.62, -0.75);
    parts.push(P(taper(1.36, 1.7, 1.3, 1.6, 0.6), body, [0, 0.62, -0.35]), P(taper(0.95, 0.75, 0.7, 0.55, 0.8, 0.05), body, [0, 0.78, 0.9]),
      P(box(1.44, 0.1, 2.25), top, [0, 1.85, -0.12]), P(box(1.36, 0.95, 0.08), top, [0, 1.36, -1.22]), P(box(1.38, 0.18, 2.2), '#111', [0, 1.74, -0.12]),
      P(box(0.06, 0.95, 0.06), '#111', [0.62, 1.36, 0.95]), P(box(0.06, 0.95, 0.06), '#111', [-0.62, 1.36, 0.95]),
      P(box(1.1, 0.35, 0.55), '#1f2937', [0, 1.0, -0.72]), P(box(1.36, 0.08, 1.7), '#0f172a', [0, 0.92, -0.35]),
      P(box(0.5, 0.05, 0.05), '#9ca3af', [0, 1.25, 0.95]), P(box(0.18, 0.18, 0.1), '#111', [0.25, 1.08, 0.9]), P(box(1.4, 0.06, 0.05), '#d1d5db', [0, 0.95, 0.4]));
    glass.push(P(box(1.18, 0.62, 0.04), '#000', [0, 1.42, 1.0], [-0.15, 0, 0]));
    glow.push(P(cyl(0.11, 0.11, 0.05, 10), '#fff7cc', [0, 1.0, 1.27], [Math.PI / 2, 0, 0]), P(box(0.14, 0.1, 0.04), '#ff2020', [0.5, 0.55, -1.22]), P(box(0.14, 0.1, 0.04), '#ff2020', [-0.5, 0.55, -1.22]));
    plateMesh(g, plate(true), 0, 0.5, -1.24, Math.PI, 0.4);
  } else if (['car', 'hatch', 'sedan', 'taxi', 'omni', 'suv', 'jeep', 'ambulance'].includes(kind)) {
    const c = kind === 'jeep' ? '#f1f5f9' : kind === 'ambulance' ? '#f8fafc' : kind === 'taxi' ? '#111827' : (o.color || pick(CAR_COLS));
    const hx = W / 2 - 0.08, fz = L / 2 - (kind === 'omni' ? 0.55 : 0.8);
    wheel(hx, fz); wheel(-hx, fz); wheel(hx, -fz); wheel(-hx, -fz);
    const y0 = wr + 0.05;
    if (kind === 'hatch' || kind === 'sedan' || kind === 'taxi') {
      const hb = kind === 'hatch';
      parts.push(P(taper(W, L, W - 0.05, L - 0.15, 0.55), c, [0, y0 + 0.3, 0]),
        hb ? P(taper(W - 0.08, L * 0.62, W - 0.3, L * 0.46, 0.56, -0.2), c, [0, y0 + 0.85, -0.3]) : P(taper(W - 0.08, L * 0.5, W - 0.32, L * 0.32, 0.52, 0.0), c, [0, y0 + 0.85, 0.05]),
        P(box(W - 0.1, 0.1, hb ? 0.1 : L * 0.2), c, [0, y0 + 0.62, -L / 2 + (hb ? 0.2 : 0.42)]),
        P(box(W + 0.04, 0.12, 0.2), '#374151', [0, y0 + 0.12, L / 2]), P(box(W + 0.04, 0.12, 0.2), '#374151', [0, y0 + 0.12, -L / 2]), P(box(W - 0.5, 0.14, 0.04), '#111', [0, y0 + 0.4, L / 2 + 0.01]),
        P(box(0.12, 0.08, 0.1), '#111', [W / 2 + 0.04, y0 + 0.78, 0.5]), P(box(0.12, 0.08, 0.1), '#111', [-W / 2 - 0.04, y0 + 0.78, 0.5]),
        P(box(0.012, 0.36, 0.03), '#0b0b0b', [W / 2 + 0.005, y0 + 0.5, 0.3]), P(box(0.012, 0.36, 0.03), '#0b0b0b', [-W / 2 - 0.005, y0 + 0.5, 0.3]), P(box(0.012, 0.36, 0.03), '#0b0b0b', [W / 2 + 0.005, y0 + 0.5, -0.65]), P(box(0.012, 0.36, 0.03), '#0b0b0b', [-W / 2 - 0.005, y0 + 0.5, -0.65]),
        P(box(0.02, 0.4, 0.02), '#111', [-0.5, y0 + 1.38, -0.2], [0.3, 0, 0]));
      if (kind === 'taxi') parts.push(P(box(W + 0.01, 0.1, L * 0.92), '#facc15', [0, y0 + 0.55, 0]), P(box(W - 0.4, 0.05, L * 0.3), '#facc15', [0, y0 + 1.12, 0.05]), P(box(0.5, 0.13, 0.2), '#facc15', [0, y0 + 1.2, 0.05]));
      glass.push(hb ? P(taper(W - 0.06, L * 0.6, W - 0.32, L * 0.44, 0.42, -0.2), '#000', [0, y0 + 0.9, -0.3]) : P(taper(W - 0.06, L * 0.48, W - 0.34, L * 0.3, 0.4, 0.0), '#000', [0, y0 + 0.9, 0.05]));
      lights(y0 + 0.42, W / 2 - 0.3, L / 2 + 0.01, -L / 2 - 0.01);
    } else if (kind === 'car') {
      parts.push(P(taper(W, L, W - 0.05, L - 0.15, 0.55), c, [0, y0 + 0.3, 0]), P(taper(W - 0.08, L * 0.56, W - 0.32, L * 0.36, 0.55, -0.12), c, [0, y0 + 0.85, -0.25]),
        P(box(W + 0.04, 0.12, 0.2), '#374151', [0, y0 + 0.12, L / 2]), P(box(W + 0.04, 0.12, 0.2), '#374151', [0, y0 + 0.12, -L / 2]), P(box(0.12, 0.08, 0.1), '#111', [W / 2 + 0.04, y0 + 0.75, 0.55]), P(box(0.12, 0.08, 0.1), '#111', [-W / 2 - 0.04, y0 + 0.75, 0.55]));
      glass.push(P(taper(W - 0.06, L * 0.55, W - 0.34, L * 0.35, 0.42, -0.12), '#000', [0, y0 + 0.9, -0.25]));
      lights(y0 + 0.42, W / 2 - 0.3, L / 2 + 0.01, -L / 2 - 0.01);
    } else if (kind === 'omni') {
      parts.push(P(taper(W, L, W - 0.04, L - 0.2, 1.4, -0.05), c, [0, y0 + 0.75, 0]), P(box(W + 0.03, 0.1, L * 0.7), '#374151', [0, y0 + 0.45, -0.2]), P(box(W + 0.02, 0.12, 0.15), '#374151', [0, y0 + 0.12, L / 2]));
      glass.push(P(box(W - 0.1, 0.55, 0.05), '#000', [0, y0 + 1.1, L / 2 - 0.12], [-0.12, 0, 0]), P(box(W + 0.02, 0.42, L * 0.62), '#000', [0, y0 + 1.15, -0.25]));
      lights(y0 + 0.4, W / 2 - 0.25, L / 2 - 0.05, -L / 2 + 0.09);
    } else {
      const top = kind === 'ambulance' ? 1.65 : kind === 'jeep' ? 0.95 : 0.8;
      parts.push(P(taper(W, L, W - 0.04, L - 0.1, 0.75), c, [0, y0 + 0.4, 0]), P(taper(W - 0.05, L * (kind === 'ambulance' ? 0.78 : 0.68), W - 0.18, L * (kind === 'ambulance' ? 0.74 : 0.58), top, -0.1), c, [0, y0 + 0.78 + top / 2, -0.35]),
        P(box(W + 0.04, 0.16, 0.22), '#374151', [0, y0 + 0.14, L / 2]), P(box(W + 0.04, 0.16, 0.22), '#374151', [0, y0 + 0.14, -L / 2]));
      glass.push(P(box(W - 0.12, 0.5, 0.05), '#000', [0, y0 + 1.1 + (kind === 'ambulance' ? 0.15 : 0), L * 0.5 - (kind === 'ambulance' ? 1.0 : 1.25)], [-0.3, 0, 0]),
        P(box(W - 0.02, 0.4, L * (kind === 'ambulance' ? 0.2 : 0.42)), '#000', [0, y0 + 1.15 + (kind === 'ambulance' ? 0.15 : 0), kind === 'ambulance' ? 0.9 : -0.35]));
      if (kind === 'jeep') { parts.push(P(box(W + 0.01, 0.2, L * 0.98), '#1d4ed8', [0, y0 + 0.55, 0]), P(box(1.1, 0.12, 0.3), '#1f2937', [0, y0 + 1.8, -0.2])); flash.push(P(box(0.45, 0.14, 0.26), '#ef4444', [-0.28, y0 + 1.92, -0.2]), P(box(0.45, 0.14, 0.26), '#3b82f6', [0.28, y0 + 1.92, -0.2])); }
      if (kind === 'ambulance') { parts.push(P(box(W + 0.01, 0.25, L * 0.98), '#dc2626', [0, y0 + 0.95, 0]), P(box(W - 0.4, 0.12, 0.5), '#1f2937', [0, y0 + 2.48, 1.0])); flash.push(P(box(0.5, 0.16, 0.4), '#ef4444', [-0.3, y0 + 2.6, 1.0]), P(box(0.5, 0.16, 0.4), '#3b82f6', [0.3, y0 + 2.6, 1.0])); }
      if (kind === 'suv') parts.push(P(box(W - 0.2, 0.06, L * 0.5), '#111', [0, y0 + 1.97, -0.35]));
      lights(y0 + 0.5, W / 2 - 0.3, L / 2 + 0.01, -L / 2 - 0.01);
    }
    plateMesh(g, plate(yellowPlate), 0, y0 + 0.2, L / 2 + 0.12, 0); plateMesh(g, plate(yellowPlate), 0, y0 + 0.2, -L / 2 - 0.12, Math.PI);
  } else if (kind === 'pickup' || kind === 'minitruck') {
    const c = o.color || pick(kind === 'pickup' ? ['#f8fafc', '#e5e7eb', '#9ca3af', '#b91c1c', '#1d4ed8'] : ['#f8fafc', '#facc15', '#2563eb', '#16a34a']);
    const y0 = wr + 0.05, hx = W / 2 - 0.08, fz = L / 2 - (kind === 'pickup' ? 0.85 : 0.7), cabL = kind === 'pickup' ? 1.9 : 1.3, cz = L / 2 - cabL / 2 - 0.05;
    wheel(hx, fz); wheel(-hx, fz); wheel(hx, -fz + 0.2); wheel(-hx, -fz + 0.2);
    parts.push(P(box(W, 0.25, L), '#374151', [0, y0 + 0.2, 0]), P(taper(W, cabL, W - 0.06, cabL - 0.3, kind === 'pickup' ? 1.0 : 1.35, -0.1), c, [0, y0 + 0.82, cz]), P(box(W + 0.04, 0.16, 0.22), '#374151', [0, y0 + 0.14, L / 2]),
      P(box(0.12, 0.08, 0.1), '#111', [W / 2 + 0.04, y0 + 1.0, cz + 0.4]), P(box(0.12, 0.08, 0.1), '#111', [-W / 2 - 0.04, y0 + 1.0, cz + 0.4]), P(box(W - 0.5, 0.16, 0.04), '#111', [0, y0 + 0.4, L / 2 + 0.01]));
    const bedL = L - cabL - 0.15, bz = -L / 2 + bedL / 2 + 0.05, sideH = kind === 'pickup' ? 0.55 : 0.4;
    parts.push(P(box(W, 0.1, bedL), '#4b5563', [0, y0 + 0.4, bz]), P(box(0.08, sideH, bedL), c, [W / 2 - 0.04, y0 + 0.4 + sideH / 2, bz]), P(box(0.08, sideH, bedL), c, [-W / 2 + 0.04, y0 + 0.4 + sideH / 2, bz]), P(box(W, sideH, 0.08), c, [0, y0 + 0.4 + sideH / 2, -L / 2 + 0.04]), P(box(W, sideH, 0.08), c, [0, y0 + 0.4 + sideH / 2, bz + bedL / 2 - 0.04]));
    for (let i = 0; i < 5; i++) parts.push(kind === 'pickup' ? P(cyl(0.2, 0.22, 0.45, 8), pick(['#1d4ed8', '#e5e7eb', '#16a34a']), [-0.45 + (i % 2) * 0.9, y0 + 0.7, bz - 0.5 + (i >> 1) * 0.6]) : P(box(0.5, 0.4, 0.5), pick(['#a16207', '#d6d3d1', '#fb923c', '#65a30d']), [-0.35 + (i % 2) * 0.7, y0 + 0.65, bz - 0.4 + (i >> 1) * 0.55]));
    glass.push(P(box(W - 0.15, 0.5, 0.05), '#000', [0, y0 + 1.15 + (kind === 'minitruck' ? 0.1 : 0), L / 2 - 0.35 - (kind === 'pickup' ? 0.4 : 0.1)], [-0.3, 0, 0]), P(box(W - 0.02, 0.38, cabL * 0.35), '#000', [0, y0 + 1.15 + (kind === 'minitruck' ? 0.1 : 0), cz - 0.1]));
    lights(y0 + 0.5, W / 2 - 0.3, L / 2 + 0.01, -L / 2 - 0.01);
    plateMesh(g, plate(true), 0, y0 + 0.2, L / 2 + 0.12, 0); plateMesh(g, plate(true), 0, y0 + 0.2, -L / 2 - 0.12, Math.PI);
  } else if (kind === 'tempo') {
    const c = o.color || pick(['#f8fafc', '#facc15', '#0ea5e9']);
    wheel(0.75, 1.3); wheel(-0.75, 1.3); wheel(0.75, -1.3); wheel(-0.75, -1.3);
    parts.push(P(taper(W, 1.2, W - 0.1, 1.0, 1.35, -0.08), c, [0, 1.1, 1.45]), P(box(W, 0.2, 3.0), '#334155', [0, 0.62, -0.6]),
      P(box(0.08, 0.55, 3.0), '#64748b', [W / 2 - 0.04, 0.98, -0.6]), P(box(0.08, 0.55, 3.0), '#64748b', [-W / 2 + 0.04, 0.98, -0.6]), P(box(W, 0.55, 0.08), '#64748b', [0, 0.98, -2.08]));
    for (let i = 0; i < 6; i++) parts.push(P(box(0.5, 0.45, 0.5), pick(['#fb923c', '#a3e635', '#fde047', '#f87171', '#84cc16']), [-0.45 + (i % 2) * 0.9, 0.95, -0.2 - Math.floor(i / 2) * 0.8]));
    glass.push(P(box(W - 0.15, 0.55, 0.05), '#000', [0, 1.45, 2.04], [-0.1, 0, 0]));
    lights(0.8, 0.6, 2.06, -2.12);
    plateMesh(g, plate(true), 0, 0.55, 2.07, 0, 0.4);
  } else if (kind === 'lorry' || kind === 'tanker') {
    const cab = o.color || pick(['#ea580c', '#facc15', '#0284c7', '#dc2626']);
    for (const z of [2.4, -1.6, -2.7]) { wheel(1.0, z); wheel(-1.0, z); }
    parts.push(P(taper(W, 1.9, W - 0.1, 1.7, 1.7, -0.1), cab, [0, 1.75, 2.6]), P(box(W, 0.35, 1.9), '#111827', [0, 0.82, 2.6]), P(box(W - 0.3, 0.3, 0.12), '#d1d5db', [0, 1.1, 3.58]),
      P(box(W + 0.04, 0.12, 0.5), '#1f2937', [0, 2.7, 2.7]), P(box(W, 0.3, 5.0), '#1f2937', [0, 0.85, -1.2]));
    if (kind === 'lorry') {
      parts.push(P(box(W, 1.6, 5.0), pick(['#b45309', '#15803d', '#1d4ed8']), [0, 1.85, -1.2]), P(box(W + 0.02, 0.15, 5.02), '#facc15', [0, 2.6, -1.2]));
      const back = signMesh(['HORN OK PLEASE', 'Use Dipper at Night'], 2.1, 0.9, { bg: '#facc15', fg: '#b91c1c', border: false, w: 512, h: 220 }); back.position.set(0, 1.9, -3.72); back.rotation.y = Math.PI; g.add(back);
    } else {
      parts.push(P(cyl(1.05, 1.05, 4.8, 18), '#1d4ed8', [0, 2.0, -1.2], [Math.PI / 2, 0, 0]), P(cyl(0.35, 0.35, 0.25, 10), '#1e3a8a', [0, 3.1, -1.2]));
      const sg = signMesh(['DRINKING WATER', 'ಕುಡಿಯುವ ನೀರು'], 3.4, 0.7, { bg: '#1d4ed8', fg: '#fff', border: false, w: 512, h: 112 }); sg.position.set(W / 2 + 0.03, 2.0, -1.2); sg.rotation.y = Math.PI / 2; g.add(sg);
      const sg2 = sg.clone(); sg2.position.x = -W / 2 - 0.03; sg2.rotation.y = -Math.PI / 2; g.add(sg2);
    }
    glass.push(P(box(W - 0.2, 0.7, 0.05), '#000', [0, 2.15, 3.56], [-0.08, 0, 0]));
    lights(1.0, W / 2 - 0.35, 3.58, -3.72);
    plateMesh(g, plate(true), 0, 0.8, 3.6, 0, 0.5);
  } else if (kind === 'tractor') {
    const c = o.color || pick(['#dc2626', '#1d4ed8', '#16a34a']);
    const back = new THREE.Mesh(wheelGeo(0.75, 0.42, false), RIM); back.position.set(0.85, 0.75, -0.7); g.add(back); wheels.push(back);
    const back2 = back.clone(); back2.position.x = -0.85; g.add(back2); wheels.push(back2);
    wheel(0.6, 1.2, 0.38, 0.22); wheel(-0.6, 1.2, 0.38, 0.22);
    parts.push(P(taper(0.85, 2.0, 0.75, 1.9, 0.8), c, [0, 1.1, 0.6]), P(box(0.9, 0.5, 0.6), '#374151', [0, 0.75, 1.6]), P(box(0.5, 0.15, 0.5), '#111', [0, 1.6, -0.6]),
      P(box(1.9, 0.12, 0.9), c, [0, 1.55, -0.7]), P(cyl(0.06, 0.07, 1.1, 8), '#111', [0.25, 2.0, 1.2]), P(box(0.06, 0.45, 0.06), '#111', [0, 1.75, 0.1]), P(box(0.45, 0.06, 0.06), '#111', [0, 1.98, 0.1]));
    glow.push(P(box(0.2, 0.14, 0.04), '#fff7cc', [0.3, 1.25, 1.62]), P(box(0.2, 0.14, 0.04), '#fff7cc', [-0.3, 1.25, 1.62]));
  } else if (kind === 'bus' || kind === 'ksrtc' || kind === 'schoolbus') {
    const [c1, c2] = kind === 'ksrtc' ? ['#b91c1c', '#f8fafc'] : kind === 'schoolbus' ? ['#facc15', '#facc15'] : (o.cols || pick(BUS_COLS));
    const wz = L / 2 - 1.7;
    wheel(1.1, wz); wheel(-1.1, wz); wheel(1.1, -wz + 0.6); wheel(-1.1, -wz + 0.6);
    parts.push(P(box(W, 1.3, L), c1, [0, 1.15, 0]), P(box(W, 1.0, L), c2, [0, 2.3, 0]), P(box(W, 0.16, L), c1, [0, 2.86, 0]), P(box(W - 0.3, 0.22, L - 1), '#475569', [0, 3.05, 0]),
      P(box(0.04, 1.7, 0.9), '#0f172a', [W / 2 + 0.01, 1.6, L / 2 - 1.2]), P(box(0.04, 1.7, 0.9), '#0f172a', [W / 2 + 0.01, 1.6, -L / 2 + 1.6]),
      P(box(W + 0.03, 0.12, L), kind === 'schoolbus' ? '#111' : '#f8fafc', [0, 1.78, 0]), P(box(W + 0.05, 0.3, 0.22), '#374151', [0, 0.55, L / 2]), P(box(W + 0.05, 0.3, 0.22), '#374151', [0, 0.55, -L / 2]),
      P(box(0.08, 0.6, 0.08), '#111', [W / 2 + 0.2, 2.3, L / 2 - 0.1]), P(box(0.08, 0.6, 0.08), '#111', [-W / 2 - 0.2, 2.3, L / 2 - 0.1]));
    for (let i = 0; i < Math.floor(L / 1.35); i++) parts.push(P(box(W + 0.03, 0.75, 0.07), c2 === c1 ? '#111' : c2, [0, 2.25, -L / 2 + 0.9 + i * 1.35]));
    glass.push(P(box(W + 0.02, 0.72, L - 1.2), '#000', [0, 2.25, -0.4]), P(box(W - 0.1, 0.95, 0.05), '#000', [0, 2.2, L / 2 + 0.01]));
    lights(0.9, 0.85, L / 2 + 0.01, -L / 2 - 0.01, '#fff7cc', [0.35, 0.18]);
    const name = kind === 'ksrtc' ? 'KARUNADU SARIGE' : kind === 'schoolbus' ? 'SCHOOL BUS' : (o.name || pick(BUS_NAMES));
    const s = signMesh([name], 2.2, 0.42, { bg: '#111827', fg: kind === 'ksrtc' ? '#f8fafc' : '#fde047', border: false, w: 512, h: 96 });
    s.position.set(0, 2.98, L / 2 + 0.03); g.add(s);
    const sideText = kind === 'ksrtc' ? ['KARUNADU SARIGE', 'KARKALA · UDUPI · MANGALURU'] : kind === 'schoolbus' ? ['VIDYA NIKETHAN SCHOOL', 'KARKALA'] : [name, 'KARKALA - UDUPI'];
    const side = signMesh(sideText, 4.5, 0.75, { bg: kind === 'schoolbus' ? '#facc15' : c2, fg: kind === 'schoolbus' ? '#111' : c1, border: false, w: 768, h: 128 });
    side.position.set(W / 2 + 0.03, 1.15, 0.6); side.rotation.y = Math.PI / 2; g.add(side);
    const side2 = side.clone(); side2.position.x = -W / 2 - 0.03; side2.rotation.y = -Math.PI / 2; g.add(side2);
    g.userData.busName = name;
    plateMesh(g, plate(true), 0, 0.55, L / 2 + 0.13, 0, 0.55); plateMesh(g, plate(true), 0, 0.55, -L / 2 - 0.13, Math.PI, 0.55);
  }
  const body = new THREE.Mesh(merge(parts), ['car', 'hatch', 'sedan', 'taxi', 'jeep', 'suv', 'omni', 'ambulance', 'pickup', 'minitruck', 'scooter', 'scooty', 'moped', 'bike', 'sportbike'].includes(kind) ? MAT.shiny : MAT.solid); body.castShadow = true; g.add(body);
  if (glass.length) { const gm = new THREE.Mesh(merge(glass), GLASS); g.add(gm); }
  if (glow.length) g.add(new THREE.Mesh(merge(glow), MAT.glow));
  let flashMesh = null; if (flash.length) { flashMesh = new THREE.Mesh(merge(flash), MAT.glow); g.add(flashMesh); }
  if (kind === 'jeep' || kind === 'ambulance') {
    const s = signMesh([kind === 'jeep' ? 'POLICE' : '108 AMBULANCE'], kind === 'jeep' ? 1.4 : 2.4, 0.32, { bg: kind === 'jeep' ? '#1d4ed8' : '#dc2626', fg: '#fff', border: false, w: 384, h: 72 });
    s.position.set(W / 2 + 0.02, kind === 'jeep' ? 1.0 : 1.75, kind === 'jeep' ? 0.5 : -0.4); s.rotation.y = Math.PI / 2; g.add(s);
    const s2 = s.clone(); s2.position.x = -W / 2 - 0.02; s2.rotation.y = -Math.PI / 2; g.add(s2);
  }
  return { group: g, def: d, wheels, flash: flashMesh };
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

/** Chain of boxes forming a drooping frond starting at (x,y,z) heading yaw a; segs: [[len, pitch], ...]. */
function frond(parts, x, y, z, a, segs, w, col) {
  let px = x, py = y, pz = z;
  for (const [len, pitch] of segs) {
    const dx = Math.sin(a) * Math.cos(pitch), dy = -Math.sin(pitch), dz = Math.cos(a) * Math.cos(pitch);
    parts.push(P(box(w, 0.04, len), col, [px + dx * len / 2, py + dy * len / 2, pz + dz * len / 2], [pitch, a, 0, 'YXZ']));
    px += dx * len; py += dy * len; pz += dz * len; w *= 0.8;
  }
}
/** Coconut palm (trunk + crown) geometries for instancing. Height ~10 m, slightly curved trunk. */
export function palmGeos() {
  const tp = [];
  for (let i = 0; i < 6; i++) tp.push(P(cyl(0.17 - i * 0.012, 0.19 - i * 0.012, 1.65, 7), i % 2 ? '#8b7355' : '#7d6a4f', [Math.sin(i * 0.35) * 0.25, 0.83 + i * 1.6, 0], [0, 0, Math.cos(i * 0.4) * 0.05]));
  const trunk = merge(tp), fr = [];
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + (i % 2) * 0.2; frond(fr, 0.3, 9.6, 0, a, [[1.3, -0.45], [1.3, 0.15], [1.2, 0.6], [0.9, 1.0]], 0.75, i % 3 ? '#4d8f32' : '#3d7a2a'); }
  fr.push(P(sph(0.5, 7, 5), '#6b8e23', [0.3, 9.5, 0]));
  for (let i = 0; i < 5; i++) { const a = i * 1.26; fr.push(P(sph(0.17, 6, 4), '#8a6d1f', [0.3 + Math.sin(a) * 0.35, 9.2, Math.cos(a) * 0.35])); }
  return { trunk, crown: merge(fr) };
}
/** Areca (supari) palm: very thin, very tall, small crown. */
export function arecaGeos() {
  const trunk = merge([P(cyl(0.09, 0.12, 12.5, 6), '#9a9080', [0, 6.25, 0]), P(cyl(0.13, 0.13, 1.4, 6), '#5b8a2e', [0, 12.9, 0])]);
  const fr = []; for (let i = 0; i < 8; i++) frond(fr, 0, 13.5, 0, (i / 8) * Math.PI * 2, [[1.0, -0.6], [0.9, 0.2], [0.7, 0.8]], 0.45, i % 2 ? '#4f8f2f' : '#5fa03a');
  return { trunk, crown: merge(fr) };
}
/** Banana plant. */
export function bananaGeos() {
  const trunk = merge([P(cyl(0.13, 0.18, 2.2, 7), '#6b8f3a', [0, 1.1, 0])]);
  const fr = []; for (let i = 0; i < 7; i++) frond(fr, 0, 2.2, 0, (i / 7) * Math.PI * 2 + 0.3, [[1.0, -0.9], [0.9, -0.1], [0.8, 0.6]], 0.75, i % 3 ? '#65a30d' : '#84cc16');
  return { trunk, crown: merge(fr) };
}
export function bushGeo() { return merge([P(new THREE.IcosahedronGeometry(0.9, 0), '#3f7a2e', [0, 0.6, 0], [0, 0, 0], [1.2, 0.8, 1.1]), P(new THREE.IcosahedronGeometry(0.6, 0), '#4d8c36', [0.6, 0.6, 0.2])]); }
export function treeGeos() {
  const trunk = merge([P(cyl(0.25, 0.4, 3.2, 7), '#6b4f3a', [0, 1.6, 0])]);
  const crown = merge([P(new THREE.IcosahedronGeometry(3.1, 0), '#2f6b2a', [0, 4.6, 0]), P(new THREE.IcosahedronGeometry(2.3, 0), '#3a7d32', [1.4, 5.6, 0.6]), P(new THREE.IcosahedronGeometry(2.0, 0), '#2a5f25', [-1.3, 5.3, -0.7])]);
  return { trunk, crown };
}

/* ------------------------------------------------------------------ landmarks */
/* ------------------------------------------------------------------ Gommata (Bahubali) */
const _up = new THREE.Vector3(0, 1, 0);
/** A tapered cylinder from point a to b (radius ra at a, rb at b) with a ball joint at a. */
function limb(parts, a, b, ra, rb, col, seg = 16, joint = true) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(_up, d.normalize()), e = new THREE.Euler().setFromQuaternion(q);
  parts.push(P(new THREE.CylinderGeometry(rb, ra, L, seg, 3), col, A.clone().add(B).multiplyScalar(0.5).toArray(), [e.x, e.y, e.z]));
  if (joint) parts.push(P(sph(ra, seg, 10), col, a));
}
/** A creeper (madhavi lata) winding up a limb: tube + leaves. */
function creeper(parts, a, b, ra, rb, turns, phase, front = 1) {
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, ang = phase + t * turns * Math.PI * 2, r = (ra + (rb - ra) * t) + 0.06;
    pts.push(new THREE.Vector3(a[0] + (b[0] - a[0]) * t + Math.cos(ang) * r, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t + Math.sin(ang) * r * 0.95));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  parts.push(P(new THREE.TubeGeometry(curve, 80, 0.065, 6, false), '#7b8f5c'));
  for (let i = 2; i < 40; i += 3) {
    const p = pts[i], n = pts[i + 1].clone().sub(p);
    parts.push(P(sph(0.17, 6, 4), i % 2 ? '#8ea56a' : '#71885a', p.toArray(), [0.4, Math.atan2(n.x, n.z) + 1.2, 0.3], [1, 0.32, 0.62]));
  }
}
function granite() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#d9d2c3'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5000; i++) { const v = Math.random(); x.fillStyle = v < 0.45 ? '#9e978a' : v < 0.8 ? '#efe9dc' : '#6e685d'; x.globalAlpha = 0.35; x.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2); }
  for (let i = 0; i < 26; i++) { const xx = Math.random() * 256, g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, 'rgba(60,55,48,0)'); g.addColorStop(0.5, 'rgba(60,55,48,.22)'); g.addColorStop(1, 'rgba(60,55,48,0)'); x.globalAlpha = 1; x.fillStyle = g; x.fillRect(xx, 0, 2 + Math.random() * 5, 256); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
/**
 * Gommata (Bahubali): monolith in kayotsarga, standing straight, arms hanging to the knees,
 * long ear lobes, ringlets of hair, creepers climbing the legs and arms, anthills by the feet,
 * on a lotus pedestal. Faces +z. Feet at y≈1.1, crown at ≈13.4 m (Karkala's is 42 ft).
 */
export function statue() {
  const S = '#ece5d6', D = '#b9b2a3', HAIR = '#8a8478', parts = [];
  // lotus pedestal
  parts.push(P(cyl(2.7, 2.9, 0.7, 28), D, [0, 0.35, 0]), P(cyl(2.35, 2.5, 0.35, 28), S, [0, 0.88, 0]));
  for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; parts.push(P(sph(0.62, 10, 6), S, [Math.sin(a) * 2.45, 0.78, Math.cos(a) * 2.45], [0, a, 0], [0.75, 0.42, 1.25])); }
  // feet
  for (const sx of [-1, 1]) parts.push(P(sph(0.5, 14, 8), S, [sx * 0.5, 1.28, 0.32], [0, 0, 0], [0.95, 0.42, 1.85]));
  // legs: ankle -> knee -> hip
  for (const sx of [-1, 1]) { limb(parts, [sx * 0.5, 1.45, 0], [sx * 0.53, 4.6, 0.02], 0.36, 0.47, S); limb(parts, [sx * 0.53, 4.6, 0.02], [sx * 0.6, 7.55, 0], 0.49, 0.68, S); }
  parts.push(P(sph(1.0, 20, 12), S, [0, 7.75, 0], [0, 0, 0], [1.2, 0.82, 0.74]));
  // torso: lathe profile hip -> waist -> chest -> shoulders, flattened front-to-back
  const prof = [[0.96, 0], [0.9, 0.6], [0.84, 1.2], [0.98, 1.9], [1.2, 2.65], [1.3, 3.25], [1.18, 3.65], [0.72, 3.98], [0.36, 4.15]].map(([r, y]) => new THREE.Vector2(r, y));
  parts.push(P(new THREE.LatheGeometry(prof, 24), S, [0, 7.6, 0], [0, 0, 0], [1, 1, 0.62]));
  for (const sx of [-1, 1]) parts.push(P(sph(0.5, 12, 8), S, [sx * 0.48, 10.2, 0.42], [0, 0, 0], [1.05, 0.55, 0.32]));
  parts.push(P(sph(0.08, 6, 4), D, [0, 8.85, 0.58]));
  // shoulders and arms, hanging straight, hands near the knees
  for (const sx of [-1, 1]) {
    parts.push(P(sph(0.5, 14, 10), S, [sx * 1.12, 11.0, 0], [0, 0, 0], [1.1, 0.8, 0.85]));
    limb(parts, [sx * 1.28, 10.85, 0], [sx * 1.36, 8.5, 0.04], 0.4, 0.34, S, 14, false);
    limb(parts, [sx * 1.36, 8.5, 0.04], [sx * 1.32, 6.25, 0.08], 0.33, 0.26, S, 14);
    parts.push(P(sph(0.3, 12, 8), S, [sx * 1.3, 5.85, 0.1], [0, 0, 0], [0.7, 1.55, 0.55]));
    for (let f = 0; f < 4; f++) parts.push(P(cyl(0.06, 0.055, 0.6, 6), S, [sx * 1.28, 5.25, -0.1 + f * 0.085], [0, 0, 0]));
  }
  // neck, head, face
  limb(parts, [0, 11.3, 0], [0, 12.0, 0.02], 0.5, 0.42, S);
  parts.push(P(sph(0.72, 22, 16), S, [0, 12.55, 0.05], [0, 0, 0], [0.9, 1.15, 0.95]));
  parts.push(P(box(0.17, 0.42, 0.22), S, [0, 12.5, 0.7], [-0.15, 0, 0]), P(box(0.92, 0.08, 0.14), D, [0, 12.83, 0.63]),
    P(box(0.26, 0.05, 0.05), '#6e685d', [-0.25, 12.68, 0.69]), P(box(0.26, 0.05, 0.05), '#6e685d', [0.25, 12.68, 0.69]),
    P(box(0.34, 0.07, 0.06), D, [0, 12.16, 0.66]));
  for (const sx of [-1, 1]) limb(parts, [sx * 0.64, 12.72, -0.05], [sx * 0.66, 12.0, -0.02], 0.09, 0.13, S, 10);
  // ringlets of hair
  for (let r = 0; r < 7; r++) {
    const phi = 0.12 + r * 0.19, n = Math.max(1, Math.round(Math.sin(phi) * 22));
    for (let k = 0; k < n; k++) {
      const th = (k / n) * Math.PI * 2 + r * 0.3, z = Math.sin(phi) * Math.cos(th);
      if (phi > 1.0 && z > 0.25) continue;                    // keep the forehead clear
      parts.push(P(sph(0.13, 6, 5), HAIR, [Math.sin(phi) * Math.sin(th) * 0.66, 12.6 + Math.cos(phi) * 0.84, 0.05 + z * 0.7]));
    }
  }
  // creepers up both legs and both arms
  for (const sx of [-1, 1]) {
    creeper(parts, [sx * 0.5, 1.5, 0], [sx * 0.6, 7.3, 0], 0.4, 0.66, 3.2, sx > 0 ? 0 : Math.PI);
    creeper(parts, [sx * 1.32, 6.3, 0.08], [sx * 1.3, 10.7, 0], 0.28, 0.4, 2.4, sx > 0 ? 1 : 2.5);
  }
  // anthills with snakes beside the legs
  for (const sx of [-1, 1]) {
    const g = new THREE.ConeGeometry(0.9, 2.9, 12, 8), pa = g.attributes.position;
    for (let i = 0; i < pa.count; i++) { const y = pa.getY(i), k = 1 + Math.sin(y * 3.1 + pa.getX(i) * 4) * 0.12 + Math.cos(pa.getZ(i) * 5) * 0.08; pa.setX(i, pa.getX(i) * k); pa.setZ(i, pa.getZ(i) * k); }
    g.computeVertexNormals();
    parts.push(P(g, '#a89c88', [sx * 2.0, 2.45, -0.4]));
    parts.push(P(sph(0.15, 8, 6), '#6f675b', [sx * 1.9, 3.95, -0.25], [0, 0, 0], [1, 0.8, 1.6]), P(cyl(0.08, 0.1, 0.7, 6), '#6f675b', [sx * 1.95, 3.6, -0.35], [0.4, 0, sx * 0.3]));
  }
  const mat = new THREE.MeshStandardMaterial({ map: granite(), vertexColors: true, roughness: 0.88, emissive: '#3c3934', emissiveIntensity: 0.4 });
  const m = new THREE.Mesh(merge(parts), mat); m.castShadow = true; m.receiveShadow = true;
  const g = new THREE.Group(); g.add(m); return g;
}

/** Chaturmukha (four-faced) basadi: granite hall with pillared porches on all four sides. */
export function basadi(scale = 1) {
  const gr = '#a39b8b', dk = '#857d6e', p = [P(box(24, 1.2, 24), '#8f887a', [0, 0.6, 0]), P(box(15, 6.5, 15), gr, [0, 4.4, 0]), P(box(17, 0.8, 17), dk, [0, 8.0, 0]), P(box(12, 1.6, 12), gr, [0, 9.2, 0]), P(box(8, 1.2, 8), dk, [0, 10.6, 0]), P(box(3, 2.2, 3), gr, [0, 12.3, 0])];
  for (const [dx, dz, rot] of [[0, 1, 0], [0, -1, 0], [1, 0, 1], [-1, 0, 1]]) {
    for (let i = -2; i <= 2; i++) { const ax = rot ? dx * 10 : i * 2.6, az = rot ? i * 2.6 : dz * 10; p.push(P(box(0.9, 6.0, 0.9), '#b5ad9c', [ax, 4.2, az])); }
    p.push(P(box(rot ? 4.5 : 15, 0.7, rot ? 15 : 4.5), dk, [dx * 9.5, 7.4, dz * 9.5]));
    p.push(P(box(rot ? 0.4 : 3.2, 4.5, rot ? 3.2 : 0.4), '#2b2620', [dx * 7.55, 3.6, dz * 7.55]));
  }
  const g = new THREE.Group(); g.add(mesh(merge(p), MAT.stone)); g.scale.setScalar(scale); return g;
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
