const { chromium } = require('playwright');
const out = '' + (process.env.QA_OUT || '/tmp/nk-qa/') + 'audit/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1000, height: 600 } }); const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  await p.addInitScript(() => { localStorage.setItem('namma-karkala-v1', JSON.stringify({ money: 500, done: ['m1'], time: 9 * 60, pos: null, seenIntro: true })); });
  await p.goto('http://localhost:8770/play/'); await p.waitForFunction(() => !document.getElementById('play').disabled, null, { timeout: 240000 });
  await p.click('#play'); await p.waitForTimeout(2500);
  await p.evaluate(() => { const t = document.getElementById('title'); if (t) t.style.display = 'none'; document.querySelector('.hud').style.display = 'none'; const g = window.__game; g.mission = null; g.skipTalk && g.skipTalk(); g.renderer.setPixelRatio(1); g.cheatWeather = true; g.freezeFrame = true; });
  const info = await p.evaluate(() => { const w = window.__game.world; const js = w.nodes.filter(n => n.adj.length >= 3 && Math.max(...n.adj.map(e => e.w)) >= 9); const c = w.pois['Karkala Bus Stand']; js.sort((a, b) => Math.hypot(a.x - c[0], a.z - c[1]) - Math.hypot(b.x - c[0], b.z - c[1])); return { total: w.nodes.length, junctions: w.nodes.filter(n => n.adj.length >= 3).length, wide: js.length, pick: js.slice(0, 8).map(n => [n.x, n.z, n.adj.length]) }; });
  console.log(JSON.stringify(info));
  for (let i = 0; i < Math.min(6, info.pick.length); i++) {
    await p.evaluate(async ({ x, z }) => { const T = await import('/js/three.module.min.js'); const g = window.__game; g.freezeFrame = false; g.teleport(x, z); for (let k = 0; k < 10; k++) g.step(1, 1 / 30); g.freezeFrame = true; g.player.mesh.visible = false;
      const cam = new T.PerspectiveCamera(50, 1000 / 600, 0.2, 500); cam.position.set(x + 14, 17, z + 14); cam.lookAt(x, 0, z); g.step(2); g.renderer.render(g.scene, cam); }, { x: info.pick[i][0], z: info.pick[i][1] });
    await p.screenshot({ path: out + 'junc_' + i + '.png' });
  }
  console.log(JSON.stringify(errs)); await b.close();
})();
