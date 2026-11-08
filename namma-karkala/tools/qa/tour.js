const { chromium } = require('playwright');
const out = '' + (process.env.QA_OUT || '/tmp/nk-qa/') + 'tour/';
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  await p.addInitScript(() => { localStorage.setItem('namma-karkala-v1', JSON.stringify({ money: 500, done: ['m1'], time: 9 * 60, pos: null, seenIntro: true })); });
  await p.goto('http://localhost:8770/play/'); await p.waitForFunction(() => !document.getElementById('play').disabled, null, { timeout: 240000 });
  await p.click('#play'); await p.waitForTimeout(2200);
  await p.evaluate(() => { const t = document.getElementById('title'); if (t) t.style.display = 'none'; document.querySelector('.hud').style.display = 'none'; const g = window.__game; g.mission = null; g.skipTalk && g.skipTalk(); g.renderer.setPixelRatio(1); g.cheatWeather = true; });
  const pois = await p.evaluate(() => Object.keys(window.__game.world.pois));
  console.log(pois.length, pois.join(' | '));
  const pick = (process.argv[2] || '').split(',').filter(Boolean); const list = pick.length ? pick : pois;
  for (const poi of list) {
    const ok = await p.evaluate(({ poi }) => { const g = window.__game, w = g.world, pt = w.pois[poi]; if (!pt) return false; g.freezeFrame = false; const rd = w.nearestRoad(pt[0], pt[1], 120); g.teleport(rd ? rd.x : pt[0], rd ? rd.z : pt[1]); g.player.mesh.visible = true; g.time = 10 * 60; g.envT = 0; g.camYaw = (rd ? Math.atan2(rd.dirx, rd.dirz) : 0) + 0.5; g.camPitch = 0.2; g.camDist = 7.5; for (let i = 0; i < 40; i++) g.step(1, 1 / 30); g.step(2); g.renderer.render(g.scene, g.cam); return true; }, { poi });
    if (ok) await p.screenshot({ path: out + poi.replace(/[^a-z0-9]/gi, '_') + '.png' });
  }
  console.log(JSON.stringify(errs)); await b.close();
})();
