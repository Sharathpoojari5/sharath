// Street advertising: pasted wall posters, vinyl flex banners on shop fronts and electric poles, festival banners hung across the
// road, free-standing hoardings and bunting. Every party, brand, film and person is fictional. The artwork is painted at start-up
// on canvases (Kannada and English text, painted portraits, weathering) and drawn with a handful of instanced meshes.
import * as THREE from './three.module.min.js';

const KN = '"Noto Sans Kannada","Kannada Sangam MN","Tunga",system-ui,sans-serif', EN = '"Inter","Helvetica Neue",Arial,system-ui,sans-serif';
let seed = 4242; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647), rr = (a, b) => a + rnd() * (b - a), pick = (a) => a[Math.floor(rnd() * a.length)];
const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ painting helpers */
function text(x, s, px, py, size, color, o = {}) {
  x.save(); x.font = `${o.weight || 900} ${size}px ${o.font || KN}`; x.fillStyle = color; x.textAlign = o.align || 'center'; x.textBaseline = 'middle';
  if (o.shadow) { x.shadowColor = o.shadow; x.shadowBlur = o.blur || 6; x.shadowOffsetY = o.dy || 2; }
  if (o.stroke) { x.lineWidth = o.lw || 4; x.strokeStyle = o.stroke; x.lineJoin = 'round'; x.strokeText(s, px, py, o.max); }
  x.fillText(s, px, py, o.max); x.restore();
}
function grad(x, x0, y0, x1, y1, stops) { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach(([t, c]) => g.addColorStop(t, c)); return g; }
const SKIN = ['#8d5a3b', '#a8703f', '#b98255', '#7a4a2d', '#c08a5c'];

/** A painted head-and-shoulders portrait centred on (cx, base-of-neck y), s = head height in px. */
function portrait(x, cx, by, s, o = {}) {
  const skin = o.skin || pick(SKIN), hair = o.hair || '#15110e', grey = o.grey || 0, woman = !!o.woman;
  x.save();
  // shoulders and clothes
  const sw = s * 1.55; x.fillStyle = o.shirt || '#f8fafc'; x.beginPath(); x.moveTo(cx - sw, by + s * 1.3); x.quadraticCurveTo(cx - sw * 0.95, by - s * 0.05, cx - s * 0.32, by - s * 0.12); x.lineTo(cx + s * 0.32, by - s * 0.12); x.quadraticCurveTo(cx + sw * 0.95, by - s * 0.05, cx + sw, by + s * 1.3); x.closePath(); x.fill();
  if (o.shawl) { x.fillStyle = o.shawl; x.beginPath(); x.moveTo(cx - sw * 0.9, by + s * 1.3); x.quadraticCurveTo(cx - sw * 0.8, by + s * 0.1, cx - s * 0.1, by + s * 0.05); x.lineTo(cx + s * 0.06, by + s * 1.3); x.fill(); x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(cx - sw * 0.5, by + s * 0.25, s * 0.06, s); }
  if (woman && o.saree) { x.fillStyle = o.saree; x.beginPath(); x.moveTo(cx - sw, by + s * 1.3); x.quadraticCurveTo(cx - sw * 0.9, by - s * 0.05, cx - s * 0.3, by - s * 0.1); x.lineTo(cx + s * 0.9, by + s * 1.3); x.fill(); }
  x.fillStyle = 'rgba(0,0,0,.18)'; x.beginPath(); x.moveTo(cx - s * 0.2, by - s * 0.12); x.lineTo(cx, by + s * 0.28); x.lineTo(cx + s * 0.2, by - s * 0.12); x.fill();      // collar V
  // neck + head
  x.fillStyle = skin; x.fillRect(cx - s * 0.17, by - s * 0.45, s * 0.34, s * 0.4);
  x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(cx - s * 0.17, by - s * 0.45, s * 0.34, s * 0.1);
  x.fillStyle = skin; x.beginPath(); x.ellipse(cx, by - s * 0.82, s * 0.39, s * 0.5, 0, 0, TAU); x.fill();
  x.beginPath(); x.ellipse(cx - s * 0.4, by - s * 0.78, s * 0.06, s * 0.1, 0, 0, TAU); x.ellipse(cx + s * 0.4, by - s * 0.78, s * 0.06, s * 0.1, 0, 0, TAU); x.fill();    // ears
  const sh = x.createRadialGradient(cx - s * 0.12, by - s * 0.95, s * 0.05, cx, by - s * 0.8, s * 0.55); sh.addColorStop(0, 'rgba(255,230,200,.35)'); sh.addColorStop(1, 'rgba(0,0,0,.28)');
  x.fillStyle = sh; x.beginPath(); x.ellipse(cx, by - s * 0.82, s * 0.39, s * 0.5, 0, 0, TAU); x.fill();
  // hair
  x.fillStyle = grey ? '#9ca3af' : hair;
  if (woman) { x.beginPath(); x.ellipse(cx, by - s * 0.98, s * 0.44, s * 0.46, 0, Math.PI, TAU); x.fill(); x.fillRect(cx - s * 0.44, by - s * 0.98, s * 0.1, s * 0.62); x.fillRect(cx + s * 0.34, by - s * 0.98, s * 0.1, s * 0.62); x.fillStyle = '#f8fafc'; for (let i = 0; i < 7; i++) { x.beginPath(); x.arc(cx - s * 0.3 + i * s * 0.1, by - s * 1.22, s * 0.03, 0, TAU); x.fill(); } }       // jasmine
  else if (o.bald) { x.beginPath(); x.ellipse(cx - s * 0.37, by - s * 0.9, s * 0.05, s * 0.2, 0, 0, TAU); x.ellipse(cx + s * 0.37, by - s * 0.9, s * 0.05, s * 0.2, 0, 0, TAU); x.fill(); }
  else { x.beginPath(); x.ellipse(cx, by - s * 1.0, s * 0.41, s * 0.38, 0, Math.PI * 1.02, TAU * 0.995); x.fill(); x.beginPath(); x.moveTo(cx - s * 0.4, by - s * 0.98); x.quadraticCurveTo(cx - s * 0.1, by - s * 1.25, cx + s * 0.4, by - s * 0.98); x.lineTo(cx + s * 0.4, by - s * 1.05); x.quadraticCurveTo(cx, by - s * 1.4, cx - s * 0.4, by - s * 1.05); x.fill(); }
  if (o.cap) { x.fillStyle = o.cap; x.beginPath(); x.moveTo(cx - s * 0.36, by - s * 1.02); x.quadraticCurveTo(cx - s * 0.3, by - s * 1.32, cx, by - s * 1.3); x.quadraticCurveTo(cx + s * 0.3, by - s * 1.32, cx + s * 0.36, by - s * 1.02); x.lineTo(cx + s * 0.36, by - s * 1.0); x.lineTo(cx - s * 0.36, by - s * 1.0); x.fill(); }
  // face: brows, eyes, nose, moustache, smile
  const ey = by - s * 0.86; x.lineCap = 'round';
  x.strokeStyle = grey ? '#6b7280' : hair; x.lineWidth = s * 0.035; for (const sx of [-1, 1]) { x.beginPath(); x.moveTo(cx + sx * s * 0.08, ey - s * 0.1); x.quadraticCurveTo(cx + sx * s * 0.17, ey - s * 0.16, cx + sx * s * 0.27, ey - s * 0.1); x.stroke(); }
  for (const sx of [-1, 1]) { x.fillStyle = '#f8fafc'; x.beginPath(); x.ellipse(cx + sx * s * 0.17, ey, s * 0.075, s * 0.04, 0, 0, TAU); x.fill(); x.fillStyle = '#1b130d'; x.beginPath(); x.arc(cx + sx * s * 0.17, ey, s * 0.03, 0, TAU); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(cx + sx * s * 0.16, ey - s * 0.01, s * 0.01, 0, TAU); x.fill(); }
  x.strokeStyle = 'rgba(60,30,15,.55)'; x.lineWidth = s * 0.025; x.beginPath(); x.moveTo(cx - s * 0.03, ey + s * 0.03); x.quadraticCurveTo(cx - s * 0.07, ey + s * 0.22, cx + s * 0.04, ey + s * 0.24); x.stroke();
  if (o.stache) { x.fillStyle = grey ? '#6b7280' : hair; x.beginPath(); x.moveTo(cx - s * 0.2, ey + s * 0.33); x.quadraticCurveTo(cx, ey + s * 0.25, cx + s * 0.2, ey + s * 0.33); x.quadraticCurveTo(cx, ey + s * 0.36, cx - s * 0.2, ey + s * 0.33); x.fill(); }
  x.strokeStyle = woman ? '#9f1239' : 'rgba(80,30,25,.8)'; x.lineWidth = s * 0.03; x.beginPath(); x.moveTo(cx - s * 0.12, ey + s * 0.42); x.quadraticCurveTo(cx, ey + s * 0.5, cx + s * 0.12, ey + s * 0.42); x.stroke();
  if (woman) { x.fillStyle = '#dc2626'; x.beginPath(); x.arc(cx, ey - s * 0.13, s * 0.025, 0, TAU); x.fill(); }
  if (o.glasses) { x.strokeStyle = '#111'; x.lineWidth = s * 0.025; for (const sx of [-1, 1]) { x.beginPath(); x.roundRect(cx + sx * s * 0.17 - s * 0.1, ey - s * 0.07, s * 0.2, s * 0.14, s * 0.04); x.stroke(); } x.beginPath(); x.moveTo(cx - s * 0.07, ey); x.lineTo(cx + s * 0.07, ey); x.stroke(); }
  if (o.tilaka) { x.fillStyle = '#f59e0b'; x.fillRect(cx - s * 0.02, ey - s * 0.2, s * 0.04, s * 0.1); x.fillStyle = '#dc2626'; x.fillRect(cx - s * 0.012, ey - s * 0.18, s * 0.024, s * 0.06); }
  x.restore();
}
const LEADERS = [
  { skin: '#a8703f', stache: true, grey: 0, shawl: '#c2410c', glasses: false }, { skin: '#8d5a3b', stache: true, grey: 1, shawl: '#1d4ed8', glasses: true },
  { skin: '#b98255', woman: true, saree: '#15803d' }, { skin: '#7a4a2d', stache: false, bald: true, shawl: '#be123c', glasses: true },
  { skin: '#c08a5c', stache: true, grey: 0, shirt: '#e0f2fe', glasses: false, tilaka: true }, { skin: '#9a6a43', woman: true, saree: '#7c3aed' },
];

function symbol(x, kind, cx, cy, r, col) {
  x.save(); x.fillStyle = col; x.strokeStyle = col; x.lineWidth = r * 0.12; x.lineCap = 'round';
  if (kind === 'kalasha') { x.beginPath(); x.moveTo(cx - r * 0.5, cy - r * 0.2); x.quadraticCurveTo(cx - r * 0.8, cy + r * 0.5, cx - r * 0.3, cy + r * 0.8); x.lineTo(cx + r * 0.3, cy + r * 0.8); x.quadraticCurveTo(cx + r * 0.8, cy + r * 0.5, cx + r * 0.5, cy - r * 0.2); x.closePath(); x.fill(); x.beginPath(); x.arc(cx, cy - r * 0.4, r * 0.32, 0, TAU); x.fill(); for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(cx, cy - r * 0.7); x.lineTo(cx + (i - 2) * r * 0.32, cy - r * 1.05); x.stroke(); } }
  else if (kind === 'boat') { x.beginPath(); x.moveTo(cx - r, cy + r * 0.2); x.quadraticCurveTo(cx, cy + r * 0.9, cx + r, cy + r * 0.2); x.closePath(); x.fill(); x.beginPath(); x.moveTo(cx, cy + r * 0.1); x.lineTo(cx, cy - r); x.stroke(); x.beginPath(); x.moveTo(cx + r * 0.05, cy - r * 0.95); x.lineTo(cx + r * 0.8, cy + r * 0.05); x.lineTo(cx + r * 0.05, cy + r * 0.05); x.fill(); }
  else if (kind === 'coconut') { x.beginPath(); x.moveTo(cx, cy + r); x.quadraticCurveTo(cx + r * 0.15, cy, cx + r * 0.05, cy - r * 0.5); x.stroke(); for (let i = 0; i < 7; i++) { const a = -Math.PI * 0.95 + i * Math.PI * 0.32; x.beginPath(); x.moveTo(cx + r * 0.05, cy - r * 0.5); x.quadraticCurveTo(cx + Math.cos(a) * r * 0.5, cy - r * 0.5 + Math.sin(a) * r * 0.9 - r * 0.3, cx + Math.cos(a) * r * 1.0, cy - r * 0.35 + Math.sin(a) * r * 0.2 + r * 0.25); x.stroke(); } }
  else { x.beginPath(); x.arc(cx, cy, r * 0.45, 0, TAU); x.fill(); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; x.beginPath(); x.moveTo(cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62); x.lineTo(cx + Math.cos(a) * r * 0.98, cy + Math.sin(a) * r * 0.98); x.stroke(); } }
  x.restore();
}
const PARTIES = [
  { kn: 'ನಮ್ಮ ನಾಡು ಪಕ್ಷ', en: 'NAMMA NAADU PAKSHA', a: '#c2410c', b: '#fde047', sym: 'kalasha' }, { kn: 'ಜನಸೇವಾ ಸಮಿತಿ', en: 'JANASEVA SAMITHI', a: '#1d4ed8', b: '#e0f2fe', sym: 'boat' },
  { kn: 'ತುಳುನಾಡ ವಿಕಾಸ ವೇದಿಕೆ', en: 'TULUNAD VIKASA VEDIKE', a: '#15803d', b: '#fef9c3', sym: 'coconut' }, { kn: 'ಪ್ರಗತಿ ದಳ', en: 'PRAGATHI DALA', a: '#be123c', b: '#fecdd3', sym: 'sun' },
];
const CANDS = [['ಶ್ರೀ ರಘುವೀರ್ ಶೆಟ್ಟಿ', 'RAGHUVEER SHETTY'], ['ಶ್ರೀ ಪ್ರಕಾಶ್ ಹೆಗ್ಡೆ', 'PRAKASH HEGDE'], ['ಶ್ರೀಮತಿ ವನಿತಾ ಪೂಜಾರಿ', 'VANITHA POOJARY'], ['ಶ್ರೀ ಅಶೋಕ್ ಭಟ್', 'ASHOK BHAT']];
const SLOGANS = ['ಅಭಿವೃದ್ಧಿಯ ಹೊಸ ಅಧ್ಯಾಯ', 'ನಿಮ್ಮ ಮತ, ನಮ್ಮ ಜವಾಬ್ದಾರಿ', 'ರಸ್ತೆ · ನೀರು · ವಿದ್ಯುತ್', 'ಜನರೊಂದಿಗೆ, ಜನರಿಗಾಗಿ'];

/* ------------------------------------------------------------------ portrait posters (256 x 384) */
const PW = 256, PH = 384;
const POSTERS = [];
PARTIES.forEach((P, i) => POSTERS.push((x) => {
  x.fillStyle = grad(x, 0, 0, 0, PH, [[0, P.a], [1, '#1c1917']]); x.fillRect(0, 0, PW, PH);
  x.fillStyle = 'rgba(255,255,255,.07)'; for (let k = 0; k < 6; k++) { x.beginPath(); x.arc(PW * (k % 3) / 2, PH * 0.3 + k * 18, 90, 0, TAU); x.fill(); }
  text(x, P.kn, PW / 2, 26, 21, P.b, { shadow: '#0008' }); text(x, P.en, PW / 2, 48, 11, '#fff', { weight: 800, font: EN, max: 230 }); symbol(x, P.sym, 36, 84, 22, P.b); symbol(x, P.sym, PW - 36, 84, 22, P.b);
  portrait(x, PW / 2, 232, 118, { ...LEADERS[i], shirt: i % 2 ? '#e2e8f0' : '#f8fafc' });
  x.fillStyle = P.b; x.fillRect(0, 262, PW, 4); text(x, CANDS[i][0], PW / 2, 288, 20, '#fff', { shadow: '#000a', max: 236 }); text(x, CANDS[i][1], PW / 2, 308, 11, P.b, { font: EN, weight: 800 });
  text(x, SLOGANS[i], PW / 2, 336, 17, '#fff', { max: 236 }); x.fillStyle = P.b; x.fillRect(30, 352, PW - 60, 2); text(x, 'ನಿಮ್ಮ ಅಮೂಲ್ಯ ಮತ ನಮಗೇ ನೀಡಿ  ·  WARD ' + (3 + i * 4), PW / 2, 368, 11, '#fef3c7', { weight: 700 });
}));
const FILMS = [['ಪಿಲಿ ಬೇಟೆ', 'PILI BETE', '#7f1d1d', '#f59e0b'], ['ಕಂಬಳ ಕಲಿ', 'KAMBALA KALI', '#14532d', '#fde047'], ['ಮಳೆಗಾಲದ ಹುಡುಗಿ', 'MALEGAALADA HUDUGI', '#1e3a8a', '#f9a8d4'], ['ತುಳುನಾಡ ಕಲಿ', 'TULUNAD KALI', '#312e81', '#fb923c']];
FILMS.forEach(([kn, en, a, b], i) => POSTERS.push((x) => {
  x.fillStyle = grad(x, 0, 0, PW, PH, [[0, a], [0.6, '#0c0a09'], [1, a]]); x.fillRect(0, 0, PW, PH);
  const g = x.createRadialGradient(PW / 2, 150, 10, PW / 2, 150, 200); g.addColorStop(0, b + 'aa'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, PW, PH);
  portrait(x, PW * 0.38, 250, 110, { ...LEADERS[(i + 1) % 4], shirt: '#111827', shawl: null }); portrait(x, PW * 0.7, 270, 92, { ...LEADERS[2 + (i % 2) * 3], woman: true, saree: b });
  x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(0, 262, PW, 122); text(x, kn, PW / 2, 296, 34, b, { shadow: '#000', blur: 8, max: 236, stroke: '#000', lw: 5 }); text(x, en, PW / 2, 326, 14, '#fff', { font: EN, weight: 900, max: 230 });
  text(x, 'ಈ ಶುಕ್ರವಾರ ಚಿತ್ರಮಂದಿರಗಳಲ್ಲಿ', PW / 2, 352, 14, '#fde68a', { weight: 700 }); text(x, 'A KARKALA TALKIES RELEASE', PW / 2, 370, 8.5, '#d6d3d1', { font: EN, weight: 700 });
  x.fillStyle = b; x.fillRect(14, 14, 62, 20); text(x, 'U/A', 45, 24, 12, '#000', { font: EN });
}));
const ADS = [
  (x) => { x.fillStyle = grad(x, 0, 0, 0, PH, [[0, '#4a0d0d'], [1, '#1a0505']]); x.fillRect(0, 0, PW, PH); const gold = grad(x, 0, 0, PW, 0, [[0, '#b45309'], [0.4, '#fde68a'], [0.7, '#d97706'], [1, '#fcd34d']]); text(x, 'ಶ್ರೀ ಲಕ್ಷ್ಮೀ ಜ್ಯುವೆಲ್ಲರ್ಸ್', PW / 2, 34, 24, '#fcd34d', { shadow: '#000' , max: 240}); text(x, 'SRI LAKSHMI JEWELLERS', PW / 2, 58, 12, '#fde68a', { font: EN, weight: 800 }); x.strokeStyle = gold; x.lineWidth = 6; x.beginPath(); x.arc(PW / 2, 130, 70, 0.15 * Math.PI, 0.85 * Math.PI); x.stroke(); for (let i = 0; i < 17; i++) { const a = Math.PI * (0.15 + 0.7 * i / 16); x.fillStyle = gold; x.beginPath(); x.arc(PW / 2 + Math.cos(a) * 70, 130 + Math.sin(a) * 70, 5 + (i === 8 ? 5 : 0), 0, TAU); x.fill(); } x.fillStyle = '#dc2626'; x.beginPath(); x.arc(PW / 2, 205, 11, 0, TAU); x.fill(); text(x, 'ಅಕ್ಷಯ ತೃತೀಯ ವಿಶೇಷ', PW / 2, 262, 26, '#fff', { shadow: '#000', max: 236 }); text(x, 'ಮೇಕಿಂಗ್ ಚಾರ್ಜ್ ಕೇವಲ 0%', PW / 2, 300, 19, '#fcd34d', { max: 236 }); text(x, 'HALLMARK 916 GOLD · BIS CERTIFIED', PW / 2, 336, 10.5, '#fde68a', { font: EN, weight: 800 }); text(x, 'ಮಾರುಕಟ್ಟೆ ರಸ್ತೆ, ಕಾರ್ಕಳ', PW / 2, 360, 13, '#e7e5e4', { weight: 700 }); },
  (x) => { x.fillStyle = grad(x, 0, 0, PW, PH, [[0, '#0f172a'], [1, '#1e40af']]); x.fillRect(0, 0, PW, PH); text(x, 'ಮೊಬೈಲ್ ವರ್ಲ್ಡ್', PW / 2, 32, 28, '#fff', { max: 236, shadow: '#000' }); text(x, 'MOBILE WORLD · KARKALA', PW / 2, 56, 12, '#93c5fd', { font: EN, weight: 800 }); for (let i = 0; i < 3; i++) { const px = 36 + i * 72, py = 90 + (i === 1 ? -8 : 6); x.fillStyle = '#111'; x.beginPath(); x.roundRect(px, py, 62, 116, 9); x.fill(); x.fillStyle = grad(x, px, py, px + 62, py + 116, [[0, ['#22d3ee', '#f472b6', '#a3e635'][i]], [1, '#1e1b4b']]); x.beginPath(); x.roundRect(px + 4, py + 5, 54, 104, 6); x.fill(); } text(x, '5G', PW / 2, 236, 54, '#fde047', { font: EN, shadow: '#000' }); text(x, '₹ 8,999 ರಿಂದ', PW / 2, 280, 27, '#fff', { max: 230 }); text(x, 'ಸುಲಭ ಕಂತು · 0% EMI', PW / 2, 312, 18, '#bae6fd', { max: 230 }); text(x, 'EXCHANGE OFFER · FREE COVER + GLASS', PW / 2, 346, 10, '#e0f2fe', { font: EN, weight: 800 }); text(x, 'ಬಸ್ ಸ್ಟ್ಯಾಂಡ್ ಎದುರು', PW / 2, 366, 13, '#fff', { weight: 700 }); },
  (x) => { for (let i = 0; i < 8; i++) { x.fillStyle = ['#be185d', '#facc15', '#15803d', '#7c3aed', '#ea580c', '#0e7490', '#dc2626', '#1d4ed8'][i]; x.fillRect(i * 32, 0, 32, PH); } x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, 0, PW, PH); x.fillStyle = '#fef3c7'; x.fillRect(16, 16, PW - 32, 108); text(x, 'ಶ್ರೀ ಸಿಲ್ಕ್ಸ್', PW / 2, 56, 36, '#9f1239', { max: 220 }); text(x, 'SHREE SILKS & SAREES', PW / 2, 92, 14, '#7f1d1d', { font: EN, weight: 900 }); text(x, 'ಮದುವೆ ಸೀಸನ್ ಆಫರ್', PW / 2, 186, 30, '#fff', { shadow: '#000', max: 236 }); text(x, 'ಪ್ಲಾಟಿನಂ ರೇಷ್ಮೆ ಸೀರೆಗಳು', PW / 2, 228, 18, '#fde68a', { max: 236 }); text(x, 'FLAT 25% OFF', PW / 2, 290, 40, '#fde047', { font: EN, shadow: '#000', stroke: '#7f1d1d', lw: 5 }); text(x, 'ಕಾಂಜೀವರಂ · ಮೈಸೂರು ಸಿಲ್ಕ್ · ಇಳಕಲ್', PW / 2, 336, 13.5, '#fff', { max: 236, weight: 700 }); },
  (x) => { x.fillStyle = grad(x, 0, 0, 0, PH, [[0, '#0369a1'], [1, '#082f49']]); x.fillRect(0, 0, PW, PH); text(x, 'ವಿದ್ಯಾ ನಿಕೇತನ', PW / 2, 30, 30, '#fde047', { max: 236, shadow: '#000' }); text(x, 'ENGLISH MEDIUM SCHOOL · KARKALA', PW / 2, 54, 11, '#bae6fd', { font: EN, weight: 800 }); for (let i = 0; i < 4; i++) portrait(x, 46 + i * 54, 188, 38, { ...LEADERS[(i * 2 + 1) % 6], woman: i % 2 === 1, saree: '#f472b6', shirt: ['#38bdf8', '#fde047', '#4ade80', '#fb923c'][i], glasses: false, stache: false }); text(x, 'ಪ್ರವೇಶ ಪ್ರಾರಂಭ', PW / 2, 236, 34, '#fff', { shadow: '#000', max: 236 }); text(x, 'ADMISSIONS OPEN 2026-27', PW / 2, 268, 16, '#fde047', { font: EN, weight: 900 }); text(x, 'LKG · 1 ರಿಂದ 10ನೇ ತರಗತಿ', PW / 2, 300, 17, '#e0f2fe', { max: 236 }); text(x, 'ಬಸ್ ಸೌಲಭ್ಯ · ಸ್ಮಾರ್ಟ್ ಕ್ಲಾಸ್', PW / 2, 330, 14, '#bae6fd', { max: 236, weight: 700 }); text(x, 'Ph: 08258-2XX XXX', PW / 2, 360, 13, '#fff', { font: EN, weight: 800 }); },
  (x) => { x.fillStyle = grad(x, 0, 0, PW, PH, [[0, '#1e1b4b'], [1, '#4c1d95']]); x.fillRect(0, 0, PW, PH); text(x, 'ಸಿಇಟಿ · ನೀಟ್', PW / 2, 42, 40, '#fde047', { shadow: '#000', max: 236 }); text(x, 'CET · NEET COACHING', PW / 2, 78, 17, '#fff', { font: EN, weight: 900 }); x.fillStyle = '#fde047'; x.fillRect(36, 96, PW - 72, 3); text(x, 'ನಮ್ಮ ಸಾಧಕರು', PW / 2, 128, 20, '#e9d5ff', { weight: 800 }); for (let i = 0; i < 3; i++) { portrait(x, 52 + i * 76, 232, 42, { ...LEADERS[(i * 2 + 2) % 6], woman: i === 1 }); text(x, ['612', '655', '598'][i], 52 + i * 76, 252, 15, '#fde047', { font: EN }); } text(x, '100% ಫಲಿತಾಂಶ', PW / 2, 296, 28, '#fff', { shadow: '#000', max: 236 }); text(x, 'ಹೊಸ ಬ್ಯಾಚ್ ಜೂನ್‌ನಿಂದ', PW / 2, 332, 17, '#fde68a', { max: 236, weight: 700 }); text(x, 'ಕಾರ್ಕಳ · ಉಡುಪಿ · ಮಂಗಳೂರು', PW / 2, 362, 12, '#ddd6fe', { weight: 700 }); },
  (x) => { x.fillStyle = grad(x, 0, 0, 0, PH, [[0, '#ecfeff'], [1, '#67e8f9']]); x.fillRect(0, 0, PW, PH); text(x, 'ಡೆಂಟಲ್ ಕೇರ್ ಕ್ಲಿನಿಕ್', PW / 2, 34, 24, '#0e7490', { max: 236 }); text(x, 'DENTAL CARE & IMPLANT CENTRE', PW / 2, 58, 11, '#155e75', { font: EN, weight: 900 }); x.fillStyle = '#fff'; x.strokeStyle = '#0891b2'; x.lineWidth = 5; x.beginPath(); x.moveTo(78, 110); x.quadraticCurveTo(128, 80, 178, 110); x.quadraticCurveTo(190, 170, 160, 230); x.quadraticCurveTo(148, 190, 128, 190); x.quadraticCurveTo(108, 190, 96, 230); x.quadraticCurveTo(66, 170, 78, 110); x.fill(); x.stroke(); text(x, 'ನಗು ಸುಂದರವಾಗಿರಲಿ', PW / 2, 266, 24, '#0e7490', { max: 236 }); text(x, 'ಡಾ. ಸುಮಂತ್ ಭಟ್, BDS', PW / 2, 304, 17, '#155e75', { max: 236 }); text(x, 'ರೂಟ್ ಕೆನಾಲ್ · ಬ್ರೇಸಸ್ · ಇಂಪ್ಲಾಂಟ್', PW / 2, 332, 13.5, '#0f766e', { max: 236, weight: 700 }); text(x, 'ಸೋಮ–ಶನಿ 9.30 – 6.30', PW / 2, 360, 12, '#164e63', { weight: 700 }); },
  (x) => { x.fillStyle = grad(x, 0, 0, 0, PH, [[0, '#bae6fd'], [0.55, '#86efac'], [1, '#16a34a']]); x.fillRect(0, 0, PW, PH); x.fillStyle = '#14532d'; x.fillRect(0, 150, PW, 4); for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { x.fillStyle = r % 2 ? '#fde68a' : '#fef3c7'; x.beginPath(); x.moveTo(20 + c * 58 + r * 8, 238 - r * 26); x.lineTo(64 + c * 58 + r * 6, 238 - r * 26); x.lineTo(60 + c * 58 + r * 6, 210 - r * 26); x.lineTo(24 + c * 58 + r * 8, 210 - r * 26); x.fill(); } text(x, 'ಸನ್‌ರೈಸ್ ಲೇಔಟ್', PW / 2, 34, 29, '#14532d', { max: 236 }); text(x, 'ನಿವೇಶನಗಳು ಮಾರಾಟಕ್ಕೆ', PW / 2, 80, 22, '#052e16', { max: 236 }); text(x, 'DTCP APPROVED · READY TO BUILD', PW / 2, 106, 11, '#14532d', { font: EN, weight: 900 }); x.fillStyle = '#052e16'; x.fillRect(0, 262, PW, 122); text(x, '30×40 ₹ 9.5 ಲಕ್ಷದಿಂದ', PW / 2, 296, 22, '#fde047', { max: 236 }); text(x, 'ಕಾರ್ಕಳ ಬಸ್ ನಿಲ್ದಾಣದಿಂದ 4 ಕಿ.ಮೀ.', PW / 2, 328, 14, '#dcfce7', { max: 236, weight: 700 }); text(x, 'ಬ್ಯಾಂಕ್ ಸಾಲ ಸೌಲಭ್ಯ ಲಭ್ಯ', PW / 2, 356, 13, '#bbf7d0', { max: 236 }); },
  (x) => { x.fillStyle = '#e5e7eb'; x.fillRect(0, 0, PW, PH); x.fillStyle = '#b91c1c'; x.fillRect(0, 0, PW, 100); text(x, 'ಕರ್ನಾಡ್ ಸಿಮೆಂಟ್', PW / 2, 40, 30, '#fff', { max: 236 }); text(x, 'KARNAD CEMENT · PPC', PW / 2, 74, 15, '#fecaca', { font: EN, weight: 900 }); for (let i = 0; i < 3; i++) { x.fillStyle = '#d1d5db'; x.fillRect(24 + i * 74, 150 - i * 6 + (i === 1 ? -12 : 0), 62, 100); x.fillStyle = '#b91c1c'; x.fillRect(24 + i * 74, 170 - i * 6 + (i === 1 ? -12 : 0), 62, 30); text(x, '50 kg', 55 + i * 74, 185 - i * 6 + (i === 1 ? -12 : 0), 12, '#fff', { font: EN }); } text(x, 'ಗಟ್ಟಿ ಮನೆಗೆ ಗಟ್ಟಿ ಸಿಮೆಂಟ್', PW / 2, 292, 20, '#7f1d1d', { max: 236 }); text(x, 'ಮನೆ ಕಟ್ಟುವ ಕನಸಿಗೆ ನಂಬಿಕೆಯ ಹೆಸರು', PW / 2, 326, 14, '#374151', { max: 236, weight: 700 }); text(x, 'AUTHORISED DEALER: SHETTY TRADERS', PW / 2, 360, 10, '#4b5563', { font: EN, weight: 800 }); },
  (x) => { x.fillStyle = grad(x, 0, 0, 0, PH, [[0, '#7f1d1d'], [1, '#431407']]); x.fillRect(0, 0, PW, PH); text(x, 'ಮಂಗಳೂರು ಬಿರಿಯಾನಿ ಹೌಸ್', PW / 2, 34, 22, '#fde047', { max: 240, shadow: '#000' }); text(x, 'MANGALURU BIRYANI HOUSE', PW / 2, 58, 12, '#fed7aa', { font: EN, weight: 900 }); x.fillStyle = '#e5e7eb'; x.beginPath(); x.ellipse(PW / 2, 170, 92, 30, 0, 0, TAU); x.fill(); x.fillStyle = '#f59e0b'; x.beginPath(); x.ellipse(PW / 2, 160, 74, 40, 0, Math.PI, TAU); x.fill(); for (let i = 0; i < 40; i++) { x.fillStyle = ['#fde68a', '#fbbf24', '#fff7ed', '#dc2626'][i % 4]; x.fillRect(PW / 2 - 62 + Math.random() * 124, 130 + Math.random() * 36, 5, 2); } x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 4; for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(PW / 2 - 30 + i * 30, 120); x.bezierCurveTo(PW / 2 - 50 + i * 30, 100, PW / 2 - 10 + i * 30, 85, PW / 2 - 30 + i * 30, 66); x.stroke(); } text(x, 'ಸ್ಪೆಷಲ್ ಬಿರಿಯಾನಿ', PW / 2, 236, 30, '#fff', { shadow: '#000', max: 236 }); text(x, 'ಚಿಕನ್ · ಮಟನ್ · ಫಿಶ್ · ವೆಜ್', PW / 2, 276, 17, '#fde68a', { max: 236, weight: 700 }); text(x, 'ಕೋರಿ ರೊಟ್ಟಿ · ನೀರ್ ದೋಸೆ · ಸುಕ್ಕ', PW / 2, 308, 15, '#fed7aa', { max: 236, weight: 700 }); text(x, 'ಹೋಮ್ ಡೆಲಿವರಿ ಲಭ್ಯ', PW / 2, 346, 17, '#fff', { max: 236 }); },
  (x) => { x.fillStyle = grad(x, 0, 0, 0, PH, [[0, '#fef3c7'], [1, '#f59e0b']]); x.fillRect(0, 0, PW, PH); text(x, 'ಗೋಳಿಬಜೆ ಕಾರ್ನರ್', PW / 2, 40, 31, '#7c2d12', { max: 236 }); text(x, 'GOLI BAJE CORNER · SINCE 1978', PW / 2, 70, 11.5, '#92400e', { font: EN, weight: 900 }); for (let i = 0; i < 9; i++) { x.fillStyle = grad(x, 0, 0, 0, 40, [[0, '#d97706'], [1, '#92400e']]); x.beginPath(); x.arc(84 + (i % 3) * 44 + (Math.floor(i / 3) % 2) * 20, 140 + Math.floor(i / 3) * 34, 21, 0, TAU); x.fill(); } text(x, 'ಬಿಸಿ ಬಿಸಿ ಗೋಳಿಬಜೆ', PW / 2, 262, 26, '#7c2d12', { max: 236 }); text(x, 'ಚಟ್ನಿ · ಸಾಂಬಾರ್ · ಚಹಾ', PW / 2, 300, 18, '#92400e', { max: 236, weight: 700 }); text(x, '₹ 30', PW / 2, 342, 40, '#b91c1c', { font: EN, stroke: '#fff7ed', lw: 5 }); },
  (x) => { x.fillStyle = grad(x, 0, 0, 0, PH, [[0, '#7c2d12'], [1, '#1c0a02']]); x.fillRect(0, 0, PW, PH); text(x, 'ಯಕ್ಷಗಾನ ಬಯಲಾಟ', PW / 2, 34, 31, '#fde047', { shadow: '#000', max: 236 }); text(x, 'ಶ್ರೀ ದೇವಿ ಮಹಾತ್ಮೆ', PW / 2, 72, 22, '#fff', { max: 236 }); x.fillStyle = '#d4a017'; x.beginPath(); x.moveTo(PW / 2 - 40, 170); x.lineTo(PW / 2, 100); x.lineTo(PW / 2 + 40, 170); x.fill(); x.fillStyle = '#dc2626'; x.fillRect(PW / 2 - 48, 168, 96, 16); portrait(x, PW / 2, 232, 72, { skin: '#2f9e44', stache: true, shirt: '#dc2626', shawl: '#facc15' }); text(x, 'ಇಂದು ರಾತ್ರಿ 9.30ಕ್ಕೆ', PW / 2, 288, 20, '#fde68a', { max: 236 }); text(x, 'ಗಾಂಧಿ ಮೈದಾನ, ಕಾರ್ಕಳ', PW / 2, 318, 18, '#fff', { max: 236 }); text(x, 'ಹಿಮ್ಮೇಳ: ಭಾಗವತರು · ಚೆಂಡೆ · ಮದ್ದಳೆ', PW / 2, 350, 12.5, '#fed7aa', { max: 236, weight: 700 }); },
  (x) => { x.fillStyle = grad(x, 0, 0, 0, PH, [[0, '#365314'], [1, '#422006']]); x.fillRect(0, 0, PW, PH); text(x, 'ಕಂಬಳ ಕೂಟ', PW / 2, 40, 40, '#fde047', { shadow: '#000', max: 236 }); text(x, 'KORDHA TUKATTA KAMBALA', PW / 2, 74, 14, '#fff', { font: EN, weight: 900 }); x.fillStyle = '#a16207'; x.fillRect(0, 160, PW, 130); x.fillStyle = '#1c1917'; for (const dx of [-26, 26]) { x.beginPath(); x.ellipse(PW / 2 + dx, 210, 34, 22, 0, 0, TAU); x.fill(); x.fillRect(PW / 2 + dx + 22, 192, 22, 10); } x.fillStyle = '#e7e5e4'; x.fillRect(PW / 2 - 4, 150, 8, 34); text(x, 'ಈ ಭಾನುವಾರ', PW / 2, 318, 24, '#fff', { max: 236 }); text(x, 'ಕೆಸರುಗದ್ದೆ, ಆನೆಕೆರೆ ಬಳಿ', PW / 2, 346, 15, '#fde68a', { max: 236 }); text(x, 'ಬಹುಮಾನ ₹ 1,00,000', PW / 2, 368, 12, '#fff', { max: 236 }); },
  (x) => { x.fillStyle = grad(x, 0, 0, PW, PH, [[0, '#be185d'], [1, '#7c2d12']]); x.fillRect(0, 0, PW, PH); for (let i = 0; i < 14; i++) { x.fillStyle = ['#fde047', '#fb923c', '#f9a8d4'][i % 3]; x.beginPath(); x.arc(i * 20 + 8, 20 + (i % 2) * 6, 7, 0, TAU); x.fill(); } text(x, 'ಕಾರ್ಕಳ ಉತ್ಸವ', PW / 2, 78, 35, '#fff', { shadow: '#000', max: 236 }); text(x, 'KARKALA UTSAVA 2026', PW / 2, 110, 17, '#fde047', { font: EN, weight: 900 }); text(x, 'ಸಾಂಸ್ಕೃತಿಕ ಕಾರ್ಯಕ್ರಮಗಳು', PW / 2, 160, 19, '#fff', { max: 236 }); const items = ['ಪಿಲಿ ವೇಷ ಸ್ಪರ್ಧೆ', 'ಯಕ್ಷಗಾನ · ಭಜನೆ', 'ಆಹಾರ ಮೇಳ', 'ಕಂಬಳ ಪ್ರದರ್ಶನ', 'ಬಾಣ ಬಿರುಸು']; items.forEach((t, i) => { text(x, '✦ ' + t, PW / 2, 202 + i * 28, 17, '#fde68a', { max: 220, weight: 700 }); }); text(x, 'ಸ್ವರಾಜ್ ಮೈದಾನ · ಸಂಜೆ 5 ರಿಂದ', PW / 2, 360, 14, '#fff', { max: 236 }); },
  (x) => { x.fillStyle = '#fef2f2'; x.fillRect(0, 0, PW, PH); x.fillStyle = '#b91c1c'; x.fillRect(0, 0, PW, 118); text(x, 'ರಕ್ತದಾನ ಶಿಬಿರ', PW / 2, 48, 34, '#fff', { max: 236 }); text(x, 'BLOOD DONATION CAMP', PW / 2, 86, 15, '#fecaca', { font: EN, weight: 900 }); x.fillStyle = '#dc2626'; x.beginPath(); x.moveTo(PW / 2, 150); x.bezierCurveTo(PW / 2 + 60, 214, PW / 2 + 40, 252, PW / 2, 252); x.bezierCurveTo(PW / 2 - 40, 252, PW / 2 - 60, 214, PW / 2, 150); x.fill(); text(x, 'ನಿಮ್ಮ ಒಂದು ಹನಿ, ಒಂದು ಜೀವ', PW / 2, 286, 18, '#7f1d1d', { max: 236 }); text(x, 'ಭಾನುವಾರ ಬೆಳಿಗ್ಗೆ 9 ರಿಂದ', PW / 2, 322, 15, '#374151', { max: 236, weight: 700 }); text(x, 'ಸರ್ಕಾರಿ ಆಸ್ಪತ್ರೆ, ಕಾರ್ಕಳ', PW / 2, 352, 15, '#7f1d1d', { max: 236, weight: 700 }); },
];
ADS.forEach((f) => POSTERS.push(f));

/* ------------------------------------------------------------------ wide flex banners (1024 x 192) */
const BW = 1024, BH = 192, BANNERS = [];
const wide = (x, a, b, kn, en, sub, o = {}) => { x.fillStyle = grad(x, 0, 0, BW, 0, [[0, a], [0.5, b || a], [1, a]]); x.fillRect(0, 0, BW, BH); x.fillStyle = 'rgba(255,255,255,.08)'; for (let k = 0; k < 8; k++) { x.beginPath(); x.arc(k * 150 + 20, 60 + (k % 2) * 80, 110, 0, TAU); x.fill(); } text(x, kn, BW / 2, 62, o.size || 62, o.fg || '#fff', { shadow: '#000a', blur: 8, max: 700, stroke: o.stroke, lw: 6 }); text(x, en, BW / 2, 118, 28, o.fg2 || '#fde68a', { font: EN, weight: 900, max: 700 }); if (sub) text(x, sub, BW / 2, 160, 22, '#fff', { weight: 700, max: 760 }); x.fillStyle = o.line || '#fde047'; x.fillRect(0, 0, BW, 7); x.fillRect(0, BH - 7, BW, 7); };
BANNERS.push((x) => { wide(x, '#c2410c', '#7c2d12', 'ಕಾರ್ಕಳ ಉತ್ಸವಕ್ಕೆ ಸ್ವಾಗತ', 'WELCOME TO KARKALA UTSAVA', 'ಸ್ವಾಗತ ಸಮಿತಿ ಮತ್ತು ಪುರಸಭೆ'); });
BANNERS.push((x) => { wide(x, PARTIES[0].a, '#7c2d12', 'ನಮ್ಮ ನಾಡು ಪಕ್ಷಕ್ಕೆ ಸ್ವಾಗತ', 'NAMMA NAADU PAKSHA', CANDS[0][0] + ' · ' + SLOGANS[0]); portrait(x, 110, 190, 72, LEADERS[0]); portrait(x, BW - 110, 190, 72, LEADERS[4]); symbol(x, 'kalasha', 60, 40, 26, '#fde047'); symbol(x, 'kalasha', BW - 60, 40, 26, '#fde047'); });
BANNERS.push((x) => { wide(x, PARTIES[1].a, '#1e3a8a', 'ಜನಸೇವಾ ಸಮಿತಿ', 'JANASEVA SAMITHI', CANDS[1][0] + ' · ' + SLOGANS[1]); portrait(x, 110, 190, 72, LEADERS[1]); portrait(x, BW - 110, 190, 72, LEADERS[5]); symbol(x, 'boat', 70, 40, 26, '#e0f2fe'); symbol(x, 'boat', BW - 70, 40, 26, '#e0f2fe'); });
BANNERS.push((x) => { wide(x, '#be185d', '#9d174d', 'ಹುಟ್ಟುಹಬ್ಬದ ಶುಭಾಶಯಗಳು', 'HAPPY BIRTHDAY ANNA', 'ಅಭಿಮಾನಿ ಬಳಗ, ಕಾರ್ಕಳ', { fg2: '#fde68a' }); portrait(x, 120, 190, 74, { ...LEADERS[4], shirt: '#fef08a' }); for (let i = 0; i < 12; i++) { x.fillStyle = ['#fde047', '#4ade80', '#38bdf8', '#fb923c'][i % 4]; x.beginPath(); x.arc(BW - 60 - (i % 4) * 36, 40 + Math.floor(i / 4) * 38, 12, 0, TAU); x.fill(); } });
BANNERS.push((x) => { wide(x, '#1e3a8a', '#1e40af', 'ಎಸ್‌ಎಸ್‌ಎಲ್‌ಸಿ ಸಾಧಕರಿಗೆ ಅಭಿನಂದನೆಗಳು', 'CONGRATULATIONS SSLC TOPPERS', 'ವಿದ್ಯಾ ನಿಕೇತನ ಪ್ರೌಢಶಾಲೆ · 100% ಫಲಿತಾಂಶ', { size: 50 }); for (let i = 0; i < 3; i++) portrait(x, 80 + i * 90, 190, 54, { ...LEADERS[(i * 2 + 2) % 6], woman: i !== 1, saree: '#f472b6' }); for (let i = 0; i < 3; i++) portrait(x, BW - 80 - i * 90, 190, 54, { ...LEADERS[(i * 2 + 1) % 6], woman: i === 1 }); });
BANNERS.push((x) => { wide(x, '#14532d', '#166534', 'ಶುಭ ಉದ್ಘಾಟನೆ', 'GRAND OPENING TODAY', 'ಮಹಾಲಕ್ಷ್ಮೀ ಸೂಪರ್ ಮಾರ್ಕೆಟ್ · ಬೆಳಿಗ್ಗೆ 10 ಗಂಟೆಗೆ', { size: 70 }); for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#f97316' : '#facc15'; x.beginPath(); x.arc(30 + i * 64, 22, 14, 0, TAU); x.fill(); } });
BANNERS.push((x) => { wide(x, '#365314', '#422006', 'ಕಂಬಳ ಕೂಟ', 'KORDHA TUKATTA KAMBALA · ಆನೆಕೆರೆ', 'ಕೋಣಗಳ ಓಟ · ಬಹುಮಾನ ₹ 1,00,000', { size: 72 }); });
BANNERS.push((x) => { wide(x, '#7f1d1d', '#431407', 'ಯಕ್ಷಗಾನ ಬಯಲಾಟ', 'YAKSHAGANA · SRI DEVI MAHATME', 'ಇಂದು ರಾತ್ರಿ 9.30 · ಗಾಂಧಿ ಮೈದಾನ', { size: 66 }); });
BANNERS.push((x) => { wide(x, '#6d28d9', '#be185d', 'ನವರಾತ್ರಿ ಶುಭಾಶಯಗಳು', 'HAPPY NAVARATRI', 'ಶ್ರೀ ವೆಂಕಟರಮಣ ದೇವಸ್ಥಾನ ಸೇವಾ ಸಮಿತಿ', { size: 62 }); });
BANNERS.push((x) => { wide(x, '#92400e', '#b45309', 'ದೀಪಾವಳಿ ಶುಭಾಶಯಗಳು', 'HAPPY DEEPAVALI', 'ಶ್ರೀ ಲಕ್ಷ್ಮೀ ಜ್ಯುವೆಲ್ಲರ್ಸ್ & ಸಿಲ್ಕ್ಸ್', { size: 62 }); for (let i = 0; i < 7; i++) { x.fillStyle = '#fde047'; x.beginPath(); x.ellipse(70 + i * 148, 168, 12, 7, 0, 0, TAU); x.fill(); x.fillStyle = '#ef4444'; x.beginPath(); x.arc(70 + i * 148, 158, 5, 0, TAU); x.fill(); } });
BANNERS.push((x) => { wide(x, '#0f766e', '#115e59', 'ಈದ್ ಮುಬಾರಕ್', 'EID MUBARAK', 'ಕಾರ್ಕಳ ಜಮಾತ್ ಸಮಿತಿ', { size: 74, fg2: '#fef08a' }); });
BANNERS.push((x) => { wide(x, '#b91c1c', '#facc15', 'ಕನ್ನಡ ರಾಜ್ಯೋತ್ಸವ ಶುಭಾಶಯಗಳು', 'KANNADA RAJYOTSAVA', 'ಕನ್ನಡ ಸಂಘ, ಕಾರ್ಕಳ', { size: 56, fg: '#fff', stroke: '#7f1d1d' }); });

/* ------------------------------------------------------------------ weathering */
function weather(x, W, H, k = 1) {
  x.save();
  for (let i = 0; i < 700 * k; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.07)'; x.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 2, 1 + Math.random() * 2); }
  const wash = x.createLinearGradient(0, 0, 0, H); wash.addColorStop(0, 'rgba(40,30,20,.0)'); wash.addColorStop(1, 'rgba(255,255,255,.1)'); x.fillStyle = wash; x.fillRect(0, 0, W, H);       // sun fade
  for (let i = 0; i < 3; i++) { const sx = Math.random() * W, g = x.createLinearGradient(sx, 0, sx + 6, H * (0.4 + Math.random() * 0.6)); g.addColorStop(0, 'rgba(60,45,30,.22)'); g.addColorStop(1, 'rgba(60,45,30,0)'); x.fillStyle = g; x.fillRect(sx, 0, 6 + Math.random() * 10, H); }   // rain streaks
  x.strokeStyle = 'rgba(255,255,255,.22)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(W / 2, 0); x.lineTo(W / 2, H); x.stroke(); x.strokeStyle = 'rgba(0,0,0,.12)'; x.beginPath(); x.moveTo(W / 2 + 2, 0); x.lineTo(W / 2 + 2, H); x.stroke();   // fold
  if (Math.random() < 0.5) { x.globalCompositeOperation = 'destination-out'; x.beginPath(); const c = Math.random() < 0.5 ? 0 : W, d = Math.random() < 0.5 ? 0 : H, s = 14 + Math.random() * 30; x.moveTo(c, d); x.lineTo(c + (c ? -s : s), d); x.lineTo(c, d + (d ? -s * 1.4 : s * 1.4)); x.closePath(); x.fill(); }      // torn corner
  x.restore();
}
export function atlas(list, cw, ch, cols, wk) {
  const rows = Math.ceil(list.length / cols), c = document.createElement('canvas'); c.width = cw * cols; c.height = ch * rows; const x = c.getContext('2d');
  list.forEach((f, i) => { const cx = (i % cols) * cw, cy = Math.floor(i / cols) * ch; x.save(); x.translate(cx, cy); x.beginPath(); x.rect(0, 0, cw, ch); x.clip(); f(x); weather(x, cw, ch, wk); x.restore(); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; return { tex: t, cols, rows, n: list.length };
}
export function atlasMat(a, rough) {
  const m = new THREE.MeshStandardMaterial({ map: a.tex, alphaTest: 0.5, roughness: rough, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => { sh.vertexShader = 'attribute float aRow;\n' + sh.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>\n { float col = mod(aRow, ${a.cols}.0), row = floor(aRow / ${a.cols}.0); vMapUv = (vMapUv + vec2(col, ${a.rows - 1}.0 - row)) / vec2(${a.cols}.0, ${a.rows}.0); }\n #ifdef USE_EMISSIVEMAP\n vEmissiveMapUv = vMapUv;\n #endif`); };
  m.customProgramCacheKey = () => `atlas-${a.cols}x${a.rows}-${a.n}`; return m;
}
export function tiledAttr(world, geo, mat, items) {
  const T = 180, groups = new Map(); for (const it of items) { const k = Math.floor(it.x / T) * 1000 + Math.floor(it.z / T); (groups.get(k) || groups.set(k, []).get(k)).push(it); }
  for (const list of groups.values()) {
    const g2 = geo.clone(); g2.setAttribute('aRow', new THREE.InstancedBufferAttribute(Float32Array.from(list.map(i => i.row)), 1));
    const im = new THREE.InstancedMesh(g2, mat, list.length); list.forEach((it, i) => im.setMatrixAt(i, it.m)); im.computeBoundingSphere(); im.castShadow = false; im.receiveShadow = false; world.scene.add(im);
  }
}
const M4 = (p, ry, sx, sy, rz = 0) => new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, rz, 'YXZ')), new THREE.Vector3(sx, sy, 1));
const walk = (pts, step, fn) => { let carry = rr(0, step); for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az); if (L < 0.01) continue; const dx = (bx - ax) / L, dz = (bz - az) / L; let t = carry; for (; t < L; t += step) fn(ax + dx * t, az + dz * t, dx, dz); carry = t - L; } };

/** Called once the buildings and poles exist. */
export function buildPosters(world) {
  seed = 4242;
  const P = atlas(POSTERS, PW, PH, 4, 1), B = atlas(BANNERS, BW, BH, 1, 1.2);
  const pm = atlasMat(P, 0.9), bm = atlasMat(B, 0.5), quad = new THREE.PlaneGeometry(1, 1);
  const poster = [], banner = [];
  const loc = (b, lx, ly, lz) => { const cs = Math.cos(b.rot), sn = Math.sin(b.rot); return new THREE.Vector3(b.x + lx * cs + lz * sn, ly, b.z - lx * sn + lz * cs); };
  // 1. wall posters on house fronts, shop side walls, and compound walls; vinyl flex across multi-storey shop fronts
  for (const b of world.buildings || []) {
    if (rnd() < (b.shop ? 0.5 : 0.35)) {                                                             // front face, low on the wall, pasted in a clump of 1-3
      const n = 1 + Math.floor(rnd() * 3); let lx = rr(-b.fw * 0.3, b.fw * 0.3);
      for (let i = 0; i < n; i++) { const w = rr(0.55, 0.85), h = w * 1.5, ly = b.shop ? rr(3.6, 4.4) : rr(0.9, 1.6); if (b.shop && b.floors < 2) break; poster.push({ x: b.x, z: b.z, row: Math.floor(rnd() * P.n), m: M4(loc(b, lx, ly + h / 2, b.dd / 2 + 0.05), b.rot, w, h, rr(-0.04, 0.04)) }); lx += w * 1.05; }
    }
    if (rnd() < 0.3) { const s = rnd() < 0.5 ? 1 : -1, w = rr(0.6, 0.9), h = w * 1.5; poster.push({ x: b.x, z: b.z, row: Math.floor(rnd() * P.n), m: M4(loc(b, s * (b.fw / 2 + 0.05), rr(1.3, 2.2) + h / 2, rr(-b.dd * 0.3, b.dd * 0.3)), b.rot + s * Math.PI / 2, w, h) }); }
    if (b.shop && b.floors >= 2 && rnd() < 0.4) { const bw = b.fw * 0.92, bh = bw / (BW / BH); banner.push({ x: b.x, z: b.z, row: Math.floor(rnd() * B.n), m: M4(loc(b, 0, b.floors * 3.2 - 0.9 - bh / 2, b.dd / 2 + 0.22), b.rot, bw, bh) }); }
  }
  // 2. vertical flex banners on the electric poles beside main roads (placed by infra.js)
  for (const p of world.poleSpots || []) if (p.w >= 9 && rnd() < 0.3) {
    const bw = 1.0, bh = 1.9, sgn = rnd() < 0.5 ? 1 : -1;
    poster.push({ x: p.x, z: p.z, row: Math.floor(rnd() * P.n), m: M4(new THREE.Vector3(p.x, 4.3 + bh / 2, p.z), p.r + Math.PI / 2, bw * 0.9, bh) });
    if (rnd() < 0.5) poster.push({ x: p.x, z: p.z, row: Math.floor(rnd() * P.n), m: M4(new THREE.Vector3(p.x + Math.cos(p.r) * 0.0, 2.3 + 0.9, p.z), p.r + Math.PI / 2, 0.8, 1.2) });
  }
  // 3. festival / welcome banners hung across the road between two verge poles, plus bunting; and 4. free-standing hoardings
  const poles = [], flags = [], hoard = [], ropes = [], bspots = [];
  for (const rd of world.map.roads) if (rd.w >= 9) {
    walk(rd.pts, 300, (x, z, dx, dz) => {
      const o = rd.w / 2 + 1.1, ax = x - dz * o, az = z + dx * o, bx = x + dz * o, bz = z - dx * o;
      if (![[ax, az], [bx, bz]].every(([px, pz]) => world.roadClearance(px, pz, 0) > 0.3 && !world.blocked(px, pz, 0.8) && !world.inWater(px, pz)) || world.groundH(x, z) > 1) return;
      if (rd.pts.length < 3) return;
      const len = rd.w + 2.2, bh = Math.min(1.6, len / 6), ry = Math.atan2(dx, dz), type = rnd();
      poles.push([ax, az], [bx, bz]);
      if (type < 0.55) { const g = new THREE.PlaneGeometry(len, bh, 14, 1); const pa = g.attributes.position; for (let i = 0; i < pa.count; i++) { const u = pa.getX(i) / len + 0.5; pa.setY(i, pa.getY(i) - Math.sin(Math.PI * u) * 0.35); } g.computeBoundingSphere(); const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: B.tex.clone(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5 })); const row = Math.floor(rnd() * B.n); mesh.material.map.needsUpdate = true; mesh.material.map.repeat.set(1, 1 / B.rows); mesh.material.map.offset.set(0, (B.rows - 1 - row) / B.rows); mesh.material.side = THREE.FrontSide; mesh.position.set(x, 5.6, z); mesh.rotation.y = Math.atan2(-dx, -dz); world.scene.add(mesh); const back = mesh.clone(); back.rotation.y += Math.PI; world.scene.add(back); bspots.push([x, z, dx, dz]); }
      else { for (let i = 0; i < 14; i++) { const u = (i + 0.5) / 14, px = ax + (bx - ax) * u, pz = az + (bz - az) * u, sag = Math.sin(Math.PI * u) * 0.5; flags.push({ x, z, m: new THREE.Matrix4().compose(new THREE.Vector3(px, 5.6 - sag - 0.2, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(dz, -dx), 0)), new THREE.Vector3(0.5, 0.5, 1)), c: new THREE.Color(pick(['#dc2626', '#facc15', '#2563eb', '#16a34a', '#f97316', '#ec4899', '#f8fafc'])) }); } ropes.push(ax, 5.6, az, bx, 5.6, bz); }
    });
    walk(rd.pts, 380, (x, z, dx, dz) => {
      const s = rnd() < 0.5 ? 1 : -1, off = rd.w / 2 + 4.2, hx = x - dz * off * s, hz = z + dx * off * s;
      if (world.roadClearance(hx, hz, 1.5) < 0.5 || world.blocked(hx, hz, 4) || world.inWater(hx, hz) || world.groundH(hx, hz) > 1) return;
      hoard.push({ x: hx, z: hz, row: Math.floor(rnd() * B.n), dx, dz, s });
    });
  }
  // build pole + flag + hoarding geometry
  const steel = new THREE.MeshStandardMaterial({ color: '#4b5563', roughness: 0.7, metalness: 0.4 });
  if (poles.length) { const pg = new THREE.CylinderGeometry(0.07, 0.09, 6.2, 6).translate(0, 3.1, 0), im = new THREE.InstancedMesh(pg, steel, poles.length); poles.forEach(([x, z], i) => im.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, 0, z))); im.computeBoundingSphere(); world.scene.add(im); poles.forEach(([x, z]) => world.addObs({ x, z, r: 0.2 })); }
  if (flags.length) { const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.35, 0, 0, 0.35, 0, 0, 0, -0.6, 0], 3)); tri.computeVertexNormals(); const fm = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 }); const im = new THREE.InstancedMesh(tri, fm, flags.length); flags.forEach((f, i) => { im.setMatrixAt(i, f.m); im.setColorAt(i, f.c); }); im.instanceColor.needsUpdate = true; im.computeBoundingSphere(); world.scene.add(im); const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(ropes, 3)); world.scene.add(new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: '#d6d3d1' }))); }
  for (const h of hoard) {
    const g = new THREE.Group(), W = 7.2, H = W / (BW / BH);
    g.position.set(h.x, 0, h.z); g.rotation.y = Math.atan2(h.dz * h.s, -h.dx * h.s);              // face normal points at the road
    const m = new THREE.MeshStandardMaterial({ map: B.tex.clone(), roughness: 0.5, side: THREE.DoubleSide }); m.map.needsUpdate = true; m.map.repeat.set(1, 1 / B.rows); m.map.offset.set(0, (B.rows - 1 - h.row) / B.rows);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(W, H), m); face.position.set(0, 5.4, 0.02); g.add(face);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(W + 0.3, H + 0.3, 0.2), steel); panel.position.set(0, 5.4, -0.1); g.add(panel);
    for (const sx of [-1, 1]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 6.6, 8), steel); pole.position.set(sx * (W / 2 - 0.5), 3.3, -0.2); g.add(pole); }
    world.scene.add(g); world.addObs({ x: h.x, z: h.z, r: 1.0 });
  }
  tiledAttr(world, quad, pm, poster); tiledAttr(world, quad, bm, banner);
  world.posterSpots = { hoard: hoard.map(h => [h.x, h.z, h.dx, h.dz]), across: bspots, bunting: ropes.length / 6, wall: poster.slice(0, 400).map(p => [p.x, p.z]) };
  return { posters: poster.length, banners: banner.length, acrossRoad: poles.length / 2, hoardings: hoard.length };
}
