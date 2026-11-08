const { chromium } = require('playwright');
const out = '' + (process.env.QA_OUT || '/tmp/nk-qa/') + 'audit/';
const SP = +(process.argv[4] || 6), CD = +(process.argv[5] || 15); const kinds = (process.argv[3] || 'hatch,sedan,taxi,auto,suv,pickup,bus,scooter,bike,omni').split(',');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 640 } }); const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  await p.addInitScript(() => { localStorage.setItem('namma-karkala-v1', JSON.stringify({ money: 500, done: ['m1'], time: 9 * 60, pos: null, seenIntro: true })); });
  await p.goto('http://localhost:8770/play/'); await p.waitForFunction(() => !document.getElementById('play').disabled, null, { timeout: 240000 });
  await p.click('#play'); await p.waitForTimeout(600);
  for (const view of ['side', 'front34', 'rear34']) {
    await p.evaluate(async ({ kinds, view, SP, CD }) => {
      const T = await import('/js/three.module.min.js'), M = await import('/js/models.js'); const g = window.__game; g.freezeFrame = true; g.renderer.setPixelRatio(1); document.querySelector('.hud').style.display = 'none';
      const sc = g.scene; if (window.__ln) window.__ln.forEach(o => sc.remove(o)); window.__ln = [];
      const base = [g.player.x + 4000, 0, g.player.z]; const grp = [];
      kinds.forEach((k, i) => { const v = M.vehicle(k); const row = 0, col = i; v.group.position.set(base[0] + (col - (kinds.length - 1) / 2) * SP, 0, base[2] + row * 9); v.group.rotation.y = view === 'side' ? Math.PI / 2 : view === 'front34' ? Math.PI / 2 - 0.7 : Math.PI / 2 + 0.7 + Math.PI; sc.add(v.group); window.__ln.push(v.group); });
      const gnd = new T.Mesh(new T.PlaneGeometry(200, 200), new T.MeshStandardMaterial({ color: '#555' })); gnd.rotation.x = -Math.PI / 2; gnd.position.set(base[0], 0, base[2]); sc.add(gnd); window.__ln.push(gnd);
      g.time = 10 * 60; g.envT = 0; g.step(1, 1 / 30); g.bakeEnv();
      const cam = new T.PerspectiveCamera(34, 2, 0.1, 500); cam.position.set(base[0] + 0, 2.6, base[2] + CD); cam.lookAt(base[0], 0.8, base[2] + 0); g.renderer.render(sc, cam);
    }, { kinds, view, SP, CD });
    await p.screenshot({ path: out + 'veh_' + (process.argv[2] || 'a') + '_' + view + '.png' });
  }
  console.log(JSON.stringify(errs)); await b.close();
})();
