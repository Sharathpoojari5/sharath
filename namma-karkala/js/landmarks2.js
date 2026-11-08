// Detailed Karkala landmarks: a Tulunadu-style temple (stripe-painted compound wall, tiered gopura, hipped tiled sanctum with
// eaves and kalasha, pillared mandapa, golden dhwaja stambha, deepa stambha, Nandi) and the Chaturmukha basadi
// (granite, stepped plinth, pillared verandahs on four sides, tiered stone-slab roofs, kalasha) with a manastambha and guardian elephants.
import * as THREE from './three.module.min.js';

/** `m` supplies P, box, cyl, sph, cone, merge, taper from models.js (avoids a circular import). */
export function templeParts(m) {
  const { P, box, cyl, sph, cone, taper } = m, p = [];
  const WALL = '#f3e9d4', RED = '#b3431c', STONE = '#9a9384', DSTONE = '#7c7667', TILE = ['#a8431f', '#b4502a', '#9c3d1b', '#bb5a30'], GOLD = '#d9a516', WOOD = '#5a3a1e';
  // ---- roof helper: stacked tile courses with a concave profile and visible overhang
  const roof = (cx, cy, cz, w, d, h, over = 0.9, courses = 7, col = TILE) => {
    for (let i = 0; i < courses; i++) {
      const t0 = i / courses, t1 = (i + 1) / courses, k0 = Math.pow(1 - t0, 1.35), k1 = Math.pow(1 - t1, 1.35), y = cy + h * t0;
      p.push(P(taper((w + over * 2) * k0 + 0.3, (d + over * 2) * k0 + 0.3, (w + over * 2) * k1 + 0.3, (d + over * 2) * k1 + 0.3, h / courses * 1.05), col[i % col.length], [cx, y + h / courses / 2, cz]));
    }
    p.push(P(box(0.35, 0.35, d * 0.5 * (1 - 0.3) + 0.4), '#8a3416', [cx, cy + h + 0.05, cz]));                       // ridge
    p.push(P(box(w + over * 2 + 0.2, 0.22, d + over * 2 + 0.2), WOOD, [cx, cy - 0.05, cz]));                         // eave board
    for (let i = -Math.floor(w / 1.0); i <= Math.floor(w / 1.0); i++) { p.push(P(box(0.18, 0.18, 0.5), WOOD, [cx + i * 1.0, cy - 0.28, cz + d / 2 + over - 0.1]), P(box(0.18, 0.18, 0.5), WOOD, [cx + i * 1.0, cy - 0.28, cz - d / 2 - over + 0.1])); }   // rafter ends
  };
  const pillar = (x, y, z, h, r = 0.28, col = STONE) => {
    p.push(P(box(r * 3.0, 0.3, r * 3.0), DSTONE, [x, y + 0.15, z]), P(cyl(r * 0.8, r, 0.35, 8), col, [x, y + 0.45, z]), P(cyl(r * 0.7, r * 0.8, h - 1.1, 8), col, [x, y + 0.6 + (h - 1.1) / 2, z]));
    p.push(P(cyl(r * 1.0, r * 0.7, 0.3, 8), col, [x, y + h - 0.5, z]), P(box(r * 3.0, 0.25, r * 3.0), DSTONE, [x, y + h - 0.2, z]), P(box(r * 4.2, 0.2, r * 1.2), WOOD, [x, y + h - 0.02, z]));
  };
  const kalasha = (x, y, z, s = 1, col = GOLD) => { p.push(P(cyl(0.35 * s, 0.5 * s, 0.35 * s, 10), col, [x, y + 0.17 * s, z]), P(sph(0.5 * s, 10, 8), col, [x, y + 0.7 * s, z], [0, 0, 0], [1, 0.85, 1]), P(cyl(0.12 * s, 0.25 * s, 0.4 * s, 8), col, [x, y + 1.15 * s, z]), P(cone(0.28 * s, 0.9 * s, 8), col, [x, y + 1.75 * s, z])); };

  // ---- compound wall (30 x 30) with red stripe, panels, coping tiles
  for (const [x, z, w, d] of [[0, 15, 30, 0.6], [0, -15, 30, 0.6], [15, 0, 0.6, 30], [-15, 0, 0.6, 30]]) {
    p.push(P(box(w, 2.3, d), WALL, [x, 1.15, z]), P(box(w + 0.02, 0.4, d + 0.02), RED, [x, 0.5, z]), P(box(w + 0.02, 0.18, d + 0.02), RED, [x, 1.9, z]), P(box(w + 0.3, 0.26, d + 0.3), '#8a3416', [x, 2.45, z]), P(box(w + 0.1, 0.28, d + 0.1), TILE[0], [x, 2.7, z], [0, 0, 0], [1, 1, 1]));
    const horizontal = w > d, n = Math.floor((horizontal ? w : d) / 2.5);
    for (let i = 0; i < n; i++) { const o = -(horizontal ? w : d) / 2 + 1.25 + i * 2.5; if (Math.abs(o) < 4.2 && z > 10 && horizontal) continue; p.push(P(box(horizontal ? 0.16 : w + 0.04, 1.0, horizontal ? d + 0.04 : 0.16), '#e7d8b8', [horizontal ? x + o : x, 1.2, horizontal ? z : z + o])); }
  }
  for (const [x, z] of [[15, 15], [-15, 15], [15, -15], [-15, -15]]) p.push(P(box(1.2, 3.4, 1.2), WALL, [x, 1.7, z]), P(box(1.4, 0.3, 1.4), RED, [x, 3.5, z]), P(cone(0.9, 1.1, 4), TILE[1], [x, 4.2, z], [0, Math.PI / 4, 0]));

  // ---- entrance gopura at z = 15 (road side)
  p.push(P(box(8.6, 0.6, 4.2), DSTONE, [0, 0.3, 15]), P(box(7.4, 5.4, 3.2), WALL, [0, 3.3, 15]), P(box(7.6, 0.4, 3.4), RED, [0, 1.0, 15]), P(box(7.6, 0.3, 3.4), RED, [0, 5.9, 15]));
  p.push(P(box(2.8, 4.1, 0.3), '#1c130c', [0, 2.65, 16.6]), P(cyl(1.4, 1.4, 0.3, 14, 1, false, 0, Math.PI), '#1c130c', [0, 4.7, 16.6], [Math.PI / 2, 0, 0]));   // arched doorway
  for (const sx of [-1, 1]) { pillar(sx * 1.9, 0.6, 16.7, 4.6, 0.22, WALL); p.push(P(box(0.8, 3.2, 0.2), '#7b2a12', [sx * 3.0, 2.6, 16.65]), P(sph(0.3, 8, 6), GOLD, [sx * 3.0, 4.5, 16.8])); }
  p.push(P(box(3.4, 0.4, 0.5), STONE, [0, 5.0, 16.7]), P(box(1.4, 0.6, 0.3), GOLD, [0, 5.2, 16.95]));                                            // lintel + sri-chakra plaque
  const tiers = [[6.2, 1.9, 2.8, '#e9d2a2'], [5.2, 1.8, 2.5, '#efdcb2'], [4.2, 1.7, 2.2, '#e9d2a2'], [3.2, 1.6, 1.9, '#efdcb2']]; let ty = 6.1;
  for (const [w, h, d, col] of tiers) { p.push(P(box(w, h, d), col, [0, ty + h / 2, 15]), P(box(w + 0.5, 0.28, d + 0.5), RED, [0, ty + h + 0.05, 15]), P(box(w + 0.7, 0.18, d + 0.7), TILE[0], [0, ty + h + 0.28, 15]));
    for (let i = 0; i < 4; i++) { const x = -w / 2 + 0.6 + i * (w - 1.2) / 3; p.push(P(box(0.55, h * 0.6, 0.12), '#7b2a12', [x, ty + h * 0.45, 15 + d / 2 + 0.05]), P(box(0.3, 0.42, 0.14), pick3(i), [x, ty + h * 0.42, 15 + d / 2 + 0.1])); }
    ty += h + 0.35; }
  p.push(P(box(3.8, 1.1, 1.7), '#d8b27a', [0, ty + 0.55, 15]), P(cyl(0.9, 0.9, 3.4, 12, 1, false, 0, Math.PI), TILE[2], [0, ty + 1.1, 15], [0, 0, Math.PI / 2]));
  for (const x of [-1.3, 0, 1.3]) kalasha(x, ty + 2.0, 15, 0.7);
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) p.push(P(sph(0.22, 6, 5), GOLD, [sx * 3.2, 6.3 + i * 1.7, 16.5]));                                        // lamp cups

  // ---- main sanctum (garbhagriha) with two-tier hipped tile roof and kalasha
  p.push(P(box(11.4, 0.5, 11.4), DSTONE, [0, 0.25, -6]), P(box(10.4, 0.6, 10.4), STONE, [0, 0.8, -6]), P(box(9.0, 4.4, 9.0), WALL, [0, 3.3, -6]), P(box(9.2, 0.35, 9.2), RED, [0, 1.35, -6]), P(box(9.2, 0.3, 9.2), RED, [0, 5.3, -6]));
  p.push(P(box(2.4, 3.2, 0.3), '#1c130c', [0, 2.9, -1.4]), P(box(2.8, 0.35, 0.4), STONE, [0, 4.6, -1.4]));
  for (let i = -3; i <= 3; i++) for (const s of [[1, 0], [-1, 0], [0, -1]]) { if (s[0] === 0 && Math.abs(i) < 2) { } p.push(P(box(s[0] ? 0.14 : 0.5, 2.6, s[0] ? 0.5 : 0.14), '#e7d8b8', [s[0] * 4.55 + (s[0] ? 0 : i * 1.2), 3.3, -6 + (s[0] ? i * 1.2 : s[1] * 4.55)]));
  }
  roof(0, 5.45, -6, 9.0, 9.0, 2.2, 1.6, 7); p.push(P(box(6.2, 1.5, 6.2), WALL, [0, 8.6, -6]), P(box(6.4, 0.3, 6.4), RED, [0, 9.4, -6])); roof(0, 9.5, -6, 6.2, 6.2, 2.4, 1.2, 7); kalasha(0, 12.0, -6, 1.5);
  // ---- mandapa (pillared hall) in front of the sanctum
  p.push(P(box(11.6, 0.5, 8.4), STONE, [0, 0.25, 1.0]), P(box(10.8, 0.12, 7.6), '#b9b2a2', [0, 0.56, 1.0]));
  for (let i = 0; i < 5; i++) for (const z of [-2.4, 4.4]) pillar(-4.6 + i * 2.3, 0.5, z, 3.6);
  for (const sx of [-1, 1]) for (const z of [-0.4, 1.0, 2.4]) pillar(sx * 4.6, 0.5, z, 3.6);
  p.push(P(box(10.6, 0.5, 7.4), '#e9dcc1', [0, 4.35, 1.0]), P(box(10.8, 0.25, 7.6), WOOD, [0, 4.0, 1.0])); roof(0, 4.6, 1.0, 10.0, 6.8, 1.9, 1.1, 6);
  // ---- dhwaja stambha, deepa stambha, Nandi, tulasi katte
  p.push(P(box(1.6, 0.5, 1.6), DSTONE, [0, 0.25, 9]), P(box(1.2, 0.8, 1.2), STONE, [0, 0.9, 9]), P(cyl(0.2, 0.3, 11, 12), GOLD, [0, 6.8, 9]));
  for (let i = 0; i < 7; i++) p.push(P(cyl(0.34, 0.34, 0.12, 12), '#f0c040', [0, 2.2 + i * 1.3, 9]));
  p.push(P(sph(0.42, 10, 8), GOLD, [0, 12.4, 9], [0, 0, 0], [1, 0.8, 1]), P(cone(0.28, 1.0, 8), GOLD, [0, 13.1, 9]), P(box(1.1, 0.7, 0.04), '#dc2626', [0.6, 12.0, 9], [0, 0, 0.1]));
  p.push(P(box(1.5, 0.4, 1.5), DSTONE, [-5.5, 0.2, 9.5]), P(cyl(0.3, 0.4, 3.0, 8), STONE, [-5.5, 1.9, 9.5]));
  for (let i = 0; i < 5; i++) p.push(P(cyl(0.7 - i * 0.1, 0.75 - i * 0.1, 0.18, 12), STONE, [-5.5, 3.5 + i * 0.5, 9.5]), P(sph(0.1, 6, 4), GOLD, [-5.5 + Math.cos(i * 1.256) * (0.6 - i * 0.08), 3.7 + i * 0.5, 9.5 + Math.sin(i * 1.256) * (0.6 - i * 0.08)]));
  p.push(P(sph(0.3, 8, 6), '#ffd36b', [-5.5, 6.2, 9.5]));
  // Nandi facing the sanctum
  p.push(P(box(1.4, 0.3, 2.2), DSTONE, [4.3, 0.15, 7]), P(sph(0.8, 10, 8), '#2b2b2b', [4.3, 0.95, 7], [0, 0, 0], [0.8, 0.7, 1.3]), P(sph(0.42, 8, 6), '#2b2b2b', [4.3, 1.25, 6.0], [0, 0, 0], [0.9, 1, 1.1]), P(cone(0.08, 0.35, 5), '#e5e7eb', [4.0, 1.7, 6.0], [0, 0, 0.5]), P(cone(0.08, 0.35, 5), '#e5e7eb', [4.6, 1.7, 6.0], [0, 0, -0.5]), P(torus3(), GOLD, [4.3, 1.15, 6.5]));
  p.push(P(cyl(0.5, 0.55, 0.9, 10), '#cfc7b3', [-2.6, 0.45, 12]), P(cyl(0.35, 0.4, 0.2, 10), '#3b2412', [-2.6, 0.95, 12]), P(sph(0.34, 8, 6), '#3f8f2b', [-2.6, 1.3, 12]));
  function pick3(i) { return ['#dc2626', '#16a34a', '#2563eb', '#db2777'][i % 4]; }
  function torus3() { return new THREE.TorusGeometry(0.35, 0.05, 6, 12); }
  return p;
}

export function basadiParts(m) {
  const { P, box, cyl, sph, cone, taper } = m, p = [];
  const G = '#a39b8b', DK = '#857d6e', LT = '#b9b1a0', ST = '#8f887a';
  const slabs = (cx, cy, cz, w, d, h, n = 4, over = 1.2) => { for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n, k0 = Math.pow(1 - t0, 1.15), k1 = Math.pow(1 - t1, 1.15); p.push(P(taper((w + over * 2) * k0 + 0.8, (d + over * 2) * k0 + 0.8, (w + over * 2) * k1 + 0.8, (d + over * 2) * k1 + 0.8, h / n * 1.04), i % 2 ? LT : G, [cx, cy + h * t0 + h / n / 2, cz])); p.push(P(box((w + over * 2) * k0 + 1.0, 0.16, (d + over * 2) * k0 + 1.0), DK, [cx, cy + h * t0 + 0.05, cz])); } };
  const column = (x, y, z, h) => { p.push(P(box(1.0, 0.35, 1.0), DK, [x, y + 0.17, z]), P(cyl(0.34, 0.4, 0.6, 8), G, [x, y + 0.65, z]), P(box(0.62, h - 1.9, 0.62), LT, [x, y + 0.95 + (h - 1.9) / 2, z]), P(cyl(0.4, 0.34, 0.5, 8), G, [x, y + h - 0.55, z]), P(box(0.95, 0.3, 0.95), DK, [x, y + h - 0.15, z]), P(box(1.6, 0.25, 0.5), G, [x, y + h + 0.1, z])); };
  // stepped plinth
  p.push(P(box(28, 0.5, 28), ST, [0, 0.25, 0]), P(box(26, 0.5, 26), G, [0, 0.75, 0]), P(box(24, 0.5, 24), '#9a9282', [0, 1.25, 0]));
  // sanctum block (four-faced) and its tiered roofs
  p.push(P(box(14, 6.6, 14), G, [0, 4.8, 0]), P(box(14.4, 0.5, 14.4), DK, [0, 1.8, 0]), P(box(14.4, 0.4, 14.4), DK, [0, 8.2, 0]));
  for (let i = -5; i <= 5; i++) for (const [ax, az] of [[7.05, i * 1.2], [-7.05, i * 1.2], [i * 1.2, 7.05], [i * 1.2, -7.05]]) p.push(P(box(0.14, 5.2, 0.14), '#b0a898', [ax, 5.1, az]));      // carved flutes
  slabs(0, 8.4, 0, 14, 14, 1.7, 3, 2.6); p.push(P(box(10, 2.0, 10), G, [0, 11.2, 0]), P(box(10.4, 0.35, 10.4), DK, [0, 12.3, 0])); slabs(0, 12.45, 0, 10, 10, 1.6, 3, 2.0);
  p.push(P(box(5.6, 1.6, 5.6), G, [0, 15.4, 0])); slabs(0, 16.2, 0, 5.6, 5.6, 1.5, 3, 1.4);
  p.push(P(cyl(0.9, 1.1, 0.6, 10), DK, [0, 18.0, 0]), P(sph(0.95, 12, 8), G, [0, 18.7, 0], [0, 0, 0], [1, 0.8, 1]), P(cyl(0.2, 0.35, 0.8, 8), DK, [0, 19.5, 0]), P(cone(0.38, 1.4, 8), '#d9a516', [0, 20.4, 0]));
  // four pillared verandahs, each with a lean-to slab roof and a dark doorway
  for (const [dx, dz, rot] of [[0, 1, 0], [0, -1, 0], [1, 0, 1], [-1, 0, 1]]) {
    for (let i = -3; i <= 3; i++) { const ax = rot ? dx * 10.6 : i * 2.2, az = rot ? i * 2.2 : dz * 10.6; column(ax, 1.5, az, 5.6); }
    p.push(P(box(rot ? 5.2 : 17, 0.55, rot ? 17 : 5.2), DK, [dx * 10.0, 7.45, dz * 10.0]), P(box(rot ? 4.6 : 16, 0.5, rot ? 16 : 4.6), G, [dx * 10.0, 7.9, dz * 10.0]));
    p.push(P(box(rot ? 0.4 : 3.4, 4.8, rot ? 3.4 : 0.4), '#241d17', [dx * 7.15, 4.3, dz * 7.15]), P(box(rot ? 0.6 : 4.2, 0.5, rot ? 4.2 : 0.6), LT, [dx * 7.2, 6.9, dz * 7.2]));
    for (let s = 0; s < 4; s++) p.push(P(box(rot ? 1.4 : 7.0 - s * 0.4, 0.34, rot ? 7.0 - s * 0.4 : 1.4), s % 2 ? G : LT, [dx * (12.2 + s * 0.4), 1.7 - s * 0.3 + 0.35, dz * (12.2 + s * 0.4)]));   // steps
    p.push(P(box(rot ? 0.5 : 2.2, 1.4, rot ? 2.2 : 0.5), LT, [dx * 12.6, 1.9, dz * 12.6 + (rot ? 3.6 : 0)]), P(box(rot ? 0.5 : 2.2, 1.4, rot ? 2.2 : 0.5), LT, [dx * 12.6 + (rot ? 0 : 3.6), 1.9, dz * 12.6]));
  }
  // corner shrines (small slab-roofed pavilions) at the plinth corners
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { p.push(P(box(3.2, 3.0, 3.2), G, [sx * 11.2, 3.0, sz * 11.2]), P(box(3.6, 0.3, 3.6), DK, [sx * 11.2, 4.6, sz * 11.2])); slabs(sx * 11.2, 4.7, sz * 11.2, 3.2, 3.2, 1.2, 2, 0.7); p.push(P(cone(0.3, 0.7, 6), '#d9a516', [sx * 11.2, 6.3, sz * 11.2])); }
  return p;
}

/** Manastambha (Jain pillar) and guardian elephants, as separate pieces for placing in front of the basadi. */
export function manastambha(m) {
  const { P, box, cyl, sph, cone } = m, G = '#a39b8b', DK = '#857d6e', p = [];
  p.push(P(box(3.2, 0.5, 3.2), DK, [0, 0.25, 0]), P(box(2.4, 0.5, 2.4), G, [0, 0.75, 0]), P(box(1.4, 3.4, 1.4), '#b7af9e', [0, 2.7, 0]), P(box(1.7, 0.3, 1.7), DK, [0, 4.5, 0]));
  p.push(P(cyl(0.45, 0.5, 5.2, 10), '#bdb5a4', [0, 7.2, 0]));
  for (let i = 0; i < 5; i++) p.push(P(cyl(0.58, 0.58, 0.14, 10), DK, [0, 5.2 + i * 1.0, 0]));
  p.push(P(cyl(0.75, 0.6, 0.5, 10), G, [0, 10.0, 0]), P(box(2.0, 0.3, 2.0), DK, [0, 10.4, 0]));
  for (const [x, z] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) p.push(P(box(0.25, 1.4, 0.25), G, [x, 11.2, z]));
  p.push(P(box(2.2, 0.3, 2.2), DK, [0, 12.0, 0]), P(cone(1.5, 1.3, 4), G, [0, 12.8, 0], [0, Math.PI / 4, 0]), P(sph(0.3, 8, 6), '#d9a516', [0, 13.6, 0]));
  p.push(P(box(0.8, 0.8, 0.12), '#7c7667', [0, 11.2, 0]));
  return p;
}
export function guardianElephant(m) {
  const { P, box, cyl, sph, cone } = m, S = '#a8a091', p = [];
  p.push(P(box(1.6, 0.3, 2.8), '#857d6e', [0, 0.15, 0]), P(sph(0.9, 12, 8), S, [0, 1.3, 0], [0, 0, 0], [0.9, 0.95, 1.35]));
  for (const x of [-0.4, 0.4]) for (const z of [-0.8, 0.8]) p.push(P(cyl(0.2, 0.22, 0.9, 8), S, [x, 0.65, z]));
  p.push(P(sph(0.55, 10, 8), S, [0, 1.9, 1.1], [0, 0, 0], [1, 1, 0.95]), P(cyl(0.16, 0.12, 1.1, 8), S, [0, 1.3, 1.6], [-0.3, 0, 0]), P(box(0.55, 0.06, 0.7), S, [-0.55, 1.95, 1.0], [0, 0.4, 0]), P(box(0.55, 0.06, 0.7), S, [0.55, 1.95, 1.0], [0, -0.4, 0]), P(box(0.9, 0.18, 1.2), '#b3431c', [0, 1.9, 0.1]));
  return p;
}
