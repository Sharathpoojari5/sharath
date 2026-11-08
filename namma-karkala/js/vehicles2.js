// Smooth, detailed builders for every non-car vehicle: scooters, motorbikes, auto-rickshaws, vans, jeeps, ambulances,
// pickups, mini trucks, tempos, lorries, tankers, tractors and buses. Body panels are lofted rounded forms (see carbody.js loft).
import * as THREE from './three.module.min.js';
import { loft } from './carbody.js';

const rbCache = new Map();
/** Rounded slab: w x h x d with superellipse sections (n) and end taper (tp). */
function rb(w, h, d, n = 3.2, tp = 0.88, tv = 1) {
  const k = [w, h, d, n, tp, tv].join('|'); if (rbCache.has(k)) return rbCache.get(k);
  const s = (z, f, fy) => ({ z, hw: w / 2 * f, y0: -h / 2 * fy, y1: h / 2 * fy, n });
  const g = loft([s(-d / 2, tp, tv), s(-d * 0.38, 0.99, 0.99), s(0, 1, 1), s(d * 0.38, 0.99, 0.99), s(d / 2, tp, tv)], 16); rbCache.set(k, g); return g;
}
const tubeCache = new Map();
function tubeGeo(len, r, seg = 7) { const k = len.toFixed(3) + '|' + r + '|' + seg; if (tubeCache.has(k)) return tubeCache.get(k); const g = new THREE.CylinderGeometry(r, r, len, seg); tubeCache.set(k, g); return g; }
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _q = new THREE.Quaternion(), _e = new THREE.Euler();

export function build(kind, c) {
  const { d, o, parts, glass, glow, flash, wheels, wheel, plateMesh, plate, yellowPlate, signMesh, pick, P, box, cyl, sph, g, wheelGeo, RIM, BUS_COLS, BUS_NAMES, CAR_COLS } = c;
  const L = d.L, W = d.W, H = d.H, wr = d.wr;
  const R = (w, h, dd, pos, col, rot = [0, 0, 0], n = 3.2, tp = 0.88, tv = 1) => parts.push(P(rb(w, h, dd, n, tp, tv), col, pos, rot));
  const Rg = (w, h, dd, pos, rot = [0, 0, 0], n = 3.0, tp = 0.9) => glass.push(P(rb(w, h, dd, n, tp), '#000', pos, rot));
  const tube = (a, b, r, col = '#14161a', seg = 7, arr = parts) => {
    _v.set(...a); _w.set(...b); const len = _v.distanceTo(_w); if (len < 1e-4) return; const m = _v.clone().add(_w).multiplyScalar(0.5);
    _q.setFromUnitVectors(_up, _w.clone().sub(_v).normalize()); _e.setFromQuaternion(_q);
    arr.push(P(tubeGeo(len, r, seg), col, [m.x, m.y, m.z], [_e.x, _e.y, _e.z]));
  };
  const lamp = (pos, col, sc = [1, 1, 0.5], r = 0.06, arr = glow) => arr.push(P(sph(r, 8, 6), col, pos, [0, 0, 0], sc));
  const pick1 = pick;

  /* ---------------------------------------------------------------- two-wheelers */
  if (['scooter', 'scooty', 'moped', 'bike', 'sportbike'].includes(kind)) {
    const sc = kind === 'scooter' || kind === 'scooty' || kind === 'moped';
    const col = o.color || (kind === 'sportbike' ? pick1(['#dc2626', '#1d4ed8', '#f8fafc', '#facc15', '#111827']) : kind === 'bike' ? pick1(['#111827', '#7f1d1d', '#1e3a8a', '#4b5563']) : pick1(['#b91c1c', '#f8fafc', '#1d4ed8', '#facc15', '#0f766e', '#111827', '#9ca3af']));
    const zf = L / 2 - 0.3, zr = -L / 2 + 0.3;
    wheel(0, zf, wr, 0.12); wheel(0, zr, wr, 0.12);
    // mudguards
    R(0.17, 0.05, 0.6, [0, wr * 2 + 0.05, zf + 0.03], col, [0.1, 0, 0], 2.6); R(0.2, 0.05, 0.62, [0, wr * 2 + 0.03, zr - 0.02], col, [-0.12, 0, 0], 2.6);
    // forks
    for (const sx of [-1, 1]) { tube([sx * 0.075, wr, zf], [sx * 0.075, sc ? 1.0 : 1.02, zf - (sc ? 0.2 : 0.3)], 0.022, '#c7ccd4'); tube([sx * 0.075, wr + 0.1, zf], [sx * 0.075, wr + 0.38, zf - 0.08], 0.03, '#2b2f36'); }
    if (sc) {
      // leg shield, floorboard, body, seat
      R(0.4, 0.8, 0.13, [0, 0.64, zf - 0.2], col, [0.3, 0, 0], 3, 0.82);
      R(0.46, 0.2, 0.34, [0, 1.07, zf - 0.17], col, [0.1, 0, 0], 3, 0.8);                                            // handlebar cowl
      R(0.42, 0.05, 0.6, [0, 0.31, 0.08], '#2f3338', [0, 0, 0], 2.6);                                                  // floorboard
      R(0.36, 0.1, 0.5, [0, 0.35, 0.07], col, [0, 0, 0], 2.6, 0.85);
      R(0.38, 0.5, 1.0, [0, 0.62, -0.35], col, [-0.04, 0, 0], 3.1, 0.86);                                              // body under seat
      R(0.3, 0.3, 0.45, [0, 0.74, zr - 0.02], col, [0.15, 0, 0], 3, 0.8);                                              // tail
      R(0.32, 0.11, 0.78, [0, 0.93, -0.3], '#14161a', [-0.03, 0, 0], 2.4, 0.9);                                        // seat
      tube([0, 0.97, -L / 2 + 0.2], [0, 0.97, -0.55], 0.014, '#cbd5e1'); tube([-0.13, 0.96, -0.5], [-0.13, 0.96, -L / 2 + 0.22], 0.012, '#cbd5e1'); tube([0.13, 0.96, -0.5], [0.13, 0.96, -L / 2 + 0.22], 0.012, '#cbd5e1');
      R(0.22, 0.2, 0.5, [-0.22, 0.38, zr + 0.1], '#3a3f46', [0, 0, 0], 2.8);                                           // engine casing
      tube([0.2, 0.3, zr + 0.2], [0.2, 0.34, zr - 0.35], 0.055, '#9ca3af'); R(0.11, 0.1, 0.4, [0.21, 0.32, zr - 0.2], '#6b7280', [0, 0, 0], 2.6);   // exhaust
      lamp([0, 1.13, zf + 0.0], '#fff7cc', [1.7, 1, 0.5], 0.075);                                                      // headlamp
    } else {
      // tank, side panels, seat, engine, exhaust
      const sport = kind === 'sportbike';
      R(sport ? 0.32 : 0.29, sport ? 0.3 : 0.3, sport ? 0.66 : 0.6, [0, 0.96, 0.18], col, [-0.08, 0, 0], 2.5, 0.8);                // tank
      R(0.27, 0.24, 0.45, [0, 0.75, -0.25], col, [0, 0, 0], 2.7, 0.82);                                                 // side panels
      R(0.27, 0.1, sport ? 0.55 : 0.8, [0, 0.86, -0.5], '#15171b', [0.02, 0, 0], 2.3, 0.9);                            // seat
      R(0.2, 0.13, 0.36, [0, 0.93, zr + 0.05], col, [0.16, 0, 0], 2.6, 0.7);                                           // tail cowl
      R(0.3, 0.32, 0.42, [0, 0.46, 0.02], '#4b5563', [0, 0, 0], 3, 0.9);                                              // engine block
      for (let i = 0; i < 4; i++) R(0.31, 0.012, 0.3, [0, 0.62 + i * 0.03, 0.2], '#9ca3af', [0.28, 0, 0], 4, 0.98);    // cylinder fins
      for (const sx of [-1, 1]) { tube([sx * 0.1, 0.4, -0.15], [sx * 0.1, wr, zr], 0.022, '#374151'); tube([sx * 0.11, 0.9, -0.6], [sx * 0.11, wr + 0.12, zr + 0.02], 0.02, '#c7ccd4'); }   // swingarm + shocks
      tube([0.17, 0.3, 0.28], [0.2, 0.33, -0.7], 0.04, '#c7ccd4'); R(0.11, 0.1, 0.55, [0.2, 0.33, -0.75], '#9ca3af', [0, 0, 0], 2.8);                   // exhaust
      tube([0, 1.0, zf - 0.32], [0, 0.55, 0.0], 0.035, '#1b1e24'); tube([0, 0.9, zf - 0.36], [0, 0.85, -0.3], 0.03, '#1b1e24'); tube([0, 0.78, -0.35], [0, 0.45, -0.05], 0.03, '#1b1e24'); tube([-0.2, 0.18, 0.05], [0.2, 0.18, 0.05], 0.014, '#14161a');   // frame, footpeg
      R(0.2, 0.2, 0.3, [0, 0.77, 0.18], '#1b1e24', [0, 0, 0], 3, 0.8);                                                                                         // tank base / airbox
      if (sport) { R(0.42, 0.5, 0.75, [0, 0.98, zf - 0.05], col, [-0.28, 0, 0], 2.4, 0.5); glass.push(P(rb(0.3, 0.22, 0.04), '#000', [0, 1.22, zf - 0.2], [-0.7, 0, 0])); R(0.3, 0.14, 0.5, [0, 0.48, 0.3], '#14161a', [0, 0, 0], 3, 0.7); lamp([0, 1.0, zf + 0.22], '#fff7cc', [2.2, 0.8, 0.4], 0.07); }
      else { tube([0, 1.0, zf - 0.25], [0, 1.07, zf - 0.05], 0.012, '#14161a'); R(0.19, 0.19, 0.12, [0, 1.06, zf - 0.04], '#14161a', [0, 0, 0], 2.2, 0.9); lamp([0, 1.06, zf + 0.04], '#fff7cc', [1, 1, 0.6], 0.085); R(0.1, 0.1, 0.06, [0, 1.17, zf - 0.28], '#14161a', [0, 0, 0], 2, 0.9); }
    }
    // handlebar, grips, mirrors, levers
    const hy = sc ? 1.18 : 1.1, hz = sc ? zf - 0.3 : zf - 0.28;
    tube([-0.34, hy, hz], [0.34, hy, hz], 0.013, '#14161a'); for (const sx of [-1, 1]) { tube([sx * 0.31, hy, hz], [sx * 0.4, hy, hz], 0.022, '#0b0b0d'); tube([sx * 0.3, hy + 0.01, hz - 0.01], [sx * 0.26, hy + 0.02, hz + 0.1], 0.006, '#9ca3af');
      tube([sx * 0.28, hy, hz], [sx * 0.31, hy + 0.2, hz - 0.03], 0.007, '#14161a'); parts.push(P(sph(0.05, 8, 6), '#2b2f36', [sx * 0.33, hy + 0.23, hz - 0.03], [0, 0, 0], [1.3, 0.8, 0.3]));
      lamp([sx * 0.38, hy + 0.0, hz + 0.04], '#fb923c', [1, 0.7, 0.7], 0.025); }
    glow.push(P(sph(0.04, 6, 5), '#ff2020', [0, 0.86, -L / 2 + 0.03], [0, 0, 0], [2.2, 0.8, 0.5]), P(sph(0.025, 6, 5), '#fb923c', [0.13, 0.84, -L / 2 + 0.04]), P(sph(0.025, 6, 5), '#fb923c', [-0.13, 0.84, -L / 2 + 0.04]));
    parts.push(P(box(0.04, 0.2, 0.04), '#6b7280', [0.1, 0.12, 0.1], [0.3, 0, 0]));                                      // kickstand
    plateMesh(g, plate(false), 0, 0.66, -L / 2 + 0.02, Math.PI, 0.28);
    return;
  }

  /* ---------------------------------------------------------------- auto rickshaw */
  if (kind === 'auto') {
    const top = o.top || '#f4c20d', body = o.body || pick(['#15803d', '#15803d', '#166534', '#0f766e']);
    wheel(0, 1.05); wheel(-0.62, -0.75); wheel(0.62, -0.75);
    R(0.78, 0.74, 0.95, [0, 0.8, 0.92], body, [0.12, 0, 0], 2.8, 0.55);                                                // nose / apron
    R(0.34, 0.07, 0.78, [0, wr * 2 + 0.12, 1.08], body, [0.1, 0, 0], 2.4, 0.8);                                       // front mudguard
    R(1.38, 0.52, 1.75, [0, 0.62, -0.35], body, [0, 0, 0], 3.3, 0.94);                                                 // lower body
    R(1.3, 0.7, 0.85, [0, 0.95, -1.0], body, [0, 0, 0], 3.0, 0.9);                                                      // engine bonnet
    R(1.46, 0.09, 2.38, [0, 1.86, -0.14], top, [0.0, 0, 0], 2.2, 0.94);                                                 // canopy roof
    R(1.4, 0.07, 0.55, [0, 1.8, 1.02], top, [0.35, 0, 0], 2.2, 0.8);                                                    // front visor
    R(1.34, 0.9, 0.07, [0, 1.38, -1.28], '#111827', [0, 0, 0], 2.6, 0.95);                                              // rear canvas
    R(1.1, 0.14, 0.5, [0, 0.9, -0.72], '#1f2937', [0, 0, 0], 2.3);  R(1.1, 0.5, 0.1, [0, 1.15, -1.02], '#1f2937', [-0.1, 0, 0], 2.3);   // rear bench + back rest
    R(0.4, 0.12, 0.4, [0, 0.78, 0.42], '#111827', [0, 0, 0], 2.3);                                                      // driver seat
    for (const sx of [-1, 1]) { tube([sx * 0.62, 0.96, 0.98], [sx * 0.64, 1.82, 0.76], 0.026, '#14161a'); tube([sx * 0.7, 0.95, -1.22], [sx * 0.72, 1.84, -1.22], 0.024, '#14161a'); tube([sx * 0.7, 0.95, 0.0], [sx * 0.71, 1.84, 0.0], 0.02, '#14161a'); }
    glass.push(P(rb(1.2, 0.66, 0.04, 2.6, 0.95), '#000', [0, 1.4, 1.0], [-0.22, 0, 0]));
    tube([-0.55, 1.1, 1.0], [0.55, 1.1, 1.0], 0.018, '#14161a'); tube([0, 1.12, 0.96], [0, 1.74, 0.75], 0.012, '#14161a');   // wiper stalk
    tube([-0.33, 1.02, 0.42], [0.33, 1.02, 0.42], 0.016, '#14161a'); parts.push(P(cyl(0.05, 0.05, 0.12, 8), '#111', [0, 1.02, 0.5], [Math.PI / 2, 0, 0]));   // handlebar
    for (const sx of [-1, 1]) { tube([sx * 0.45, 1.04, 0.86], [sx * 0.62, 1.4, 0.7], 0.012, '#14161a'); parts.push(P(sph(0.055, 8, 6), '#2b2f36', [sx * 0.64, 1.43, 0.69], [0, 0, 0], [0.9, 1.2, 0.3])); }
    glow.push(P(sph(0.1, 10, 8), '#fff7cc', [0, 1.0, 1.36], [0, 0, 0], [1, 1, 0.55]), P(box(0.14, 0.1, 0.04), '#ff2020', [0.5, 0.58, -1.24]), P(box(0.14, 0.1, 0.04), '#ff2020', [-0.5, 0.58, -1.24]), P(sph(0.03, 6, 5), '#fb923c', [0.3, 0.9, 1.3]), P(sph(0.03, 6, 5), '#fb923c', [-0.3, 0.9, 1.3]));
    parts.push(P(box(0.5, 0.08, 0.12), '#d1d5db', [0, 0.52, 1.34]), P(box(1.42, 0.07, 0.07), '#d1d5db', [0, 0.38, -0.2]));  // bumper + sill trim
    plateMesh(g, plate(true), 0, 0.5, -1.3, Math.PI, 0.4); return;
  }

  /* ---------------------------------------------------------------- vans, jeeps, ambulances */
  const panes = (n, z0, z1, y, hw, hh) => { for (let i = 0; i < n; i++) { const z = z0 + (z1 - z0) * (i + 0.5) / n, len = (z1 - z0) / n * 0.86; for (const sx of [-1, 1]) glass.push(P(rb(0.05, hh, len, 2.6, 0.9), '#000', [sx * hw, y, z])); } };
  const wheelsCar = (fz, rz, hx) => { wheel(hx, fz); wheel(-hx, fz); wheel(hx, rz); wheel(-hx, rz); };
  const arches = (fz, rz, hx) => { for (const sx of [-1, 1]) for (const z of [fz, rz]) parts.push(P(cyl(wr * 1.12, wr * 1.12, 0.03, 20), '#07080a', [sx * (W / 2 - 0.01), wr + 0.01, z], [0, 0, Math.PI / 2])); };
  const headlamps = (y, hw, z, sz = 0.3) => { for (const sx of [-1, 1]) { glow.push(P(box(sz, sz * 0.5, 0.05), '#fff6cf', [sx * hw, y, z])); parts.push(P(box(sz + 0.04, sz * 0.5 + 0.04, 0.03), '#cbd5e1', [sx * hw, y, z - 0.02])); glow.push(P(box(0.18, 0.14, 0.05), '#ef2b2b', [sx * (hw + 0.05), y, -z + 0.02 * 0])); } };
  const bumpers = (y, hw = W * 0.47) => { R(hw * 2, 0.2, 0.16, [0, y, L / 2 - 0.05], '#23262d', [0, 0, 0], 3); R(hw * 2, 0.2, 0.16, [0, y, -L / 2 + 0.05], '#23262d', [0, 0, 0], 3); };
  const mirrorsAt = (y, z, hw) => { for (const sx of [-1, 1]) { tube([sx * hw, y, z], [sx * (hw + 0.14), y + 0.04, z - 0.04], 0.012, '#14161a'); parts.push(P(rb(0.04, 0.2, 0.14, 2.5), '#14161a', [sx * (hw + 0.16), y + 0.05, z - 0.05])); } };
  const doorSeams = (zs, y0, y1, hw) => { for (const sx of [-1, 1]) for (const z of zs) parts.push(P(box(0.008, y1 - y0, 0.01), '#2a2e35', [sx * (hw + 0.003), (y0 + y1) / 2, z])); };

  if (kind === 'omni') {
    const col = o.color || pick(CAR_COLS), y0 = 0.3, hx = W / 2 - 0.08, fz = L / 2 - 0.55;
    wheelsCar(fz, -fz, hx); arches(fz, -fz, hx);
    c.paint(rb(W, 1.45, L, 4.2, 0.9, 0.97), col, [0, y0 + 0.72, 0]);
    R(W + 0.02, 0.1, L * 0.66, [0, y0 + 0.35, -0.2], '#2f343b', [0, 0, 0], 3);
    glass.push(P(rb(W - 0.12, 0.62, 0.05, 2.8, 0.9), '#000', [0, y0 + 1.03, L / 2 - 0.1], [-0.2, 0, 0])); panes(3, -L / 2 + 0.25, L / 2 - 0.75, y0 + 1.07, W / 2 - 0.01, 0.46);
    glass.push(P(rb(W - 0.18, 0.5, 0.05, 2.8, 0.9), '#000', [0, y0 + 1.05, -L / 2 + 0.01], [0.1, 0, 0]));
    headlamps(y0 + 0.62, W * 0.34, L / 2 - 0.02, 0.28); bumpers(y0 + 0.14); parts.push(P(box(W * 0.5, 0.14, 0.04), '#0c0d10', [0, y0 + 0.5, L / 2 - 0.02]));
    mirrorsAt(y0 + 0.96, L / 2 - 0.55, W / 2); doorSeams([0.55, -0.6], y0 + 0.25, y0 + 1.2, W / 2);
    plateMesh(g, plate(yellowPlate), 0, y0 + 0.22, L / 2 + 0.02, 0, 0.45); plateMesh(g, plate(yellowPlate), 0, y0 + 0.22, -L / 2 - 0.02, Math.PI, 0.45); return;
  }
  if (kind === 'jeep' || kind === 'ambulance') {
    const amb = kind === 'ambulance', col = amb ? '#f8fafc' : '#f1f5f9', y0 = 0.36, hx = W / 2 - 0.08, fz = L / 2 - 0.85;
    wheelsCar(fz, -fz, hx); arches(fz, -fz, hx);
    const bodyH = amb ? 1.95 : 0.72;
    c.paint(rb(W, bodyH, L, amb ? 4.2 : 3.8, amb ? 0.92 : 0.94, 0.98), col, [0, y0 + bodyH / 2, amb ? -0.05 : 0]);
    if (!amb) { c.paint(rb(W - 0.12, 0.82, L * 0.52, 3.4, 0.9, 0.96), col, [0, y0 + 0.72 + 0.4, -0.45]); parts.push(P(box(W + 0.01, 0.2, L * 0.98), '#1d4ed8', [0, y0 + 0.4, 0]), P(box(1.1, 0.12, 0.3), '#1f2937', [0, y0 + 1.62, -0.45])); flash.push(P(box(0.45, 0.14, 0.26), '#ef4444', [-0.28, y0 + 1.74, -0.45]), P(box(0.45, 0.14, 0.26), '#3b82f6', [0.28, y0 + 1.74, -0.45]));
      glass.push(P(rb(W - 0.2, 0.56, 0.05, 2.8, 0.9), '#000', [0, y0 + 1.2, -0.45 + L * 0.26 - 0.03], [-0.28, 0, 0])); panes(2, -L * 0.45 + 0.4, L * 0.12, y0 + 1.18, W / 2 - 0.07, 0.4);
      for (const sx of [-1, 1]) { tube([sx * 0.4, y0 + 0.1, L / 2 + 0.02], [sx * 0.4, y0 + 0.62, L / 2 + 0.02], 0.025, '#14161a'); } tube([-0.4, y0 + 0.62, L / 2 + 0.02], [0.4, y0 + 0.62, L / 2 + 0.02], 0.025, '#14161a'); tube([-0.4, y0 + 0.3, L / 2 + 0.02], [0.4, y0 + 0.3, L / 2 + 0.02], 0.025, '#14161a');   // bull bar
      parts.push(P(cyl(0.34, 0.34, 0.16, 16), '#111', [0, y0 + 0.62, -L / 2 - 0.1], [Math.PI / 2, 0, 0])); }
    else { parts.push(P(box(W + 0.01, 0.25, L * 0.98), '#dc2626', [0, y0 + 0.95, -0.05]), P(box(W - 0.4, 0.12, 0.5), '#1f2937', [0, y0 + 2.0, 1.0])); flash.push(P(box(0.5, 0.16, 0.4), '#ef4444', [-0.3, y0 + 2.08, 1.0]), P(box(0.5, 0.16, 0.4), '#3b82f6', [0.3, y0 + 2.08, 1.0]));
      glass.push(P(rb(W - 0.14, 0.8, 0.05, 2.8, 0.92), '#000', [0, y0 + 1.5, L / 2 - 0.5], [-0.28, 0, 0])); panes(1, 0.3, 1.5, y0 + 1.4, W / 2 - 0.01, 0.55); parts.push(P(box(0.4, 0.45, 0.04), '#dc2626', [0, y0 + 1.1, -L / 2 - 0.01]), P(box(0.12, 0.34, 0.05), '#f8fafc', [0, y0 + 1.1, -L / 2 - 0.02]), P(box(0.34, 0.12, 0.05), '#f8fafc', [0, y0 + 1.1, -L / 2 - 0.02])); }
    headlamps(y0 + (amb ? 0.7 : 0.55), W * 0.34, L / 2 - 0.02, 0.28); bumpers(y0 + 0.14); parts.push(P(box(W * 0.5, 0.2, 0.04), '#0c0d10', [0, y0 + 0.55, L / 2 - 0.02]));
    mirrorsAt(y0 + (amb ? 1.3 : 1.15), L / 2 - (amb ? 0.8 : 1.3), W / 2); doorSeams(amb ? [0.9, -0.9] : [-0.1, -0.9], y0 + 0.2, y0 + (amb ? 1.5 : 0.7), W / 2);
    plateMesh(g, plate(true), 0, y0 + 0.24, L / 2 + 0.02, 0, 0.45); plateMesh(g, plate(true), 0, y0 + 0.24, -L / 2 - 0.02, Math.PI, 0.45); return;
  }

  /* ---------------------------------------------------------------- pickups, mini trucks, tempos, lorries, tankers, tractors */
  if (kind === 'pickup' || kind === 'minitruck' || kind === 'tempo') {
    const pk = kind === 'pickup', tp = kind === 'tempo';
    const col = o.color || pick(pk ? ['#f8fafc', '#e5e7eb', '#9ca3af', '#b91c1c', '#1d4ed8'] : tp ? ['#f8fafc', '#facc15', '#0ea5e9'] : ['#f8fafc', '#facc15', '#2563eb', '#16a34a']);
    const y0 = wr + 0.05, hx = W / 2 - 0.08, fz = L / 2 - (pk ? 0.85 : 0.7);
    const cabL = pk ? 1.7 : tp ? 1.3 : 1.25, cz = L / 2 - cabL / 2 - (tp ? 0.0 : 0.45), cabH = pk ? 1.0 : 1.3;
    if (tp) { wheel(0.75, 1.3); wheel(-0.75, 1.3); wheel(0.75, -1.3); wheel(-0.75, -1.3); } else { wheel(hx, fz); wheel(-hx, fz); wheel(hx, -fz + 0.2); wheel(-hx, -fz + 0.2); }
    parts.push(P(box(W - 0.2, 0.22, L - 0.2), '#2b2f36', [0, y0 + 0.14, 0]));                                          // chassis
    c.paint(rb(W, cabH, cabL, 3.6, 0.92, 0.98), col, [0, y0 + 0.2 + cabH / 2, cz]);
    if (pk) c.paint(rb(W - 0.04, 0.62, 1.0, 3.2, 0.88, 0.96), col, [0, y0 + 0.5, L / 2 - 0.5]);                       // bonnet
    else if (!tp) R(W - 0.06, 0.5, 0.35, [0, y0 + 0.45, L / 2 - 0.2], col, [0, 0, 0], 3);
    const fy = y0 + 0.2 + cabH * 0.65;
    glass.push(P(rb(W - 0.16, cabH * 0.46, 0.05, 2.8, 0.92), '#000', [0, fy, cz + cabL / 2 - 0.02], [-0.22, 0, 0])); for (const sx of [-1, 1]) glass.push(P(rb(0.05, cabH * 0.42, cabL * 0.55, 2.6, 0.9), '#000', [sx * (W / 2 - 0.0), fy, cz - 0.1]));
    for (const sx of [-1, 1]) { parts.push(P(box(0.025, 0.02, 0.18), '#cbd5e1', [sx * (W / 2 + 0.01), fy - cabH * 0.25, cz - 0.15])); tube([sx * (W / 2), fy - 0.1, cz + cabL / 2 - 0.1], [sx * (W / 2 + 0.2), fy, cz + cabL / 2 - 0.2], 0.012, '#14161a'); parts.push(P(rb(0.05, 0.24, 0.16, 2.5), '#14161a', [sx * (W / 2 + 0.22), fy, cz + cabL / 2 - 0.22])); }
    headlamps(y0 + 0.62, W * 0.34, L / 2 - 0.02, 0.26); R(W * 0.9, 0.2, 0.14, [0, y0 + 0.2, L / 2 - 0.05], '#2b2f36', [0, 0, 0], 3); parts.push(P(box(W * 0.46, 0.18, 0.04), '#0c0d10', [0, y0 + 0.55, L / 2 - 0.02]));
    const bedL = L - cabL - 0.15 - (pk ? 1.0 : 0), bz = -L / 2 + bedL / 2 + 0.05, sideH = pk ? 0.55 : tp ? 0.55 : 0.4;
    parts.push(P(box(W, 0.1, bedL), '#4b5563', [0, y0 + 0.4, bz]));
    const sideCol = tp ? '#64748b' : col;
    for (const sx of [-1, 1]) parts.push(P(rb(0.08, sideH, bedL, 2.6, 0.98), sideCol, [sx * (W / 2 - 0.04), y0 + 0.4 + sideH / 2, bz]));
    parts.push(P(rb(W, sideH, 0.08, 2.6, 0.98), sideCol, [0, y0 + 0.4 + sideH / 2, -L / 2 + 0.06]), P(rb(W, sideH, 0.08, 2.6, 0.98), sideCol, [0, y0 + 0.4 + sideH / 2, bz + bedL / 2]));
    if (kind === 'minitruck') for (let i = 0; i < 4; i++) parts.push(P(box(W - 0.1, 0.05, 0.05), '#cbd5e1', [0, y0 + 0.4 + sideH + 0.02, bz - 0.7 + i * 0.5]));
    for (let i = 0; i < 5; i++) { if (pk) parts.push(P(rb(0.38, 0.45, 0.4, 2.4), pick(['#1d4ed8', '#e5e7eb', '#16a34a']), [-0.45 + (i % 2) * 0.9, y0 + 0.7, bz - 0.4 + (i >> 1) * 0.6])); else if (tp) parts.push(P(rb(0.5, 0.45, 0.5, 2.6), pick(['#fb923c', '#a3e635', '#fde047', '#f87171', '#84cc16']), [-0.45 + (i % 2) * 0.9, y0 + 0.75, bz + 0.4 - Math.floor(i / 2) * 0.8])); else if (i < 3) parts.push(P(rb(0.55, 0.45, 0.55, 2.6), pick(['#fb923c', '#fde047', '#e5e7eb']), [-0.35 + (i % 2) * 0.7, y0 + 0.78, bz - 0.4 + (i >> 1) * 0.6])); }
    glow.push(P(box(0.14, 0.1, 0.04), '#ff2020', [W / 2 - 0.2, y0 + 0.55, -L / 2 - 0.01]), P(box(0.14, 0.1, 0.04), '#ff2020', [-W / 2 + 0.2, y0 + 0.55, -L / 2 - 0.01]));
    plateMesh(g, plate(true), 0, y0 + 0.24, L / 2 + 0.02, 0, 0.45); plateMesh(g, plate(true), 0, y0 + 0.5, -L / 2 - 0.02, Math.PI, 0.45); return;
  }
  if (kind === 'lorry' || kind === 'tanker') {
    const cab = o.color || pick(['#ea580c', '#facc15', '#0284c7', '#dc2626']);
    for (const z of [2.4, -1.6, -2.7]) { wheel(1.0, z); wheel(-1.0, z); }
    parts.push(P(box(W - 0.3, 0.3, L - 0.3), '#1f2937', [0, 0.85, -0.1]));
    c.paint(rb(W, 1.7, 1.95, 3.8, 0.96, 0.98), cab, [0, 1.75, 2.62]); R(W - 0.1, 0.6, 0.5, [0, 1.0, 3.5], cab, [0, 0, 0], 3);
    R(W - 0.28, 0.32, 0.1, [0, 1.12, 3.62], '#d1d5db', [0, 0, 0], 3); for (let i = 0; i < 4; i++) parts.push(P(box(W - 0.4, 0.015, 0.05), '#9ca3af', [0, 0.98 + i * 0.07, 3.64]));
    R(W + 0.04, 0.12, 0.6, [0, 2.7, 2.7], '#1f2937', [0, 0, 0], 3); R(W + 0.04, 0.22, 0.3, [0, 0.55, 3.7], '#2b2f36', [0, 0, 0], 3);
    glass.push(P(rb(W - 0.2, 0.74, 0.05, 2.8, 0.92), '#000', [0, 2.15, 3.56], [-0.08, 0, 0])); for (const sx of [-1, 1]) glass.push(P(rb(0.05, 0.7, 1.0, 2.6, 0.9), '#000', [sx * (W / 2 + 0.0), 2.15, 2.9]));
    for (const sx of [-1, 1]) { tube([sx * (W / 2 + 0.1), 1.5, 3.5], [sx * (W / 2 + 0.25), 2.4, 3.4], 0.02, '#14161a'); parts.push(P(rb(0.06, 0.4, 0.2, 2.5), '#14161a', [sx * (W / 2 + 0.26), 2.2, 3.4])); parts.push(P(cyl(0.05, 0.05, 1.2, 8), '#9ca3af', [sx * (W / 2 - 0.1), 2.4, 1.75])); }
    if (kind === 'lorry') {
      parts.push(P(rb(W, 1.7, 5.0, 3.6, 0.99), pick(['#b45309', '#15803d', '#1d4ed8']), [0, 1.9, -1.2]), P(box(W + 0.02, 0.14, 5.02), '#facc15', [0, 2.62, -1.2]));
      for (let i = 0; i < 7; i++) parts.push(P(box(W + 0.03, 0.05, 0.06), '#0b0b0b', [0, 1.9, -3.5 + i * 0.7]));
      const back = signMesh(['HORN OK PLEASE', 'Use Dipper at Night'], 2.1, 0.9, { bg: '#facc15', fg: '#b91c1c', border: false, w: 512, h: 220 }); back.position.set(0, 1.9, -3.72); back.rotation.y = Math.PI; g.add(back);
    } else {
      parts.push(P(cyl(1.05, 1.05, 4.8, 22), '#1d4ed8', [0, 2.0, -1.2], [Math.PI / 2, 0, 0]), P(sph(1.05, 18, 8), '#1d4ed8', [0, 2.0, 1.2], [0, 0, 0], [1, 1, 0.3]), P(sph(1.05, 18, 8), '#1d4ed8', [0, 2.0, -3.6], [0, 0, 0], [1, 1, 0.3]), P(cyl(0.35, 0.35, 0.25, 12), '#1e3a8a', [0, 3.1, -1.2]));
      for (const z of [-3.0, -1.2, 0.6]) parts.push(P(cyl(1.07, 1.07, 0.1, 22), '#1e3a8a', [0, 2.0, z], [Math.PI / 2, 0, 0])); tube([W / 2 - 0.2, 0.9, -3.6], [W / 2 - 0.2, 3.0, -3.6], 0.025, '#9ca3af');
      const sg = signMesh(['DRINKING WATER', 'ಕುಡಿಯುವ ನೀರು'], 3.4, 0.7, { bg: '#1d4ed8', fg: '#fff', border: false, w: 512, h: 112 }); sg.position.set(W / 2 + 0.03, 2.0, -1.2); sg.rotation.y = Math.PI / 2; g.add(sg);
      const sg2 = sg.clone(); sg2.position.x = -W / 2 - 0.03; sg2.rotation.y = -Math.PI / 2; g.add(sg2);
    }
    glow.push(P(box(0.3, 0.2, 0.05), '#fff6cf', [0.7, 1.05, 3.64]), P(box(0.3, 0.2, 0.05), '#fff6cf', [-0.7, 1.05, 3.64]), P(box(0.2, 0.14, 0.05), '#ff2020', [0.8, 1.05, -3.74]), P(box(0.2, 0.14, 0.05), '#ff2020', [-0.8, 1.05, -3.74]));
    plateMesh(g, plate(true), 0, 0.8, 3.7, 0, 0.5); plateMesh(g, plate(true), 0, 0.9, -3.78, Math.PI, 0.5); return;
  }
  if (kind === 'tractor') {
    const col = o.color || pick(['#dc2626', '#1d4ed8', '#16a34a']);
    const back = new THREE.Mesh(wheelGeo(0.75, 0.42, false), RIM); back.position.set(0.85, 0.75, -0.7); g.add(back); wheels.push(back);
    const back2 = back.clone(); back2.position.x = -0.85; g.add(back2); wheels.push(back2);
    wheel(0.6, 1.2, 0.38, 0.22); wheel(-0.6, 1.2, 0.38, 0.22);
    c.paint(rb(0.82, 0.78, 1.7, 3.0, 0.85, 0.95), col, [0, 1.1, 0.75]); R(0.7, 0.45, 0.4, [0, 0.8, 1.72], col, [0, 0, 0], 2.8);        // bonnet + front
    parts.push(P(box(0.5, 0.35, 0.8), '#374151', [0, 0.85, 1.0]));
    for (const sx of [-1, 1]) R(0.5, 0.1, 1.15, [sx * 0.9, 1.52, -0.7], col, [-0.12, 0, 0], 2.5, 0.8);                                   // mudguards
    R(0.46, 0.1, 0.46, [0, 1.62, -0.62], '#111', [0, 0, 0], 2.3); R(0.4, 0.4, 0.08, [0, 1.85, -0.9], '#111', [-0.15, 0, 0], 2.3);       // seat
    for (const sx of [-1, 1]) parts.push(P(cyl(0.04, 0.04, 0.6, 8), '#9ca3af', [sx * 0.22, 2.0, 1.05]));
    tube([0, 1.6, 0.0], [0, 1.95, 0.2], 0.03, '#111'); parts.push(P(cyl(0.2, 0.2, 0.03, 14), '#111', [0, 1.98, 0.22], [-0.9, 0, 0]));       // steering
    parts.push(P(cyl(0.05, 0.06, 1.0, 8), '#14161a', [0.3, 2.0, 1.3]));                                                                  // exhaust stack
    glow.push(P(sph(0.1, 8, 6), '#fff7cc', [0.28, 1.25, 1.95], [0, 0, 0], [1, 1, 0.5]), P(sph(0.1, 8, 6), '#fff7cc', [-0.28, 1.25, 1.95], [0, 0, 0], [1, 1, 0.5])); return;
  }

  /* ---------------------------------------------------------------- buses */
  if (kind === 'bus' || kind === 'ksrtc' || kind === 'schoolbus') {
    const [c1, c2] = kind === 'ksrtc' ? ['#b91c1c', '#f8fafc'] : kind === 'schoolbus' ? ['#facc15', '#facc15'] : (o.cols || pick(BUS_COLS));
    const wz = L / 2 - 1.7;
    wheel(1.1, wz); wheel(-1.1, wz); wheel(1.1, -wz + 0.6); wheel(-1.1, -wz + 0.6);
    c.paint(rb(W, 1.3, L, 4.6, 0.97, 0.98), c1, [0, 1.15, 0]);                                                                         // lower deck
    c.paint(rb(W - 0.02, 1.25, L - 0.06, 4.0, 0.975, 0.97), c2, [0, 2.35, 0]);                                                         // window band + roof
    R(W - 0.4, 0.22, L - 1.1, [0, 3.05, 0], '#475569', [0, 0, 0], 2.4, 0.97);                                                            // roof carrier
    for (const sx of [-1, 1]) { tube([sx * (W / 2 - 0.3), 3.16, -L / 2 + 0.7], [sx * (W / 2 - 0.3), 3.16, L / 2 - 0.9], 0.02, '#9ca3af'); }
    if (kind === 'bus') for (let i = 0; i < 4; i++) parts.push(P(rb(0.8 + (i % 2) * 0.3, 0.4, 1.0, 2.4), pick(['#7c2d12', '#365314', '#1e3a8a', '#78716c', '#a16207']), [(i % 2 - 0.5) * 0.7, 3.4, -L / 2 + 1.6 + i * 1.5]));
    parts.push(P(box(W + 0.03, 0.12, L), kind === 'schoolbus' ? '#111' : '#f8fafc', [0, 1.78, 0]));                                  // waist stripe
    parts.push(P(box(W + 0.03, 0.05, L), c2 === c1 ? '#111' : c1, [0, 1.62, 0]));
    R(W + 0.05, 0.3, 0.3, [0, 0.55, L / 2], '#2b2f36', [0, 0, 0], 3); R(W + 0.05, 0.3, 0.3, [0, 0.55, -L / 2], '#2b2f36', [0, 0, 0], 3);
    const n = Math.floor((L - 1.6) / 1.3);
    for (let i = 0; i < n; i++) { const z = -L / 2 + 0.9 + i * 1.3; for (const sx of [-1, 1]) glass.push(P(rb(0.05, 0.74, 1.1, 2.6, 0.92), '#000', [sx * (W / 2 + 0.0), 2.4, z])); }   // side windows
    glass.push(P(rb(W - 0.2, 0.96, 0.05, 2.8, 0.94), '#000', [0, 2.3, L / 2 - 0.005]), P(rb(W - 0.6, 0.7, 0.05, 2.8, 0.94), '#000', [0, 2.35, -L / 2 + 0.005]));
    for (const sx of [-1, 1]) { parts.push(P(rb(0.06, 1.7, 0.9, 2.6, 0.95), '#0f172a', [sx * (W / 2 + 0.01), 1.55, L / 2 - 1.2])); tube([sx * (W / 2 + 0.05), 1.5, L / 2 - 0.4], [sx * (W / 2 + 0.4), 2.3, L / 2 - 0.5], 0.025, '#14161a'); parts.push(P(rb(0.06, 0.55, 0.22, 2.4), '#14161a', [sx * (W / 2 + 0.42), 2.1, L / 2 - 0.5])); }
    for (const sx of [-1, 1]) { glow.push(P(sph(0.13, 10, 8), '#fff7cc', [sx * 0.85, 0.9, L / 2 + 0.02], [0, 0, 0], [1, 1, 0.45]), P(box(0.3, 0.16, 0.05), '#ff2020', [sx * 0.85, 0.9, -L / 2 - 0.02])); parts.push(P(cyl(0.16, 0.16, 0.04, 12), '#cbd5e1', [sx * 0.85, 0.9, L / 2 - 0.0], [Math.PI / 2, 0, 0])); }
    parts.push(P(box(W * 0.5, 0.25, 0.05), '#0c0d10', [0, 0.85, L / 2 + 0.0]));
    tube([-0.4, 2.0, L / 2 + 0.02], [0.4, 2.45, L / 2 + 0.02], 0.014, '#14161a'); tube([0.5, 2.0, L / 2 + 0.02], [1.2, 2.45, L / 2 + 0.02], 0.014, '#14161a');   // wipers
    for (let i = 0; i < 6; i++) parts.push(P(box(0.05, 0.03, 0.4), '#9ca3af', [W / 2 - 0.35 + (i % 2) * 0.0, 0.75 + i * 0.4, -L / 2 - 0.05])), 0;      // rear ladder rungs
    tube([0.6, 0.7, -L / 2 - 0.05], [0.6, 3.0, -L / 2 - 0.05], 0.02, '#9ca3af'); tube([-0.6, 0.7, -L / 2 - 0.05], [-0.6, 3.0, -L / 2 - 0.05], 0.02, '#9ca3af');
    const name = kind === 'ksrtc' ? 'KARUNADU SARIGE' : kind === 'schoolbus' ? 'SCHOOL BUS' : (o.name || pick(BUS_NAMES));
    const s = signMesh([name], 2.2, 0.42, { bg: '#111827', fg: kind === 'ksrtc' ? '#f8fafc' : '#fde047', border: false, w: 512, h: 96 }); s.position.set(0, 3.0, L / 2 + 0.03); g.add(s);
    const sideText = kind === 'ksrtc' ? ['KARUNADU SARIGE', 'KARKALA · UDUPI · MANGALURU'] : kind === 'schoolbus' ? ['VIDYA NIKETHAN SCHOOL', 'KARKALA'] : [name, 'KARKALA - UDUPI'];
    const side = signMesh(sideText, 4.5, 0.75, { bg: kind === 'schoolbus' ? '#facc15' : c2, fg: kind === 'schoolbus' ? '#111' : c1, border: false, w: 768, h: 128 });
    side.position.set(W / 2 + 0.03, 1.15, 0.6); side.rotation.y = Math.PI / 2; g.add(side); const side2 = side.clone(); side2.position.x = -W / 2 - 0.03; side2.rotation.y = -Math.PI / 2; g.add(side2);
    g.userData.busName = name;
    plateMesh(g, plate(true), 0, 0.55, L / 2 + 0.16, 0, 0.55); plateMesh(g, plate(true), 0, 0.55, -L / 2 - 0.16, Math.PI, 0.55); return;
  }
}
