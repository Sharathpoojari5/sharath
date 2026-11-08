const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 640, height: 360 } });
  await p.goto('http://localhost:8770/play/'); await p.waitForFunction(() => !document.getElementById('play').disabled, null, { timeout: 240000 });
  const r = await p.evaluate(() => {
    const w = window.__game.world, seen = new Set(), bad = [], small = []; let n = 0;
    for (const arr of w.obs.values()) for (const o of arr) { if (seen.has(o)) continue; seen.add(o); if (o.r && o.r <= 0.45) { n++; const c = w.roadClearance(o.x, o.z, 0); small.push(c); if (c < 0.0) bad.push([Math.round(o.x), Math.round(o.z), +c.toFixed(1), o.r]); } }
    return { smallObstacles: n, onRoad: bad.length, sample: bad.slice(0, 12) };
  });
  console.log(JSON.stringify(r)); await b.close();
})();
