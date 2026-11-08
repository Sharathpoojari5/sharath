const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1000, height: 600 } }); const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  await p.addInitScript(() => { localStorage.setItem('namma-karkala-v1', JSON.stringify({ money: 500, done: ['m1'], time: 9 * 60, pos: null, seenIntro: true })); });
  await p.goto('http://localhost:8770/play/'); await p.waitForFunction(() => !document.getElementById('play').disabled, null, { timeout: 240000 });
  await p.click('#play'); await p.waitForTimeout(1500);
  const R = await p.evaluate(async () => {
    const T = await import('/js/three.module.min.js'), M = await import('/js/models.js'), PP = (await import('/js/people.js')).People; const g = window.__game, w = g.world, out = {};
    /* ---- roads / map topology ---- */
    const roads = w.map.roads; let spikes = 0, short = 0, inWater = 0, dangling = 0;
    for (const rd of roads) { if (rd.cls === 'track') continue; for (let i = 1; i < rd.pts.length - 1; i++) { const a = rd.pts[i - 1], b = rd.pts[i], c = rd.pts[i + 1], v1 = [b[0] - a[0], b[1] - a[1]], v2 = [c[0] - b[0], c[1] - b[1]], l1 = Math.hypot(...v1), l2 = Math.hypot(...v2); if (l1 < 0.01 || l2 < 0.01) { short++; continue; } const cos = (v1[0] * v2[0] + v1[1] * v2[1]) / l1 / l2; if (cos < -0.5) spikes++; } for (let i = 0; i < rd.pts.length; i += 2) if (w.inWater(rd.pts[i][0], rd.pts[i][1])) { inWater++; break; } }
    for (const n of w.nodes) if (n.adj.length === 1) { const e = n.adj[0]; if (w.roadClearance(n.x, n.z, 0) > -0.01 && false) dangling++; }
    out.roads = { count: roads.length, sharpSpikes: spikes, zeroLen: short, roadsTouchingWater: inWater, nodes: w.nodes.length, deadEnds: w.nodes.filter(n => n.adj.length === 1).length };
    /* ---- buildings vs roads / each other ---- */
    let bOnRoad = 0, bOverlap = 0; const B = w.buildings || [];
    for (const bd of B) { const c = Math.cos(bd.rot), s = Math.sin(bd.rot); let hit = false; for (const [u, v] of [[0, 0], [1, 1], [-1, 1], [1, -1], [-1, -1], [0, 1], [0, -1]]) { const x = bd.x + (u * bd.fw / 2) * c + (v * bd.dd / 2) * s, z = bd.z - (u * bd.fw / 2) * s + (v * bd.dd / 2) * c; if (w.roadClearance(x, z, 0) < -0.2) hit = true; } if (hit) bOnRoad++; }
    for (let i = 0; i < B.length; i++) for (let j = i + 1; j < Math.min(B.length, i + 400); j++) { const a = B[i], c = B[j]; if (Math.hypot(a.x - c.x, a.z - c.z) < Math.min(Math.hypot(a.fw, a.dd), Math.hypot(c.fw, c.dd)) * 0.35) bOverlap++; }
    out.buildings = { n: B.length, onRoad: bOnRoad, overlapping: bOverlap };
    /* ---- small obstacles (trees, poles, stalls...) in carriageways ---- */
    const seen = new Set(); let inRoad = 0, big = 0, bigInRoad = 0; for (const arr of w.obs.values()) for (const o of arr) { if (seen.has(o)) continue; seen.add(o); if (o.r) { if (o.r > 0.45) { big++; if (w.roadClearance(o.x, o.z, 0) < -0.3) bigInRoad++; } else if (w.roadClearance(o.x, o.z, 0) < -0.05) inRoad++; } }
    out.obstacles = { smallInRoad: inRoad, large: big, largeInRoad: bigInRoad };
    /* ---- vehicles: geometry audit ---- */
    const vk = Object.keys(M.VEHICLES), vr = [];
    for (const k of vk) { const v = M.vehicle(k), d = v.def; v.group.updateMatrixWorld(true); const bb = new T.Box3().setFromObject(v.group), sz = bb.getSize(new T.Vector3()); const wb = v.wheels.map(m => { const q = new T.Vector3(); m.getWorldPosition(q); return q; });
      vr.push({ k, len: +sz.z.toFixed(2), defL: d.L, wid: +sz.x.toFixed(2), defW: d.W, h: +sz.y.toFixed(2), defH: d.H, minY: +bb.min.y.toFixed(3), wheels: wb.length, wheelY: wb.length ? +(wb.reduce((a, q) => a + q.y, 0) / wb.length).toFixed(2) : 0, wr: d.wr, lenErr: +(Math.abs(sz.z - d.L) / d.L).toFixed(2), widErr: +(Math.abs(sz.x - d.W) / d.W).toFixed(2) }); }
    out.vehicles = vr;
    /* ---- people: pose audit on live avatars after 20 s of simulation ---- */
    g.cheatWeather = true; for (let i = 0; i < 600; i++) g.step(1, 1 / 30);
    const bones = (o, n) => { let r = null; o.traverse(c => { if (!r && c.name === n) r = c; }); return r; }, tp = new T.Vector3(), tq = new T.Vector3();
    let tpose = 0, sunk = 0, floating = 0, n = 0, badSit = 0, seatedN = 0; const samples = [];
    for (const grp of PP.live) { let a = grp; let att = false; while (a) { if (a.isScene) { att = true; break; } a = a.parent; } if (!att || !grp.visible) continue; n++;
      const ua = bones(grp, 'Bip01_L_UpperArm'), fa = bones(grp, 'Bip01_L_Forearm'); if (!ua || !fa) continue; ua.getWorldPosition(tp); fa.getWorldPosition(tq); const dy = (tq.y - tp.y) / Math.max(0.01, tp.distanceTo(tq)); if (dy > -0.55) { tpose++; if (samples.length < 4) samples.push([grp.userData && 0, +dy.toFixed(2)]); }
      const foot = bones(grp, 'Bip01_L_Foot'), head = bones(grp, 'Bip01_Head'); if (foot) { foot.getWorldPosition(tp); const wp = new T.Vector3(); grp.getWorldPosition(wp); const gy = w.groundH(wp.x, wp.z); const rel = tp.y - gy; const sit = grp.legL && grp.legL.rotation.x < -0.9; if (!sit && rel < -0.12) sunk++; if (!sit && rel > 0.45) floating++; } }
    out.people = { live: PP.live.length, checked: n, tPoseArms: tpose, feetSunk: sunk, feetFloating: floating, samples };
    /* ---- NPC behaviour after the sim ---- */
    let pedsInside = 0, pedsFloating = 0; for (const pd of g.peds) { if (w.blocked(pd.x, pd.z, 0.2)) pedsInside++; if (Math.abs(pd.y - w.groundH(pd.x, pd.z)) > 1.2) pedsFloating++; }
    let vOff = 0, vStuck = 0; for (const v of g.vehicles) { if (v.driver === 'ai' && w.roadClearance(v.x, v.z, 0) > 3) vOff++; if (v.driver === 'ai' && v.stuck > 5) vStuck++; }
    out.npc = { peds: g.peds.length, pedsInsideObstacles: pedsInside, pedsFloating, vehicles: g.vehicles.length, aiOffRoad: vOff, aiStuck: vStuck };
    return out;
  });
  R.vehicles = R.vehicles.filter(v => v.lenErr > 0.12 || v.widErr > 0.2 || Math.abs(v.minY) > 0.02 || Math.abs(v.wheelY - v.wr) > 0.02 || v.h / v.defH > 1.25 || v.h / v.defH < 0.8).map(v => `${v.k} L${v.len}/${v.defL} W${v.wid}/${v.defW} H${v.h}/${v.defH} minY${v.minY}`); console.log(JSON.stringify(R, null, 1)); console.log(JSON.stringify(errs)); await b.close();
})();
