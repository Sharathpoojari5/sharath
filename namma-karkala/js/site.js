(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var toastEl = $('#toast'), tt;
  function toast(t) { toastEl.textContent = t; toastEl.classList.add('show'); clearTimeout(tt); tt = setTimeout(function () { toastEl.classList.remove('show'); }, 3200); }
  var store = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } } };

  /* reveal on scroll */
  var rv = $$('.reveal');
  function sweep() { var vh = innerHeight; rv = rv.filter(function (el) { var r = el.getBoundingClientRect(); if (r.top < vh * 0.92 && r.bottom > 0) { el.classList.add('in'); return false; } return true; }); }
  var tick = false;
  addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(function () { tick = false; sweep(); }); } }, { passive: true });
  addEventListener('resize', sweep); addEventListener('load', sweep); sweep();

  /* send to laptop */
  var send = $('#send');
  if (send) send.addEventListener('click', function () {
    var url = location.origin + '/play/', data = { title: 'Namma Karkala', text: 'Karkala, playable in your browser. Open this on a laptop:', url: url };
    if (navigator.share) navigator.share(data).catch(function () { });
    else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast('Link copied. Paste it into WhatsApp or email and open it on your laptop.'); }, function () { toast(url); });
    else toast(url);
  });

  /* honest "right now" line: local Karkala time and the season, not a live forecast */
  (function () {
    var el = $('#livewx'); if (!el) return;
    try {
      var f = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true }), m = +new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kolkata', month: 'numeric' }).format(new Date());
      var season = (m >= 6 && m <= 9) ? 'Monsoon. It is raining somewhere in Udupi district, and in the game.' : (m >= 10 && m <= 11) ? 'Kambala season is starting. Mud is being prepared.' : (m >= 12 || m <= 2) ? 'Cool mornings, Yakshagana nights.' : 'Hot afternoon. Goli baje weather, then a sudden shower.';
      el.textContent = 'Karkala, ' + f.format(new Date()) + ' IST. ' + season;
    } catch (e) { el.textContent = 'Karkala is open. Same sky in the game.'; }
  })();

  /* page cheat codes */
  var fx = $('#fx'), ctx = fx && fx.getContext('2d'), drops = [], mode = null, raf = 0;
  function size() { fx.width = innerWidth; fx.height = innerHeight; } size(); addEventListener('resize', size);
  function loop() { ctx.clearRect(0, 0, fx.width, fx.height); if (!mode) { cancelAnimationFrame(raf); raf = 0; return; }
    if (drops.length < 140) drops.push(mode === 'rain' ? { x: Math.random() * fx.width, y: -10, v: 14 + Math.random() * 10 } : { x: Math.random() * fx.width, y: -30, v: 3 + Math.random() * 4, r: Math.random() * 6 });
    drops = drops.filter(function (d) { d.y += d.v; if (mode === 'rain') { ctx.strokeStyle = 'rgba(190,220,255,.55)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 2, d.y + 14); ctx.stroke(); } else { ctx.font = '28px serif'; ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.r + d.y / 90); ctx.fillText('🟠', 0, 0); ctx.restore(); } return d.y < fx.height + 30; });
    raf = requestAnimationFrame(loop); }
  function start(m, ms) { mode = m; drops = []; if (!raf) raf = requestAnimationFrame(loop); if (ms) setTimeout(function () { if (mode === m) mode = null; }, ms); }
  var CH = {
    barsa: function () { start('rain', 14000); toast('BARSA: it starts raining on this page'); },
    irulu: function () { document.documentElement.dataset.theme = 'night'; toast('IRULU: night falls on the site'); },
    belaku: function () { document.documentElement.dataset.theme = 'day'; toast('BELAKU: morning light'); },
    surya: function () { mode = null; document.documentElement.dataset.theme = 'night'; toast('SURYA: clear sky again'); },
    busbeku: function () { var b = document.createElement('div'); b.className = 'bus'; b.textContent = '🚌'; document.body.appendChild(b); requestAnimationFrame(function () { requestAnimationFrame(function () { b.style.left = (innerWidth + 120) + 'px'; }); }); setTimeout(function () { b.remove(); }, 5200); toast('BUSBEKU: a private bus, running late'); },
    golibaje: function () { start('baje', 9000); toast('GOLIBAJE: hot hot hot'); },
  };
  var buf = '';
  addEventListener('keydown', function (e) {
    if (/input|textarea|select/i.test((e.target.tagName || ''))) return;
    if (e.key === 'Enter' && !e.target.closest('a,button')) { location.href = 'play/'; return; }
    if (e.key.length !== 1) return; buf = (buf + e.key.toLowerCase()).slice(-10);
    Object.keys(CH).forEach(function (k) { if (buf.slice(-k.length) === k) { buf = ''; CH[k](); } });
  });

  /* radio previews */
  var R = window.NK_RADIO, aud = $('#raudio');
  if (R && aud) {
    var stEl = $('#stations'), songsEl = $('#rsongs'), cur = { st: 0, song: 0 }, bars = $('#eq'); for (var i = 0; i < 18; i++) bars.appendChild(document.createElement('i'));
    var actx, an, data;
    function ensureViz() { if (actx) return; try { actx = new (window.AudioContext || window.webkitAudioContext)(); var s = actx.createMediaElementSource(aud); an = actx.createAnalyser(); an.fftSize = 128; s.connect(an); an.connect(actx.destination); data = new Uint8Array(an.frequencyBinCount); } catch (e) { actx = null; } }
    function viz() { if (an && !aud.paused) { an.getByteFrequencyData(data); var b = bars.children; for (var k = 0; k < b.length; k++) b[k].style.height = (6 + (data[2 + k * 2] || 0) / 255 * 38) + 'px'; } requestAnimationFrame(viz); }
    viz();
    function showStation() { var st = R.stations[cur.st]; $$('.st', stEl).forEach(function (b, k) { b.setAttribute('aria-pressed', k === cur.st); }); $('.deck').style.borderColor = st.color; songsEl.innerHTML = '';
      st.songs.forEach(function (id, k) { var b = document.createElement('button'); b.type = 'button'; b.textContent = R.songs[id].title; b.setAttribute('aria-pressed', k === cur.song); b.addEventListener('click', function () { cur.song = k; load(true); }); songsEl.appendChild(b); }); load(false); }
    function load(play) { var st = R.stations[cur.st], id = st.songs[cur.song], s = R.songs[id]; $('#rtitle').textContent = s.title; $('#rartist').textContent = s.artist + ' · ' + st.name; $('#rly').textContent = ''; $$('button', songsEl).forEach(function (b, k) { b.setAttribute('aria-pressed', k === cur.song); }); aud.src = 'audio/' + id + '.mp3'; if (play) { ensureViz(); if (actx && actx.state === 'suspended') actx.resume(); aud.play().catch(function () { toast('Tap play to start the preview.'); }); } $('#rplay').textContent = play ? '❚❚ Pause' : '▶ Play preview'; }
    R.stations.forEach(function (st, k) { var b = document.createElement('button'); b.type = 'button'; b.className = 'st'; b.style.setProperty('--c', st.color); b.innerHTML = '<b></b><small></small>'; $('b', b).textContent = st.name; $('small', b).textContent = st.tag; b.addEventListener('click', function () { cur.st = k; cur.song = 0; showStation(); }); stEl.appendChild(b); });
    $('#rplay').addEventListener('click', function () { ensureViz(); if (actx && actx.state === 'suspended') actx.resume(); if (aud.paused) { aud.play().catch(function () { }); } else aud.pause(); });
    aud.addEventListener('play', function () { $('#rplay').textContent = '❚❚ Pause'; }); aud.addEventListener('pause', function () { $('#rplay').textContent = '▶ Play preview'; });
    aud.addEventListener('ended', function () { var st = R.stations[cur.st]; cur.song = (cur.song + 1) % st.songs.length; load(true); });
    aud.addEventListener('timeupdate', function () {
      var s = R.songs[R.stations[cur.st].songs[cur.song]], t = aud.currentTime, c = null; s.cues.forEach(function (q) { if (t >= q[0]) c = q; });
      var box = $('#rly'), key = c ? c[1] : ''; if (box.dataset.k === key) return; box.dataset.k = key; box.innerHTML = ''; if (!c) return;
      var a = document.createElement('div'), b = document.createElement('div'); a.textContent = c[3]; b.textContent = c[1]; b.style.cssText = 'font-size:14px;opacity:.7;font-style:normal'; box.appendChild(a); box.appendChild(b);
    });
    showStation();
  }

  /* forms: posted to the endpoint in <meta name="form-endpoint"> when set, otherwise kept on this device */
  function handle(form, noteEl, key, ok) {
    form.addEventListener('submit', function (e) {
      e.preventDefault(); var fd = new FormData(form), o = {}; fd.forEach(function (v, k) { o[k] = o[k] ? o[k] + ', ' + v : v; }); o._form = key; o._at = new Date().toISOString();
      if (key === 'bug' && !String(o.what || '').trim()) { noteEl.textContent = 'Please tell us what happened.'; return; }
      var ep = ($('meta[name="form-endpoint"]') || {}).content;
      if (ep) { fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(o) }).then(function (r) { if (!r.ok) throw 0; noteEl.textContent = ok; form.reset(); }).catch(function () { noteEl.textContent = 'Could not send just now. Please try again in a bit.'; }); }
      else { var all = []; try { all = JSON.parse(store.get('nk-forms') || '[]'); } catch (x) { } all.push(o); store.set('nk-forms', JSON.stringify(all)); noteEl.textContent = ok + ' (Saved on this device only: the site owner has not connected a form inbox yet.)'; form.reset(); }
    });
  }
  if ($('#voteform')) handle($('#voteform'), $('#vnote'), 'vote', 'Thank you! You are on the list.');
  if ($('#bugform')) handle($('#bugform'), $('#bnote'), 'bug', 'Thank you for helping make it better.');
})();
