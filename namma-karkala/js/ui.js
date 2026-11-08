// Game UI behaviour: title backdrop slideshow, live Karkala chip, wallet deltas, arc speedometer, key card (F1).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  /* title backdrop */
  var tbg = $('tbg');
  if (tbg) {
    var shots = ['dawn', 'temple', 'lake', 'hill', 'rain', 'night', 'market'].map(function (n) { return 'media/shots/' + n + '-sm.webp'; }), i = 0, layers = [];
    for (var k = 0; k < 2; k++) { var el = document.createElement('i'); tbg.appendChild(el); layers.push(el); }
    var order = shots.slice(); var first = Math.floor(Math.random() * order.length);
    var show = function () { var l = layers[i % 2]; var img = new Image(); img.onload = function () { l.style.backgroundImage = 'url(' + img.src + ')'; layers.forEach(function (x) { x.classList.remove('on'); }); void l.offsetWidth; l.classList.add('on'); i++; }; img.src = order[(first + i) % order.length]; };
    show(); setInterval(show, 6500);
  }
  /* live Karkala sky chip (Open-Meteo, silently skipped when offline) */
  var chip = $('skychip');
  if (chip) {
    var f = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true });
    var paint = function (txt) { chip.textContent = 'Karkala now · ' + f.format(new Date()) + ' IST' + (txt ? ' · ' + txt : ''); };
    paint('');
    var W = { 0: 'clear', 1: 'mostly clear', 2: 'partly cloudy', 3: 'overcast', 45: 'misty', 48: 'misty', 51: 'drizzle', 53: 'drizzle', 55: 'drizzle', 61: 'light rain', 63: 'rain', 65: 'heavy rain', 80: 'showers', 81: 'showers', 82: 'heavy showers', 95: 'thunderstorm', 96: 'thunderstorm', 99: 'thunderstorm' };
    fetch('https://api.open-meteo.com/v1/forecast?latitude=13.21&longitude=74.99&current=temperature_2m,weather_code&timezone=Asia%2FKolkata').then(function (r) { return r.json(); }).then(function (d) { paint(Math.round(d.current.temperature_2m) + '° ' + (W[d.current.weather_code] || 'sky')); }).catch(function () { });
  }
  /* wallet deltas */
  var money = $('money');
  if (money) {
    var prev = null; var num = function (t) { return parseInt(String(t).replace(/[^\d-]/g, ''), 10) || 0; };
    new MutationObserver(function () {
      var tn = money.childNodes[0]; var v = num(tn ? tn.textContent : money.textContent);
      if (prev !== null && v !== prev) { var d = document.createElement('span'); d.className = 'delta ' + (v > prev ? 'up' : 'down'); d.textContent = (v > prev ? '+' : '−') + '₹' + Math.abs(v - prev).toLocaleString('en-IN'); money.appendChild(d); setTimeout(function () { d.remove(); }, 2000); }
      prev = v;
    }).observe(money, { childList: true, characterData: true, subtree: false });
    prev = num(money.textContent);
  }
  /* merge clock + weather into one chip */
  var clock = $('clock'), wx = $('wx');
  if (clock && wx && !$('clockrow')) { var row = document.createElement('div'); row.id = 'clockrow'; clock.parentNode.insertBefore(row, clock); row.appendChild(clock); row.appendChild(wx); }
  /* arc speedometer */
  var speed = $('speed'), kmh = $('kmh');
  if (speed && kmh) {
    var NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'arc'); svg.setAttribute('viewBox', '0 0 120 64');
    svg.innerHTML = '<defs><linearGradient id="arcg" x1="0" x2="1"><stop offset="0" stop-color="#ffc23d"/><stop offset=".7" stop-color="#ff8a3d"/><stop offset="1" stop-color="#ff4b55"/></linearGradient></defs><path class="trk" d="M8 60A52 52 0 0 1 112 60" pathLength="100"/><path class="val" d="M8 60A52 52 0 0 1 112 60" pathLength="100"/>';
    speed.insertBefore(svg, speed.firstChild); var val = svg.querySelector('.val');
    new MutationObserver(function () { var v = parseInt(kmh.textContent, 10) || 0; val.style.strokeDashoffset = String(100 - Math.min(100, v / 120 * 100)); }).observe(kmh, { childList: true, characterData: true, subtree: true });
  }
  /* key card (F1) and hint chip */
  var kc = document.createElement('div'); kc.id = 'kcard';
  kc.innerHTML = '<div class="in"><h3>CONTROLS</h3><div class="g"><div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk · drive</div><div><kbd>Shift</kbd> run · <kbd>Space</kbd> jump / handbrake</div><div><kbd>Mouse</kbd> hold left button and drag to look</div><div><kbd>F</kbd> get on / off, pet dogs, bat a few overs</div><div><kbd>H</kbd> horn (compulsory)</div><div><kbd>R</kbd> radio station</div><div><kbd>J</kbd> side jobs: deliveries, auto fares, bus rounds</div><div><kbd>M</kbd> big map</div><div><kbd>O</kbd> photo mode</div><div><kbd>B</kbd> record a 15 s clip</div><div><kbd>C</kbd> camera distance</div><div><kbd>Esc</kbd> pause menu</div></div><small>Type a word while playing for cheats. Try BARSA, IRULU, SANJE, BUSBEKU. Press F1 to close this.</small></div>';
  document.body.appendChild(kc);
  var kchip = document.createElement('div'); kchip.id = 'kchip'; kchip.innerHTML = '<kbd>F1</kbd> Keys · <kbd>Esc</kbd> Menu'; document.body.appendChild(kchip);
  var toggle = function (on) { kc.classList.toggle('show', on === undefined ? !kc.classList.contains('show') : on); };
  addEventListener('keydown', function (e) { if (e.key === 'F1') { e.preventDefault(); toggle(); } else if (e.key === 'Escape' && kc.classList.contains('show')) { toggle(false); e.stopImmediatePropagation(); } }, true);
  kc.addEventListener('click', function () { toggle(false); });
  var fade = function () { kchip.style.opacity = document.body.classList.contains('playing') ? '1' : '0'; }; setInterval(fade, 500);
  var t0 = 0; setInterval(function () { if (document.body.classList.contains('playing')) { t0 += 1; if (t0 === 25) kchip.style.display = 'none'; } }, 1000);
})();
