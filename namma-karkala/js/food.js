// Tindi (tiffin) counters and street carts. Walk up, press F, pick a dish. Idli-sambar, medu vada, goli baje, masala dosa,
// neer dosa, Mangalore buns, filter coffee at the tiffin hotels; kori rotti, meals, pathrode, fish fry at the lunch homes.
import * as THREE from './three.module.min.js';
import * as M from './models.js';
import { Voice } from './voice.js';
import { LINES } from './story.js';

const { P, box, cyl, sph, cone, merge, MAT } = M;
const mk = (geo, mat = MAT.solid) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m; };
const $ = (id) => document.getElementById(id);

export const MENUS = {
  tiffin: { title: 'Tiffin', items: [
    { id: 'idli', en: 'Idli sambar (2)', kn: 'ಇಡ್ಲಿ ಸಾಂಬಾರ್', price: 30, hp: 15 },
    { id: 'vada', en: 'Medu vada (2)', kn: 'ಮೆಡು ವಡೆ', price: 30, hp: 14 },
    { id: 'goli', en: 'Goli baje', kn: 'ಗೋಳಿಬಜೆ', price: 30, hp: 14 },
    { id: 'dosa', en: 'Masala dosa', kn: 'ಮಸಾಲೆ ದೋಸೆ', price: 60, hp: 26 },
    { id: 'neer', en: 'Neer dosa and chutney', kn: 'ನೀರ್ ದೋಸೆ', price: 45, hp: 20 },
    { id: 'bun', en: 'Mangalore buns', kn: 'ಮಂಗಳೂರು ಬನ್ಸ್', price: 40, hp: 16 },
    { id: 'coffee', en: 'Filter coffee', kn: 'ಫಿಲ್ಟರ್ ಕಾಫಿ', price: 15, hp: 8 },
  ] },
  meals: { title: 'Lunch home', items: [
    { id: 'meals', en: 'Full meals (oota)', kn: 'ಊಟ', price: 90, hp: 40 },
    { id: 'kori', en: 'Kori rotti and chicken ghee roast', kn: 'ಕೋರಿ ರೊಟ್ಟಿ', price: 160, hp: 45 },
    { id: 'pathrode', en: 'Pathrode and chutney', kn: 'ಪತ್ರೊಡೆ', price: 50, hp: 20 },
    { id: 'fish', en: 'Bangude fish fry', kn: 'ಬಂಗುಡೆ ಫ್ರೈ', price: 130, hp: 35 },
    { id: 'pundi', en: 'Pundi and gassi', kn: 'ಪುಂಡಿ ಗಸಿ', price: 70, hp: 28 },
    { id: 'coffee', en: 'Filter coffee', kn: 'ಫಿಲ್ಟರ್ ಕಾಫಿ', price: 15, hp: 8 },
  ] },
  cart: { title: 'Street cart', items: [
    { id: 'goli', en: 'Goli baje', kn: 'ಗೋಳಿಬಜೆ', price: 30, hp: 14 },
    { id: 'bun', en: 'Mangalore buns', kn: 'ಮಂಗಳೂರು ಬನ್ಸ್', price: 40, hp: 16 },
    { id: 'coffee', en: 'Filter coffee', kn: 'ಫಿಲ್ಟರ್ ಕಾಫಿ', price: 15, hp: 8 },
    { id: 'tender', en: 'Tender coconut', kn: 'ಎಳನೀರು', price: 40, hp: 10 },
  ] },
};
const SHOPS = [['Hotel Gokul', 'tiffin'], ['Sri Manjunatha Cafeteria', 'tiffin'], ['Hotel Prakash', 'tiffin'], ['Hotel Manmatha', 'tiffin'], ['Hotel Balaji Inn, Karkala', 'tiffin'], ['jain hotel', 'tiffin'],
  ['Shree Durga Lunch Home', 'meals'], ['Hotel Taj Mahal', 'meals'], ['Appuroopa Nonveg Restaurant', 'meals']];
const CARTS = [['Karkala Bus Stand', 'cart', 9], ['Swaraj Maidan', 'cart', 12], ['Sri Venkataramana Temple', 'cart', 14], ['Aanekere', 'cart', 10]];

/* ------------------------------------------------------------- food models (small, merged) */
function dish(id, x, y, z) {
  const p = [];
  switch (id) {
    case 'idli': p.push(P(cyl(0.2, 0.2, 0.02, 14), '#cbd5e1', [x, y + 0.01, z])); for (const [dx, dz] of [[-0.07, 0.05], [0.08, 0.04], [0, -0.08]]) p.push(P(cyl(0.075, 0.09, 0.05, 10), '#fefce8', [x + dx, y + 0.045, z + dz])); p.push(P(cyl(0.06, 0.05, 0.05, 8), '#ea580c', [x + 0.17, y + 0.03, z - 0.14])); break;
    case 'vada': p.push(P(cyl(0.2, 0.2, 0.02, 14), '#cbd5e1', [x, y + 0.01, z])); for (const dx of [-0.08, 0.08]) { p.push(P(cyl(0.085, 0.085, 0.045, 10), '#a16207', [x + dx, y + 0.045, z])); p.push(P(cyl(0.03, 0.03, 0.05, 6), '#451a03', [x + dx, y + 0.05, z])); } break;
    case 'goli': for (const [dx, dy, dz] of [[-0.1, 0, 0], [0.1, 0, 0.02], [0, 0, -0.1], [0, 0.1, 0], [0.04, 0, 0.12]]) p.push(P(sph(0.075, 8, 6), '#d97706', [x + dx, y + 0.08 + dy, z + dz])); break;
    case 'dosa': p.push(P(cyl(0.22, 0.22, 0.02, 14), '#cbd5e1', [x, y + 0.01, z]), P(cyl(0.05, 0.075, 0.42, 8), '#e5a948', [x, y + 0.09, z], [0, 0, Math.PI / 2]), P(cyl(0.06, 0.06, 0.02, 8), '#facc15', [x + 0.21, y + 0.09, z], [0, 0, Math.PI / 2])); break;
    case 'neer': p.push(P(cyl(0.2, 0.2, 0.012, 16), '#fff7ed', [x, y + 0.02, z]), P(cyl(0.2, 0.2, 0.012, 16), '#fff7ed', [x + 0.02, y + 0.034, z + 0.02]), P(cyl(0.06, 0.05, 0.05, 8), '#fefce8', [x + 0.2, y + 0.03, z - 0.12])); break;
    case 'bun': for (const [dx, dz] of [[-0.08, 0], [0.08, 0.01], [0, -0.09]]) p.push(P(sph(0.09, 8, 6), '#a16207', [x + dx, y + 0.07, z + dz], [0, 0, 0], [1, 0.72, 1])); break;
    case 'coffee': p.push(P(cyl(0.11, 0.09, 0.03, 10), '#e5e7eb', [x, y + 0.015, z]), P(cyl(0.065, 0.055, 0.1, 10), '#e5e7eb', [x, y + 0.08, z]), P(cyl(0.055, 0.055, 0.01, 10), '#78350f', [x, y + 0.13, z])); break;
    default: p.push(P(cyl(0.2, 0.2, 0.02, 14), '#cbd5e1', [x, y + 0.01, z]), P(sph(0.12, 8, 6), '#fefce8', [x, y + 0.1, z], [0, 0, 0], [1, 0.6, 1]));
  }
  return p;
}
const SHOW = ['idli', 'vada', 'goli', 'dosa', 'neer', 'bun', 'coffee'];
function counterGeo(kind, roof) {
  const p = [P(box(2.7, 0.92, 1.0), '#7c4a21', [0, 0.46, 0]), P(box(2.8, 0.07, 1.1), '#d6d3d1', [0, 0.95, 0]), P(box(2.7, 0.2, 1.02), '#dc2626', [0, 0.6, 0.002])];
  // glass-fronted display with the dishes inside
  for (const x of [-1.3, 1.3]) for (const z of [-0.45, 0.45]) p.push(P(box(0.04, 0.55, 0.04), '#9ca3af', [x, 1.28, z]));
  p.push(P(box(2.7, 0.03, 1.0), '#bae6fd', [0, 1.57, 0]), P(box(2.7, 0.03, 1.0), '#cbd5e1', [0, 1.0, 0]));
  const list = kind === 'meals' ? ['idli', 'goli', 'bun', 'coffee', 'vada', 'dosa'] : kind === 'cart' ? ['goli', 'bun', 'coffee', 'goli', 'bun', 'coffee'] : SHOW;
  list.forEach((id, i) => p.push(...dish(id, -1.1 + i * (2.2 / Math.max(1, list.length - 1)), 1.01, 0.1)));
  // big steel sambar pot with a lid and a tawa with a flame, to one side
  p.push(P(cyl(0.3, 0.27, 0.4, 12), '#cbd5e1', [-0.95, 1.18, -0.5]), P(cyl(0.28, 0.28, 0.015, 12), '#ea580c', [-0.95, 1.38, -0.5]), P(cyl(0.34, 0.34, 0.03, 14), '#111827', [0.95, 1.02, -0.5]), P(sph(0.08, 6, 4), '#f97316', [0.95, 0.9, -0.5], [0, 0, 0], [1, 1.5, 1]));
  if (roof) { for (const [x, z] of [[-1.3, -0.5], [1.3, -0.5], [-1.3, 0.5], [1.3, 0.5]]) p.push(P(cyl(0.04, 0.04, 2.5, 6), '#57534e', [x, 1.25, z])); for (let i = 0; i < 8; i++) p.push(P(box(0.9, 0.04, 1.9), ['#dc2626', '#f8fafc'][i % 2], [-1.55 + i * 0.44, 2.6, 0], [0.18 * (i < 4 ? 1 : -1) * 0, 0, 0])); }
  return merge(p);
}
function steamTexture() { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t; }

export class Food {
  constructor(game) {
    this.g = game; this.stalls = []; this.open = null; this.callT = 4; this.steamTex = steamTexture();
    const w = game.world, scene = game.scene;
    const place = (poi, kind, off, label) => {
      const pt = w.pois[poi]; if (!pt) return;
      const rd = w.nearestRoad(pt[0], pt[1], 160); if (!rd) return;
      // stand on the roadside nearest the shop, facing the road
      let ox = -rd.dirz, oz = rd.dirx; const sgn = ((pt[0] - rd.x) * ox + (pt[1] - rd.z) * oz) >= 0 ? 1 : -1;
      for (const d of [off, off + 1.5, off + 3, off + 5]) for (const s of [sgn, -sgn]) {
        const x = rd.x + ox * s * (rd.w / 2 + d), z = rd.z + oz * s * (rd.w / 2 + d);
        if (w.blocked(x, z, 1.5) || w.inWater(x, z) || w.roadClearance(x, z) < 1.2) continue;
        const rot = Math.atan2(rd.x - x, rd.z - z), g = new THREE.Group(), cart = kind === 'cart';
        g.add(mk(counterGeo(kind, cart)));
        g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
        const name = label || poi, sign = M.signMesh([name.replace(/, Karkala$/, ''), kind === 'meals' ? 'ಊಟ · ಊಟ ಲಭ್ಯ' : kind === 'cart' ? 'ಗೋಳಿಬಜೆ · ಕಾಫಿ' : 'ತಿಂಡಿ · ಕಾಫಿ'], 2.7, 0.7, { bg: kind === 'meals' ? '#7c2d12' : kind === 'cart' ? '#166534' : '#b91c1c', fg: '#fde047', edge: '#fff', w: 768, h: 200 });
        sign.position.set(0, cart ? 3.0 : 2.15, -0.55); g.add(sign);
        const cook = M.person({ kind: 'shirt', shirt: '#f8fafc', pants: '#1f2937', cap: '#f8fafc' }); cook.position.set(0.2, 0, -1.0); cook.rotation.y = Math.PI; g.add(cook);
        const sp = []; for (let i = 0; i < 3; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.steamTex, transparent: true, depthWrite: false, opacity: 0 })); s.scale.set(0.5, 0.5, 1); g.add(s); sp.push(s); }
        w.addObs({ x, z, r: 1.5 });
        this.stalls.push({ x, z, rot, g, kind, name, cook, steam: sp, t: Math.random() * 6 }); return;
      }
    };
    for (const [poi, kind] of SHOPS) place(poi, kind, 2.4);
    for (const [poi, kind, off] of CARTS) place(poi, kind, off, 'Karkala ' + ({ 'Karkala Bus Stand': 'bus stand cart', 'Swaraj Maidan': 'maidan cart', 'Sri Venkataramana Temple': 'temple cart', Aanekere: 'kere-side cart' }[poi]));
    this.buildMenu();
  }
  buildMenu() {
    const el = document.createElement('div'); el.id = 'menu';
    el.innerHTML = '<div class="mh"></div><div class="ml"></div><div class="mf">Press a number to order · Esc to leave</div>';
    const css = document.createElement('style');
    css.textContent = '#menu{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:#1a0f0acc;border:2px solid #facc15;border-radius:14px;padding:16px 20px;min-width:340px;color:#fff7ed;z-index:30;display:none;backdrop-filter:blur(6px)} #menu.show{display:block} #menu .mh{font-weight:900;color:#facc15;letter-spacing:.1em;margin-bottom:8px} #menu .row{display:flex;gap:10px;align-items:baseline;padding:5px 0;border-bottom:1px solid #fff2} #menu .row b{background:#facc15;color:#1a0f0a;border-radius:6px;padding:0 7px} #menu .row span{flex:1} #menu .row i{opacity:.75;font-style:normal;font-size:12px} #menu .mf{margin-top:8px;font-size:12px;opacity:.7}';
    document.head.appendChild(css); document.body.appendChild(el); this.el = el;
  }
  nearest(p, r = 3.8) { let best = null, bd = r; for (const s of this.stalls) { const d = Math.hypot(s.x - p.x, s.z - p.z); if (d < bd) { bd = d; best = s; } } return best; }
  /** Called from the F key. Returns true when it handled the press. */
  interact() { if (this.g.car || this.g.dlg) return false; const s = this.nearest(this.g.player); if (!s) return false; this.show(s); return true; }
  show(s) {
    this.open = s; const m = MENUS[s.kind], lang = Voice.lang, en = lang === 'en';
    this.el.querySelector('.mh').textContent = (s.name + ' · ' + m.title).toUpperCase();
    this.el.querySelector('.ml').innerHTML = m.items.map((it, i) => `<div class="row"><b>${i + 1}</b><span>${en ? it.en : it.kn}</span><i>${en ? it.kn : it.en}</i><em>₹${it.price}</em></div>`).join('');
    this.el.classList.add('show');
  }
  close() { this.open = null; this.el.classList.remove('show'); }
  key(k) {
    if (!this.open) return false;
    if (k === 'escape' || k === 'f' || k === 'e') { this.close(); return true; }
    const n = parseInt(k, 10), it = MENUS[this.open.kind].items[n - 1]; if (!it) return true;
    const g = this.g;
    if (g.save.money < it.price) { g.toast('NOT ENOUGH', `${it.en} costs ₹${it.price}. Eat on credit? The owner says no.`); return true; }
    g.addMoney(-it.price); const before = g.player.hp; g.player.hp = Math.min(100, g.player.hp + it.hp);
    g.toast(Voice.lang === 'en' ? it.en.toUpperCase() : it.kn, `-₹${it.price} · +${Math.round(g.player.hp - before)} health. ${Voice.lang === 'en' ? 'Tastes like Karkala.' : 'ರುಚಿ ಕಾರ್ಕಳದ್ದು!'}`);
    g.audio.ring && g.audio.ring(); this.close(); return true;
  }
  update(dt) {
    const g = this.g, p = g.player, now = g.now;
    for (const s of this.stalls) {
      const d = Math.hypot(s.x - p.x, s.z - p.z); s.g.visible = d < 260; if (!s.g.visible) continue;
      s.t += dt; s.cook.rotation.z = Math.sin(s.t * 3) * 0.05; s.cook.position.y = Math.abs(Math.sin(s.t * 3)) * 0.015;
      s.steam.forEach((sp, i) => { const u = ((s.t * 0.5 + i / 3) % 1); sp.position.set(-0.95 + (i - 1) * 0.1 + Math.sin(u * 6 + i) * 0.08, 1.45 + u * 1.0, -0.5); sp.material.opacity = (1 - u) * 0.5 * (d < 40 ? 1 : 0); sp.scale.setScalar(0.35 + u * 0.7); });
    }
    const s = !g.car && !g.dlg && !g.cine.active ? this.nearest(p) : null;
    if (s && !this.open && !g.paused) { g.hint(`F · order at ${s.name}`, 0.25); this.callT -= dt; if (this.callT <= 0 && LINES.V01) { this.callT = 14 + Math.random() * 8; const id = g.chatter ? g.chatter.callIds[Math.floor(Math.random() * g.chatter.callIds.length)] : 'V01'; g.sayQ(id, 3); } }
    else if (!s && this.open) this.close();
  }
}
