(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, seen = false;
  try { seen = sessionStorage.getItem('nk-splash') === '1'; } catch (e) { }
  var splash = document.getElementById('splash');
  function ready() { document.body.classList.add('ready'); }
  function finish() { if (!splash) return; splash.classList.add('fade'); setTimeout(function () { if (splash) splash.remove(); splash = null; document.documentElement.style.overflow = ''; }, 500); }
  var stage = 0;
  function sequence() { if (stage) return; stage = 1; splash.classList.add('close'); setTimeout(function () { if (!splash) return; splash.classList.add('open'); ready(); setTimeout(finish, 1350); }, 1300); }
  if (!splash || reduce || seen) { if (splash) splash.remove(); splash = null; ready(); }
  else {
    document.documentElement.style.overflow = 'hidden';
    var t3 = setTimeout(sequence, 3300);
    var skip = function () { clearTimeout(t3); sequence(); };
    splash.addEventListener('click', skip); addEventListener('keydown', function k(e) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { skip(); removeEventListener('keydown', k); } });
    try { sessionStorage.setItem('nk-splash', '1'); } catch (e) { }
  }
  /* split the headline into words that rise in one by one */
  var h1 = document.querySelector('.hero h1');
  if (h1 && !h1.dataset.split) { h1.dataset.split = '1'; h1.innerHTML = h1.textContent.trim().split(/\s+/).map(function (w, i) { return '<span class="w" style="--i:' + i + '">' + w + '</span>'; }).join(' '); }
  /* Ken Burns slideshow + pointer parallax */
  var slides = document.querySelectorAll('.hero .slides img'), dots = document.querySelectorAll('.hero .dots i'), cur = 0, timer;
  function show(n) { cur = (n + slides.length) % slides.length; slides.forEach(function (s, i) { s.classList.remove('on'); if (i === cur) { void s.offsetWidth; s.classList.add('on'); } }); dots.forEach(function (d, i) { d.classList.remove('on'); if (i === cur) { void d.offsetWidth; d.classList.add('on'); } }); }
  function loop() { clearInterval(timer); timer = setInterval(function () { show(cur + 1); }, 6000); }
  if (slides.length) { show(0); loop(); dots.forEach(function (d, i) { d.addEventListener('click', function () { show(i); loop(); }); }); document.addEventListener('visibilitychange', function () { if (document.hidden) clearInterval(timer); else loop(); }); }
  var hero = document.querySelector('.hero'), sl = document.querySelector('.hero .slides');
  if (hero && sl && !reduce) hero.addEventListener('pointermove', function (e) { var r = hero.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; sl.style.transform = 'translate(' + (-x * 18) + 'px,' + (-y * 12) + 'px)'; });
  /* hero fades and drifts as you scroll away */
  if (hero && !reduce) addEventListener('scroll', function () { var y = Math.min(scrollY, innerHeight); if (sl) sl.style.opacity = String(1 - y / innerHeight * 0.7); }, { passive: true });
})();
