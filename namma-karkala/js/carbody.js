// Smooth lofted car bodies: rounded cross-sections along the length, a separate glasshouse, pillars, roof, bumpers,
// grille, lamps, door seams and handles. Replaces the old stacked-box cars with real car silhouettes.
import * as THREE from './three.module.min.js';

const TAU = Math.PI * 2, lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const sup = (a, e) => Math.sign(a) * Math.pow(Math.abs(a), 2 / e);
function interp(pts, t) {
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const a = pts[i - 1], b = pts[i], k = (t - a[0]) / (b[0] - a[0]); return lerp(a[1], b[1], k * k * (3 - 2 * k) * 0.45 + k * 0.55); }
  return pts[pts.length - 1][1];
}

/** Loft rounded cross-sections: st = [{ z, hw, y0, y1, n, cx }] ordered rear -> front. */
export function loft(st, N = 22) {
  const pos = [], idx = [];
  for (const s of st) { const cy = (s.y0 + s.y1) / 2, hh = Math.max(0.001, (s.y1 - s.y0) / 2); for (let j = 0; j < N; j++) { const a = (j / N) * TAU; pos.push((s.cx || 0) + s.hw * sup(Math.cos(a), s.n), cy + hh * sup(Math.sin(a), s.n), s.z); } }
  for (let i = 0; i < st.length - 1; i++) for (let j = 0; j < N; j++) { const a = i * N + j, b = i * N + (j + 1) % N, c = (i + 1) * N + j, d = (i + 1) * N + (j + 1) % N; idx.push(a, b, c, b, d, c); }
  for (const [k, front] of [[0, false], [st.length - 1, true]]) {
    const s = st[k], ci = pos.length / 3; pos.push(s.cx || 0, (s.y0 + s.y1) / 2, s.z);
    for (let j = 0; j < N; j++) { const a = k * N + j, b = k * N + (j + 1) % N; if (front) idx.push(ci, a, b); else idx.push(ci, b, a); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

/* z' runs 0 (rear) -> 1 (front). belt = top of the lower body (hood / doors / boot), gh = [rear base, roof rear, roof front, cowl]. */
export const SHAPES = {
  hatch: { H: 1.5, n: 3.4, belt: [[0, 0.78], [0.12, 0.9], [0.55, 0.93], [0.78, 0.86], [0.92, 0.75], [1, 0.62]], gh: [0.03, 0.13, 0.5, 0.66], tail: 0.97 },
  car: { H: 1.5, n: 3.3, belt: [[0, 0.82], [0.14, 0.9], [0.55, 0.93], [0.78, 0.86], [0.92, 0.75], [1, 0.62]], gh: [0.1, 0.2, 0.5, 0.65], tail: 0.94 },
  sedan: { H: 1.42, n: 3.5, belt: [[0, 0.84], [0.2, 0.9], [0.55, 0.92], [0.75, 0.85], [0.92, 0.74], [1, 0.62]], gh: [0.24, 0.33, 0.5, 0.64], tail: 0.95 },
  taxi: { H: 1.5, n: 2.9, belt: [[0, 0.86], [0.2, 0.93], [0.55, 0.95], [0.75, 0.88], [0.92, 0.78], [1, 0.66]], gh: [0.22, 0.31, 0.53, 0.64], tail: 0.95 },
  suv: { H: 1.85, n: 3.6, belt: [[0, 1.02], [0.2, 1.06], [0.6, 1.07], [0.8, 1.02], [0.93, 0.92], [1, 0.78]], gh: [0.02, 0.06, 0.45, 0.63], tail: 0.99 },
};

/**
 * Returns { paint, roof, glass, trim: [{geo,color}], glow: [{geo,color}] } in car space, z forward, wheels at y = wr.
 * `mk` supplies P (coloured geometry) and box helpers from models.js to avoid a circular import.
 */
export function buildCar(kind, d, mk) {
  const S = SHAPES[kind], L = d.L, W = d.W, wr = d.wr, hwB = W / 2, yb0 = 0.17 + (wr - 0.3) * 0.35, H = d.H * 0.96 / 1; const Hh = Math.min(S.H * (d.H / S.H), d.H);
  const Z = (zn) => (zn - 0.5) * L, belt = (zn) => interp(S.belt, zn) * (Hh / S.H);
  const hwAt = (zn) => hwB * (1 - 0.15 * sm(0.86, 1, zn) - 0.11 * sm(0.14, 0, zn));
  const ybAt = (zn) => yb0 + 0.12 * sm(0.9, 1, zn) + 0.1 * sm(0.1, 0, zn);
  // lower body
  const st = []; for (let i = 0; i <= 30; i++) { const zn = i / 30; st.push({ z: Z(zn), hw: hwAt(zn), y0: ybAt(zn), y1: belt(zn), n: S.n }); }
  const paint = loft(st, 24);
  // glasshouse
  const [gR, rR, rF, gC] = S.gh, roofY = Hh - 0.05, topAt = (zn) => zn <= rR ? lerp(belt(gR), roofY, sm(gR, rR, zn) * 0.85 + sm(gR, rR, zn) * 0.15) : zn >= rF ? lerp(roofY, belt(gC), (zn - rF) / (gC - rF)) : roofY + 0.02 * Math.sin(Math.PI * (zn - rR) / (rF - rR));
  const gs = [], rs = [], NG = 18;
  for (let i = 0; i <= NG; i++) {
    const zn = lerp(gR, gC, i / NG), top = i === 0 || i === NG ? belt(zn) + 0.02 : topAt(zn), hr = clamp((top - belt(zn)) / (roofY - belt(gR) + 0.001), 0, 1), hw = hwAt(zn) * (0.93 - 0.2 * hr);
    gs.push({ z: Z(zn), hw, y0: belt(zn) - 0.03, y1: top, n: 2.5 });
    if (zn >= rR - 0.025 && zn <= rF + 0.025) rs.push({ z: Z(zn), hw: hw * 1.0, y0: top - 0.11, y1: top + 0.014, n: 2.2 });
  }
  const glass = loft(gs, 22), roof = rs.length > 2 ? loft(rs, 18) : null;
  const trim = [], glow = [];
  const T = (g, c) => trim.push(mk.P(g, c[0] === '#' ? c : '#111', c.pos || [0, 0, 0])), box = mk.box;
  const zF = L / 2, zR = -L / 2, hwF = hwAt(1) * 0.98;
  // bumpers and valance
  trim.push(mk.P(box(hwAt(1) * 1.9, 0.17, 0.12), '#23262d', [0, yb0 + 0.12, zF - 0.045]), mk.P(box(hwAt(0) * 1.9, 0.17, 0.12), '#23262d', [0, yb0 + 0.12, zR + 0.045]));
  trim.push(mk.P(box(W * 0.62, 0.16, 0.05), '#0c0d10', [0, belt(1) - 0.2, zF - 0.01]));                                                     // grille
  for (let i = 0; i < 4; i++) trim.push(mk.P(box(W * 0.6, 0.012, 0.055), '#9ca3af', [0, belt(1) - 0.27 + i * 0.045, zF - 0.01]));
  trim.push(mk.P(box(W * 0.46, 0.09, 0.05), '#0c0d10', [0, yb0 + 0.12, zF - 0.02]));                                                          // lower intake
  // headlamps and tail lamps (glow) with chrome rims
  for (const sx of [-1, 1]) {
    glow.push(mk.P(box(0.34, 0.13, 0.06), '#fff6cf', [sx * (W * 0.34), belt(0.985) - 0.1, zF - 0.045], [0, sx * 0.25, 0]));
    trim.push(mk.P(box(0.37, 0.16, 0.04), '#cbd5e1', [sx * (W * 0.34), belt(0.985) - 0.1, zF - 0.065], [0, sx * 0.25, 0]));
    glow.push(mk.P(box(0.3, 0.12, 0.05), '#ef2b2b', [sx * (W * 0.36), belt(S.tail) - 0.12, zR + 0.02], [0, sx * -0.2, 0]));
    glow.push(mk.P(box(0.08, 0.07, 0.05), '#ffb02e', [sx * (W * 0.46), belt(0.97) - 0.13, zF - 0.1], [0, sx * 0.9, 0]));                       // indicators
  }
  // door seams, handles, mirrors, sills, wipers, antenna
  const seams = [0.64, 0.5, 0.33];
  for (const sx of [-1, 1]) {
    for (const zn of seams) { const x = sx * (hwAt(zn) + 0.004); trim.push(mk.P(box(0.008, belt(zn) - yb0 - 0.2, 0.008), '#262a31', [x, (belt(zn) + yb0 + 0.12) / 2, Z(zn)])); }
    for (const zn of [0.6, 0.4]) trim.push(mk.P(box(0.02, 0.025, 0.16), '#cbd5e1', [sx * (hwAt(zn) + 0.01), belt(zn) - 0.1, Z(zn)]));
    trim.push(mk.P(box(0.006, 0.01, L * 0.5), '#3a3f48', [sx * (hwAt(0.5) + 0.003), belt(0.5) - 0.24, 0]));                                  // shoulder crease
    trim.push(mk.P(box(0.05, 0.05, L * 0.46), '#1b1d22', [sx * (hwAt(0.5) - 0.07), yb0 + 0.03, 0]));                                              // sill
    trim.push(mk.P(box(0.16, 0.1, 0.12), '#16181d', [sx * (hwAt(gC) + 0.1), belt(gC) + 0.1, Z(gC) - 0.1]), mk.P(box(0.12, 0.07, 0.04), '#16181d', [sx * (hwAt(gC) + 0.16), belt(gC) + 0.1, Z(gC) - 0.12]));   // wing mirror
    const ax = hwAt(gC) * 0.92 * sx, bx = hwAt((rF + gC) / 2) * 0.72 * sx;
    trim.push(mk.P(box(0.03, 0.03, 0.03), '#111', [ax, belt(gC), Z(gC)]));
  }
  // A / B / C pillars as dark rails
  const rail = (x0, y0, z0, x1, y1, z1, c = '#14161a', r = 0.022) => { const a = new THREE.Vector3(x0, y0, z0), b = new THREE.Vector3(x1, y1, z1), len = a.distanceTo(b), m = a.clone().add(b).multiplyScalar(0.5); const g = new THREE.CylinderGeometry(r, r, len, 6); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); g.applyQuaternion(q); g.translate(m.x, m.y, m.z); trim.push(mk.P(g, c)); };
  for (const sx of [-1, 1]) {
    const gAt = (zn) => ({ hw: hwAt(zn) * (0.93 - 0.2 * clamp((topAt(zn) - belt(zn)) / (roofY - belt(gR) + 0.001), 0, 1)), top: topAt(zn) });
    const a0 = gAt(gC - 0.005), a1 = gAt(rF), c0 = gAt(gR + 0.01), c1 = gAt(rR), bz = (rF + rR) / 2, b0 = gAt(bz);
    rail(sx * a0.hw, belt(gC), Z(gC), sx * a1.hw, a1.top - 0.02, Z(rF), '#14161a', 0.026);
    rail(sx * c0.hw, belt(gR), Z(gR), sx * c1.hw, c1.top - 0.02, Z(rR), '#14161a', 0.03);
    rail(sx * b0.hw, belt(bz), Z(bz), sx * b0.hw, b0.top - 0.02, Z(bz), '#14161a', 0.024);
  }
  trim.push(mk.P(box(0.5, 0.012, 0.02), '#111', [-0.45, topAt(gC) - 0.0 + 0.02, Z(gC) - 0.05]));                                                // wiper (approx)
  // wheel arches: dark discs on the body side behind the wheels
  const arches = [];
  return { paint, roof, glass, trim, glow, Z, belt, hwAt, yb0, zF, zR, roofY, gC };
}
