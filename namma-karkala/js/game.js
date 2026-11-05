// The game: rendering, camera, input, traffic, police, missions, jobs, weather, saving and the HUD.
import * as THREE from './three.module.min.js';
import { World, AREAS } from './world.js';
import { Vehicle, Ped, Cow, Player, wrap } from './actors.js';
import * as M from './models.js';
import { Audio } from './audio.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const $ = (id) => document.getElementById(id);
const SAVE_KEY = 'namma-karkala-v1';
const WANTED = ['', 'GOSSIP', 'FINE', 'JEEP CHASE', 'CHECKPOST', 'FRONT PAGE'];
const OUCH = ['Ey! Kannu kaanalva?', 'Yen maaraya!', 'Swalpa nodi hogi!', 'Ayyo, nanna kaalu!', 'Daane maaraya?!', 'Police ge call maadtini!'];
const HIJACK = ['Nanna gaadi! Ille nillu!', 'Ey! Kallaa! Kallaa!', 'Amma! Gaadi hoytu!'];
const COWHIT = ['You hit a cow. In Karkala. Everyone saw.', 'The cow is fine. Your reputation is not.'];

export class Game {
  constructor(map, onProgress) {
    this.map = map; this.audio = new Audio(); this.now = 0; this.keys = new Set(); this.cheats = {}; this.paused = false; this.photo = false;
    const R = this.renderer = new THREE.WebGLRenderer({ canvas: $('view'), antialias: true, powerPreference: 'high-performance' });
    R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); R.setSize(innerWidth, innerHeight);
    R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
    R.outputColorSpace = THREE.SRGBColorSpace;
    const S = this.scene = new THREE.Scene();
    S.fog = new THREE.Fog('#c9d8e6', 140, 560);
    this.cam = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.3, 900);
    this.hemi = new THREE.HemisphereLight('#cfe4ff', '#5b6b3a', 0.9); S.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight('#fff1d6', 2.2); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -75, right: 75, top: 75, bottom: -75, near: 1, far: 400 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
    S.add(sun); S.add(sun.target);
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
    this.setupParked(); this.setupMissions();
    this.bindInput(); this.hudInit();
    addEventListener('resize', () => { R.setSize(innerWidth, innerHeight); this.cam.aspect = innerWidth / innerHeight; this.cam.updateProjectionMatrix(); });
  }

  /* ====================================================================== setup */
  makeSky() {
    const g = new THREE.SphereGeometry(800, 32, 16);
    this.skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color('#5aa0e6') }, bot: { value: new THREE.Color('#d8e6f0') }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color('#fff3c4') }, night: { value: 0 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `uniform vec3 top, bot, sunCol, sunDir; uniform float night; varying vec3 vP;
        float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164)))*43758.5453); }
        void main(){ float y = clamp(vP.y,0.,1.); vec3 c = mix(bot, top, pow(y, .55));
          float s = max(dot(vP, normalize(sunDir)), 0.); c += sunCol * (pow(s, 900.)*3. + pow(s, 12.)*.35);
          vec3 q = floor(vP*240.); float st = step(.9965, h(q)) * night * smoothstep(.05,.4,y); c += vec3(st);
          gl_FragColor = vec4(c, 1.); }` });
    this.sky = new THREE.Mesh(g, this.skyMat); this.sky.renderOrder = -1; this.scene.add(this.sky);
  }
  makeRain() {
    const n = 4000, pos = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) { const x = rnd(-40, 40), y = rnd(0, 30), z = rnd(-40, 40); pos.set([x, y, z, x + 0.05, y - 0.9, z + 0.05], i * 6); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rain = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#a9c3d8', transparent: true, opacity: 0.55 })); this.rain.visible = false; this.rain.frustumCulled = false; this.scene.add(this.rain);
    this.raining = 0; this.rainOn = false;
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
    for (let i = 0; i < 26; i++) {
      const n = pick(nodes), e = pick(n.adj), dx = e.n.x - n.x, dz = e.n.z - n.z, L = Math.hypot(dx, dz) || 1, t = rnd(0.3, 0.7), s = Math.random() < 0.5 ? 1 : -1;
      const x = n.x + dx * t + (-dz / L) * (e.w / 2 + 1) * s, z = n.z + dz * t + (dx / L) * (e.w / 2 + 1) * s;
      if (w.blocked(x, z, 1)) continue;
      const v = new Vehicle(this, pick(['scooter', 'scooter', 'bike', 'car', 'auto']), x, z, Math.atan2(dx, dz)); v.parked = true; this.vehicles.push(v);
    }
  }

  /* ====================================================================== input */
  bindInput() {
    const cv = $('view');
    addEventListener('keydown', (e) => {
      if (!this.started) return;
      const k = e.key.toLowerCase(); this.audio.resume();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(k);
      if (k.length === 1 && /[a-z]/.test(k)) this.cheat(k);
      if (k === 'escape') { if (this.photo) this.togglePhoto(); else if ($('bigmap').classList.contains('show')) this.toggleMap(); else this.togglePause(); return; }
      if (this.paused) return;
      if (k === 'f' || k === 'e') this.interact();
      if (k === 'h') { const kind = this.car ? this.car.kind : 'scooter'; this.audio.horn(kind); this.honked(this.car || this.player); }
      if (k === 'm') this.toggleMap();
      if (k === 'o') this.togglePhoto();
      if (k === 'enter' && this.photo) this.savePhoto();
      if (k === 'j') this.toggleJob();
      if (k === 'c') this.camDist = this.camDist * 1.35 > 22 ? (this.car ? this.car.def.cam : 5.5) : this.camDist * 1.35;
    });
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => this.keys.clear());
    cv.addEventListener('click', () => { if (this.started && !this.paused && document.pointerLockElement !== cv) cv.requestPointerLock?.(); });
    addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== cv && !(e.buttons & 1)) return;
      this.camYaw -= e.movementX * 0.0028; this.camPitch = clamp(this.camPitch + e.movementY * 0.0022, -0.25, 1.25); this.lastMouse = this.now;
    });
    addEventListener('wheel', (e) => { if (this.started) this.camDist = clamp(this.camDist * (e.deltaY > 0 ? 1.1 : 0.9), 3, 30); }, { passive: true });
    $('resume').onclick = () => this.togglePause();
    $('mute').onclick = () => { this.audio.setMuted(this.audio.on); $('mute').textContent = this.audio.on ? 'Sound: on' : 'Sound: off'; };
    $('reset').onclick = () => { if (confirm('Delete your Karkala progress and start again?')) { localStorage.removeItem(SAVE_KEY); location.reload(); } };
    $('photoSave').onclick = () => this.savePhoto();
  }
  input() {
    const k = this.keys, x = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0), y = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
    return { x, y, run: k.has('shift'), jump: k.has(' '), hand: k.has(' '), boost: k.has('shift') };
  }
  cheat(ch) {
    this.cbuf = ((this.cbuf || '') + ch).slice(-12);
    const C = {
      barsa: ['Heavy rain (barsa!)', () => { this.rainOn = true; }], surya: ['Clear skies', () => { this.rainOn = false; }],
      irulu: ['Night falls', () => { this.time = 22 * 60; }], belaku: ['Morning light', () => { this.time = 7 * 60; }],
      paisa: ['+₹10,000 (not real, sadly)', () => { this.addMoney(10000, true); }], policeilla: ['Police forgot about you', () => { this.heat = 0; }],
      golibaje: ['Full health. Goli baje fixes everything.', () => { this.player.hp = 100; }], bahubali: ['Bahubali jump', () => { this.cheats.moon = !this.cheats.moon; }],
      busbeku: ['A bus appears', () => this.spawnNear('bus')], autobeku: ['Pom pom! An auto', () => this.spawnNear('auto')], bullet: ['A motorbike', () => this.spawnNear('bike')],
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
    if (this.car) { if (Math.abs(this.car.v) > 6) { this.hint('Slow down to get off', 1.5); return; } this.exitVehicle(); return; }
    this.enterNearest();
  }
  exitVehicle() {
    const p = this.player, c = this.car; if (!c) return;
    {
      const lx = -Math.cos(c.h) * (c.def.W / 2 + 0.9), lz = Math.sin(c.h) * (c.def.W / 2 + 0.9);
      let x = c.x + lx, z = c.z + lz; if (this.world.blocked(x, z, 0.4)) { x = c.x - lx; z = c.z - lz; }
      p.x = x; p.z = z; p.y = this.world.groundH(x, z); p.mesh.visible = true; c.driver = null; c.parked = true; c.removeDriverModel(); this.car = null; this.camDist = 5.5; this.audio.engine(null); this.sinking = 0; c.sink = 0;
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
      this.say(pick(HIJACK), 2.5); this.offence(best.driver === 'police' ? 2.2 : 1.1);
      if (best.police) this.police = this.police.filter(v => v !== best);
    }
    best.driver = 'player'; best.parked = false; best.removeDriverModel(); this.car = best; this.camDist = best.def.cam;
    p.mesh.visible = false; if (best.def.two) best.addDriverModel(true);
    this.camYaw = best.h;
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
    if (traffic < 34) {
      const near = w.nodesNear(p.x, p.z, 380).filter(n => Math.hypot(n.x - p.x, n.z - p.z) > 110 && n.adj.length);
      for (let k = 0; k < 4 && near.length; k++) {
        const n = pick(near), e = pick(n.adj); if (e.w < 6 && Math.random() < 0.6) continue;
        const kind = e.w >= 9 ? pick(['scooter', 'scooter', 'bike', 'auto', 'auto', 'car', 'car', 'bus', 'tempo']) : pick(['scooter', 'scooter', 'bike', 'auto', 'car']);
        const h = Math.atan2(e.n.x - n.x, e.n.z - n.z), L = Math.hypot(e.n.x - n.x, e.n.z - n.z) || 1, lo = e.w / 4 + 0.2;
        const x = n.x + ((e.n.z - n.z) / L) * lo, z = n.z - ((e.n.x - n.x) / L) * lo;
        if (this.vehicles.some(v => Math.hypot(v.x - x, v.z - z) < 12)) continue;
        const v = new Vehicle(this, kind, x, z, h, { driver: 'ai' }); v.aiInit(n, e.n); this.vehicles.push(v);
      }
    }
    if (this.peds.filter(q => !q.idle).length < 42) {
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
  shout(ped) { if (Math.hypot(ped.x - this.player.x, ped.z - this.player.z) < 40) this.say(pick(OUCH), 2.2); }
  offence(n) { this.heat = Math.min(5.99, this.heat + n); this.lastOffence = this.now; }
  onCrash(me, other) {
    if (other.driver === 'police') this.offence(1.2); else if (other.driver === 'ai' && Math.abs(me.v) > 9) this.offence(0.35);
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
      if (lvl >= 2) { v.seek(dt, p.x, p.z, 16 + lvl * 2.2); v.siren = true; }
      else { v.siren = false; if (!v.a) { const n = this.world.nodesNear(v.x, v.z, 80)[0]; if (n) v.aiInit(n, n.adj[0].n); } if (v.a) v.ai(dt); else v.physics(dt, { thr: 0, steer: 0, hand: true }); }
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
    this.MISSIONS = [
      { id: 'm1', title: 'Welcome Home', reward: 300, start: () => bus(), auto: true, steps: [
        { t: 'say', lines: ['RAJU: Four years in Bengaluru. Three of them stuck at Silk Board. Enough.', 'AMMA (phone): Raju! Ajja\'s scooter is parked near Gandhi Maidan. Take it to the temple for pooja first!'] },
        { t: 'goto', at: () => this.ajja ? [this.ajja.x, this.ajja.z] : R('Gandhi Maidan')(), r: 4, need: 'foot', text: 'Walk to Ajja\'s old red scooter near <b>Gandhi Maidan</b>' },
        { t: 'enter', tag: 'ajja', text: 'Press <b>F</b> to get on the scooter' },
        { t: 'stop', at: temple, r: 9, hold: 2.5, text: 'Ride to <b>Sri Venkataramana Temple</b> and stop at the gate' },
        { t: 'say', lines: ['ARCHAKARU: Lemon under the wheel... kumkuma on the headlight... done. Drive slowly, magu.', 'RAJU: A blessed 1998 scooter. Now we are unstoppable.'] }] },
      { id: 'm2', title: 'Goli Baje Express', reward: 500, start: R('Hotel Taj Mahal'), steps: [
        { t: 'say', lines: ['HOTEL OWNER: College canteen order! Forty goli baje, hot hot. If they get cold, don\'t come back.'] },
        { t: 'enter', two: true, text: 'Get on a <b>two-wheeler</b> (your scooter works)' },
        { t: 'timer', sec: 120 },
        { t: 'stop', at: R('Sri Bhuvanendra College'), r: 10, hold: 1, text: 'Deliver the hot goli baje to <b>Bhuvanendra College</b>' },
        { t: 'say', lines: ['CANTEEN ANNA: Still hot! Good boy. Students will survive one more lecture.'] }] },
      { id: 'm3', title: 'Conductor Saab', reward: 800, start: () => bus(), steps: [
        { t: 'say', lines: ['PRAMOD: Machaa, I have fever. Take my bus, SRI DURGA, on the town round. Stop at every stop. Right?', 'PRAMOD: And honk. A bus that does not honk is not a bus.'] },
        { t: 'enter', tag: 'pramod', text: 'Get into the red bus <b>SRI DURGA</b> at the bus stand' },
        { t: 'stop', at: R('Gandhi Maidan'), r: 12, hold: 2, text: 'Stop 1 of 3: <b>Gandhi Maidan</b>', pax: true },
        { t: 'stop', at: temple, r: 12, hold: 2, text: 'Stop 2 of 3: <b>Venkataramana Temple</b>', pax: true },
        { t: 'stop', at: R('Karkala Government Hospital'), r: 12, hold: 2, text: 'Stop 3 of 3: <b>Government Hospital</b>', pax: true },
        { t: 'stop', at: () => bus(), r: 14, hold: 2, text: 'Back to the <b>bus stand</b>' },
        { t: 'say', lines: ['PRAMOD: Full bus, no scratches? You should quit software, machaa.'] }] },
      { id: 'm4', title: 'The Mallige Thief', reward: 700, start: () => (w.marketRoad ? [w.marketRoad.pts[Math.floor(w.marketRoad.pts.length / 2)][0], w.marketRoad.pts[Math.floor(w.marketRoad.pts.length / 2)][1]] : R('Gopal Towers')()), steps: [
        { t: 'say', lines: ['AJJI: Ayyo! That boy in the red cap took my mallige! Twenty moLa! Catch him, Raju!'] },
        { t: 'chase', sec: 110, text: 'Catch the <b>thief on the black bike</b>. Stay close to him!' },
        { t: 'say', lines: ['THIEF: Sorry sorry! It was for my girlfriend!', 'AJJI: Buy her your own mallige. Here, ₹700 for the petrol.'] }] },
      { id: 'm5', title: 'Kere Evening', reward: 400, start: R('Rama Samudra'), steps: [
        { t: 'say', lines: ['SHWETHA: Raju anna! My Insta needs a photo of the basadi in Aanekere. Golden hour. Please?'] },
        { t: 'goto', at: () => { const k = w.kereBasadi || [112, 360]; const rd = w.nearestRoad(k[0], k[1], 200); return rd ? [rd.x, rd.z] : k; }, r: 9, text: 'Go to <b>Aanekere</b>, by the lake' },
        { t: 'photo', text: 'Press <b>O</b> for photo mode, frame the basadi in the lake, then press <b>Enter</b>' },
        { t: 'say', lines: ['SHWETHA: 400 likes in ten minutes! You are hired.'] }] },
      { id: 'm6', title: 'Bahubali Calling', reward: 1000, start: () => w.hillFoot || R('Bahubali Hill')(), steps: [
        { t: 'say', lines: ['RAJU: Ajja used to bring me here. Every step, he said, is one less worry.'] },
        { t: 'goto', at: () => w.hillTop || [w.hill.x, w.hill.z], r: 7, need: 'foot', text: 'Climb the steps up <b>Bahubali Betta</b> on foot' },
        { t: 'photo', text: 'Press <b>O</b> and take a photo with Bahubali, then press <b>Enter</b>' },
        { t: 'say', lines: ['RAJU: Silk Board never had a view like this.', 'RAJU: I am staying. Work from home. Work from Karkala.'] }] },
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
    if (s.t === 'say') { ms.say = s.lines.slice(); ms.sayT = 0; }
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
    if (s.t === 'say') { this.marker.visible = false; ms.sayT -= dt; if (ms.sayT <= 0) { if (!ms.say.length) return this.nextStep(); this.say(ms.say.shift(), 3.6); ms.sayT = 3.8; } return; }
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
    if (!this.photo) this.time = (this.time + dt * (60 / 60)) % 1440;      // 1 real second = 1 game minute
    const t = this.time / 1440, el = Math.sin((t - 0.25) * Math.PI * 2), az = (t - 0.25) * Math.PI * 2;
    const day = clamp(el * 3 + 0.25, 0, 1), dusk = clamp(1 - Math.abs(el) * 4, 0, 1) * (el > -0.2 ? 1 : 0);
    const p = this.carOrPlayer();
    const sd = new THREE.Vector3(Math.cos(az) * 0.8, Math.max(0.08, el), Math.sin(az) * 0.6).normalize();
    this.sun.position.set(p.x + sd.x * 150, sd.y * 150, p.z + sd.z * 150); this.sun.target.position.set(p.x, 0, p.z);
    const rain = this.raining;
    const top = new THREE.Color('#0b1430').lerp(new THREE.Color('#4f93dc'), day).lerp(new THREE.Color('#5b6675'), rain * 0.85);
    const bot = new THREE.Color('#1a2236').lerp(new THREE.Color('#d9e8f3'), day).lerp(new THREE.Color('#ff9c5a'), dusk * 0.65).lerp(new THREE.Color('#8b939c'), rain * 0.8);
    this.skyMat.uniforms.top.value.copy(top); this.skyMat.uniforms.bot.value.copy(bot); this.skyMat.uniforms.sunDir.value.copy(sd); this.skyMat.uniforms.night.value = 1 - day;
    this.skyMat.uniforms.sunCol.value.set(day > 0.1 ? '#fff1c2' : '#000'); this.skyMat.uniforms.sunCol.value.multiplyScalar(1 - rain);
    this.scene.fog.color.copy(bot); this.scene.fog.far = lerp(560, 260, rain); this.scene.fog.near = lerp(140, 40, rain);
    this.sun.intensity = (0.15 + 2.3 * day) * (1 - rain * 0.7); this.sun.color.set(dusk > 0.3 ? '#ffb27a' : '#fff1d6');
    if (day < 0.05) { this.sun.color.set('#9fb4ff'); this.sun.intensity = 0.35; }
    this.hemi.intensity = 0.35 + 1.25 * day; this.hemi.color.set(day > 0.2 ? '#cfe4ff' : '#5266a8');
    this.renderer.toneMappingExposure = 0.95 + 0.25 * (1 - day);
    this.world.setNight(1 - day); this.world.setWet(rain);
    // weather: Karkala rains often
    if (!this.cheatWeather) { this.wxT = (this.wxT || 0) - dt; if (this.wxT < 0) { this.wxT = rnd(60, 180); this.rainOn = this.rainOn ? Math.random() < 0.55 : Math.random() < 0.3; if (this.rainOn) this.toast('MALE BANTHU', 'It is raining again. Of course it is. This is Karkala.'); } }
    this.raining = clamp(this.raining + (this.rainOn ? dt / 6 : -dt / 8), 0, 1);
    this.rain.visible = this.raining > 0.05; this.rain.material.opacity = 0.6 * this.raining;
    if (this.rain.visible) {
      const a = this.rain.geometry.attributes.position.array, cp = this.cam.position, fall = 26 * dt;
      for (let i = 0; i < a.length; i += 6) { a[i + 1] -= fall; a[i + 4] -= fall; if (a[i + 4] < -2) { const x = rnd(-40, 40), y = rnd(22, 32), z = rnd(-40, 40); a[i] = x; a[i + 1] = y; a[i + 2] = z; a[i + 3] = x + 0.05; a[i + 4] = y - 0.9; a[i + 5] = z + 0.05; } }
      this.rain.geometry.attributes.position.needsUpdate = true; this.rain.position.set(cp.x, cp.y - 15, cp.z);
    }
    this.audio.rain(this.raining);
    const lightsOn = day < 0.5 || rain > 0.6;
    if (this.car && lightsOn && !this.car.def.two) { this.headlight.intensity = 40; } else if (this.car && lightsOn) this.headlight.intensity = 25; else this.headlight.intensity = 0;
    if (this.car) { const c = this.car; this.headlight.position.set(c.x + c.fx * c.def.L / 2, c.y + 1.1, c.z + c.fz * c.def.L / 2); this.headlight.target.position.set(c.x + c.fx * 25, 0, c.z + c.fz * 25); }
    if (day > 0.6 && Math.random() < dt * 0.05) this.audio.crow();
  }

  /* ====================================================================== main loop */
  start() {
    this.started = true; this.audio.init(); this.audio.resume(); this.clock = new THREE.Clock();
    this.hudShow(true); const loop = () => { requestAnimationFrame(loop); this.frame(); }; loop();
    setInterval(() => this.store(), 15000);
    if (this.save.done.length) this.toast('WELCOME BACK', `₹${this.save.money.toLocaleString('en-IN')} in your pocket`);
  }
  frame() {
    const raw = this.clock.getDelta(), dt = Math.min(0.05, raw); this.now += dt;
    this.adaptQuality(raw);
    if (!this.paused && !this.photo) this.update(dt); else if (this.photo) this.updateSky(0);
    this.updateCamera(dt); this.renderer.render(this.scene, this.cam);
    if (!this.paused && !this.photo) this.hudUpdate(dt);
  }
  /** Debug/testing: advance the simulation without rendering. */
  step(n = 1, dt = 1 / 30) { for (let i = 0; i < n; i++) { this.now += dt; this.update(dt); } this.updateCamera(dt); }
  /** Lower resolution, then shadow quality, on slow laptops (checked every 4 seconds). */
  adaptQuality(raw) {
    this.qT = (this.qT || 0) + raw; this.qN = (this.qN || 0) + 1;
    if (this.qT < 4) return; const fps = this.qN / this.qT; this.qT = 0; this.qN = 0; this.fps = fps;
    if (this.paused || this.photo || fps > 32) return;
    this.qLevel = (this.qLevel || 0) + 1; const R = this.renderer;
    if (this.qLevel === 1) R.setPixelRatio(1);
    else if (this.qLevel === 2) { this.sun.shadow.mapSize.set(1024, 1024); this.sun.shadow.map?.dispose(); this.sun.shadow.map = null; }
    else if (this.qLevel === 3) { R.setPixelRatio(0.75); }
    else if (this.qLevel === 4) { R.shadowMap.enabled = false; this.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); }
    R.setSize(innerWidth, innerHeight);
  }
  update(dt) {
    const inp = this.input(), p = this.player, w = this.world;
    this.popT = (this.popT || 0) - dt; if (this.popT < 0) { this.popT = 0.4; this.populate(); }
    // the player
    if (this.car) {
      const c = this.car, steer = inp.x, thr = inp.y;
      const impact = c.physics(dt, { thr, steer, hand: inp.hand, boost: inp.boost });
      if (impact > 6) { this.audio.thud(impact); this.shake = Math.min(0.6, impact * 0.04); if (c.def.two && impact > 9) { this.exitVehicle(); p.down = 1.6; p.hp -= impact * 2; this.say('Ayyo! Off the scooter!', 2); } }
      c.sync(); if (this.car) { p.x = c.x; p.z = c.z; }
      this.audio.engine(c.kind, c.v, thr);
      if (w.inWater(c.x, c.z) && !this.sinking) { this.sinking = 1; this.audio.splash(); this.say(c.kind === 'bus' ? 'You drove a bus into the kere. Pramod will hear about this.' : 'Splash! Into the kere.', 3); }
      if (this.sinking) { c.v *= 0.9; c.sink = -(this.sinking - 1) * 1.6; this.sinking += dt; if (this.sinking > 2.5) { this.sinking = 0; c.sink = 0; const rd = w.nearestRoad(c.x, c.z, 200); this.exitVehicle(); if (rd) this.teleport(rd.x, rd.z); this.addMoney(-150); this.toast('TOWED', 'Crane hire ₹150. Your vehicle is with the fish now.'); const i = this.vehicles.indexOf(c); if (i >= 0 && !c.tag) { c.dispose(); this.vehicles.splice(i, 1); } } }
    } else p.update(dt, inp, this.camYaw);
    if (p.hp <= 0) this.hospital(); else if (this.now - p.lastHurt > 8) p.hp = Math.min(100, p.hp + dt * 2);
    // traffic and others
    for (const v of this.vehicles) {
      if (v === this.car || v.police) continue;
      if (v.driver === 'ai') v.ai(dt);
      else if (v.driver === 'thief') { if (this.thief === v && Math.hypot(v.x - p.x, v.z - p.z) < 45) v.seek(dt, p.x, p.z, 15, true); else v.ai(dt); }
      else if (Math.abs(v.v) > 0.05) v.physics(dt, { thr: 0, steer: 0, hand: true });
      v.sync();
      // a moving vehicle hitting the player on foot
      if (!this.car && Math.abs(v.v) > 6 && p.down <= 0) { const d = Math.hypot(v.x - p.x, v.z - p.z); if (d < v.def.L / 2 + 0.4 && this.rayHit(v, p.x, p.z, 0.4)) { p.down = 1.8; p.hp -= Math.abs(v.v) * 3; p.lastHurt = this.now; this.audio.thud(v.v); v.v *= 0.3; this.say(pick(['Ayyo!', 'Kanninda nodi, maaraya!']), 2); } }
    }
    this.updatePolice(dt);
    for (const v of this.police) v.sync();
    for (const q of this.peds) {
      q.update(dt);
      if (this.car && q.state !== 'down' && Math.abs(this.car.v) > 4 && this.rayHit(this.car, q.x, q.z, 0.35)) { q.knock(this.car.fx, this.car.fz, Math.abs(this.car.v)); this.audio.thud(this.car.v); this.offence(1); this.car.v *= 0.75; }
    }
    for (const c of this.cows) {
      c.update(dt);
      if (this.car && c.hit <= 0 && Math.abs(this.car.v) > 4 && this.rayHit(this.car, c.x, c.z, 0.9)) { c.hit = 3; c.h = this.car.h; this.audio.thud(9); this.offence(2); this.say(pick(COWHIT), 3); this.car.v *= 0.2; }
    }
    if (this.mission) this.missionUpdate(dt); else if (this.job) this.jobUpdate(dt); else this.missionUpdate(dt);
    this.updateSky(dt);
    this.marker.rotation.y += dt; if (this.marker.arrow) this.marker.arrow.position.y = 4 + Math.sin(this.now * 3) * 0.4;
    this.startMarker.rotation.y -= dt;
  }
  /** Is point (x,z) inside vehicle v's footprint (+r)? */
  rayHit(v, x, z, r) { const dx = x - v.x, dz = z - v.z, a = dx * v.fx + dz * v.fz, l = dx * v.fz - dz * v.fx; return Math.abs(a) < v.def.L / 2 + r && Math.abs(l) < v.def.W / 2 + r; }
  updateCamera(dt) {
    const t = this.car || this.player, c = this.cam;
    if (this.car && this.now - this.lastMouse > 1.2 && Math.abs(this.car.v) > 1) { const want = this.car.v > 0 ? this.car.h : this.car.h + Math.PI; this.camYaw += wrap(want - this.camYaw) * Math.min(1, dt * 2.5); }
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
  }
  store() {
    const p = this.carOrPlayer(); this.save.time = this.time; this.save.pos = this.save.done.length ? [p.x, p.z] : null;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)); } catch (e) { }
  }

  /* ====================================================================== HUD */
  hudInit() { this.miniC = $('mini'); this.miniX = this.miniC.getContext('2d'); this.shownMoney = this.save.money; this.areaT = 0; }
  hudShow(on) { document.body.classList.toggle('playing', on); }
  objective(html) { $('obj').innerHTML = html; $('obj').style.display = html ? 'block' : 'none'; }
  say(text, sec = 3) { const el = $('say'); el.textContent = text; el.style.opacity = 1; clearTimeout(this._sayT); this._sayT = setTimeout(() => el.style.opacity = 0, sec * 1000); }
  hint(text, sec = 1.5) { const el = $('hint'); el.textContent = text; el.style.opacity = 1; clearTimeout(this._hintT); this._hintT = setTimeout(() => el.style.opacity = 0, sec * 1000); }
  toast(title, text) { const el = $('toast'); el.innerHTML = `<b>${title}</b><span>${text}</span>`; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
  big(title, sub, color) { const el = $('big'); el.innerHTML = `<div style="color:${color}">${title}</div><span>${sub}</span>`; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
  hudUpdate(dt) {
    const s = this.save; this.shownMoney += (s.money - this.shownMoney) * Math.min(1, dt * 6);
    $('money').textContent = '₹' + Math.round(this.shownMoney).toLocaleString('en-IN');
    const hh = Math.floor(this.time / 60), mm = Math.floor(this.time % 60);
    $('clock').textContent = `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`;
    $('wx').textContent = this.raining > 0.4 ? '🌧 Rain' : (hh >= 19 || hh < 6) ? '🌙 Clear' : '☀ Clear';
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
      $('progress').textContent = `${this.save.done.length} / ${this.MISSIONS.length} missions · ₹${this.save.money.toLocaleString('en-IN')}`; }
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
