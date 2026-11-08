// The game: rendering, camera, input, traffic, police, missions, jobs, weather, saving and the HUD.
import * as THREE from './three.module.min.js';
import { World, AREAS } from './world.js';
import { Vehicle, Ped, Cow, Player, wrap } from './actors.js';
import * as M from './models.js';
import { Audio } from './audio.js';
import { Cinematic } from './cine.js';
import { Voice, LANG_NAME } from './voice.js';
import { LINES } from './story.js';
import { Radio } from './radio.js';
import { Culture } from './culture.js';
import { Food } from './food.js';
import { Extras } from './extras.js';
import { People } from './people.js';
import { Chatter } from './chatter.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const $ = (id) => document.getElementById(id);
const SAVE_KEY = 'namma-karkala-v1';
const WANTED = ['', 'GOSSIP', 'FINE', 'JEEP CHASE', 'CHECKPOST', 'FRONT PAGE'];
const TIME_SCALE = 0.2;
const ISTMIN = () => { const d = new Date(); return (d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60 + 330) % 1440; };      // Karkala (IST) minutes since midnight
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
const Q_OUCH = ['Q01', 'Q02', 'Q03', 'Q04', 'Q05', 'Q06'];
const Q_HIJACK = ['Q07', 'Q08', 'Q09'];
const SPK = { RAJU: ['Raju', '#38bdf8'], AMMA: ['Amma · on the phone', '#f472b6'], AJJI: ['Ajji', '#fb923c'], ARCHAKARU: ['Archakaru', '#fbbf24'], PRAMOD: ['Pramod', '#4ade80'],
  OWNER: ['Hotel owner', '#f87171'], CANTEEN: ['Canteen Anna', '#a78bfa'], SHWETHA: ['Shwetha', '#f0abfc'], THIEF: ['Thief', '#cbd5e1'], NARRATOR: ['', '#fde047'] };
const S = (id) => ({ id });
const Q_COW = ['Q10', 'Q11'];

export class Game {
  constructor(map, onProgress) {
    this.map = map; this.audio = new Audio(); this.now = 0; this.keys = new Set(); this.cheats = {}; this.paused = false; this.photo = false;
    const R = this.renderer = new THREE.WebGLRenderer({ canvas: $('view'), antialias: true, powerPreference: 'high-performance' });
    R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25)); R.setSize(innerWidth, innerHeight);
    R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFShadowMap; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
    R.outputColorSpace = THREE.SRGBColorSpace;
    const S = this.scene = new THREE.Scene();
    S.fog = new THREE.Fog('#c9d8e6', 140, 560);
    this.cam = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.3, 900);
    this.hemi = new THREE.HemisphereLight('#cfe4ff', '#5b6b3a', 0.9); S.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight('#fff1d6', 2.2); sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536); Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 400 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
    S.add(sun); S.add(sun.target);
    this.torch = new THREE.PointLight('#ffe2b0', 0, 22, 1.6); S.add(this.torch);
    this.headlight = new THREE.SpotLight('#fff3cc', 0, 70, 0.55, 0.5, 1.2); S.add(this.headlight); S.add(this.headlight.target);
    this.makeSky(); this.makeRain();
    this.vehicles = []; this.peds = []; this.cows = []; this.police = [];
  }
  async init(onProgress) {
    const S = this.scene, R = this.renderer, map = this.map;
    this.world = new World(S, map); await this.world.build(onProgress);
    this.heat = 0; this.lastOffence = -99; this.bustT = 0;
    this.load();
    const st = this.world.busStand;
    const start = this.save.pos || (st ? [st.x - Math.cos(st.rot) * 27 - st.n[0] * 1, st.z + Math.sin(st.rot) * 27 - st.n[1] * 1] : [150, 38]);
    this.player = new Player(this, start[0], start[1]); this.car = null;
    this.camYaw = st ? Math.atan2(-st.n[0], -st.n[1]) : 0; this.camPitch = 0.28; this.camDist = 5.5; this.lastMouse = -99;
    this.marker = M.markerMesh('#facc15'); this.marker.visible = false; S.add(this.marker);
    this.startMarker = M.markerMesh('#f97316'); this.startMarker.visible = false; S.add(this.startMarker);
    this.cine = new Cinematic(this); this.radio = new Radio(this); this.npcs = {}; this.dlg = null; this.inputLock = false; Voice.init(this.audio);
    this.setupParked(); this.setupMissions(); this.setupNpcs(); this.culture = new Culture(this); this.chatter = new Chatter(this); this.food = new Food(this); try { this.extras = new Extras(this); } catch (e) { console.warn('extras', e); this.extras = { update() {}, interact() { return false; }, clip() {} }; }
    this.bindInput(); this.hudInit();
    this.clock = new THREE.Clock(); const loop = () => { requestAnimationFrame(loop); this.frame(); }; loop();
    addEventListener('resize', () => { R.setSize(innerWidth, innerHeight); this.cam.aspect = innerWidth / innerHeight; this.cam.updateProjectionMatrix(); });
  }

  /* ====================================================================== setup */
  makeSky() {
    const g = new THREE.SphereGeometry(800, 32, 16);
    this.skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color('#5aa0e6') }, bot: { value: new THREE.Color('#d8e6f0') }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color('#fff3c4') }, night: { value: 0 },
        uTime: { value: 0 }, cover: { value: 0.45 }, cloudCol: { value: new THREE.Color('#ffffff') } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `uniform vec3 top, bot, sunCol, sunDir, cloudCol; uniform float night, uTime, cover; varying vec3 vP;
        float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164)))*43758.5453); }
        float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
        float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++){ v += a*n2(p); p = p*2.03 + 17.; a *= .5; } return v; }
        void main(){ float y = clamp(vP.y,0.,1.); vec3 c = mix(bot, top, pow(y, .55));
          float s = max(dot(vP, normalize(sunDir)), 0.); c += sunCol * (pow(s, 900.)*3. + pow(s, 12.)*.35);
          vec3 q = floor(vP*240.); float st = step(.9965, h(q)) * night * smoothstep(.05,.4,y) * (1. - cover); c += vec3(st);
          vec2 uv = vP.xz / (vP.y + .18) * 1.6 + vec2(uTime * .006, uTime * .002);
          float cl = smoothstep(1. - cover - .15, 1. - cover + .25, fbm(uv)) * smoothstep(.0, .2, vP.y);
          vec3 cc = cloudCol * (0.75 + 0.35 * fbm(uv * 2. + 3.)) + sunCol * pow(s, 6.) * .4;
          c = mix(c, cc, cl * .92);
          gl_FragColor = vec4(c, 1.); }` });
    this.sky = new THREE.Mesh(g, this.skyMat); this.sky.renderOrder = -1; this.scene.add(this.sky);
  }
  makeRain() {
    const n = 4000, pos = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) { const x = rnd(-40, 40), y = rnd(0, 30), z = rnd(-40, 40); pos.set([x, y, z, x + 0.05, y - 0.9, z + 0.05], i * 6); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rain = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#a9c3d8', transparent: true, opacity: 0.55 })); this.rain.visible = false; this.rain.frustumCulled = false; this.scene.add(this.rain);
    this.raining = 0; this.rainOn = false; this.wxT = 300;      // the first few minutes of a morning are dry
  }
  setupParked() {
    const w = this.world, st = w.busStand;
    if (st) {
      const along = [Math.cos(st.rot), -Math.sin(st.rot)], h = Math.atan2(along[0], along[1]);
      [-14, 0, 14].forEach((k, i) => { const x = st.x + along[0] * k - st.n[0] * 7.5, z = st.z + along[1] * k - st.n[1] * 7.5;
        const b = new Vehicle(this, 'bus', x, z, h, i === 1 ? { name: 'SRI DURGA', cols: ['#dc2626', '#facc15'], tag: 'pramod' } : {}); this.vehicles.push(b); b.parked = true; });
      for (let i = 0; i < 3; i++) { const x = st.x + along[0] * (28 + i * 3.2) - st.n[0] * 3, z = st.z + along[1] * (28 + i * 3.2) - st.n[1] * 3; const a = new Vehicle(this, 'auto', x, z, h + Math.PI / 2); a.parked = true; this.vehicles.push(a); }
    }
    const gm = w.pois['Gandhi Maidan'] || [-234, -12], rd = w.nearestRoad(gm[0], gm[1], 120);
    if (rd) { const s = new Vehicle(this, 'scooter', rd.x - rd.dirz * (rd.w / 2 + 0.8), rd.z + rd.dirx * (rd.w / 2 + 0.8), Math.atan2(rd.dirx, rd.dirz), { color: '#b91c1c', tag: 'ajja' }); s.parked = true; this.vehicles.push(s); this.ajja = s; }
    // scattered parked two-wheelers and cars
    const nodes = w.bigNodes.length ? w.bigNodes : w.nodes;
    for (let i = 0; i < 40; i++) {
      const n = pick(nodes), e = pick(n.adj), dx = e.n.x - n.x, dz = e.n.z - n.z, L = Math.hypot(dx, dz) || 1, t = rnd(0.3, 0.7), s = Math.random() < 0.5 ? 1 : -1;
      const x = n.x + dx * t + (-dz / L) * (e.w / 2 + 1) * s, z = n.z + dz * t + (dx / L) * (e.w / 2 + 1) * s;
      if (w.blocked(x, z, 1)) continue;
      const v = new Vehicle(this, pick(['scooter', 'scooty', 'moped', 'bike', 'sportbike', 'car', 'hatch', 'sedan', 'taxi', 'auto', 'cycle', 'omni', 'suv', 'pickup', 'minitruck']), x, z, Math.atan2(dx, dz)); v.parked = true; this.vehicles.push(v);
    }
  }

  /* ====================================================================== input */
  bindInput() {
    const cv = $('view');
    addEventListener('keydown', (e) => {
      if (!this.started && !this.cine.active) return;
      const k = e.key.toLowerCase(); this.audio.resume();
      if (this.cine.active) { if (k === ' ' || k === 'escape' || k === 'enter') { e.preventDefault(); this.cine.stop(false); } return; }
      if (this.food && this.food.open) { e.preventDefault(); this.food.key(k); return; }
      if (this.dlg) { if (k === ' ' || k === 'enter' || k === 'f' || k === 'e') { e.preventDefault(); this.advanceTalk(); } else if (k === 'escape') this.skipTalk(); return; }
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(k);
      if (k.length === 1 && /[a-z]/.test(k)) this.cheat(k);
      if (k === 'escape') { if (this.photo) this.togglePhoto(); else if ($('bigmap').classList.contains('show')) this.toggleMap(); else this.togglePause(); return; }
      if (this.paused) return;
      if (k === 'f' || k === 'e') this.interact();
      if (k === 'h') { const kind = this.car ? this.car.kind : 'scooter'; this.audio.horn(kind); this.honked(this.car || this.player); if (this.car) this.chatter.horn(); }
      if (k === 'r') this.radio.next();
      if (k === 'm') this.toggleMap();
      if (k === 'o') this.togglePhoto();
      if (k === 'b') this.extras.clip();
      if (k === 'enter' && this.photo) this.savePhoto();
      if (k === 'j') this.toggleJob();
      if (k === 'c') this.camDist = this.camDist * 1.35 > 22 ? (this.car ? this.car.def.cam : 5.5) : this.camDist * 1.35;
    });
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => this.keys.clear());
    addEventListener('mousedown', (e) => { if (this.dlg && !e.target.closest('button')) this.advanceTalk(); });
    // Mouse look defaults to click-and-drag so the cursor is never trapped. Pointer lock is opt-in (pause menu) and always gives a way out.
    try { this.mouseLock = localStorage.getItem('nk-mlock') === '1'; } catch (e) { this.mouseLock = false; }
    cv.addEventListener('click', () => { if (this.mouseLock && this.started && !this.paused && document.pointerLockElement !== cv) cv.requestPointerLock?.(); });
    document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement !== cv && this.started && !this.paused && this.mouseLock && !this.photo && !this.cine.active) this.togglePause(); });   // Esc frees the cursor -> show the menu
    const freeMouse = () => { if (document.pointerLockElement) document.exitPointerLock?.(); };
    addEventListener('blur', freeMouse); document.addEventListener('visibilitychange', () => { if (document.hidden) freeMouse(); });
    $('menubtn').onclick = (e) => { e.stopPropagation(); freeMouse(); if (!this.paused) this.togglePause(); };
    const ML = () => { $('mlock').textContent = this.mouseLock ? 'Mouse: locked (Esc frees it)' : 'Mouse: drag to look'; };
    $('mlock').onclick = () => { this.mouseLock = !this.mouseLock; try { localStorage.setItem('nk-mlock', this.mouseLock ? '1' : '0'); } catch (e) { } if (!this.mouseLock) freeMouse(); ML(); }; ML();
    addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== cv && !(e.buttons & 1)) return;
      this.camYaw -= e.movementX * 0.0028; this.camPitch = clamp(this.camPitch + e.movementY * 0.0022, -0.25, 1.25); this.lastMouse = this.now;
    });
    addEventListener('wheel', (e) => { if (this.started) this.camDist = clamp(this.camDist * (e.deltaY > 0 ? 1.1 : 0.9), 3, 30); }, { passive: true });
    $('resume').onclick = () => this.togglePause();
    $('music').onclick = () => { this.audio.setMusic(!this.audio.musicOn); $('music').textContent = this.audio.musicOn ? 'Music: on' : 'Music: off'; };
    $('voices').onclick = () => { Voice.enabled = !Voice.enabled; if (!Voice.enabled) Voice.stop(); $('voices').textContent = Voice.enabled ? 'Voices: on' : 'Voices: off'; };
    try { this.live = localStorage.getItem('nk-live') === '1'; } catch (e) { this.live = false; } $('timemode').textContent = this.live ? 'Time: Karkala live' : 'Time: game clock (morning)';
    $('timemode').onclick = () => { this.live = !this.live; this.cheatWeather = !this.live ? this.cheatWeather : false; try { localStorage.setItem('nk-live', this.live ? '1' : '0'); } catch (e) { } $('timemode').textContent = this.live ? 'Time: Karkala live' : 'Time: game clock (morning)'; this.toast(this.live ? 'LIVE' : 'GAME CLOCK', this.live ? 'Time and weather follow Karkala now.' : 'A game day takes two real hours. Type SANJE for evening, IRULU for night.'); };
    const GN = ['Graphics: auto', 'Graphics: low', 'Graphics: lowest']; try { this.gfx = parseInt(localStorage.getItem('nk-gfx') || '0', 10) || 0; } catch (e) { this.gfx = 0; } if (new URLSearchParams(location.search).has('low')) this.gfx = 1; $('gfx').textContent = GN[this.gfx]; if (this.gfx) this.setGraphics(this.gfx);
    $('gfx').onclick = () => { this.setGraphics((this.gfx + 1) % 3); $('gfx').textContent = GN[this.gfx]; };
    let vox = true; try { vox = localStorage.getItem('nk-vocals') !== '0'; } catch (e) { } this.audio.setVocals(vox); $('vocals').textContent = vox ? 'Song vocals: on' : 'Song vocals: off';
    $('vocals').onclick = () => { const on = !this.audio.vocalsOn; this.audio.setVocals(on); try { localStorage.setItem('nk-vocals', on ? '1' : '0'); } catch (e) { } $('vocals').textContent = on ? 'Song vocals: on' : 'Song vocals: off'; };
    $('lang').onclick = () => { Voice.nextLang(); $('lang').textContent = 'Voice: ' + LANG_NAME[Voice.lang]; };
    $('lang').textContent = 'Voice: ' + LANG_NAME[Voice.lang];
    $('replay').onclick = () => { this.togglePause(); this.playTrailer(); };
    $('mute').onclick = () => { this.audio.setMuted(this.audio.on); $('mute').textContent = this.audio.on ? 'Sound: on' : 'Sound: off'; };
    $('reset').onclick = () => { if (confirm('Delete your Karkala progress and start again?')) { localStorage.removeItem(SAVE_KEY); location.reload(); } };
    $('photoSave').onclick = () => this.savePhoto();
  }
  input() {
    if (this.inputLock || this.dlg) return { x: 0, y: 0, run: false, jump: false, hand: true, boost: false };
    const k = this.keys, x = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0), y = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
    return { x, y, run: k.has('shift'), jump: k.has(' '), hand: k.has(' '), boost: k.has('shift') };
  }
  cheat(ch) {
    this.cbuf = ((this.cbuf || '') + ch).slice(-12);
    const C = {
      barsa: ['Heavy rain (barsa!)', () => { this.cheatWeather = true; this.rainOn = true; this.rainMax = 1; }], surya: ['Clear skies', () => { this.cheatWeather = true; this.rainOn = false; }],
      live: ['Back to real Karkala time and weather', () => { this.live = true; this.cheatWeather = false; $('timemode').textContent = 'Time: Karkala live'; }], sanje: ['Evening (shows start)', () => { this.live = false; this.time = 17.5 * 60; $('timemode').textContent = 'Time: game clock'; }],
      irulu: ['Night falls', () => { this.live = false; this.time = 22 * 60; $('timemode').textContent = 'Time: game clock'; }], belaku: ['Morning light', () => { this.live = false; this.time = 7 * 60; $('timemode').textContent = 'Time: game clock'; }],
      paisa: ['+₹10,000 (not real, sadly)', () => { this.addMoney(10000, true); }], policeilla: ['Police forgot about you', () => { this.heat = 0; }],
      golibaje: ['Full health. Goli baje fixes everything.', () => { this.player.hp = 100; }], bahubali: ['Bahubali jump', () => { this.cheats.moon = !this.cheats.moon; }],
      busbeku: ['A bus appears', () => this.spawnNear('bus')], autobeku: ['Pom pom! An auto', () => this.spawnNear('auto')], bullet: ['A motorbike', () => this.spawnNear('bike')],
      lorry: ['HORN OK PLEASE', () => this.spawnNear('lorry')], tractor: ['A tractor', () => this.spawnNear('tractor')], ambulance: ['108 is here', () => this.spawnNear('ambulance')], cycle: ['A bicycle', () => this.spawnNear('cycle')], ksrtc: ['A state bus', () => this.spawnNear('ksrtc')], scooty: ['A scooty', () => this.spawnNear('scooty')], taxi: ['An Ambassador taxi', () => this.spawnNear('taxi')], pickup: ['A pickup', () => this.spawnNear('pickup')], sedan: ['A sedan', () => this.spawnNear('sedan')], hatch: ['A hatchback', () => this.spawnNear('hatch')], moped: ['A moped', () => this.spawnNear('moped')], sportbike: ['A sports bike', () => this.spawnNear('sportbike')], minitruck: ['A mini truck', () => this.spawnNear('minitruck')],
      jorr: ['Super sprint', () => { this.cheats.fast = !this.cheats.fast; }],
    };
    for (const [code, [msg, fn]] of Object.entries(C)) if (this.cbuf.endsWith(code)) { fn(); this.toast('CHEAT', msg); this.cbuf = ''; this.save.cheated = true; this.audio.coin(); }
  }
  spawnNear(kind) {
    const p = this.player, f = this.camYaw, x = p.x + Math.sin(f) * 8, z = p.z + Math.cos(f) * 8;
    const v = new Vehicle(this, kind, x, z, f + Math.PI / 2); v.parked = true; this.vehicles.push(v);
  }

  /* ====================================================================== vehicles in/out */
  interact() {
    const p = this.player;
    if (this.food.interact()) return;
    if (this.extras.interact()) return;
    if (this.car) { if (Math.abs(this.car.v) > 6) { this.hint('Slow down to get off', 1.5); return; } this.exitVehicle(); return; }
    this.enterNearest();
  }
  exitVehicle() {
    const p = this.player, c = this.car; if (!c) return;
    {
      const lx = -Math.cos(c.h) * (c.def.W / 2 + 0.9), lz = Math.sin(c.h) * (c.def.W / 2 + 0.9);
      let x = c.x + lx, z = c.z + lz; if (this.world.blocked(x, z, 0.4)) { x = c.x - lx; z = c.z - lz; }
      p.x = x; p.z = z; p.y = this.world.groundH(x, z); p.mesh.visible = true; c.driver = null; c.parked = true; c.removeDriverModel(); this.car = null; this.radio.stop(); this.camDist = 5.5; this.audio.engine(null); this.sinking = 0; c.sink = 0;
    }
  }
  enterNearest() {
    const p = this.player;
    let best = null, bd = 1e9;
    for (const v of this.vehicles) { const d = Math.hypot(v.x - p.x, v.z - p.z) - v.def.L / 2; if (d < 2.6 && d < bd) { bd = d; best = v; } }
    if (!best) return;
    if (best.driver === 'ai' || best.driver === 'police' || best.driver === 'thief') {
      if (best.driver === 'thief') return;
      const ped = new Ped(this, best.x - Math.cos(best.h) * 2, best.z + Math.sin(best.h) * 2); ped.state = 'flee'; this.peds.push(ped);
      this.sayQ(pick(Q_HIJACK), 2.5); this.offence(best.driver === 'police' ? 2.2 : 1.1);
      if (best.police) this.police = this.police.filter(v => v !== best);
    }
    best.driver = 'player'; best.parked = false; best.removeDriverModel(); this.car = best; this.camDist = best.def.cam;
    p.mesh.visible = false; if (best.def.two || best.def.open) best.addDriverModel(true);
    this.camYaw = best.h; this.radio.start(best.kind);
  }

  /* ====================================================================== traffic, people, cows, police */
  populate() {
    const p = this.carOrPlayer(), w = this.world;
    for (const list of [this.vehicles, this.peds, this.cows]) for (let i = list.length - 1; i >= 0; i--) {
      const o = list[i], d = Math.hypot(o.x - p.x, o.z - p.z);
      if (o === this.car || o.tag || o.keep || (o.driver === 'police' && this.heat >= 2)) continue;
      if (d > (o.parked ? 650 : 470)) { o.dispose(); list.splice(i, 1); if (o.driver === 'police' && this.police) this.police = this.police.filter(v => v !== o); }
    }
    const traffic = this.vehicles.filter(v => v.driver === 'ai').length;
    if (traffic < 56) {
      const near = w.nodesNear(p.x, p.z, 380).filter(n => Math.hypot(n.x - p.x, n.z - p.z) > 110 && n.adj.length);
      for (let k = 0; k < 6 && near.length; k++) {
        const n = pick(near), e = pick(n.adj); if (e.w < 6 && Math.random() < 0.6) continue;
        const kind = e.w >= 9 ? pick(['scooter', 'scooty', 'scooty', 'moped', 'bike', 'bike', 'sportbike', 'auto', 'auto', 'auto', 'car', 'hatch', 'hatch', 'sedan', 'taxi', 'suv', 'omni', 'pickup', 'minitruck', 'bus', 'bus', 'ksrtc', 'schoolbus', 'tempo', 'lorry', 'tanker', 'tractor', 'cycle', 'ambulance'])
          : pick(['scooter', 'scooty', 'moped', 'bike', 'cycle', 'auto', 'car', 'hatch', 'taxi', 'omni', 'minitruck', 'tractor']);
        const h = Math.atan2(e.n.x - n.x, e.n.z - n.z), L = Math.hypot(e.n.x - n.x, e.n.z - n.z) || 1, lo = e.w / 4 + 0.2;
        const x = n.x + ((e.n.z - n.z) / L) * lo, z = n.z - ((e.n.x - n.x) / L) * lo;
        if (this.vehicles.some(v => Math.hypot(v.x - x, v.z - z) < 12)) continue;
        const v = new Vehicle(this, kind, x, z, h, { driver: 'ai' }); v.aiInit(n, e.n); this.vehicles.push(v);
      }
    }
    if (this.peds.filter(q => !q.idle).length < 56) {
      const near = w.nodesNear(p.x, p.z, 220).filter(n => Math.hypot(n.x - p.x, n.z - p.z) > 50);
      for (let k = 0; k < 4 && near.length; k++) {
        const n = pick(near), e = pick(n.adj), L = Math.hypot(e.n.x - n.x, e.n.z - n.z) || 1, s = Math.random() < 0.5 ? 1 : -1, o = e.w / 2 + 1.4;
        const t = Math.random(), x = n.x + (e.n.x - n.x) * t + ((e.n.z - n.z) / L) * o * s, z = n.z + (e.n.z - n.z) * t - ((e.n.x - n.x) / L) * o * s;
        if (w.blocked(x, z, 0.4) || w.inWater(x, z)) continue;
        const q = new Ped(this, x, z); q.side = s; q.pathInit(n, e.n); this.peds.push(q);
      }
    }
    if (this.cows.length < 7) {
      const near = w.nodesNear(p.x, p.z, 300).filter(n => Math.hypot(n.x - p.x, n.z - p.z) > 90);
      if (near.length) { const n = pick(near); this.cows.push(new Cow(this, n.x + rnd(-3, 3), n.z + rnd(-3, 3))); }
    }
  }
  carOrPlayer() { return this.car || this.player; }
  /** Distance to the nearest thing in front of vehicle v inside its lane, or 0. */
  obstacleAhead(v, dist) {
    const fx = v.fx, fz = v.fz, lx = fz, lz = -fx; let best = 0;
    const test = (x, z, r) => { const rx = x - v.x, rz = z - v.z; if (Math.abs(rx) > dist + 6 || Math.abs(rz) > dist + 6) return; const a = rx * fx + rz * fz; if (a < v.def.L / 2 - 0.5 || a > dist + v.def.L / 2) return; const lat = Math.abs(rx * lx + rz * lz); if (lat < v.def.W / 2 + r + 0.5) { const d = a - v.def.L / 2; if (!best || d < best) best = d; } };
    for (const o of this.vehicles) if (o !== v) test(o.x, o.z, o.r);
    for (const c of this.cows) test(c.x, c.z, 0.9);
    for (const q of this.peds) if (q.state !== 'down') test(q.x, q.z, 0.4);
    if (!this.car) test(this.player.x, this.player.z, 0.5);
    return best ? Math.max(0.01, best) : 0;
  }
  honked(src) {
    for (const q of this.peds) if (q.state === 'walk' && Math.hypot(q.x - src.x, q.z - src.z) < 14) { q.dodge = 1.2; q.h += Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1); }
    if (src === this.car || src === this.player) for (const c of this.cows) if (Math.hypot(c.x - src.x, c.z - src.z) < 16 && Math.random() < 0.15) this.say('The cow heard you. The cow does not care.', 2.2);
  }
  shout(ped) { if (Math.hypot(ped.x - this.player.x, ped.z - this.player.z) < 40) { if (Math.random() < 0.65) this.chatter.rage('hit', ped); else this.sayQ(pick(Q_OUCH), 2.2); } }
  offence(n) { this.heat = Math.min(5.99, this.heat + n); this.lastOffence = this.now; }
  onCrash(me, other) {
    if (other.driver === 'police') this.offence(1.2); else if (other.driver === 'ai' && Math.abs(me.v) > 9) this.offence(0.35);
    if (other.driver === 'ai' && me === this.car && Math.abs(me.v) > 4) this.chatter.rage('hit', other);
    this.audio.thud(Math.abs(me.v)); this.shake = 0.35;
  }
  get level() { return Math.min(5, Math.floor(this.heat)); }
  updatePolice(dt) {
    this.police = (this.police || []).filter(v => this.vehicles.includes(v));
    const lvl = this.level, want = lvl >= 2 ? Math.min(4, lvl - 1) : 0, p = this.carOrPlayer();
    if (this.police.length < want && this.now - (this.lastCop || 0) > 4) {
      const near = this.world.nodesNear(p.x, p.z, 260).filter(n => { const d = Math.hypot(n.x - p.x, n.z - p.z); return d > 120 && n.adj.some(e => e.w >= 6); });
      if (near.length) { const n = pick(near); const v = new Vehicle(this, 'jeep', n.x, n.z, Math.atan2(p.x - n.x, p.z - n.z), { driver: 'police' }); v.police = true; this.vehicles.push(v); this.police.push(v); this.lastCop = this.now; }
    }
    let close = 1e9;
    for (const v of this.police) {
      const d = Math.hypot(v.x - p.x, v.z - p.z); close = Math.min(close, d);
      if (lvl >= 2) {
        v.siren = true;
        if (d > 45) {                                              // chase along the roads, like traffic but faster
          if (!v.a || !v.b) { const A = this.world.nearestNode(v.x, v.z); if (A) v.aiInit(A, A.adj[0].n); }
          if (v.a && (!v.pathT || this.now - v.pathT > 2)) { v.pathT = this.now; const B = this.world.nearestNode(p.x, p.z); v.route = B ? this.world.path(v.b, B) : null; }
          if (v.a) v.ai(dt, 15 + lvl * 2.5); else v.seek(dt, p.x, p.z, 16 + lvl * 2.2);
        } else { v.a = v.b = null; v.route = null; v.seek(dt, p.x, p.z, 16 + lvl * 2.2); }   // close: go straight at the player
      }
      if (lvl >= 2) {                                              // safety net: a jeep that makes no progress respawns closer, on a road
        v.chkT = (v.chkT || 0) + dt;
        if (v.chkT > 3) {
          v.chkT = 0; v.fails = d > 22 && d > (v.lastD ?? 1e9) - 4 ? (v.fails || 0) + 1 : 0; v.lastD = d;
          if (v.fails >= 2) {
            const c = this.world.nodesNear(p.x, p.z, 130).filter(n => Math.hypot(n.x - p.x, n.z - p.z) > 55 && n.adj.length);
            if (c.length) { const n = pick(c); v.x = n.x; v.z = n.z; v.h = Math.atan2(p.x - n.x, p.z - n.z); v.v = 0; v.a = v.b = null; v.route = null; v.fails = 0; v.lastD = 1e9; v.stuck = 0; v.revT = 0; }
          }
        }
      }
      if (lvl < 2) { v.siren = false; if (!v.a) { const n = this.world.nodesNear(v.x, v.z, 80)[0]; if (n) v.aiInit(n, n.adj[0].n); } if (v.a) v.ai(dt); else v.physics(dt, { thr: 0, steer: 0, hand: true }); }
    }
    this.audio.siren(lvl >= 2 && close < 220);
    // decay: out of sight for a while
    if (this.heat > 0 && this.now - this.lastOffence > (lvl >= 2 ? 18 : 9) && close > 140) this.heat = Math.max(0, this.heat - dt / (lvl >= 2 ? 6 : 3));
    // busted: police right next to a slow player
    const slow = this.car ? Math.abs(this.car.v) < 2.5 : true;
    if (lvl >= 2 && close < (this.car ? 7 : 5) && slow) { this.bustT += dt; if (this.bustT > 2.2) this.busted(); } else this.bustT = Math.max(0, this.bustT - dt);
    if (lvl >= 1 && this.level === 1 && !this.gossipSaid) { this.gossipSaid = true; this.say('An aunty saw that. The whole street will know by evening.', 3); }
    if (lvl === 0) this.gossipSaid = false;
  }
  busted() {
    const fine = Math.max(200, Math.round(this.save.money * 0.1));
    this.addMoney(-fine); this.heat = 0; this.bustT = 0; this.big('BUSTED', `Fine ₹${fine}. The SI says hello to your amma.`, '#60a5fa'); this.audio.fail();
    if (this.car) this.exitVehicle(); const ps = this.world.pois['Police Station'] || [0, 0], rd = this.world.nearestRoad(ps[0], ps[1], 100);
    this.teleport(rd ? rd.x : ps[0], rd ? rd.z : ps[1]); if (this.mission) this.failMission('You were busted.');
    for (const v of this.police) { v.dispose(); this.vehicles.splice(this.vehicles.indexOf(v), 1); } this.police = [];
  }
  hospital() {
    this.addMoney(-300); this.player.hp = 100; this.big('ADMITTED', 'Government Hospital. Bill ₹300. Rest for two minutes, please.', '#f87171'); this.audio.fail();
    if (this.car) this.exitVehicle(); const h = this.world.pois['Karkala Government Hospital'] || [290, 145], rd = this.world.nearestRoad(h[0], h[1], 100);
    this.teleport(rd ? rd.x : h[0], rd ? rd.z : h[1]); this.heat = 0; if (this.mission) this.failMission('You ended up in hospital.');
  }
  teleport(x, z) { this.player.x = x; this.player.z = z; this.player.y = this.world.groundH(x, z); this.player.mesh.visible = true; }

  /* ====================================================================== missions */
  roadAt(name, off = 0) {
    const w = this.world, p = typeof name === 'string' ? (w.pois[name] || [0, 0]) : name, rd = w.nearestRoad(p[0], p[1], 160);
    return rd ? [rd.x + (-rd.dirz) * off, rd.z + rd.dirx * off] : p;
  }
  setupMissions() {
    const w = this.world, R = (n, o) => () => this.roadAt(n, o);
    const temple = () => { const t = w.temple; return t ? this.roadAt([t[0] + Math.sin(t[2]) * 16, t[1] + Math.cos(t[2]) * 16]) : this.roadAt('Sri Venkataramana Temple'); };
    const bus = () => w.busStand ? [w.busStand.x - w.busStand.n[0] * 7.5, w.busStand.z - w.busStand.n[1] * 7.5] : [150, 38];
    const npcPos = (id) => () => { const n = this.npcs[id]; return n ? [n.x, n.z] : [150, 38]; };
    this.MISSIONS = [
      { id: 'm1', title: 'Welcome Home', reward: 300, start: () => bus(), auto: true, steps: [
        { t: 'say', lines: [S('L01'),
          S('L02'),
          S('L03'),
          S('L04'),
          S('L05'),
          S('L06')] },
        { t: 'goto', at: () => this.ajja ? [this.ajja.x, this.ajja.z] : R('Gandhi Maidan')(), r: 4, need: 'foot', text: 'Walk to Ajja\'s old red scooter near <b>Gandhi Maidan</b>' },
        { t: 'enter', tag: 'ajja', text: 'Press <b>F</b> to get on the scooter' },
        { t: 'say', lines: [S('L07')] },
        { t: 'stop', at: temple, r: 9, hold: 2.5, text: 'Ride to <b>Sri Venkataramana Temple</b> and stop at the gate' },
        { t: 'say', lines: [S('L08'),
          S('L09'),
          S('L10')] }] },
      { id: 'm2', title: 'Goli Baje Express', reward: 500, start: npcPos('owner'), steps: [
        { t: 'say', lines: [S('L11'),
          S('L12'),
          S('L13')] },
        { t: 'enter', two: true, text: 'Get on a <b>two-wheeler</b> (your scooter works)' },
        { t: 'timer', sec: 120 },
        { t: 'stop', at: R('Sri Bhuvanendra College'), r: 10, hold: 1, text: 'Deliver the hot goli baje to <b>Bhuvanendra College</b>' },
        { t: 'say', lines: [S('L14'),
          S('L15'),
          S('L16')] }] },
      { id: 'm3', title: 'Conductor Saab', reward: 800, start: npcPos('pramod'), steps: [
        { t: 'say', lines: [S('L17'),
          S('L18'),
          S('L19')] },
        { t: 'enter', tag: 'pramod', text: 'Get into the red bus <b>SRI DURGA</b> at the bus stand' },
        { t: 'say', lines: [S('L20')] },
        { t: 'stop', at: R('Gandhi Maidan'), r: 12, hold: 2, text: 'Stop 1 of 3: <b>Gandhi Maidan</b>', pax: true },
        { t: 'stop', at: temple, r: 12, hold: 2, text: 'Stop 2 of 3: <b>Venkataramana Temple</b>', pax: true },
        { t: 'stop', at: R('Karkala Government Hospital'), r: 12, hold: 2, text: 'Stop 3 of 3: <b>Government Hospital</b>', pax: true },
        { t: 'stop', at: () => bus(), r: 14, hold: 2, text: 'Back to the <b>bus stand</b>' },
        { t: 'say', lines: [S('L21'),
          S('L22')] }] },
      { id: 'm4', title: 'The Mallige Thief', reward: 700, start: npcPos('ajji'), steps: [
        { t: 'say', lines: [S('L23'),
          S('L24'),
          S('L25')] },
        { t: 'chase', sec: 110, text: 'Catch the <b>thief on the black bike</b>. Stay close to him!' },
        { t: 'say', lines: [S('L26'),
          S('L27'),
          S('L28')] }] },
      { id: 'm5', title: 'Kere Evening', reward: 400, start: npcPos('shwetha'), steps: [
        { t: 'say', lines: [S('L29'),
          S('L30'),
          S('L31')] },
        { t: 'goto', at: () => { const k = w.kereBasadi || [112, 360]; const rd = w.nearestRoad(k[0], k[1], 200); return rd ? [rd.x, rd.z] : k; }, r: 9, text: 'Go to <b>Aanekere</b>, by the lake' },
        { t: 'say', lines: [S('L32')] },
        { t: 'photo', text: 'Press <b>O</b> for photo mode, frame the basadi in the lake, then press <b>Enter</b>' },
        { t: 'say', lines: [S('L33'),
          S('L34')] }] },
      { id: 'm6', title: 'Bahubali Calling', reward: 1000, start: () => w.hillFoot || R('Bahubali Hill')(), steps: [
        { t: 'say', lines: [S('L35'),
          S('L36'),
          S('L37')] },
        { t: 'goto', at: () => w.hillTop || [w.hill.x, w.hill.z], r: 7, need: 'foot', text: 'Climb the steps up <b>Bahubali Betta</b> on foot' },
        { t: 'photo', text: 'Press <b>O</b> and take a photo with Bahubali, then press <b>Enter</b>' },
        { t: 'ending' }] },
    ];
    this.mission = null;
  }
  nextMission() { return this.MISSIONS.find(m => !this.save.done.includes(m.id)); }
  startMission(m) {
    this.mission = { def: m, i: -1, hold: 0, timer: 0 }; this.big(m.title.toUpperCase(), 'MISSION', '#facc15'); this.audio.pass();
    this.nextStep();
  }
  nextStep() {
    const ms = this.mission; ms.i++; ms.hold = 0;
    const s = ms.def.steps[ms.i];
    if (!s) return this.passMission();
    if (s.t === 'say') { ms.talking = true; this.talk(s.lines).then(() => { ms.talking = false; if (this.mission === ms) this.nextStep(); }); }
    if (s.t === 'ending') { ms.talking = true; this.endingScene().then(() => { ms.talking = false; if (this.mission === ms) this.nextStep(); }); }
    if (s.t === 'timer') { ms.timer = s.sec; return this.nextStep(); }
    if (s.t === 'chase') this.spawnThief(s);
    this.objective(s.text || '');
  }
  passMission() {
    const m = this.mission.def; this.mission = null; this.save.done.push(m.id); this.addMoney(m.reward); this.audio.pass();
    this.big('MISSION PASSED', `${m.title} · +₹${m.reward}`, '#facc15'); this.objective(''); this.marker.visible = false; $('timer').style.display = 'none';
    if (this.thief) { this.thief.driver = 'ai'; this.thief.keep = false; this.thief = null; }
    this.store();
    if (!this.nextMission()) setTimeout(() => this.big('KARKALA IS YOURS', 'All story missions done. Free roam, side jobs (J) and cheats are waiting.', '#34d399'), 4200);
  }
  failMission(why) {
    this.big('MISSION FAILED', why, '#f87171'); this.audio.fail(); this.mission = null; this.objective(''); this.marker.visible = false; $('timer').style.display = 'none';
    if (this.thief) { this.thief.driver = 'ai'; this.thief.keep = false; this.thief = null; }
  }
  spawnThief(s) {
    const p = this.carOrPlayer(), n = this.world.nodesNear(p.x, p.z, 80).filter(n => n.adj.some(e => e.w >= 6))[0] || this.world.nodes[0];
    const e = n.adj.find(e => e.w >= 6) || n.adj[0];
    const v = new Vehicle(this, 'bike', n.x, n.z, Math.atan2(e.n.x - n.x, e.n.z - n.z), { driver: 'thief', color: '#111827' });
    v.keep = true; v.aiInit(n, e.n); this.vehicles.push(v); this.thief = v; this.mission.timer = s.sec; this.mission.close = 0;
  }
  missionUpdate(dt) {
    const ms = this.mission, p = this.carOrPlayer();
    if (!ms) {
      const m = this.nextMission(); this.startMarker.visible = !!m && !this.job;
      if (m) {
        const [x, z] = m.start(); this.startMarker.position.set(x, this.world.groundH(x, z), z); this.nextStart = [x, z];
        if (m.auto && !this.save.done.length && this.now > 1.5) return this.startMission(m);
        if (!this.job && Math.hypot(p.x - x, p.z - z) < 4.5 && (!this.car || Math.abs(this.car.v) < 3)) this.startMission(m);
      }
      return;
    }
    this.startMarker.visible = false;
    if (ms.timer > 0) { ms.timer -= dt; $('timer').style.display = 'block'; $('timer').textContent = fmtT(ms.timer); if (ms.timer <= 0) { $('timer').style.display = 'none'; return this.failMission(ms.def.steps[ms.i].t === 'chase' ? 'He got away with the mallige.' : 'Too late. The goli baje went cold.'); } }
    const s = ms.def.steps[ms.i]; if (!s) return;
    if (s.t === 'say' || s.t === 'ending') { this.marker.visible = false; return; }
    if (s.t === 'enter') {
      const ok = this.car && (s.tag ? this.car.tag === s.tag : s.two ? this.car.def.two : true);
      const tgt = s.tag ? this.vehicles.find(v => v.tag === s.tag) : null;
      this.marker.visible = !!tgt && !ok; if (tgt) this.marker.position.set(tgt.x, this.world.groundH(tgt.x, tgt.z), tgt.z); ms.target = tgt ? [tgt.x, tgt.z] : null;
      if (ok) this.nextStep(); return;
    }
    if (s.t === 'chase') {
      const th = this.thief; if (!th) return this.failMission('He vanished.');
      this.marker.visible = true; this.marker.position.set(th.x, th.y + 1, th.z); ms.target = [th.x, th.z];
      const d = Math.hypot(th.x - p.x, th.z - p.z);
      if (d < 7) { ms.close += dt; this.hint(`Stay close... ${Math.ceil(Math.max(0, 3 - ms.close))}`, 0.3); } else ms.close = Math.max(0, ms.close - dt * 0.5);
      if (ms.close >= 3) { th.v = 0; th.driver = null; th.removeDriverModel(); const q = new Ped(this, th.x + 1.5, th.z); q.idle = true; this.peds.push(q); this.thief = null; th.keep = false; $('timer').style.display = 'none'; ms.timer = 0; this.nextStep(); }
      return;
    }
    const [tx, tz] = s.at ? s.at() : [p.x, p.z]; ms.target = [tx, tz];
    if (s.t === 'photo') { this.marker.visible = false; if (this.photoTaken) { this.photoTaken = false; this.nextStep(); } return; }
    this.marker.visible = true; this.marker.position.set(tx, this.world.groundH(tx, tz), tz); this.marker.scale.setScalar(s.r / 2.2);
    const d = Math.hypot(tx - p.x, tz - p.z);
    if (d > s.r) { ms.hold = 0; return; }
    if (s.need === 'foot' && this.car) { this.hint('Get off the vehicle here (F)', 0.5); return; }
    if (s.t === 'goto') return this.nextStep();
    if (s.t === 'stop') {
      if (!this.car) { this.hint('You need to be in the vehicle', 0.5); return; }
      if (Math.abs(this.car.v) > 1.6) { this.hint('Stop here', 0.3); ms.hold = 0; return; }
      ms.hold += dt; this.hint(s.pax ? 'Passengers getting in...' : 'Stopping...', 0.3);
      if (ms.hold >= s.hold) { if (s.pax) { const n = 4 + Math.floor(Math.random() * 9); this.bussers = (this.bussers || 0) + n; this.say(`Conductor: Rightu! ${n} passengers in. Hogi, hogi!`, 2.4); this.addMoney(n * 15); } this.nextStep(); }
    }
  }

  /* ====================================================================== side jobs (J) */
  toggleJob() {
    if (this.job) { this.job = null; this.objective(''); this.marker.visible = false; $('timer').style.display = 'none'; this.toast('JOB', 'Shift ended'); return; }
    if (this.mission) { this.hint('Finish the mission first', 1.5); return; }
    if (!this.car) { this.hint('Get on a scooter, auto or bus, then press J', 2); return; }
    this.job = { kind: this.car.def.two ? 'delivery' : this.car.kind === 'auto' || this.car.kind === 'car' ? 'ride' : this.car.kind === 'bus' ? 'bus' : 'delivery', count: 0 };
    this.newJob();
  }
  newJob() {
    const j = this.job, w = this.world, p = this.carOrPlayer();
    const food = ['Hotel Taj Mahal', 'Hotel Prakash', 'Shree Durga Lunch Home', 'Hotel Gokul', 'Sri Manjunatha Cafeteria', 'Appuroopa Nonveg Restaurant', 'Gopal Towers'].filter(n => w.pois[n]);
    const nameOf = { 'Hotel Taj Mahal': 'Hotel Raj Mahal', 'Hotel Prakash': 'Hotel Prakasham', 'Shree Durga Lunch Home': 'Durga Lunch Home', 'Appuroopa Nonveg Restaurant': 'Apurupa Non-veg', 'Gopal Towers': 'Gopal Towers food court' };
    const houses = (w.buildings || []).filter(b => !b.shop);
    const roadPt = (x, z) => { const rd = w.nearestRoad(x, z, 120); return rd ? [rd.x, rd.z] : [x, z]; };
    let a, b, label;
    if (j.kind === 'delivery') { const f = pick(food); a = roadPt(...w.pois[f]); label = nameOf[f] || f; let h; for (let k = 0; k < 30; k++) { h = pick(houses); if (Math.hypot(h.x - a[0], h.z - a[1]) > 280 && Math.hypot(h.x - a[0], h.z - a[1]) < 900) break; } b = roadPt(h.x, h.z); }
    else { const near = w.nodesNear(p.x, p.z, 260).filter(n => Math.hypot(n.x - p.x, n.z - p.z) > 60); const n1 = pick(near.length ? near : w.nodes); a = [n1.x, n1.z]; let n2; for (let k = 0; k < 40; k++) { n2 = pick(w.nodes); if (Math.hypot(n2.x - a[0], n2.z - a[1]) > 300 && Math.hypot(n2.x - a[0], n2.z - a[1]) < 1000) break; } b = [n2.x, n2.z]; label = w.placeName(b[0], b[1]); }
    const dist = Math.hypot(b[0] - a[0], b[1] - a[1]), pay = Math.round((j.kind === 'delivery' ? 60 : 40) + dist * (j.kind === 'delivery' ? 0.28 : 0.35));
    j.stage = 0; j.a = a; j.b = b; j.pay = pay; j.label = label; j.time = Math.round(dist / 7 + 45); j.hold = 0;
    this.objective(j.kind === 'delivery' ? `<b>Oota Express</b>: pick up the order at <b>${label}</b>` : j.kind === 'bus' ? `<b>Bus round</b>: stop for passengers` : `<b>Auto meter</b>: pick up the passenger`);
  }
  jobUpdate(dt) {
    const j = this.job; if (!j) return; const p = this.carOrPlayer();
    if (!this.car) { this.hint('Back on your vehicle to continue the job (J to stop)', 0.4); }
    const t = j.stage === 0 ? j.a : j.b; this.marker.visible = true; this.marker.position.set(t[0], this.world.groundH(t[0], t[1]), t[1]); this.marker.scale.setScalar(3); this.jobTarget = t;
    if (j.stage === 1) { j.time -= dt; $('timer').style.display = 'block'; $('timer').textContent = fmtT(j.time); if (j.time <= 0) { this.toast('LATE', 'Customer cancelled. One star rating. Ouch.'); this.audio.fail(); $('timer').style.display = 'none'; return this.newJob(); } }
    if (Math.hypot(t[0] - p.x, t[1] - p.z) < 9 && this.car && Math.abs(this.car.v) < 2) {
      j.hold += dt; this.hint(j.stage === 0 ? 'Picking up...' : 'Dropping off...', 0.3);
      if (j.hold > 1.2) {
        j.hold = 0;
        if (j.stage === 0) { j.stage = 1; this.objective(j.kind === 'delivery' ? `Deliver to a house near <b>${this.world.placeName(j.b[0], j.b[1])}</b>` : `Drop the passenger at <b>${j.label}</b>`); this.say(j.kind === 'delivery' ? pick(['Hotel: Extra chutney packed. Go fast!', 'Hotel: Two fish thalis. Don\'t tilt the box!']) : pick(['Passenger: Bus stand-ge... no, actually somewhere else.', 'Passenger: Meter on? Okay okay, go.']), 2.6); }
        else { const bonus = this.raining > 0.4 ? 1.3 : 1, pay = Math.round(j.pay * bonus); this.addMoney(pay); j.count++; this.toast(j.kind === 'delivery' ? 'DELIVERED' : 'FARE', `+₹${pay}${bonus > 1 ? ' (rain bonus +30%)' : ''} · job ${j.count}`); this.audio.coin(); $('timer').style.display = 'none'; this.newJob(); }
      }
    } else j.hold = 0;
  }

  /* ====================================================================== time, weather */
  updateSky(dt) {
    if (!this.photo) { if (this.live && !this.cine.active && !this.endMode) this.time = ISTMIN(); else this.time = (this.time + dt * TIME_SCALE * ((this.time >= 330 && this.time < 600) ? 0.5 : 1)) % 1440; }      // game minutes per real second: a full day takes 2 real hours, a night about 35 minutes
    const t = this.time / 1440, el = Math.sin((t - 0.25) * Math.PI * 2), az = (t - 0.25) * Math.PI * 2;
    const day = clamp(el * 3 + 0.25, 0, 1), dusk = clamp(1 - Math.abs(el) * 4, 0, 1) * (el > -0.2 ? 1 : 0);
    const hrs = this.time / 60, morn = clamp(1 - Math.abs(hrs - 7.0) / 2.6, 0, 1) * (1 - this.raining * 0.6); this.morn = morn;
    this.dayAmt = day; const p = this.carOrPlayer();
    const sd = new THREE.Vector3(Math.cos(az) * 0.8, Math.max(0.08, el), Math.sin(az) * 0.6).normalize();
    this.sun.position.set(p.x + sd.x * 150, sd.y * 150, p.z + sd.z * 150); this.sun.target.position.set(p.x, 0, p.z);
    const rain = this.raining;
    const top = new THREE.Color('#162552').lerp(new THREE.Color('#4f93dc'), day).lerp(new THREE.Color('#5b6675'), rain * 0.85);
    const bot = new THREE.Color('#2b3d66').lerp(new THREE.Color('#d9e8f3'), day).lerp(new THREE.Color('#ff9c5a'), dusk * 0.65).lerp(new THREE.Color('#ffd0a0'), morn * 0.55).lerp(new THREE.Color('#8b939c'), rain * 0.8);
    this.skyMat.uniforms.top.value.copy(top); this.skyMat.uniforms.bot.value.copy(bot); this.skyMat.uniforms.sunDir.value.copy(sd); this.skyMat.uniforms.night.value = 1 - day;
    this.skyMat.uniforms.sunCol.value.set(day > 0.1 ? '#fff1c2' : '#000'); this.skyMat.uniforms.sunCol.value.multiplyScalar(1 - rain);
    const U = this.skyMat.uniforms; U.uTime.value = this.now; U.cover.value = (this.live && this.wx ? 0.15 + 0.6 * this.wx.cloud : 0.38) + rain * 0.55;
    U.cloudCol.value.set('#ffffff').lerp(new THREE.Color('#ffb48a'), dusk * 0.7).lerp(new THREE.Color('#ffe0c0'), morn * 0.5).multiplyScalar(0.12 + 0.88 * day).lerp(new THREE.Color('#6b7280'), rain * 0.7 * day);
    // sky reflections for glass, paint and water: re-baked every few game minutes
    this.envT = (this.envT || 0) - dt;
    if (this.envT <= 0) { this.envT = 20; this.bakeEnv(); }
    this.scene.fog.color.copy(bot); this.scene.fog.far = lerp(560, 260, rain) * (1 - morn * 0.3); this.scene.fog.near = lerp(140, 40, rain) * (1 - morn * 0.55);      // a little morning mist
    this.sun.intensity = (0.55 + 1.95 * day) * (1 - rain * 0.7); this.sun.color.set(dusk > 0.3 ? '#ffb27a' : morn > 0.25 ? '#ffe2b4' : '#fff1d6');
    if (day < 0.05) { this.sun.color.set('#a9bdff'); this.sun.intensity = 1.1; }
    this.hemi.intensity = 1.0 + 0.5 * day; this.hemi.color.set(day > 0.2 ? '#cfe4ff' : '#7a90d0'); this.hemi.groundColor.set(day > 0.2 ? '#5b6b3a' : '#3d4a6a');
    this.renderer.toneMappingExposure = 0.95 + 0.4 * (1 - day);
    this.world.setNight(1 - day); this.world.setWet(rain);
    // weather: Karkala rains often
    if (this.live && !this.cheatWeather && this.wx) { const w = this.wx; this.rainOn = w.rain > 0.05 || RAIN_CODES.has(w.code); this.rainMax = this.rainOn ? clamp(0.5 + w.rain / 4, 0.5, 1) : 1; }
    this.wxPoll = (this.wxPoll || 0) - dt; if (this.wxPoll <= 0) { this.wxPoll = 600; this.fetchWeather(); }
    if (!(this.live && this.wx) && !this.cheatWeather) { this.wxT = (this.wxT || 0) - dt; if (this.wxT < 0) { this.wxT = rnd(60, 180); this.rainOn = this.rainOn ? Math.random() < 0.55 : Math.random() < 0.3; if (this.rainOn) this.toast('MALE BANTHU', 'It is raining again. Of course it is. This is Karkala.'); } }
    this.raining = clamp(this.raining + (this.rainOn ? dt / 6 : -dt / 8), 0, this.rainMax ?? 1);
    this.rain.visible = this.raining > 0.05; this.rain.material.opacity = 0.6 * this.raining;
    if (this.rain.visible) {
      const a = this.rain.geometry.attributes.position.array, cp = this.cam.position, fall = 26 * dt;
      for (let i = 0; i < a.length; i += 6) { a[i + 1] -= fall; a[i + 4] -= fall; if (a[i + 4] < -2) { const x = rnd(-40, 40), y = rnd(22, 32), z = rnd(-40, 40); a[i] = x; a[i + 1] = y; a[i + 2] = z; a[i + 3] = x + 0.05; a[i + 4] = y - 0.9; a[i + 5] = z + 0.05; } }
      this.rain.geometry.attributes.position.needsUpdate = true; this.rain.position.set(cp.x, cp.y - 15, cp.z);
    }
    this.audio.rain(this.raining);
    { const nt = clamp((0.6 - day) / 0.5, 0, 1), pp = this.player; this.torch.intensity = this.car ? 0 : 14 * nt; this.torch.position.set(pp.x, pp.y + 2.4, pp.z); }      // a soft lantern glow around you on foot at night
    const lightsOn = day < 0.5 || rain > 0.6;
    if (this.car && lightsOn && !this.car.def.two) { this.headlight.intensity = 40; } else if (this.car && lightsOn) this.headlight.intensity = 25; else this.headlight.intensity = 0;
    if (this.car) { const c = this.car; this.headlight.position.set(c.x + c.fx * c.def.L / 2, c.y + 1.1, c.z + c.fz * c.def.L / 2); this.headlight.target.position.set(c.x + c.fx * 25, 0, c.z + c.fz * 25); }
    if (day > 0.6 && Math.random() < dt * 0.05) this.audio.crow();
  }

  bakeEnv() {
    if (!this.pmrem) { this.pmrem = new THREE.PMREMGenerator(this.renderer); this.envScene = new THREE.Scene(); }
    const sky = this.sky; this.scene.remove(sky); this.envScene.add(sky); const p = sky.position.clone(); sky.position.set(0, 0, 0);
    const rt = this.pmrem.fromScene(this.envScene, 0, 1, 1000); this.envScene.remove(sky); this.scene.add(sky); sky.position.copy(p);
    if (this.envRT) this.envRT.dispose(); this.envRT = rt;
    for (const [m, k] of [[M.MAT.shiny, 0.9], [M.MAT.gold, 1.5], [M.GLASS, 1.2], [this.world.waterMat, 0.35]]) { m.envMap = rt.texture; m.envMapIntensity = k; m.needsUpdate = !m.userData.envSet; m.userData.envSet = true; }
    M.ENV.tex = rt.texture; for (const m of M.ENV.mats) { m.envMap = rt.texture; m.needsUpdate = !m.userData.envSet; m.userData.envSet = true; }
  }
  /* ====================================================================== story NPCs */
  setupNpcs() {
    const w = this.world, side = (pt, off = 3.2) => { const rd = w.nearestRoad(pt[0], pt[1], 200); return rd ? [rd.x - rd.dirz * (rd.w / 2 + off), rd.z + rd.dirx * (rd.w / 2 + off)] : pt; };
    const place = (id, name, pt, o, mission) => {
      let [x, z] = side(pt, o.off || 2.6); if (w.blocked(x, z, 0.6)) { x = pt[0]; z = pt[1]; }
      const mesh = M.person(o); this.scene.add(mesh);
      const tag = this.makeTag(name); tag.position.y = 2.35; mesh.add(tag);
      const bang = this.makeTag('!', '#facc15', 64); bang.scale.set(0.9, 0.9, 1); bang.position.y = 3.1; mesh.add(bang);
      const n = { id, name, mesh, x, z, h: 0, y: w.groundH(x, z), tag, bang, mission }; w.addObs({ x, z, r: 0.55 }); mesh.position.set(x, n.y, z); this.npcs[id] = n;
    };
    const P = w.pois, t = w.temple;
    if (t) { const lx = 4, lz = 19.5, c = Math.cos(t[2]), sn = Math.sin(t[2]); const x = t[0] + lx * c + lz * sn, z = t[1] - lx * sn + lz * c; place('archakaru', 'Archakaru', [x, z], { kind: 'lungi', shirt: '#f8fafc', lungi: '#f8fafc', skin: '#a8703f', off: 0.5 }, null); }
    place('owner', 'Hotel owner', P['Hotel Taj Mahal'] || [90, -82], { kind: 'lungi', shirt: '#f8fafc', lungi: '#e5e7eb', skin: '#b9814f', off: 3 }, 'm2');
    place('canteen', 'Canteen Anna', this.roadAt('Sri Bhuvanendra College'), { kind: 'shirt', shirt: '#f59e0b', pants: '#1f2937', skin: '#7b4b2c', off: 3 }, null);
    const pv = this.vehicles.find(v => v.tag === 'pramod'); place('pramod', 'Pramod', pv ? [pv.x + 6, pv.z] : [150, 38], { kind: 'shirt', shirt: '#1d4ed8', pants: '#111827', cap: '#facc15', skin: '#a8703f', off: 1.5 }, 'm3');
    const mr = w.marketRoad; place('ajji', 'Ajji', mr ? mr.pts[Math.floor(mr.pts.length / 2)] : [150, 40], { kind: 'saree', saree: '#db2777', skin: '#8d5a3b', off: 3 }, 'm4');
    place('shwetha', 'Shwetha', this.roadAt('Rama Samudra'), { kind: 'saree', saree: '#7c3aed', skin: '#b9814f', off: 3 }, 'm5');
  }
  makeTag(text, col = '#ffffff', size = 256) {
    const c = document.createElement('canvas'); c.width = size; c.height = size === 256 ? 64 : 64; const x = c.getContext('2d');
    if (size === 256) { x.fillStyle = 'rgba(0,0,0,.62)'; x.beginPath(); x.roundRect(4, 8, 248, 48, 14); x.fill(); }
    x.fillStyle = col; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = size === 256 ? '800 28px system-ui,sans-serif' : '900 56px system-ui,sans-serif'; x.fillText(text, c.width / 2, 34);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); sp.scale.set(size === 256 ? 2.4 : 0.9, 0.6, 1); return sp;
  }
  updateNpcs(dt) {
    const p = this.carOrPlayer(), m = this.nextMission();
    for (const n of Object.values(this.npcs)) {
      const d = Math.hypot(n.x - p.x, n.z - p.z), want = Math.atan2(p.x - n.x, p.z - n.z);
      if (d < 14 || this.dlg) n.h += wrap(want - n.h) * Math.min(1, dt * 4);
      n.mesh.rotation.y = n.h; n.tag.visible = d < 28 && !this.cine.active; n.bang.visible = !this.cine.active && !this.mission && !!m && m.id === n.mission && d < 120;
      if (n.bang.visible) n.bang.position.y = 3.1 + Math.sin(this.now * 4) * 0.12;
      n.mesh.visible = d < 260;
    }
  }

  /* ====================================================================== dialogue scenes */
  /** Show a conversation: letterbox, camera on the speaker, typewriter text, voice-over (or blips). Resolves when finished. */
  talk(lines) {
    return new Promise((res) => {
      this.dlg = { lines, i: -1, res, camP: null }; document.body.classList.add('talk'); this.audio.init(); this.audio.resume(); this.keys.clear();
      this.nextLine();
    });
  }
  speaker(w) {
    const n = { ARCHAKARU: 'archakaru', PRAMOD: 'pramod', OWNER: 'owner', CANTEEN: 'canteen', AJJI: 'ajji', SHWETHA: 'shwetha' }[w];
    if (n && this.npcs[n]) return this.npcs[n];
    if (w === 'THIEF' && this.thief) return this.thief;
    return this.car || this.player;
  }
  nextLine() {
    const d = this.dlg; d.i++; Voice.stop();
    if (d.i >= d.lines.length) return this.endTalk();
    const raw = d.lines[d.i], rec = LINES[raw.id], L = { id: raw.id, w: rec.w, t: Voice.text(raw.id), en: rec.en }, [name, col] = SPK[L.w] || ['', '#fff'];
    d.L = L; d.shown = 0; d.timer = 0; d.voiceDone = false; d.full = false; d.sp = this.speaker(L.w);
    if (L.w === 'AMMA' && (d.i === 0 || LINES[d.lines[d.i - 1].id].w !== 'AMMA')) this.audio.ring();
    if (d.sp && d.sp.mesh && d.sp.id) { d.sp.h = Math.atan2(this.player.x - d.sp.x, this.player.z - d.sp.z); }
    $('dwho').textContent = name; $('dwho').style.color = col; $('dchip').style.background = col; $('dchip').textContent = (name || '·')[0]; $('dtxt').textContent = '';
    $('dsub').textContent = Voice.lang === 'en' ? '' : L.en; $('dsub').style.display = Voice.lang === 'en' ? 'none' : 'block';
    $('dlg').classList.toggle('narr', L.w === 'NARRATOR'); $('dlg').style.display = 'block'; $('dlg').classList.remove('in'); void $('dlg').offsetWidth; $('dlg').classList.add('in');
    d.voiceStarted = Voice.speak(L.id, L.w, () => { d.voiceDone = true; });
    d.mode = (d.i % 2) ? 1 : -1;
  }
  updateDialogue(dt) {
    const d = this.dlg; if (!d) return; d.timer += dt;
    const L = d.L, n = L.t.length;
    if (!d.full) {
      const target = Math.min(n, Math.floor(d.timer * (d.voiceStarted ? 30 : 42)));
      if (target > d.shown) { if (!d.voiceStarted) for (let k = d.shown; k < target; k += 3) this.audio.blip(L.w, L.t[k] || 'a'); d.shown = target; $('dtxt').textContent = L.t.slice(0, d.shown); }
      if (d.shown >= n) { d.full = true; d.doneAt = d.timer; }
    } else if (d.voiceStarted ? (d.voiceDone && d.timer - d.doneAt > 0.5) : (d.timer - d.doneAt > 0.7 + n * 0.024)) this.nextLine();
  }
  advanceTalk() { const d = this.dlg; if (!d) return; if (!d.full) { d.full = true; d.shown = d.L.t.length; d.doneAt = d.timer; $('dtxt').textContent = d.L.t; } else this.nextLine(); }
  skipTalk() { if (this.dlg) { this.dlg.i = this.dlg.lines.length; this.nextLine(); } }
  endTalk() { const d = this.dlg; this.dlg = null; Voice.stop(); $('dlg').style.display = 'none'; document.body.classList.remove('talk'); d.res(); }
  /** Camera for the current line (null = normal gameplay camera). */
  dialogueCam(dt) {
    const d = this.dlg, sp = d.sp; if (!sp) return null;
    const isVeh = !!sp.def, face = isVeh ? 1.7 + sp.def.H * 0.3 : (sp.mesh && sp.id ? 1.6 : 1.6), hy = (sp.y || 0) + face, dist = isVeh ? 5 + sp.def.L * 0.3 : 2.6;
    const az = (sp.h || 0) + d.mode * 0.55 + (isVeh ? 0.8 : 0), tp = [sp.x + Math.sin(az) * dist, hy + 0.1 + Math.min(0.5, d.timer * 0.04), sp.z + Math.cos(az) * dist];
    d.camP = d.camP ? [d.camP[0] + (tp[0] - d.camP[0]) * Math.min(1, dt * 5), d.camP[1] + (tp[1] - d.camP[1]) * Math.min(1, dt * 5), d.camP[2] + (tp[2] - d.camP[2]) * Math.min(1, dt * 5)] : tp;
    return { p: d.camP, l: [sp.x, hy - 0.05, sp.z], fov: 38 };
  }
  /** Mission 6 finale: sunrise at the statue, a phone call, credits, then free roam. */
  endingScene() {
    return new Promise(async (res) => {
      this.endMode = true; this.inputLock = true; document.body.classList.add('cine'); this.audio.music.set('ending');
      const h = this.world.hill, f = this.world.hillFace || 0, sv = { time: this.time, cw: this.cheatWeather, rain: this.rainOn, raining: this.raining };
      this.cheatWeather = true; this.rainOn = false; this.raining = 0; this.time = 5.9 * 60; this.player.mesh.visible = false;
      let t = 0; const tick = (dt) => { t += dt; const a = f + 0.4 - Math.min(1, t / 40) * 0.8; this.cinCam = { p: [h.x + Math.sin(a) * 22, h.H + 7.5 - Math.min(1, t / 40) * 1.5, h.z + Math.cos(a) * 22], l: [h.x, h.H + 8.5, h.z], fov: 50 }; };
      this.endTick = tick; await new Promise(r => setTimeout(r, 1500));
      document.body.classList.remove('cine'); document.body.classList.add('talk');
      await this.talk([S('L38'), S('L39'),
        S('L40'), S('L41'),
        S('L42'), S('L43'),
        S('L44'), S('L45'),
        S('L46')]);
      this.endTick = null; this.cinCam = { p: [h.x + Math.sin(f) * 30, h.H + 6, h.z + Math.cos(f) * 30], l: [h.x, h.H + 9, h.z], fov: 50 };
      $('credits').classList.add('roll'); this.audio.music.set('ending'); await new Promise(r => setTimeout(r, 24000)); $('credits').classList.remove('roll');
      this.endMode = false; this.cinCam = null; this.endTick = null; this.inputLock = false; document.body.classList.remove('cine', 'talk');
      this.time = sv.time; this.cheatWeather = sv.cw; this.rainOn = sv.rain; this.raining = sv.raining; this.player.mesh.visible = !this.car; res();
    });
  }
  /** The intro trailer, optionally recorded to a video file. */
  playTrailer(o = {}) {
    if (this.cine.active) return; this.keys.clear();
    $('title').classList.add('gone'); this.audio.init(); this.audio.resume();
    this.cine.play({ record: o.record, onVideo: o.onVideo, onEnd: (fin) => { this.save.seenIntro = true; this.store(); o.onEnd && o.onEnd(fin); } });
  }

  /* ====================================================================== main loop */
  start() {
    this.started = true; this.audio.init(); this.audio.resume(); this.hudShow(true);
    setInterval(() => this.store(), 15000);
    if (!this.save.seenIntro && !this.save.done.length) this.playTrailer({ onEnd: () => { } });
    else if (this.save.done.length) this.toast(this.live ? 'WELCOME BACK' : 'SUPRABHATA, KARKALA', this.live ? `₹${this.save.money.toLocaleString('en-IN')} in your pocket` : `Good morning. Temple bells, birdsong and mist on the kere. ₹${this.save.money.toLocaleString('en-IN')} in your pocket.`);
  }
  frame() {
    if (this.freezeFrame) return;            // used by automated screenshot tests
    const raw = this.clock.getDelta(), dt = Math.min(0.05, raw); this.now += dt; this.dtLast = dt;
    this.adaptQuality(raw);
    const live = this.started || this.cine.active;
    if (this.cine.active) this.cine.update(dt);
    if (this.endTick) this.endTick(dt);
    if (live && !this.paused && !this.photo) this.update(dt); else if (this.photo) this.updateSky(0);
    if (this.dlg) this.updateDialogue(dt);
    this.updateCamera(dt); this.renderer.render(this.scene, this.cam);
    if (this.cine.active) { this.cine.captureFrame(this.renderer.domElement); this.cine.drawOverlay(); }
    if (live && !this.paused && !this.photo && !this.cine.active) { this.radio.update(dt); this.hudUpdate(dt); this.radioHud(dt); }
    if (this.audio.ctx && live) {
      const rd = this.radio, pf = this.culture.near, lv = { song: rd.active && rd.song ? rd.song.id : null, vol: 1 };
      rd.live = pf && !rd.active && !this.cine.active ? { song: pf.site.def.song, name: pf.site.def.name, color: pf.site.def.color } : null;
      if (rd.live) { lv.song = rd.live.song; lv.vol = 0.3 + 0.7 * pf.vol; } else if (pf && lv.song) lv.vol = 1 - 0.55 * pf.vol;
      const p = this.carOrPlayer(), t = this.world.temple;  this.audio.update(dt, { day: this.dayAmt ?? 1, rain: this.raining, templeDist: t ? Math.hypot(t[0] - p.x, t[1] - p.z) : 999, traffic: this.vehicles.reduce((a, v) => a + (v.driver === 'ai' && Math.hypot(v.x - p.x, v.z - p.z) < 80 ? 1 : 0), 0), chase: this.level >= 2, song: lv.song, vol: lv.vol, morning: this.morn || 0, cheer: this.culture.cheer, intensity: this.car ? Math.min(1, Math.abs(this.car.v) / 22 + (this.level >= 2 ? 0.4 : 0)) : 0.25, scene: this.cine.active ? this.cine.list[this.cine.shot]?.music : this.endMode ? 'ending' : null });
    }
  }
  /** Debug/testing: advance the simulation without rendering. */
  step(n = 1, dt = 1 / 30) { this.dtLast = dt; for (let i = 0; i < n; i++) { this.now += dt; this.update(dt); } this.updateCamera(dt); }
  /** Lower resolution, then shadow quality, on slow laptops (checked every 4 seconds). */
  /** Real sky over Karkala: current rain and cloud from Open-Meteo (free, no key). Falls back to the game's own weather if it can't be reached. */
  async fetchWeather() {
    try {
      const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=13.2135&longitude=74.996&current=precipitation,rain,showers,cloud_cover,weather_code&timezone=Asia%2FKolkata', { cache: 'no-store' });
      const c = (await r.json()).current; if (!c) throw 0;
      const first = !this.wx; this.wx = { rain: c.precipitation || 0, cloud: (c.cloud_cover || 0) / 100, code: c.weather_code };
      if (first && this.live) { const hh = Math.floor(this.time / 60), mm = Math.floor(this.time % 60); this.toast('KARKALA, LIVE', `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'} IST · ${this.wx.rain > 0.05 ? 'raining right now' : 'dry'} · ${Math.round(this.wx.cloud * 100)}% cloud`); }
    } catch (e) { /* offline: keep the game's own weather */ }
  }
  /** Hide city tiles that are further than the fog distance: they are fully fogged anyway and cost draw calls. */
  cullFar() {
    if (!this.tiles) { this.tiles = this.scene.children.filter(o => o.isInstancedMesh); for (const t of this.tiles) if (!t.boundingSphere) t.computeBoundingSphere(); }
    const c = this.cam.position, far = this.scene.fog.far + 30;
    for (const t of this.tiles) { const s = t.boundingSphere, d = Math.hypot(s.center.x - c.x, s.center.y - c.y, s.center.z - c.z); t.visible = d - s.radius < far; }
  }
  setGraphics(level) {          // 0 auto, 1 low, 2 lowest
    this.gfx = level; try { localStorage.setItem('nk-gfx', String(level)); } catch (e) { }
    M.DETAIL.value = level >= 1 ? 0 : 1; const R = this.renderer; if (level === 0) { R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25)); R.shadowMap.enabled = true; this.qLevel = 0; }
    else if (level === 1) { R.setPixelRatio(1); R.shadowMap.enabled = true; this.qLevel = 2; this.sun.shadow.mapSize.set(1024, 1024); this.sun.shadow.map?.dispose(); this.sun.shadow.map = null; }
    else { R.setPixelRatio(0.75); R.shadowMap.enabled = false; this.qLevel = 9; }
    this.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); R.setSize(innerWidth, innerHeight);
  }
  adaptQuality(raw) {
    if (this.gfx) return;
    this.qT = (this.qT || 0) + raw; this.qN = (this.qN || 0) + 1;
    if (this.qT < 2.5) return; const fps = this.qN / this.qT; this.qT = 0; this.qN = 0; this.fps = fps;
    if (this.paused || this.photo || fps > 42) return;
    this.qLevel = (this.qLevel || 0) + 1; const R = this.renderer; if (this.qLevel >= 2) M.DETAIL.value = 0;      // drop the weathering shaders on slow machines
    if (this.qLevel === 1) R.setPixelRatio(1);
    else if (this.qLevel === 2) { this.sun.shadow.mapSize.set(1024, 1024); this.sun.shadow.map?.dispose(); this.sun.shadow.map = null; }
    else if (this.qLevel === 3) { R.setPixelRatio(0.75); }
    else if (this.qLevel === 4) { R.shadowMap.enabled = false; this.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); }
    R.setSize(innerWidth, innerHeight);
  }
  update(dt) {
    const inp = this.input(), p = this.player, w = this.world; this._inp = inp;
    this.popT = (this.popT || 0) - dt; if (this.popT < 0) { this.popT = 0.4; this.populate(); }
    const cin = this.cine.active;
    if ((this.cullT = (this.cullT || 0) + 1) % 6 === 0) this.cullFar();
    this.updateNpcs(dt); People.update(dt, this.carOrPlayer().x, this.carOrPlayer().z); this.culture.update(dt); this.food.update(dt); this.extras.update(dt); this.chatter.update(dt);
    // the player
    if (cin) { /* no player in the trailer */ } else if (this.car) {
      const c = this.car, steer = inp.x, thr = inp.y;
      const impact = c.physics(dt, { thr, steer, hand: inp.hand, boost: inp.boost });
      if (impact > 6) { this.audio.thud(impact); this.shake = Math.min(0.6, impact * 0.04); if (c.def.two && impact > 12) { this.exitVehicle(); p.down = 1.6; p.hp -= impact * 2; this.say('Ayyo! Off the scooter!', 2); } }
      c.sync(); if (this.car) { p.x = c.x; p.z = c.z; }
      this.audio.engine(c.kind, c.v, thr);
      if (w.inWater(c.x, c.z) && !this.sinking) { this.sinking = 1; this.audio.splash(); this.say(c.kind === 'bus' ? 'You drove a bus into the kere. Pramod will hear about this.' : 'Splash! Into the kere.', 3); }
      if (this.sinking) { c.v *= 0.9; c.sink = -(this.sinking - 1) * 1.6; this.sinking += dt; if (this.sinking > 2.5) { this.sinking = 0; c.sink = 0; const rd = w.nearestRoad(c.x, c.z, 200); this.exitVehicle(); if (rd) this.teleport(rd.x, rd.z); this.addMoney(-150); this.toast('TOWED', 'Crane hire ₹150. Your vehicle is with the fish now.'); const i = this.vehicles.indexOf(c); if (i >= 0 && !c.tag) { c.dispose(); this.vehicles.splice(i, 1); } } }
    } else p.update(dt, inp, this.camYaw);
    if (!cin && p.hp <= 0) this.hospital(); else if (this.now - p.lastHurt > 8) p.hp = Math.min(100, p.hp + dt * 2);
    // traffic and others
    for (const v of this.vehicles) {
      if (v === this.car || v.police) continue;
      if (v.driver === 'ai') v.ai(dt);
      else if (v.driver === 'thief') { if (this.thief === v && Math.hypot(v.x - p.x, v.z - p.z) < 45) v.seek(dt, p.x, p.z, 15, true); else v.ai(dt); }
      else if (Math.abs(v.v) > 0.05) v.physics(dt, { thr: 0, steer: 0, hand: true });
      v.sync();
      // a moving vehicle hitting the player on foot
      if (!cin && !this.car && Math.abs(v.v) > 6 && p.down <= 0) { const d = Math.hypot(v.x - p.x, v.z - p.z); if (d < v.def.L / 2 + 0.4 && this.rayHit(v, p.x, p.z, 0.4)) { p.down = 1.8; p.hp -= Math.abs(v.v) * 3; p.lastHurt = this.now; this.audio.thud(v.v); v.v *= 0.3; this.sayQ(pick(['Q03', 'Q04']), 2); } }
    }
    if (!cin) this.updatePolice(dt);
    for (const v of this.police) v.sync();
    for (const q of this.peds) {
      q.update(dt);
      if (!cin && this.car && q.state !== 'down' && Math.abs(this.car.v) > 4 && this.rayHit(this.car, q.x, q.z, 0.35)) { q.knock(this.car.fx, this.car.fz, Math.abs(this.car.v)); this.audio.thud(this.car.v); this.offence(1); this.chatter.rage("hit", q); this.car.v *= 0.75; }
    }
    for (const c of this.cows) {
      c.update(dt);
      if (!cin && this.car && c.hit <= 0 && Math.abs(this.car.v) > 4 && this.rayHit(this.car, c.x, c.z, 0.9)) { c.hit = 3; c.h = this.car.h; this.audio.thud(9); this.offence(2); this.sayQ(pick(Q_COW), 3); this.car.v *= 0.2; }
    }
    if (!cin) { if (this.mission) this.missionUpdate(dt); else if (this.job) this.jobUpdate(dt); else this.missionUpdate(dt); }
    this.updateSky(dt); this.world.update(dt);
    this.marker.rotation.y += dt; if (this.marker.arrow) this.marker.arrow.position.y = 4 + Math.sin(this.now * 3) * 0.4;
    this.startMarker.rotation.y -= dt;
  }
  /** Is point (x,z) inside vehicle v's footprint (+r)? */
  rayHit(v, x, z, r) { const dx = x - v.x, dz = z - v.z, a = dx * v.fx + dz * v.fz, l = dx * v.fz - dz * v.fx; return Math.abs(a) < v.def.L / 2 + r && Math.abs(l) < v.def.W / 2 + r; }
  updateCamera(dt) {
    const t = this.car || this.player, c = this.cam;
    const k = this.cinCam || (this.dlg ? this.dialogueCam(dt) : null);
    if (k) { c.position.set(k.p[0], k.p[1], k.p[2]); c.lookAt(k.l[0], k.l[1], k.l[2]); if (Math.abs(c.fov - k.fov) > 0.05) { c.fov = k.fov; c.updateProjectionMatrix(); } this.sky.position.copy(c.position); return; }
    if (this.startOrbit && !this.started) { this.startOrbit(dt); return; }
    if (this.car && this.now - this.lastMouse > 1.2 && Math.abs(this.car.v) > 1) { const want = this.car.v > 0 ? this.car.h : this.car.h + Math.PI; this.camYaw += wrap(want - this.camYaw) * Math.min(1, dt * 2.5); }
    else if (!this.car && this._inp && !this.photo && this.now - this.lastMouse > 0.7) {      // on foot: swing the camera round behind you as you steer
      const iv = this._inp, moving = Math.hypot(iv.x, iv.y) > 0.1;
      if (moving && iv.y > -0.1) this.camYaw += wrap(this.player.h - this.camYaw) * Math.min(1, dt * (Math.abs(iv.x) > 0.1 ? 2.8 : 1.0));
    }
    const h = this.car ? this.car.def.H * 0.75 + 0.6 : 1.6;
    const ty = (this.car ? this.car.y : this.player.y) + h, d = this.camDist, cp = Math.cos(this.camPitch), sp = Math.sin(this.camPitch);
    let x = t.x - Math.sin(this.camYaw) * d * cp, z = t.z - Math.cos(this.camYaw) * d * cp, y = ty + d * sp;
    y = Math.max(y, this.world.groundH(x, z) + 0.6);
    if (this.shake > 0.01) { x += rnd(-1, 1) * this.shake; y += rnd(-1, 1) * this.shake; this.shake *= 0.85; }
    c.position.set(x, y, z); c.lookAt(t.x, ty, t.z);
    const target = this.car ? 62 + clamp(Math.abs(this.car.v) - 8, 0, 20) * 0.6 : 62; if (Math.abs(c.fov - target) > 0.1) { c.fov = lerp(c.fov, target, dt * 3); c.updateProjectionMatrix(); }
    this.sky.position.copy(c.position);
  }

  /* ====================================================================== money, save */
  addMoney(n, cheat) { this.save.money = Math.max(0, this.save.money + n); if (!cheat && n > 0) this.save.earned = (this.save.earned || 0) + n; }
  load() {
    let s = null; try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { }
    this.save = Object.assign({ money: 500, done: [], time: 16.5 * 60, pos: null }, s || {});
    this.time = this.save.time;
    { let liveOn = false; try { liveOn = localStorage.getItem('nk-live') === '1'; } catch (e) { } if (!liveOn && !(this.time >= 5.5 * 60 && this.time <= 10 * 60)) this.time = 7.2 * 60; }      // the game starts on a fresh Karkala morning
  }
  store() {
    const p = this.carOrPlayer(); this.save.time = this.time; this.save.pos = this.save.done.length ? [p.x, p.z] : null;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)); } catch (e) { }
  }

  /* ====================================================================== HUD */
  hudInit() { this.miniC = $('mini'); this.miniX = this.miniC.getContext('2d'); this.shownMoney = this.save.money; this.areaT = 0; }
  hudShow(on) { document.body.classList.toggle('playing', on); }
  objective(html) { $('obj').innerHTML = html; $('obj').style.display = html ? 'block' : 'none'; }
  /** A short voiced street line from the script (Kannada / Tulu / English). */
  sayQ(id, sec = 2.5) { const r = LINES[id]; if (!r) return; this.say(Voice.text(id), sec); if (!this.cine.active && !this.dlg) Voice.speak(id, r.w); }
  say(text, sec = 3, who) { if (who && Voice.enabled && !this.cine.active) Voice.speak(text.replace(/^[^:]+: /, ''), who); const el = $('say'); el.textContent = text; el.style.opacity = 1; clearTimeout(this._sayT); this._sayT = setTimeout(() => el.style.opacity = 0, sec * 1000); }
  hint(text, sec = 1.5) { const el = $('hint'); el.textContent = text; el.style.opacity = 1; clearTimeout(this._hintT); this._hintT = setTimeout(() => el.style.opacity = 0, sec * 1000); }
  toast(title, text) { const el = $('toast'); el.innerHTML = `<b>${title}</b><span>${text}</span>`; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
  big(title, sub, color) { const el = $('big'); el.innerHTML = `<div style="color:${color}">${title}</div><span>${sub}</span>`; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
  radioHud(dt) {
    const el = $('radio'), r = this.radio, show = (!!this.car && r.has(this.car.kind) && (r.active || r.flash > 0)) || (!!r.live && !r.active);
    el.classList.toggle('show', show); if (!show) return;
    const st = r.station, song = r.song;
    if (!r.active && r.live) { el.style.setProperty('--rc', r.live.color); $('rstn').textContent = '● LIVE · ' + r.live.name; $('rsong').textContent = r.song ? `${r.song.title} — ${r.song.artist}` : ''; const lyr = r.lyricId ? Voice.text(r.lyricId) : ''; if ($('rlyr').textContent !== lyr) $('rlyr').textContent = lyr; const an = this.audio.studio && this.audio.studio.analyser; if (an) { this._fq = this._fq || new Uint8Array(an.frequencyBinCount); an.getByteFrequencyData(this._fq); const bars = $('rbars').children; for (let b = 0; b < bars.length; b++) bars[b].style.height = (4 + (this._fq[2 + b * 3] || 0) / 255 * 22) + 'px'; } }
    else if (!r.active) { $('rstn').textContent = 'Radio off'; $('rsong').textContent = 'Press R for a station'; $('rlyr').textContent = ''; el.style.setProperty('--rc', '#888'); }
    else {
      el.style.setProperty('--rc', st.color); $('rstn').textContent = st.name; $('rsong').textContent = `${song.title} — ${song.artist}`;
      const lyr = r.lyricId ? Voice.text(r.lyricId) : ''; if ($('rlyr').textContent !== lyr) $('rlyr').textContent = lyr;
      const an = this.audio.studio && this.audio.studio.analyser; if (an) { this._fq = this._fq || new Uint8Array(an.frequencyBinCount); an.getByteFrequencyData(this._fq); const bars = $('rbars').children; for (let b = 0; b < bars.length; b++) bars[b].style.height = (4 + (this._fq[2 + b * 3] || 0) / 255 * 22) + 'px'; }
    }
  }
  hudUpdate(dt) {
    const s = this.save; this.shownMoney += (s.money - this.shownMoney) * Math.min(1, dt * 6);
    $('money').textContent = '₹' + Math.round(this.shownMoney).toLocaleString('en-IN');
    const hh = Math.floor(this.time / 60), mm = Math.floor(this.time % 60);
    $('clock').textContent = `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`;
    $('wx').textContent = (this.raining > 0.4 ? '🌧 Rain' : (hh >= 19 || hh < 6) ? '🌙 Clear' : '☀ Clear') + (this.live ? (this.wx ? ' · live' : ' · live time') : '');
    const lvl = this.level; $('stars').innerHTML = [1, 2, 3, 4, 5].map(i => `<i class="${i <= lvl ? 'on' : ''}">★</i>`).join(''); $('wlabel').textContent = WANTED[lvl] || '';
    $('wanted').classList.toggle('hot', lvl >= 2); $('hpbar').style.width = clamp(this.player.hp, 0, 100) + '%';
    if (this.car) { $('speed').style.display = 'block'; $('kmh').textContent = Math.round(Math.abs(this.car.v) * 3.6); $('vname').textContent = this.car.def.label + (this.car.mesh.userData.busName ? ` · ${this.car.mesh.userData.busName}` : ''); }
    else $('speed').style.display = 'none';
    this.areaT -= dt; if (this.areaT < 0) { this.areaT = 0.6; const p = this.carOrPlayer(), n = this.world.placeName(p.x, p.z); if (n !== this.area) { this.area = n; $('area').textContent = n; $('area').classList.remove('pop'); void $('area').offsetWidth; $('area').classList.add('pop'); } }
    // context hints
    if (!this.car && !this.player.down) { const p = this.player; let near = null; for (const v of this.vehicles) if (Math.hypot(v.x - p.x, v.z - p.z) - v.def.L / 2 < 2.6) { near = v; break; } $('ctx').textContent = near && near.driver !== 'thief' ? `F · ${near.driver === 'ai' ? 'grab' : 'ride'} the ${near.def.label.toLowerCase()}` : ''; }
    else $('ctx').textContent = this.car ? (this.job ? 'J · end shift' : (!this.mission ? 'J · start a side job' : '')) : '';
    this.drawMini();
  }
  drawMini() {
    const x = this.miniX, C = this.miniC, W = C.width, mm = this.world.minimap, p = this.carOrPlayer(), zoom = this.car ? 1.1 : 1.6;
    x.save(); x.clearRect(0, 0, W, W); x.beginPath(); x.arc(W / 2, W / 2, W / 2 - 2, 0, 7); x.clip();
    x.fillStyle = '#1f3b22'; x.fillRect(0, 0, W, W);
    const th = -Math.PI / 2 - Math.atan2(Math.cos(this.camYaw), Math.sin(this.camYaw));
    x.translate(W / 2, W / 2); x.rotate(th); x.scale(zoom, zoom);
    const px = (p.x - mm.x0) * mm.S, pz = (p.z - mm.z0) * mm.S; x.drawImage(mm.canvas, -px, -pz);
    const blip = (wx, wz, col, r = 4) => { let bx = (wx - mm.x0) * mm.S - px, bz = (wz - mm.z0) * mm.S - pz; const L = Math.hypot(bx, bz), lim = (W / 2 - 10) / zoom; if (L > lim) { bx *= lim / L; bz *= lim / L; } x.fillStyle = col; x.beginPath(); x.arc(bx, bz, r / zoom, 0, 7); x.fill(); x.strokeStyle = '#000'; x.lineWidth = 1 / zoom; x.stroke(); };
    for (const v of this.police || []) blip(v.x, v.z, (this.now * 4 | 0) % 2 ? '#3b82f6' : '#ef4444', 3.5);
    if (this.mission && this.mission.target) blip(this.mission.target[0], this.mission.target[1], '#facc15', 6);
    else if (this.job && this.jobTarget) blip(this.jobTarget[0], this.jobTarget[1], '#facc15', 6);
    else if (this.nextStart && !this.mission) blip(this.nextStart[0], this.nextStart[1], '#f97316', 6);
    x.restore();
    const hh = (this.car ? this.car.h : this.player.h);
    x.save(); x.translate(W / 2, W / 2); x.rotate(th + Math.atan2(Math.cos(hh), Math.sin(hh)) + Math.PI / 2);
    x.fillStyle = '#fff'; x.strokeStyle = '#111'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(0, -8); x.lineTo(6, 6); x.lineTo(0, 3); x.lineTo(-6, 6); x.closePath(); x.fill(); x.stroke(); x.restore();
    x.save(); x.translate(W / 2, W / 2); x.rotate(th); x.fillStyle = '#facc15'; x.font = 'bold 13px system-ui'; x.textAlign = 'center'; x.fillText('N', 0, -W / 2 + 16); x.restore();
  }
  toggleMap() {
    const el = $('bigmap'), on = !el.classList.contains('show'); el.classList.toggle('show', on); if (!on) return;
    const c = $('bigc'), mm = this.world.minimap, sc = Math.min((innerWidth - 60) / mm.canvas.width, (innerHeight - 120) / mm.canvas.height);
    c.width = mm.canvas.width * sc; c.height = mm.canvas.height * sc; const x = c.getContext('2d'); x.drawImage(mm.canvas, 0, 0, c.width, c.height);
    const P = (wx, wz) => [(wx - mm.x0) * mm.S * sc, (wz - mm.z0) * mm.S * sc];
    x.font = '600 13px system-ui'; x.textAlign = 'center';
    for (const a of AREAS) { const p = this.world.pois[a.at]; if (!p) continue; const [u, v] = P(p[0], p[1]); x.fillStyle = 'rgba(0,0,0,.55)'; const tw = x.measureText(a.name).width; x.fillRect(u - tw / 2 - 5, v - 10, tw + 10, 18); x.fillStyle = '#fff'; x.fillText(a.name, u, v + 4); }
    const pl = this.carOrPlayer(), [u, v] = P(pl.x, pl.z); x.fillStyle = '#38bdf8'; x.beginPath(); x.arc(u, v, 7, 0, 7); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 2; x.stroke();
    const tg = this.mission?.target || this.jobTarget || this.nextStart; if (tg) { const [a, b] = P(tg[0], tg[1]); x.fillStyle = '#facc15'; x.beginPath(); x.arc(a, b, 8, 0, 7); x.fill(); x.stroke(); }
    $('mapnote').textContent = this.nextMission() ? `Next mission: ${this.nextMission().title}` : 'All story missions done';
  }
  togglePause() {
    this.paused = !this.paused; $('pause').classList.toggle('show', this.paused); this.keys.clear();
    if (this.paused) { document.exitPointerLock?.(); this.audio.engine(null); this.audio.siren(false); this.store();
      $('progress').innerHTML = `${this.save.done.length} / ${this.MISSIONS.length} missions · ₹${this.save.money.toLocaleString('en-IN')}<div style="text-align:left;margin:10px auto 0;display:inline-block;font-size:14px;line-height:1.7">` +
        this.MISSIONS.map((m, i) => { const d = this.save.done.includes(m.id), nx = this.nextMission() === m; return `<div style="color:${d ? '#86efac' : nx ? '#facc15' : '#8d7c63'}">${d ? '✓' : nx ? '▶' : '○'} Chapter 1.${i + 1} · ${m.title}</div>`; }).join('') + '</div>'; }
  }
  togglePhoto() {
    this.photo = !this.photo; document.body.classList.toggle('photo', this.photo); this.keys.clear(); this.audio.engine(null);
    if (this.photo) { this.camDistBefore = this.camDist; this.camDist = Math.max(this.camDist, 7); } else this.camDist = this.camDistBefore || this.camDist;
  }
  savePhoto() {
    if (!this.photo) return; this.renderer.render(this.scene, this.cam);
    const url = this.renderer.domElement.toDataURL('image/png'); const a = document.createElement('a'); a.href = url; a.download = `namma-karkala-${Date.now()}.png`; a.click();
    this.photoTaken = this.mission && this.mission.def.steps[this.mission.i]?.t === 'photo';
    this.toast('PHOTO SAVED', 'Check your downloads. Send it to the family group.'); this.audio.coin();
    if (this.photoTaken) setTimeout(() => { if (this.photo) this.togglePhoto(); }, 400);
  }
}

function fmtT(s) { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
