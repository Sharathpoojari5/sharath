// Builds Karkala from the OpenStreetMap-derived map file and answers spatial questions
// (ground height, collisions, nearest road, water, place names) for everything that moves.
import * as THREE from './three.module.min.js';
import * as M from './models.js';
import { buildInfra, petrolBunk } from './infra.js';

let seed = 1337;
export const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const rr = (a, b) => a + rand() * (b - a);

export class World {
  constructor(scene, map) {
    this.scene = scene; this.map = map;
    this.obs = new Map(); this.OBS = 16;          // collision grid: cell -> [obstacle]
    this.segGrid = new Map(); this.SEG = 32; this.segs = [];
    this.water = map.water.map(w => ({ ...w, bb: bbox(w.pts) }));
    this.pois = {}; for (const p of map.pois) if (!this.pois[p.name]) this.pois[p.name] = p.p;
    this.lamps = null; this.night = 0;
    const hillP = this.pois['Karkala Gomateshwara Statue'] || [570, 592];
    this.hill = { x: hillP[0], z: hillP[1], R: 80, H: 30 };
    this.buildRoadIndex();
    this.buildGraph();
  }

  /* ---------------------------------------------------------------- queries */
  groundH(x, z) {
    const h = this.hill, d = Math.hypot(x - h.x, z - h.z);
    if (d >= h.R) return 0;
    const t = d / h.R, f = 0.27; if (t < f) return h.H;                 // flat granite top around the statue
    const u = (t - f) / (1 - f); return h.H * (0.5 + 0.5 * Math.cos(Math.PI * u)) * (1 - 0.12 * u);
  }
  inWater(x, z) {
    for (const w of this.water) if (x > w.bb[0] && x < w.bb[2] && z > w.bb[1] && z < w.bb[3] && pip(x, z, w.pts)) return w;
    return null;
  }
  key(ix, iz) { return ix * 100003 + iz; }
  addObs(o) {
    const r = o.r || Math.hypot(o.hx, o.hz);
    const x0 = Math.floor((o.x - r) / this.OBS), x1 = Math.floor((o.x + r) / this.OBS), z0 = Math.floor((o.z - r) / this.OBS), z1 = Math.floor((o.z + r) / this.OBS);
    for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) { const k = this.key(i, j); let a = this.obs.get(k); if (!a) this.obs.set(k, a = []); a.push(o); }
  }
  /** Circle (x,z,r) against static obstacles. Returns {x,z} push (0,0 when free). */
  collide(x, z, r) {
    let px = 0, pz = 0;
    const i0 = Math.floor((x - r) / this.OBS), i1 = Math.floor((x + r) / this.OBS), j0 = Math.floor((z - r) / this.OBS), j1 = Math.floor((z + r) / this.OBS);
    const seen = this._seen || (this._seen = new Set()); seen.clear();
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const a = this.obs.get(this.key(i, j)); if (!a) continue;
      for (const o of a) {
        if (seen.has(o)) continue; seen.add(o);
        const cx = x + px, cz = z + pz;
        if (o.hx !== undefined) {
          const dx = cx - o.x, dz = cz - o.z, lx = dx * o.c + dz * o.s, lz = -dx * o.s + dz * o.c;
          const qx = Math.max(-o.hx, Math.min(o.hx, lx)), qz = Math.max(-o.hz, Math.min(o.hz, lz));
          let ex = lx - qx, ez = lz - qz, d = Math.hypot(ex, ez);
          if (d >= r) continue;
          if (d < 1e-4) { // centre inside the box: push out along the shallowest axis
            const ox = o.hx - Math.abs(lx), oz = o.hz - Math.abs(lz);
            if (ox < oz) { ex = Math.sign(lx) || 1; ez = 0; d = -ox; } else { ex = 0; ez = Math.sign(lz) || 1; d = -oz; }
            const m = r - d; px += (ex * o.c - ez * o.s) * m; pz += (ex * o.s + ez * o.c) * m; continue;
          }
          const m = (r - d) / d; px += (ex * o.c - ez * o.s) * m; pz += (ex * o.s + ez * o.c) * m;
        } else {
          const dx = cx - o.x, dz = cz - o.z, d = Math.hypot(dx, dz), R = r + o.r;
          if (d < R && d > 1e-4) { const m = (R - d) / d; px += dx * m; pz += dz * m; }
        }
      }
    }
    return { x: px, z: pz };
  }
  /** Is a straight line blocked by an obstacle? (coarse, used by police whiskers) */
  blocked(x, z, r) { const p = this.collide(x, z, r); return Math.abs(p.x) + Math.abs(p.z) > 0.05; }

  buildRoadIndex() {
    this.map.roads.forEach((rd, ri) => {
      for (let i = 0; i < rd.pts.length - 1; i++) {
        const [ax, az] = rd.pts[i], [bx, bz] = rd.pts[i + 1];
        const s = { ax, az, bx, bz, w: rd.w, ri, cls: rd.cls }; const si = this.segs.push(s) - 1;
        const m = rd.w / 2 + 2;
        const x0 = Math.floor((Math.min(ax, bx) - m) / this.SEG), x1 = Math.floor((Math.max(ax, bx) + m) / this.SEG);
        const z0 = Math.floor((Math.min(az, bz) - m) / this.SEG), z1 = Math.floor((Math.max(az, bz) + m) / this.SEG);
        for (let a = x0; a <= x1; a++) for (let b = z0; b <= z1; b++) { const k = this.key(a, b); let arr = this.segGrid.get(k); if (!arr) this.segGrid.set(k, arr = []); arr.push(si); }
      }
    });
  }
  /** Nearest road point within maxR. Returns {x,z,d,w,seg,dirx,dirz,name} or null. */
  nearestRoad(x, z, maxR = 80) {
    let best = null;
    const n = Math.ceil(maxR / this.SEG), ci = Math.floor(x / this.SEG), cj = Math.floor(z / this.SEG);
    for (let a = ci - n; a <= ci + n; a++) for (let b = cj - n; b <= cj + n; b++) {
      const arr = this.segGrid.get(this.key(a, b)); if (!arr) continue;
      for (const si of arr) {
        const s = this.segs[si]; const q = closest(x, z, s.ax, s.az, s.bx, s.bz);
        if (q.d < maxR && (!best || q.d < best.d)) { const L = Math.hypot(s.bx - s.ax, s.bz - s.az) || 1; best = { x: q.x, z: q.z, d: q.d, w: s.w, seg: s, dirx: (s.bx - s.ax) / L, dirz: (s.bz - s.az) / L, name: this.map.roads[s.ri].name }; }
      }
    }
    return best;
  }
  /** Distance from a point to any road edge (negative = on the road). */
  roadClearance(x, z, pad = 0) {
    const ci = Math.floor(x / this.SEG), cj = Math.floor(z / this.SEG); let m = 1e9;
    for (let a = ci - 1; a <= ci + 1; a++) for (let b = cj - 1; b <= cj + 1; b++) {
      const arr = this.segGrid.get(this.key(a, b)); if (!arr) continue;
      for (const si of arr) { const s = this.segs[si]; const q = closest(x, z, s.ax, s.az, s.bx, s.bz); m = Math.min(m, q.d - s.w / 2 - pad); }
    }
    return m;
  }

  buildGraph() {
    const N = new Map();
    const node = (id, p) => { let n = N.get(id); if (!n) N.set(id, n = { id, x: p[0], z: p[1], adj: [] }); return n; };
    for (const rd of this.map.roads) {
      if (rd.cls === 'track' || rd.cls === 'service') continue;
      for (let i = 0; i < rd.ids.length - 1; i++) {
        const a = node(rd.ids[i], rd.pts[i]), b = node(rd.ids[i + 1], rd.pts[i + 1]);
        if (a === b) continue;
        a.adj.push({ n: b, w: rd.w, cls: rd.cls }); b.adj.push({ n: a, w: rd.w, cls: rd.cls });
      }
    }
    this.nodes = [...N.values()].filter(n => n.adj.length);
    this.bigNodes = this.nodes.filter(n => n.adj.some(e => e.w >= 9));
    this.nodeGrid = new Map();
    for (const n of this.nodes) { const k = this.key(Math.floor(n.x / 64), Math.floor(n.z / 64)); let a = this.nodeGrid.get(k); if (!a) this.nodeGrid.set(k, a = []); a.push(n); }
  }
  nodesNear(x, z, R) {
    const out = [], n = Math.ceil(R / 64), ci = Math.floor(x / 64), cj = Math.floor(z / 64);
    for (let a = ci - n; a <= ci + n; a++) for (let b = cj - n; b <= cj + n; b++) { const arr = this.nodeGrid.get(this.key(a, b)); if (arr) for (const nd of arr) if (Math.hypot(nd.x - x, nd.z - z) < R) out.push(nd); }
    return out;
  }

  nearestNode(x, z) {
    for (const R of [60, 160, 420]) { const c = this.nodesNear(x, z, R); if (c.length) return c.reduce((a, n) => (Math.hypot(n.x - x, n.z - z) < Math.hypot(a.x - x, a.z - z) ? n : a)); }
    return null;
  }
  /** A* over the road graph. Returns the list of nodes from a to b (inclusive) or null. */
  path(a, b, cap = 1500) {
    const g = new Map([[a, 0]]), prev = new Map(), open = [a], f = new Map([[a, Math.hypot(a.x - b.x, a.z - b.z)]]), closed = new Set(); let it = 0;
    while (open.length && it++ < cap) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (f.get(open[i]) < f.get(open[bi])) bi = i;
      const n = open.splice(bi, 1)[0]; if (n === b) { const out = [n]; let c = n; while (prev.has(c)) { c = prev.get(c); out.push(c); } return out.reverse(); }
      closed.add(n);
      for (const e of n.adj) { const m = e.n; if (closed.has(m)) continue; const ng = g.get(n) + Math.hypot(m.x - n.x, m.z - n.z); if (!g.has(m) || ng < g.get(m)) { g.set(m, ng); prev.set(m, n); f.set(m, ng + Math.hypot(m.x - b.x, m.z - b.z)); if (!open.includes(m)) open.push(m); } }
    }
    return null;
  }
  placeName(x, z) {
    const rd = this.nearestRoad(x, z, 14);
    let best = null, bd = 1e9;
    for (const a of AREAS) { const p = typeof a.at === 'string' ? this.pois[a.at] : a.at; if (!p) continue; const d = Math.hypot(p[0] - x, p[1] - z); if (d < a.r && d < bd) { bd = d; best = a.name; } }
    if (best) return best;
    if (rd && rd.name) return rd.name;
    return 'Karkala';
  }

  /* ---------------------------------------------------------------- building the scene */
  async build(onProgress = () => {}) {
    const tick = () => new Promise(r => setTimeout(r, 0));
    const S = this.scene, b = this.map.bounds;
    const W = b[2] - b[0] + 700, H = b[3] - b[1] + 700, cx = (b[0] + b[2]) / 2, cz = (b[1] + b[3]) / 2;
    this.ext = { x0: b[0] - 120, z0: b[1] - 120, x1: b[2] + 120, z1: b[3] + 120 };
    // ground: detail texture tinted by vertex colours (paddy, laterite, lawns)
    const gGeo = new THREE.PlaneGeometry(W, H, 180, 140); gGeo.rotateX(-Math.PI / 2); gGeo.translate(cx, 0, cz);
    const gp = gGeo.attributes.position, gc = new Float32Array(gp.count * 3), col = new THREE.Color();
    for (let i = 0; i < gp.count; i++) {
      const x = gp.getX(i), z = gp.getZ(i), n = noise2(x * 0.004, z * 0.004), m = noise2(x * 0.02 + 9, z * 0.02 - 3);
      if (n > 0.62) col.set('#9aa83f');          // paddy edge
      else if (n < 0.28) col.set('#8a5a3c');     // laterite soil
      else col.set('#5c8a3a');
      col.offsetHSL(0, 0, (m - 0.5) * 0.08);
      gc[i * 3] = col.r; gc[i * 3 + 1] = col.g; gc[i * 3 + 2] = col.b;
    }
    gGeo.setAttribute('color', new THREE.BufferAttribute(gc, 3));
    const ground = new THREE.Mesh(gGeo, new THREE.MeshStandardMaterial({ vertexColors: true, map: noiseTex('#d9e6c3', '#b7c99a', 256, 6), roughness: 1 }));
    ground.material.onBeforeCompile = (sh) => {      // patchy lush / dry grass, fine blades and soil speckle instead of one flat green
      sh.vertexShader = 'varying vec2 vGp;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vGp = position.xz;');
      sh.fragmentShader = GLSL_NOISE + 'varying vec2 vGp;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float pat = fbm(vGp * 0.011), clump = fbm(vGp * 0.12), fine = fbm(vGp * 1.1), blades = fbm(vec2(vGp.x * 4.0, vGp.y * 1.1));
        vec3 dry = vec3(1.2, 1.05, 0.7), lush = vec3(0.8, 1.04, 0.76);
        diffuseColor.rgb *= mix(lush, dry, smoothstep(0.38, 0.72, pat)) * (0.82 + 0.34 * clump) * (0.88 + 0.24 * fine) * (0.93 + 0.14 * blades);`);
    };
    ground.material.customProgramCacheKey = () => 'ground-v2';
    ground.material.map.repeat.set(W / 9, H / 9); ground.receiveShadow = true; S.add(ground); this.groundMat = ground.material;
    onProgress(0.15, 'Laying the roads'); await tick();
    this.buildRoads(); onProgress(0.3, 'Filling the keres'); await tick();
    this.buildWater(); this.buildHill(); onProgress(0.4, 'Building the town'); await tick();
    this.buildLandmarks(); this.buildOsmBuildings(); this.buildTown(); onProgress(0.7, 'Planting coconut trees'); await tick();
    this.buildTrees(); this.buildTufts(); this.buildLamps(); onProgress(0.8, 'Stringing the electric wires'); await tick();
    buildInfra(this); onProgress(0.88, 'Drawing the map'); await tick();
    this.minimap = this.drawMinimap(); onProgress(0.95, 'Almost there');
  }

  buildRoads() {
    const groups = { main: [], minor: [], track: [] };
    for (const rd of this.map.roads) (rd.cls === 'track' ? groups.track : rd.w >= 9 ? groups.main : groups.minor).push(rd);
    const mk = (list, tex, y) => {
      const pos = [], uv = [], idx = [];
      for (const rd of list) {
        const pts = rd.pts, hw = rd.w / 2; let v = 0; const base = pos.length / 3;
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i], a = pts[Math.max(0, i - 1)], c = pts[Math.min(pts.length - 1, i + 1)];
          let dx = c[0] - a[0], dz = c[1] - a[1]; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
          let nx = -dz, nz = dx, k = 1;
          if (i > 0 && i < pts.length - 1) { // miter
            const d1x = p[0] - a[0], d1z = p[1] - a[1], l1 = Math.hypot(d1x, d1z) || 1;
            const cos = (-d1z / l1) * nx + (d1x / l1) * nz; k = Math.min(2.2, 1 / Math.max(0.45, cos));
          }
          if (i > 0) v += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) / 10;
          for (const s of [-1, 1]) { const x = p[0] + nx * hw * k * s, z = p[1] + nz * hw * k * s; pos.push(x, this.groundH(x, z) + y, z); uv.push(s < 0 ? 0 : 1, v); }
          if (i > 0) { const q = base + (i - 1) * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -1 - y * 20, polygonOffsetUnits: -2 - y * 40 }));
      m.receiveShadow = true; this.scene.add(m); return m;
    };
    this.roadMats = [];
    this.roadMats.push(mk(groups.track, noiseTex('#a3623f', '#8f5236', 64, 3), 0.02).material);
    this.roadMats.push(mk(groups.minor, roadTex(false), 0.03).material);
    this.roadMats.push(mk(groups.main, roadTex(true), 0.05).material);
    // junction patches cover the seams where roads meet
    const disc = [], dm = new THREE.Matrix4();
    for (const n of this.nodes) if (n.adj.length >= 3 || n.adj.length === 1) disc.push([n.x, n.z, Math.max(...n.adj.map(e => e.w)) / 2]);
    const dg = new THREE.CircleGeometry(1, 16); dg.rotateX(-Math.PI / 2);
    const im = new THREE.InstancedMesh(dg, new THREE.MeshStandardMaterial({ color: '#4a4e54', roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }), disc.length);
    disc.forEach(([x, z, r], i) => { dm.makeScale(r, 1, r); dm.setPosition(x, this.groundH(x, z) + 0.06, z); im.setMatrixAt(i, dm); });
    im.receiveShadow = true; this.scene.add(im); this.roadMats.push(im.material);
  }

  buildWater() {
    this.waterNormal = waterNormalTex();
    this.waterMat = new THREE.MeshStandardMaterial({ color: '#246b80', roughness: 0.16, metalness: 0.12, normalMap: this.waterNormal, normalScale: new THREE.Vector2(0.45, 0.45) });
    this.waterNormal.repeat.set(0.07, 0.07);
    const edge = new THREE.MeshStandardMaterial({ color: '#8a6a52', roughness: 1 });
    for (const w of this.water) {
      const sh = new THREE.Shape(w.pts.map(p => new THREE.Vector2(p[0], -p[1])));
      const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(g, this.waterMat); m.position.y = 0.12; m.receiveShadow = true; this.scene.add(m);
      // laterite steps around the kere
      const ring = ribbon(w.pts.concat([w.pts[0]]), 2.6, 0.18, this);
      this.scene.add(new THREE.Mesh(ring, edge));
      // water is solid for the collision grid: approximate with circles along the shoreline so walkers stop at the edge
    }
    for (const r of this.map.rivers) { const m = new THREE.Mesh(ribbon(r.pts, 9, 0.015, this), this.waterMat); m.receiveShadow = true; this.scene.add(m); }
    const grass = new THREE.MeshStandardMaterial({ color: '#6ea544', roughness: 1, map: noiseTex('#ffffff', '#cfe3b6', 128, 4) });
    grass.map.repeat.set(8, 8);
    for (const g of this.map.green) {
      const sh = new THREE.Shape(g.pts.map(p => new THREE.Vector2(p[0], -p[1])));
      const geo = new THREE.ShapeGeometry(sh); geo.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(geo, grass); m.position.y = 0.04; m.receiveShadow = true; this.scene.add(m);
    }
  }

  buildHill() {
    const h = this.hill, g = new THREE.CircleGeometry(h.R + 4, 72, 0, Math.PI * 2);
    // add rings for smooth displacement
    const geo = new THREE.RingGeometry(0.01, h.R + 4, 72, 40); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position, c = new Float32Array(p.count * 3), col = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + h.x, z = p.getZ(i) + h.z, y = this.groundH(x, z);
      p.setXYZ(i, x, y + 0.05, z);
      const t = y / h.H, n = noise2(x * 0.08, z * 0.08);
      col.set(t < 0.12 ? '#5f7f3d' : n > 0.7 ? '#6f7b54' : '#8d887e'); col.offsetHSL(0, 0, (n - 0.5) * 0.12);
      c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); geo.computeVertexNormals(); g.dispose();
    const m = new THREE.Mesh(geo, M.MAT.granite);      // weathered granite with lichen and rain streaks
    m.receiveShadow = true; m.castShadow = true; this.scene.add(m);
    // steps from the nearest road up to the gate; the statue faces the steps
    const rd = this.nearestRoad(h.x, h.z - h.R, 140) || { x: h.x, z: h.z - h.R - 10 };
    const dx = h.x - rd.x, dz = h.z - rd.z, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, face = Math.atan2(-ux, -uz);
    const st = M.statue(); st.position.set(h.x, h.H, h.z); st.rotation.y = face; this.scene.add(st);
    this.addObs({ x: h.x, z: h.z, hx: 3.0, hz: 3.0, c: Math.cos(-face), s: Math.sin(-face) });
    const n = Math.max(1, Math.floor((L - 15.5) / 1.1)), stepGeo = new THREE.BoxGeometry(4.2, 0.42, 1.25);
    const steps = new THREE.InstancedMesh(stepGeo, new THREE.MeshStandardMaterial({ color: '#b9b1a1', roughness: 1 }), n); const mm = new THREE.Matrix4(), q = new THREE.Quaternion();
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(ux, uz));
    for (let i = 0; i < n; i++) { const x = rd.x + ux * (i * 1.1 + 3), z = rd.z + uz * (i * 1.1 + 3); mm.compose(new THREE.Vector3(x, this.groundH(x, z) + 0.12, z), q, new THREE.Vector3(1, 1, 1)); steps.setMatrixAt(i, mm); }
    steps.receiveShadow = true; steps.castShadow = true; this.scene.add(steps);
    // hilltop: stone paving, a prakara wall with a gateway facing the steps, a little shrine behind
    const W = 26, wallH = 2.3, stone = '#b3ab9b', dark = '#958d7e', parts = [M.P(M.box(W, 0.2, W), '#c9c1b0', [0, 0.1, 0])];
    const seg = (x, z, w, d) => { parts.push(M.P(M.box(w, wallH, d), stone, [x, wallH / 2, z]), M.P(M.box(w + 0.2, 0.25, d + 0.2), dark, [x, wallH + 0.12, z])); };
    seg(0, -W / 2, W, 0.7); seg(-W / 2, 0, 0.7, W); seg(W / 2, 0, 0.7, W);
    seg(-(W / 4 + 1.6), W / 2, W / 2 - 3.2, 0.7); seg(W / 4 + 1.6, W / 2, W / 2 - 3.2, 0.7);
    parts.push(M.P(M.box(1.0, 3.0, 1.0), stone, [-3.0, 1.5, W / 2]), M.P(M.box(1.0, 3.0, 1.0), stone, [3.0, 1.5, W / 2]), M.P(M.box(1.3, 0.35, 1.3), dark, [-3.0, 3.15, W / 2]), M.P(M.box(1.3, 0.35, 1.3), dark, [3.0, 3.15, W / 2]));
    for (const sx of [-1, 1]) parts.push(M.P(M.box(0.18, 9, 0.18), '#d4a017', [sx * 9, 4.5, 8]), M.P(M.box(0.9, 0.6, 0.02), '#f97316', [sx * 9 + 0.45, 8.5, 8]));   // flag poles
    parts.push(M.P(M.box(5, 3.2, 4), stone, [0, 1.6, -W / 2 + 3.2]), M.P(M.box(6, 0.4, 5), dark, [0, 3.4, -W / 2 + 3.2]), M.P(M.box(2.4, 2.2, 0.15), '#3a332a', [0, 1.1, -W / 2 + 5.25]));
    for (const [px, pz] of [[-8, 6], [8, 6], [-8, -4], [8, -4]]) parts.push(M.P(M.cyl(0.45, 0.6, 0.5, 10), dark, [px, 0.45, pz]), M.P(M.box(0.12, 0.6, 0.12), '#9a6b3a', [px, 0.9, pz]));
    const top = new THREE.Mesh(M.merge(parts), M.MAT.stone); top.castShadow = true; top.receiveShadow = true;
    top.position.set(h.x, h.H, h.z); top.rotation.y = face; this.scene.add(top);
    const cf = Math.cos(face), sn = Math.sin(face), loc = (lx, lz) => [h.x + lx * cf + lz * sn, h.z - lx * sn + lz * cf];
    const wob = (lx, lz, hx, hz) => { const [x, z] = loc(lx, lz); this.addObs({ x, z, hx, hz, c: Math.cos(-face), s: Math.sin(-face) }); };
    wob(0, -W / 2, W / 2, 0.4); wob(-W / 2, 0, 0.4, W / 2); wob(W / 2, 0, 0.4, W / 2); wob(-(W / 4 + 1.6), W / 2, W / 4 - 1.6, 0.4); wob(W / 4 + 1.6, W / 2, W / 4 - 1.6, 0.4); wob(0, -W / 2 + 3.2, 2.6, 2.1);
    // granite boulders on the slopes
    const bl = [];
    for (let i = 0; i < 70; i++) { const a = rand() * 6.28, r = rr(h.R * 0.32, h.R * 0.95), x = h.x + Math.cos(a) * r, z = h.z + Math.sin(a) * r; if (Math.abs(Math.atan2(x - h.x, z - h.z) - Math.atan2(-ux, -uz)) < 0.25) continue; const s = rr(0.8, 2.6); bl.push({ x, z, m: new THREE.Matrix4().compose(new THREE.Vector3(x, this.groundH(x, z) + s * 0.3, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rand(), rand() * 6, rand())), new THREE.Vector3(s, s * 0.7, s * 1.1)) }); this.addObs({ x, z, r: s * 0.8 }); }
    tiled(this.scene, new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#8f8a80', roughness: 1, flatShading: true }), bl);
    this.hillFoot = [rd.x + ux * 3, rd.z + uz * 3]; this.hillTop = loc(0, 9);
    this.hillFace = face;
  }

  landmark(obj, x, z, rot, obb) {
    obj.position.set(x, this.groundH(x, z), z); obj.rotation.y = rot; this.scene.add(obj);
    if (obb) for (const o of obb) { const c = Math.cos(rot), s = Math.sin(rot), ox = o[0] * c + o[1] * s, oz = -o[0] * s + o[1] * c; this.addObs({ x: x + ox, z: z + oz, hx: o[2], hz: o[3], c: Math.cos(-rot), s: Math.sin(-rot) }); }
  }
  /** rotation that makes a landmark's front (+z) face the nearest road */
  faceRoad(x, z) { const r = this.nearestRoad(x, z, 150); return r ? Math.atan2(r.x - x, r.z - z) : 0; }

  buildLandmarks() {
    const P = this.pois; this.special = [];
    const put = (name, fn) => { const p = P[name]; if (p) { fn(p[0], p[1]); this.special.push(p); } };
    put('Sri Venkataramana Temple', (x, z) => { const r = this.faceRoad(x, z); this.landmark(M.temple(), x, z, r, [[0, 15, 15, 0.4], [0, -15, 15, 0.4], [15, 0, 0.4, 15], [-15, 0, 0.4, 15], [0, -4, 6, 7]]); this.temple = [x, z, r]; });
    put('Chaturmakha Basadi', (x, z) => this.landmark(M.basadi(), x, z, this.faceRoad(x, z), [[0, 0, 12, 12]]));
    put('Karkala Bus Stand', (x, z) => {
      const rd = this.nearestRoad(x, z, 80); if (!rd) return;
      const n0x = -rd.dirz, n0z = rd.dirx, side = Math.sign((x - rd.x) * n0x + (z - rd.z) * n0z) || 1;
      const off = rd.w / 2 + 12, bx = rd.x + n0x * side * off, bz = rd.z + n0z * side * off;
      let rot = Math.atan2(-rd.dirz, rd.dirx); if (side > 0) rot += Math.PI;   // sign (+z) faces the road
      this.landmark(M.busStand(), bx, bz, rot, [[0, 0, 23, 0.8], [-16, -2, 4, 2]]);
      this.busStand = { x: bx, z: bz, rot, road: rd, side, n: [n0x * side, n0z * side] };
    });
    put('Pradeep Fuel Station', (x, z) => this.landmark(petrolBunk(), x, z, this.faceRoad(x, z), [[-5, -2.5, 0.3, 0.3], [5, -2.5, 0.3, 0.3], [-5, 2.5, 0.3, 0.3], [5, 2.5, 0.3, 0.3], [-2.5, 0, 0.5, 0.4], [2.5, 0, 0.5, 0.4], [0, -7, 2.5, 2]]));
    put('Gopal Towers', (x, z) => this.tower(x, z, ['GOPAL TOWERS', 'ಗೋಪಾಲ್ ಟವರ್ಸ್'], 16, 14, 4, '#e2e8f0'));
    put('Sri Bhuvanendra College', (x, z) => this.tower(x, z, ['SRI BHUVANENDRA COLLEGE'], 40, 16, 3, '#fef3c7'));
    put('Police Station', (x, z) => this.tower(x, z, ['POLICE STATION', 'ಪೊಲೀಸ್ ಠಾಣೆ'], 18, 12, 2, '#fde68a', '#b91c1c'));
    put('Karkala Government Hospital', (x, z) => this.tower(x, z, ['GOVERNMENT HOSPITAL', 'ಸರ್ಕಾರಿ ಆಸ್ಪತ್ರೆ'], 26, 14, 3, '#f8fafc', '#15803d'));
    put('Taluk Office', (x, z) => this.tower(x, z, ['TALUK OFFICE'], 20, 12, 2, '#fef9c3'));
    put('Hotel Taj Mahal', (x, z) => this.tower(x, z, ['HOTEL RAJ MAHAL', 'Veg · Non-veg · Goli Baje'], 14, 12, 2, '#fff7ed', '#c2410c'));
    put('Hotel Prakash', (x, z) => this.tower(x, z, ['HOTEL PRAKASHAM', 'Meals Ready'], 14, 11, 2, '#fefce8', '#a16207'));
    put('Shree Durga Lunch Home', (x, z) => this.tower(x, z, ['DURGA LUNCH HOME', 'Fish Thali'], 12, 10, 2, '#ecfeff', '#0e7490'));
    // Aanekere: the little basadi in the middle of the lake
    const ak = this.water.find(w => w.name === 'Aanekere');
    if (ak) {
      let sx = 0, sz = 0; ak.pts.forEach(p => { sx += p[0]; sz += p[1]; }); sx /= ak.pts.length; sz /= ak.pts.length;
      const isl = new THREE.Mesh(new THREE.CylinderGeometry(13, 14, 1.2, 20), new THREE.MeshStandardMaterial({ color: '#8f887a', roughness: 1 }));
      isl.position.set(sx, 0.5, sz); this.scene.add(isl);
      const bs = M.basadi(0.45); bs.position.set(sx, 1.0, sz); this.scene.add(bs); this.kereBasadi = [sx, sz];
    }
    // Market Road stalls
    const mr = this.map.roads.find(r => r.name === 'Market Road');
    this.stalls = [];
    if (mr) {
      const geo = M.stallGeo(), spots = [];
      walk(mr.pts, 9, (x, z, dx, dz) => { for (const s of [-1, 1]) if (rand() < 0.75) spots.push([x - dz * s * (mr.w / 2 + 2.2), z + dx * s * (mr.w / 2 + 2.2), Math.atan2(dz * s, -dx * s) + Math.PI / 2]); });
      const im = new THREE.InstancedMesh(geo, M.MAT.solid, spots.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
      spots.forEach(([x, z, r], i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r); m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, m4); this.addObs({ x, z, r: 1.3 }); });
      im.castShadow = true; this.scene.add(im); this.stalls = spots; this.marketRoad = mr;
    }
  }

  tower(x, z, sign, w, d, floors, wall, signBg = '#1d4ed8') {
    const rot = this.faceRoad(x, z), h = floors * 3.4 + 0.6;
    const parts = [M.P(M.box(w, h, d), wall, [0, h / 2, 0]), M.P(M.box(w + 0.6, 0.5, d + 0.6), '#94a3b8', [0, h + 0.25, 0])];
    for (let f = 0; f < floors; f++) for (let i = 0; i < Math.floor(w / 3); i++) parts.push(M.P(M.box(1.4, 1.4, 0.1), '#334155', [-w / 2 + 1.6 + i * 3, f * 3.4 + 2.0, d / 2 + 0.05]));
    parts.push(M.P(M.box(Math.min(5, w * 0.4), 2.6, 0.1), '#1f2937', [0, 1.3, d / 2 + 0.06]));
    const g = new THREE.Group(); const m = new THREE.Mesh(M.merge(parts), M.MAT.solid); m.castShadow = true; m.receiveShadow = true; g.add(m);
    const s = M.signMesh(sign, Math.min(w * 0.9, 14), 1.8, { bg: signBg, fg: '#fff', w: 1024, h: 140 }); s.position.set(0, Math.min(h - 0.6, 4.6), d / 2 + 0.12); g.add(s);
    this.landmark(g, x, z, rot, [[0, 0, w / 2, d / 2]]);
  }

  buildOsmBuildings() {
    const skip = new Set(['Karkala Gomateshwara', 'Sri Venkataramana Temple', 'Chaturmakha Basadi', 'Karkala Bus Stand', 'Sri Bhuvanendra College', 'Police Station', 'Taluk Office', 'Shree Durga Lunch Home', 'Hanuman Temple']);
    const parts = [];
    for (const b of this.map.buildings) {
      if (skip.has(b.name) || b.pts.length < 3) continue;
      // oriented bounding box from the longest edge
      let best = 0, ang = 0; for (let i = 0; i < b.pts.length; i++) { const p = b.pts[i], q = b.pts[(i + 1) % b.pts.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (L > best) { best = L; ang = Math.atan2(q[1] - p[1], q[0] - p[0]); } }
      const c = Math.cos(ang), s = Math.sin(ang); let mnx = 1e9, mxx = -1e9, mnz = 1e9, mxz = -1e9;
      for (const p of b.pts) { const lx = p[0] * c + p[1] * s, lz = -p[0] * s + p[1] * c; mnx = Math.min(mnx, lx); mxx = Math.max(mxx, lx); mnz = Math.min(mnz, lz); mxz = Math.max(mxz, lz); }
      const hx = Math.max(2, (mxx - mnx) / 2), hz = Math.max(2, (mxz - mnz) / 2); if (hx > 40 || hz > 40) continue;
      const lcx = (mnx + mxx) / 2, lcz = (mnz + mxz) / 2, x = lcx * c - lcz * s, z = lcx * s + lcz * c;
      if (this.roadClearance(x, z) < -0.5) continue;
      const floors = b.kind === 'school' || b.kind === 'college' ? 2 : 1 + Math.floor(rand() * 2), h = floors * 3.3;
      parts.push(M.P(M.box(hx * 2, h, hz * 2), pick(WALLS), [x, h / 2, z], [0, -ang, 0]));
      parts.push(M.P(M.box(hx * 2 + 0.4, 0.35, hz * 2 + 0.4), '#9ca3af', [x, h + 0.17, z], [0, -ang, 0]));
      this.addObs({ x, z, hx, hz, c, s });
    }
    if (parts.length) { const m = new THREE.Mesh(M.merge(parts), M.MAT.solid); m.castShadow = true; m.receiveShadow = true; this.scene.add(m); }
  }

  /** Procedural houses and shops along every road: denser near the bus stand. */
  buildTown() {
    const centre = this.pois['Karkala Bus Stand'] || [150, 38];
    const north = this.pois['Taluk Office'] || [-886, -759];
    const B = [], taken = new Map(), TK = 12;
    const free = (x, z, r) => {
      const i0 = Math.floor((x - r) / TK), i1 = Math.floor((x + r) / TK), j0 = Math.floor((z - r) / TK), j1 = Math.floor((z + r) / TK);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const a = taken.get(i * 9973 + j); if (a) for (const o of a) if (Math.hypot(o[0] - x, o[1] - z) < o[2] + r) return false; }
      return true;
    };
    const take = (x, z, r) => { const i0 = Math.floor((x - r) / TK), i1 = Math.floor((x + r) / TK), j0 = Math.floor((z - r) / TK), j1 = Math.floor((z + r) / TK); for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const k = i * 9973 + j; let a = taken.get(k); if (!a) taken.set(k, a = []); a.push([x, z, r]); } };
    for (const s of this.special) take(s[0], s[1], 26);
    if (this.busStand) take(this.busStand.x, this.busStand.z, 30);
    for (const st of this.stalls) take(st[0], st[1], 1.6);
    for (const rd of this.map.roads) {
      if (rd.cls === 'track') continue;
      let acc = 0;
      for (let i = 0; i < rd.pts.length - 1; i++) {
        const [ax, az] = rd.pts[i], [bx, bz] = rd.pts[i + 1], L = Math.hypot(bx - ax, bz - az); if (L < 4) continue;
        const dx = (bx - ax) / L, dz = (bz - az) / L;
        for (let t = acc; t < L; t += rr(9, 15)) {
          const x0 = ax + dx * t, z0 = az + dz * t;
          const dc = Math.min(Math.hypot(x0 - centre[0], z0 - centre[1]), Math.hypot(x0 - north[0], z0 - north[1]) * 1.4);
          const urban = Math.max(0, 1 - dc / 650);
          for (const side of [-1, 1]) {
            if (rand() > 0.22 + urban * 0.7) continue;
            const shop = urban > 0.45 && rand() < 0.75;
            const fw = shop ? rr(7, 11) : rr(7, 10), dd = shop ? rr(8, 13) : rr(7, 10);
            const set = rd.w / 2 + (shop ? 1.8 : rr(3, 7)) + dd / 2;
            const nx = -dz * side, nz = dx * side, x = x0 + nx * set, z = z0 + nz * set, r = Math.hypot(fw, dd) / 2 * 0.92;
            if (!free(x, z, r) || this.groundH(x, z) > 0.3 || this.inWater(x, z) || this.inWater(x + nx * dd / 2, z + nz * dd / 2)) continue;
            const ok = [[0, 0], [fw / 2, dd / 2], [-fw / 2, dd / 2], [fw / 2, -dd / 2], [-fw / 2, -dd / 2]].every(([u, v]) => this.roadClearance(x + dx * u + nx * v, z + dz * u + nz * v, 0.8) > 0);
            if (!ok) continue;
            take(x, z, r);
            const floors = shop ? 1 + Math.floor(rand() * (1 + urban * 3.2)) : 1 + (rand() < 0.35 ? 1 : 0);
            B.push({ x, z, fw, dd, rot: Math.atan2(-nx, -nz), floors, shop, tiled: !shop && rand() < 0.72, yard: set - rd.w / 2 - dd / 2 });
          }
        }
        acc = 0;
      }
    }
    this.buildings = B;
    // instanced + tiled: walls (windows drawn by the shader), roofs, balconies, water tanks, compound walls, verandas, shop fronts
    const unit = new THREE.BoxGeometry(1, 1, 1); unit.translate(0, 0.5, 0);
    const L = { house: [], shopw: [], flats: [], tiles: [], slab: [], rail: [], tank: [], cwall: [], ver: [], pillar: [], shut: [], sign: [] };
    const up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3();
    const qOf = (b, tilt = 0) => new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, b.rot, 0, 'YXZ'));
    const local = (b, lx, ly, lz) => { const cs = Math.cos(b.rot), sn = Math.sin(b.rot); return new THREE.Vector3(b.x + lx * cs + lz * sn, ly, b.z - lx * sn + lz * cs); };
    const add = (list, b, pos, scl, col, q = qOf(b), extra) => list.push(Object.assign({ x: b.x, z: b.z, m: new THREE.Matrix4().compose(pos, q, scl.clone()), c: col ? new THREE.Color(col) : null }, extra));
    for (const b of B) {
      const h = b.floors * 3.2;
      add(b.shop ? L.shopw : L.house, b, local(b, 0, 0, 0), sc.set(b.fw, h, b.dd), b.shop ? pick(SHOPWALLS) : pick(WALLS));
      if (b.tiled) add(L.tiles, b, local(b, 0, h, 0), sc.set(b.fw + 1.0, rr(2.2, 3.0), b.dd + 1.0), pick(TILES));
      else {
        add(L.flats, b, local(b, 0, h, 0), sc.set(b.fw + 0.3, 0.45, b.dd + 0.3));
        if (rand() < 0.75) add(L.tank, b, local(b, (rand() < 0.5 ? -1 : 1) * (b.fw / 2 - 1.1), h + 0.45, -(b.dd / 2 - 1.1)), sc.set(1, 1, 1));
      }
      if (b.floors >= 2 && rand() < (b.shop ? 0.4 : 0.6)) {
        const bw = b.fw * rr(0.45, 0.7), ox = rr(-0.15, 0.15) * b.fw, rc = pick(['#e5e7eb', '#a3e635', '#38bdf8', '#f472b6', '#facc15', '#94a3b8']);
        for (let f = 1; f < b.floors; f++) { add(L.slab, b, local(b, ox, f * 3.2 - 0.05, b.dd / 2 + 0.55), sc.set(bw, 0.16, 1.1)); add(L.rail, b, local(b, ox, f * 3.2 + 0.1, b.dd / 2 + 1.07), sc.set(bw, 0.85, 0.07), rc); }
      }
      if (!b.shop && b.yard > 2.2 && rand() < 0.8) {
        const len = b.fw + 2, seg = (len - 2.6) / 2, zl = b.dd / 2 + b.yard - 0.6, col = pick(['#d6d3d1', '#fca5a5', '#fde68a', '#a8a29e', '#b4532a', '#e7e5e4', '#bbf7d0']);
        for (const sx of [-1, 1]) { const lx = sx * (1.3 + seg / 2); add(L.cwall, b, local(b, lx, 0, zl), sc.set(seg, 1.25, 0.22), col); const w = local(b, lx, 0, zl); this.addObs({ x: w.x, z: w.z, hx: seg / 2, hz: 0.15, c: Math.cos(-b.rot), s: Math.sin(-b.rot) }); }
        for (const sx of [-1, 1]) add(L.pillar, b, local(b, sx * 1.3, 0, zl), sc.set(0.45, 1.6, 0.45), col);
      }
      if (b.tiled && b.yard > 2.4 && rand() < 0.6) {
        add(L.ver, b, local(b, 0, h - 0.25, b.dd / 2 + 0.95), sc.set(b.fw * 0.86, 0.12, 2.1), pick(TILES), qOf(b, 0.3));
        for (const sx of [-1, 1]) add(L.pillar, b, local(b, sx * b.fw * 0.38, 0, b.dd / 2 + 1.75), sc.set(0.2, h - 0.5, 0.2), '#f5f5f4');
      }
      if (b.shop) {
        add(L.shut, b, local(b, 0, 0, b.dd / 2 + 0.03), sc.set(b.fw * 0.82, 2.5, 0.1), pick(['#475569', '#64748b', '#1f2937', '#fbbf24', '#f97316', '#e2e8f0', '#0f766e']));
        add(L.sign, b, local(b, 0, 3.05, b.dd / 2 + 0.16), sc.set(b.fw * 0.92, 0.86, 1), null, qOf(b), { row: Math.floor(rand() * SHOPNAMES.length) });
      }
      this.addObs({ x: b.x, z: b.z, hx: b.fw / 2, hz: b.dd / 2, c: Math.cos(-b.rot), s: Math.sin(-b.rot) });
    }
    const S = this.scene;
    this.wallMats = [wallMaterial(false), wallMaterial(true)];
    tiled(S, unit, this.wallMats[0], L.house); tiled(S, unit, this.wallMats[1], L.shopw);
    tiled(S, unit, new THREE.MeshStandardMaterial({ color: '#a8a29e', roughness: 1 }), L.flats);
    const tileTex = roofTex(); tiled(S, hipRoof(), new THREE.MeshStandardMaterial({ roughness: 0.85, map: tileTex }), L.tiles);
    tiled(S, unit, new THREE.MeshStandardMaterial({ color: '#d6d3d1', roughness: 1 }), L.slab, { cast: false });
    tiled(S, unit, new THREE.MeshStandardMaterial({ roughness: 0.6 }), L.rail, { cast: false });
    tiled(S, new THREE.CylinderGeometry(0.62, 0.62, 1.25, 12).translate(0, 0.62, 0), new THREE.MeshStandardMaterial({ color: '#1f2937', roughness: 0.5 }), L.tank, { receive: false });
    tiled(S, unit, new THREE.MeshStandardMaterial({ roughness: 1 }), L.cwall); tiled(S, unit, new THREE.MeshStandardMaterial({ roughness: 1 }), L.pillar);
    tiled(S, unit, new THREE.MeshStandardMaterial({ roughness: 0.85, map: tileTex }), L.ver);
    this.shopMats = [new THREE.MeshStandardMaterial({ roughness: 0.6, emissive: '#000' })];
    tiled(S, unit, this.shopMats[0], L.shut, { cast: false });
    const signGeo = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), atlas = signAtlas(), signMat = new THREE.MeshStandardMaterial({ map: atlas, emissiveMap: atlas, roughness: 0.6, emissive: '#000000' });
    const rows = SHOPNAMES.length;
    signMat.onBeforeCompile = (sh) => { sh.vertexShader = 'attribute float aRow;\n' + sh.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>\n vMapUv.y = (vMapUv.y + (${rows - 1}.0 - aRow)) / ${rows}.0;\n #ifdef USE_EMISSIVEMAP\n vEmissiveMapUv.y = (vEmissiveMapUv.y + (${rows - 1}.0 - aRow)) / ${rows}.0;\n #endif`); };
    signMat.customProgramCacheKey = () => 'shop-sign';
    tiled(S, signGeo, signMat, L.sign, { cast: false, attr: 'row' });
    this.shopMats.push(signMat);
  }

  buildTrees() {
    const b = this.map.bounds, kinds = { palm: [], tree: [], areca: [], banana: [] }, bushes = [];
    const nearHouse = (x, z) => this.blocked(x, z, 9);
    for (let i = 0; i < 12000 && kinds.palm.length + kinds.tree.length + kinds.areca.length + kinds.banana.length < 4600; i++) {
      const x = rr(b[0] - 100, b[2] + 100), z = rr(b[1] - 100, b[3] + 100);
      if (this.inWater(x, z) || this.roadClearance(x, z, 1.5) < 0) continue;
      if (this.blocked(x, z, 1.2)) continue;
      const hg = this.groundH(x, z); if (hg > 22) continue;
      if (this.map.green.some(g => pip(x, z, g.pts))) continue;
      const r = rand(), home = nearHouse(x, z);
      const k = home ? (r < 0.4 ? 'palm' : r < 0.62 ? 'banana' : r < 0.82 ? 'areca' : 'tree') : (r < 0.5 ? 'palm' : r < 0.72 ? 'tree' : r < 0.9 ? 'areca' : 'banana');
      kinds[k].push([x, hg, z, rr(0.8, 1.2), rand() * 6.28, k === 'palm' ? rr(-0.12, 0.12) : rr(-0.04, 0.04)]);
      if (rand() < 0.35) { const bx = x + rr(-4, 4), bz = z + rr(-4, 4); if (this.roadClearance(bx, bz, 0.8) > 0 && !this.blocked(bx, bz, 0.8) && !this.inWater(bx, bz)) bushes.push({ x: bx, z: bz, m: new THREE.Matrix4().compose(new THREE.Vector3(bx, this.groundH(bx, bz), bz), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 6), new THREE.Vector3().setScalar(rr(0.6, 1.4))) }); }
    }
    const put = (geos, list, r0) => {
      const q = new THREE.Quaternion(), e = new THREE.Euler(), items = [];
      for (const [x, y, z, s, r, tilt] of list) { e.set(tilt, r, tilt * 0.6); q.setFromEuler(e); items.push({ x, z, m: new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s, s)) }); this.addObs({ x, z, r: r0 * s }); }
      tiled(this.scene, geos.trunk, M.MAT.solid, items, { receive: false }); tiled(this.scene, geos.crown, M.MAT.solid, items, { receive: false });
    };
    put(M.palmGeos(), kinds.palm, 0.35); put(M.treeGeos(), kinds.tree, 0.45); put(M.arecaGeos(), kinds.areca, 0.2); put(M.bananaGeos(), kinds.banana, 0.3);
    tiled(this.scene, M.bushGeo(), M.MAT.solid, bushes, { receive: false });
  }

  /** Grass tufts and wild flowers along the verges: cheap crossed quads with a painted alpha texture, tiled so they cull. */
  buildTufts() {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128; const x = c.getContext('2d');
    for (let i = 0; i < 26; i++) { const bx = 8 + Math.random() * 112, h = 40 + Math.random() * 80, lean = (Math.random() - 0.5) * 36, g = 90 + Math.random() * 70; x.strokeStyle = `rgb(${50 + Math.random() * 40},${g},${35 + Math.random() * 30})`; x.lineWidth = 2 + Math.random() * 2.5; x.beginPath(); x.moveTo(bx, 128); x.quadraticCurveTo(bx + lean * 0.4, 128 - h * 0.6, bx + lean, 128 - h); x.stroke(); }
    for (let i = 0; i < 3; i++) { const fx = 14 + Math.random() * 100, fy = 128 - 50 - Math.random() * 40; x.fillStyle = ['#fde047', '#f472b6', '#f8fafc'][i % 3]; x.beginPath(); x.arc(fx, fy, 3.2, 0, 7); x.fill(); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const q = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), g = new THREE.BufferGeometry(); const a = q.clone(), b2 = q.clone().rotateY(Math.PI / 2);
    const merged = M.merge([{ geo: a, color: '#ffffff', pos: [0, 0, 0], rot: [0, 0, 0], scl: [1, 1, 1] }, { geo: b2, color: '#ffffff', pos: [0, 0, 0], rot: [0, 0, 0], scl: [1, 1, 1] }]);
    const mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 1, vertexColors: false }); mat.userData.tuft = true;
    const items = [], e = new THREE.Euler(), qt = new THREE.Quaternion(); let tries = 0;
    for (const s of this.segs) {
      const L = Math.hypot(s.bx - s.ax, s.bz - s.az); if (L < 6) continue;
      const n = Math.min(14, Math.floor(L / 7)), dx = (s.bx - s.ax) / L, dz = (s.bz - s.az) / L;
      for (let i = 0; i < n && items.length < 6500; i++) {
        tries++; const t = Math.random() * L, side = Math.random() < 0.5 ? -1 : 1, off = s.w / 2 + 2.4 + Math.random() * 7;
        const px = s.ax + dx * t - dz * off * side, pz = s.az + dz * t + dx * off * side;
        if (this.inWater(px, pz) || this.blocked(px, pz, 0.6) || this.roadClearance(px, pz, 0.6) < 0) continue;
        const sc = 0.5 + Math.random() * 0.8; e.set(0, Math.random() * 6.28, 0); qt.setFromEuler(e);
        items.push({ x: px, z: pz, m: new THREE.Matrix4().compose(new THREE.Vector3(px, this.groundH(px, pz), pz), qt, new THREE.Vector3(sc * 1.4, sc, sc * 1.4)) });
      }
    }
    tiled(this.scene, merged, mat, items, { cast: false, receive: false });
  }

  buildLamps() {
    const spots = [];
    for (const rd of this.map.roads) if (rd.w >= 9) walk(rd.pts, 38, (x, z, dx, dz) => { const s = spots.length % 2 ? 1 : -1; spots.push([x - dz * s * (rd.w / 2 + 0.8), z + dx * s * (rd.w / 2 + 0.8), Math.atan2(dz * s, -dx * s)]); });
    const g = M.lampGeos(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), poles = [], pools = [];
    for (const [x, z, r] of spots) {
      q.setFromAxisAngle(up, r + Math.PI / 2); poles.push({ x, z, m: new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(1, 1, 1)) });
      const px = x + Math.sin(r + Math.PI / 2) * 1.5, pz = z + Math.cos(r + Math.PI / 2) * 1.5; pools.push({ x, z, m: new THREE.Matrix4().makeTranslation(px, 0.09, pz) }); this.addObs({ x, z, r: 0.2 });
    }
    tiled(this.scene, g.pole, M.MAT.solid, poles, { receive: false }); tiled(this.scene, g.lamp, M.MAT.glow, poles, { cast: false, receive: false });
    const poolMat = new THREE.MeshBasicMaterial({ color: '#ffd88a', transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    this.lamps = { pools: tiled(this.scene, new THREE.CircleGeometry(6, 20).rotateX(-Math.PI / 2), poolMat, pools, { cast: false, receive: false }), poolMat };
    for (const m of this.lamps.pools) m.visible = false;
  }

  setNight(n) {     // 0 day .. 1 night
    this.night = n;
    if (this.lamps) { for (const m of this.lamps.pools) m.visible = n > 0.35; this.lamps.poolMat.opacity = 0.4 * n; }
    if (this.wallMats) for (const m of this.wallMats) m.userData.uNight.value = n;
    if (this.shopMats) { this.shopMats[0].emissive.setRGB(0.25 * n, 0.22 * n, 0.15 * n); this.shopMats[1].emissive.setRGB(0.45 * n, 0.45 * n, 0.45 * n); }
  }
  update(dt) { if (this.waterNormal) { this.waterNormal.offset.x += dt * 0.004; this.waterNormal.offset.y += dt * 0.0027; } }
  setWet(w) { for (const m of this.roadMats || []) m.roughness = 0.92 - 0.6 * w; this.groundMat.color.setScalar(1 - 0.25 * w); }

  drawMinimap() {
    const b = this.ext, S = 0.5, W = Math.ceil((b.x1 - b.x0) * S), H = Math.ceil((b.z1 - b.z0) * S);
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    x.fillStyle = '#2f4f2a'; x.fillRect(0, 0, W, H);
    const P = (p) => [(p[0] - b.x0) * S, (p[1] - b.z0) * S];
    x.fillStyle = '#4d7a3a'; for (const g of this.map.green) poly(x, g.pts.map(P));
    x.fillStyle = '#7d786e'; x.beginPath(); x.arc(...P([this.hill.x, this.hill.z]), this.hill.R * S, 0, 7); x.fill();
    x.fillStyle = '#2d7fb0'; for (const w of this.water) poly(x, w.pts.map(P));
    x.strokeStyle = '#2d7fb0'; x.lineCap = 'round'; for (const r of this.map.rivers) { x.lineWidth = 4; line(x, r.pts.map(P)); }
    x.fillStyle = '#6b6357'; for (const bd of this.buildings || []) { const p = P([bd.x, bd.z]); x.fillRect(p[0] - 1.5, p[1] - 1.5, 3, 3); }
    for (const rd of this.map.roads) { x.strokeStyle = rd.w >= 9 ? '#f1f5f9' : '#cbd5e1'; x.lineWidth = Math.max(1.5, rd.w * S * 1.2); x.lineJoin = 'round'; line(x, rd.pts.map(P)); }
    return { canvas: c, S, x0: b.x0, z0: b.z0 };
  }
}

export const AREAS = [
  { name: 'Karkala Bus Stand', at: 'Karkala Bus Stand', r: 70 },
  { name: 'Market Road', at: 'Gopal Towers', r: 90 },
  { name: 'Gandhi Maidan', at: 'Gandhi Maidan', r: 80 },
  { name: 'Venkataramana Temple', at: 'Sri Venkataramana Temple', r: 70 },
  { name: 'Aanekere', at: 'Aanekere', r: 140 },
  { name: 'Ramasamudra', at: 'Rama Samudra', r: 220 },
  { name: 'Chaturmukha Basadi', at: 'Chaturmakha Basadi', r: 70 },
  { name: 'Bahubali Betta', at: 'Bahubali Hill', r: 120 },
  { name: 'Bhuvanendra College', at: 'Sri Bhuvanendra College', r: 110 },
  { name: 'Swaraj Maidan', at: 'Swaraj Maidan', r: 70 },
  { name: 'Taluk Office', at: 'Taluk Office', r: 120 },
  { name: 'Police Station', at: 'Police Station', r: 70 },
  { name: 'Government Hospital', at: 'Karkala Government Hospital', r: 60 },
];

/* ---------------------------------------------------------------- helpers */
/**
 * Wall material for instanced unit boxes (0..1 high): draws windows with white frames and grills,
 * chajja shadow lines, a plinth and a front door in the shader, using each instance's scale in
 * metres. Windows glow warm at night (uniform uNight), with a random pattern per building.
 */
export function wallMaterial(shop) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.92 });
  m.userData.uNight = { value: 0 }; m.customProgramCacheKey = () => 'wall2-' + shop;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = m.userData.uNight;
    sh.vertexShader = 'varying vec3 vLoc; varying vec3 vNo; varying vec3 vSz; varying float vSeed;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vLoc = position; vNo = normal; vSeed = float(gl_InstanceID);
      vSz = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));`);
    sh.fragmentShader = GLSL_NOISE + `varying vec3 vLoc; varying vec3 vNo; varying vec3 vSz; varying float vSeed; uniform float uNight;
      float hsh(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
      ` + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 winGlow = vec3(0.);
        if (abs(vNo.y) < 0.5) {
          bool zf = abs(vNo.z) > 0.5; float faceW = zf ? vSz.x : vSz.z;
          float u = (zf ? vLoc.x : vLoc.z) * faceW, v = vLoc.y * vSz.y;
          float fl = floor(v / 3.2), fy = v - fl * 3.2;
          bool front = vNo.z > 0.5;
          float nw = max(1., floor(faceW / 2.9)); float cu = (u / faceW + 0.5) * nw; float cx = fract(cu), ci = floor(cu);
          float nz = fbm(vec2(u * 0.45, v * 0.45) + vSeed * 1.7); diffuseColor.rgb *= 0.84 + 0.26 * nz;                           // plaster tone variation
          float streak = smoothstep(0.52, 0.88, fbm(vec2(u * 3.2 + vSeed, v * 0.1))); diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.6, 0.58, 0.54), streak * 0.5 * smoothstep(0.1, 1.0, v / vSz.y));   // rain streaks
          float damp = (1.0 - smoothstep(0.0, 1.7, v)) * smoothstep(0.34, 0.8, fbm(vec2(u * 1.3, v * 1.7) + vSeed)); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.27, 0.37, 0.2), damp * 0.62);   // moss and damp at the base
          float crack = smoothstep(0.008, 0.0, abs(fbm(vec2(u * 0.9, v * 0.9) + vSeed * 3.1) - 0.5)); diffuseColor.rgb *= 1.0 - 0.3 * crack;
          float peel = smoothstep(0.7, 0.78, fbm(vec2(u * 0.6, v * 0.6) - vSeed)); diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.12 + 0.03, peel * 0.5);
          if (v < 0.45) diffuseColor.rgb *= 0.62;                                 // plinth
          float band = step(2.42, fy) * step(fy, 2.62) * step(0.5, v); diffuseColor.rgb *= 1. - 0.32 * band;   // chajja shadow
          if (v > vSz.y - 0.35) diffuseColor.rgb *= 0.85;                          // parapet line
          bool doorZone = front && fl < 0.5 && abs(u) < 1.1;
          ${shop ? 'bool skip = front && fl < 0.5;' : 'bool skip = doorZone;'}
          float inWin = step(0.27, cx) * step(cx, 0.73) * step(0.95, fy) * step(fy, 2.2) * step(v, vSz.y - 0.5);
          float inFrame = step(0.23, cx) * step(cx, 0.77) * step(0.88, fy) * step(fy, 2.28) * step(v, vSz.y - 0.42);
          if (!skip && inFrame > 0.5) {
            if (inWin > 0.5) {
              float lit = step(0.42, hsh(vec3(vSeed, fl, ci + (zf ? 0. : 17.))));
              vec3 glass = mix(vec3(0.16, 0.2, 0.26), vec3(0.32, 0.4, 0.48), smoothstep(0.95, 2.2, fy));
              float grill = step(0.86, fract((cx - 0.27) / 0.46 * 4.0)) ;
              diffuseColor.rgb = mix(glass, vec3(0.85), grill * 0.6);
              winGlow = vec3(1.0, 0.72, 0.38) * lit * uNight * (1. - grill * 0.5) * 0.9;
            } else diffuseColor.rgb = vec3(0.93, 0.92, 0.88);
          }
          ${shop ? '' : `if (front && fl < 0.5 && abs(u) < 0.6 && v < 2.15) { diffuseColor.rgb = vec3(0.36, 0.2, 0.1) * (0.8 + 0.2 * step(0.5, fract(u * 3.))); }
          else if (front && fl < 0.5 && abs(u) < 0.72 && v < 2.27) diffuseColor.rgb = vec3(0.9);`}
        }`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += winGlow;');
  };
  return m;
}

/** Split instances into map tiles so the renderer can frustum-cull them tile by tile. */
export function tiled(scene, geo, mat, items, o = {}) {
  const T = o.tile || 180, groups = new Map(), out = [];
  for (const it of items) { const k = Math.floor(it.x / T) * 1000 + Math.floor(it.z / T); let a = groups.get(k); if (!a) groups.set(k, a = []); a.push(it); }
  for (const list of groups.values()) {
    let g2 = geo;
    if (o.attr) { g2 = geo.clone(); g2.setAttribute('aRow', new THREE.InstancedBufferAttribute(Float32Array.from(list.map(it => it[o.attr])), 1)); }
    const im = new THREE.InstancedMesh(g2, mat, list.length);
    list.forEach((it, i) => { im.setMatrixAt(i, it.m); if (it.c) im.setColorAt(i, it.c); });
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere(); im.castShadow = o.cast !== false; im.receiveShadow = o.receive !== false;
    scene.add(im); out.push(im);
  }
  return out;
}

const GLSL_NOISE = M.GLSL_NOISE;
const WALLS = ['#f8fafc', '#fef3c7', '#fde68a', '#e0f2fe', '#fce7f3', '#dcfce7', '#fed7aa', '#e9d5ff', '#f5f5f4', '#fef9c3', '#cffafe', '#fecaca'];
const SHOPWALLS = ['#f1f5f9', '#e2e8f0', '#fef3c7', '#d1fae5', '#fde68a', '#bae6fd', '#fbcfe8'];
const TILES = ['#a8442a', '#b5502f', '#9a3b24', '#c05a36', '#8f3a22'];
const SIGNS = ['#dc2626', '#2563eb', '#16a34a', '#f59e0b', '#7c3aed', '#0891b2', '#db2777', '#ea580c', '#facc15', '#0f766e'];
export const pick = (a) => a[Math.floor(rand() * a.length)];
const SHOPNAMES = [['SRI GANESH STORES', 'ಶ್ರೀ ಗಣೇಶ ಸ್ಟೋರ್ಸ್'], ['KARAVALI MOBILES', 'Recharge · Repair'], ['DURGA TEXTILES', 'Sarees · Dhotis'], ['MANJUNATHA MEDICALS', 'ಮಂಜುನಾಥ ಮೆಡಿಕಲ್ಸ್'],
  ['BHARATH BAKERY', 'Fresh Puffs Daily'], ['KAMATH GENERAL STORES', 'Since 1972'], ['UDUPI CAFE', 'Masala Dose · Goli Baje'], ['SHETTY TAILORS', 'Stitching in 2 days'],
  ['NAVODAYA XEROX', 'Print · Lamination'], ['RAJU CYCLE MART', 'Puncture repair'], ['PAI ELECTRICALS', 'Fans · Mixies · Bulbs'], ['ANNAPOORNA LUNCH HOME', 'Fish thali ₹120'],
  ['KUDLA FANCY STORE', 'Bangles · Bindi'], ['SAPNA OPTICALS', 'Eye test free'], ['SRI KRISHNA JEWELLERS', '916 Gold'], ['MALLIGE FLOWERS', 'ಮಲ್ಲಿಗೆ ಹೂವು'],
  ['VIJAYA HARDWARES', 'Cement · Paint · Pipes'], ['GOLDEN SWEETS', 'Mysore Pak · Laddu'], ['COASTAL TRAVELS', 'Bus tickets · Taxi'], ['NETHRA CLINIC', 'Dr. K. Bhat · 9am-1pm']];
function signAtlas() {
  const rows = SHOPNAMES.length, RH = 96, c = document.createElement('canvas'); c.width = 1024; c.height = rows * RH; const x = c.getContext('2d');
  const bgs = ['#b91c1c', '#1d4ed8', '#15803d', '#a16207', '#6d28d9', '#0e7490', '#be185d', '#c2410c', '#0f172a', '#065f46'];
  SHOPNAMES.forEach(([a, b], i) => {
    const y = i * RH, bg = bgs[i % bgs.length]; x.fillStyle = bg; x.fillRect(0, y, 1024, RH);
    x.fillStyle = i % 3 === 0 ? '#fde047' : '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = '900 46px system-ui,Arial,sans-serif'; x.fillText(a, 512, y + 36, 980);
    x.font = '700 24px "Noto Sans Kannada","Kannada Sangam MN","Tunga",system-ui,sans-serif'; x.fillStyle = '#f1f5f9'; x.fillText(b, 512, y + 74, 980);
    x.fillStyle = 'rgba(255,255,255,.6)'; x.fillRect(0, y + RH - 4, 1024, 4);
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function waterNormalTex() {
  const N = 256, h = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let v = 0, a = 1, f = 4; for (let o = 0; o < 4; o++) { v += a * tileNoise(x / N * f, y / N * f, f); a *= 0.5; f *= 2; } h[y * N + x] = v; }
  const c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), im = x.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let k = 0; k < N; k++) {
    const dx = h[y * N + (k + 1) % N] - h[y * N + (k - 1 + N) % N], dy = h[((y + 1) % N) * N + k] - h[((y - 1 + N) % N) * N + k];
    let nx = -dx * 3, ny = -dy * 3, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * N + k) * 4; im.data[i] = (nx * 0.5 + 0.5) * 255; im.data[i + 1] = (ny * 0.5 + 0.5) * 255; im.data[i + 2] = (nz * 0.5 + 0.5) * 255; im.data[i + 3] = 255;
  }
  x.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function tileNoise(x, y, period) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = (a) => ((a % period) + period) % period;
  const H = (a, b) => hash(w(a), w(b));
  const a = H(ix, iy), b = H(ix + 1, iy), c = H(ix, iy + 1), d = H(ix + 1, iy + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function roofTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#c9c9c9'; x.fillRect(0, 0, 128, 128);
  for (let r = 0; r < 8; r++) for (let k = 0; k < 8; k++) { x.fillStyle = `rgb(${200 + Math.random() * 55 | 0},${200 + Math.random() * 40 | 0},${200 + Math.random() * 40 | 0})`; x.fillRect(k * 16 + (r % 2) * 8, r * 16, 15, 12); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(k * 16 + (r % 2) * 8, r * 16 + 12, 15, 4); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 3); t.colorSpace = THREE.SRGBColorSpace; return t;
}


function bbox(pts) { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const p of pts) { a = Math.min(a, p[0]); b = Math.min(b, p[1]); c = Math.max(c, p[0]); d = Math.max(d, p[1]); } return [a, b, c, d]; }
export function pip(x, z, pts) { let ins = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const xi = pts[i][0], zi = pts[i][1], xj = pts[j][0], zj = pts[j][1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) ins = !ins; } return ins; }
export function closest(x, z, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1; let t = ((x - ax) * dx + (z - az) * dz) / L2; t = Math.max(0, Math.min(1, t)); const qx = ax + dx * t, qz = az + dz * t; return { x: qx, z: qz, t, d: Math.hypot(x - qx, z - qz) }; }
function walk(pts, step, fn) { let carry = 0; for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az); if (L < 0.01) continue; const dx = (bx - ax) / L, dz = (bz - az) / L; let t = carry; for (; t < L; t += step) fn(ax + dx * t, az + dz * t, dx, dz); carry = t - L; } }
function ribbon(pts, w, y, world) {
  const pos = [], idx = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], c = pts[Math.min(pts.length - 1, i + 1)], p = pts[i];
    let dx = c[0] - a[0], dz = c[1] - a[1]; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    for (const s of [-1, 1]) { const x = p[0] - dz * w / 2 * s, z = p[1] + dx * w / 2 * s; pos.push(x, world.groundH(x, z) + y, z); }
    if (i > 0) { const q = (i - 1) * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function hipRoof() {
  // unit footprint centred at origin, eaves at y=0, ridge at y=1 running along x
  const v = [-0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5, -0.22, 1, 0, 0.22, 1, 0];
  const i = [0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 3, 3, 5, 4, 3, 4, 0];
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(i);
  const ng = g.toNonIndexed(); ng.computeVertexNormals();
  const p = ng.attributes.position, uv = []; for (let k = 0; k < p.count; k++) uv.push(p.getX(k) + p.getZ(k) + 0.5, p.getY(k));
  ng.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return ng;
}
function poly(x, pts) { x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); x.fill(); }
function line(x, pts) { x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.stroke(); }

// smooth value noise (deterministic)
function hash(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
export function noise2(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function noiseTex(c1, c2, size, blobs) {
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
  x.fillStyle = c1; x.fillRect(0, 0, size, size);
  for (let i = 0; i < size * blobs; i++) { x.fillStyle = Math.random() < 0.5 ? c2 : c1; x.globalAlpha = 0.25 + Math.random() * 0.4; const r = 1 + Math.random() * size / 40; x.beginPath(); x.arc(Math.random() * size, Math.random() * size, r, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function roadTex(main) {
  const S = 256, c = document.createElement('canvas'); c.width = S; c.height = S * 2; const x = c.getContext('2d'), H = S * 2, k = S / 128;
  const base = main ? [58, 62, 68] : [74, 78, 85];
  x.fillStyle = `rgb(${base})`; x.fillRect(0, 0, S, H);
  // large soft tone variation, tyre-polished lanes, aggregate speckle, patches, cracks, oil, pot-holes
  for (let i = 0; i < 90; i++) { const v = (Math.random() - 0.5) * 22; x.fillStyle = `rgba(${base[0] + v},${base[1] + v},${base[2] + v},0.35)`; x.beginPath(); x.ellipse(Math.random() * S, Math.random() * H, 20 + Math.random() * 60, 18 + Math.random() * 40, Math.random() * 3, 0, 7); x.fill(); }
  for (const cx of main ? [0.3, 0.7] : [0.5]) { const g = x.createLinearGradient(cx * S - 16 * k, 0, cx * S + 16 * k, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(15,15,18,0.28)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(cx * S - 16 * k, 0, 32 * k, H); }
  for (let i = 0; i < 9000; i++) { const t = Math.random(); x.fillStyle = t < 0.5 ? 'rgba(30,32,36,0.55)' : t < 0.85 ? 'rgba(120,124,132,0.4)' : 'rgba(170,150,120,0.35)'; const s = 1 + Math.random() * 1.6; x.fillRect(Math.random() * S, Math.random() * H, s, s); }
  for (let i = 0; i < 5; i++) { const v = 38 + Math.random() * 26; x.fillStyle = `rgba(${v},${v + 2},${v + 6},0.4)`; x.fillRect(Math.random() * S * 0.7, Math.random() * H, 30 + Math.random() * 60, 18 + Math.random() * 50); }   // repair patches
  x.lineWidth = 0.9; x.strokeStyle = 'rgba(8,8,10,0.5)';
  for (let i = 0; i < 5; i++) { let px = Math.random() * S, py = Math.random() * H; x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 8; j++) { px += (Math.random() - 0.5) * 22; py += 6 + Math.random() * 16; x.lineTo(px, py); } x.stroke(); }
  for (let i = 0; i < 2; i++) { const px = Math.random() * S, py = Math.random() * H, r = 3 + Math.random() * 5; const g = x.createRadialGradient(px, py, 0, px, py, r * 1.6); g.addColorStop(0, 'rgba(5,5,6,0.85)'); g.addColorStop(0.7, 'rgba(20,20,22,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(px, py, r * 1.6, r, 0.4, 0, 7); x.fill(); }   // pot-holes
  if (main) { x.fillStyle = 'rgba(229,231,235,0.92)'; x.fillRect(4 * k, 0, 4 * k, H); x.fillRect(120 * k, 0, 4 * k, H); x.fillStyle = 'rgba(248,250,252,0.92)'; x.fillRect(62 * k, 0, 4 * k, 120 * k * 2 * 0.5); for (let i = 0; i < 60; i++) { x.fillStyle = 'rgba(58,62,68,0.5)'; x.fillRect(4 * k, Math.random() * H, 4 * k, 2 + Math.random() * 6); x.fillRect(62 * k, Math.random() * 240 * k * 0.5, 4 * k, 1 + Math.random() * 4); } }
  else { const g1 = x.createLinearGradient(0, 0, 14 * k, 0); g1.addColorStop(0, 'rgba(120,92,62,0.85)'); g1.addColorStop(1, 'rgba(120,92,62,0)'); x.fillStyle = g1; x.fillRect(0, 0, 14 * k, H); const g2 = x.createLinearGradient(S, 0, S - 14 * k, 0); g2.addColorStop(0, 'rgba(120,92,62,0.85)'); g2.addColorStop(1, 'rgba(120,92,62,0)'); x.fillStyle = g2; x.fillRect(S - 14 * k, 0, 14 * k, H); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
