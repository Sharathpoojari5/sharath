const { chromium } = require('playwright');
const out = '' + (process.env.QA_OUT || '/tmp/nk-qa/') + 'audit/';
const kinds = (process.argv[2] || 'cycle,scooter,scooty,moped,bike,sportbike,auto,tractor').split(',');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 900, height: 520 } }); const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  await p.addInitScript(() => { localStorage.setItem('namma-karkala-v1', JSON.stringify({ money: 500, done: ['m1'], time: 9 * 60, pos: null, seenIntro: true })); });
  await p.goto('http://localhost:8770/play/'); await p.waitForFunction(() => !document.getElementById('play').disabled, null, { timeout: 240000 });
  await p.click('#play'); await p.waitForTimeout(2200);
  await p.evaluate(async () => { window.__T = await import('/js/three.module.min.js'); const t = document.getElementById('title'); if (t) t.style.display = 'none'; document.querySelector('.hud').style.display = 'none'; const g = window.__game; g.mission = null; g.skipTalk && g.skipTalk(); g.renderer.setPixelRatio(1); g.cheatWeather = true; });
  for (const kind of kinds) {
    await p.evaluate(({ kind }) => { const g = window.__game, w = g.world, bs = w.pois['Karkala Bus Stand'], rd = w.nearestRoad(bs[0], bs[1], 100); g.freezeFrame = false; g.teleport(rd.x, rd.z); g.spawnNear(kind); const v = g.vehicles[g.vehicles.length - 1]; g.teleport(v.x + 1, v.z); g.enterNearest(); if (!g.car) return; g.time = 10 * 60; g.envT = 0; for (let i = 0; i < 45; i++) { g.car.v = 6; g.step(1, 1 / 30); } g.freezeFrame = true; const T = window.__T; const c = g.car, fx = Math.sin(c.h), fz = Math.cos(c.h), rx = Math.cos(c.h), rz = -Math.sin(c.h); const cam = new T.PerspectiveCamera(32, 900 / 520, 0.1, 100); cam.position.set(c.x + rx * 5.2 + fx * 0.3, 1.5, c.z + rz * 5.2 + fz * 0.3); cam.lookAt(c.x, 1.05, c.z); g.step(2); g.renderer.render(g.scene, cam); }, { kind });
    await p.screenshot({ path: out + 'rd_' + kind + '.png' }); await p.evaluate(() => { const g = window.__game; if (g.car) g.exitVehicle(); });
  }
  console.log(JSON.stringify(errs)); await b.close();
})();
