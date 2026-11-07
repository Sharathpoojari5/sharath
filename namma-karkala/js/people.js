// Real rigged people: Microsoft Rocketbox avatars (MIT) with Rocketbox walk / run / idle / sit / wave animations, tinted to local skin tones.
// People.create() returns a Group whose pose follows how fast it moves. Old procedural limb handles (legL, armR ...) exist as inert shims.
import * as THREE from './three.module.min.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import * as SU from './vendor/SkeletonUtils.js';

const BASE = new URL('../models/people/', import.meta.url).href;
const MALE = ['Male_Adult_01', 'Male_Adult_02', 'Male_Adult_03', 'Male_Adult_05', 'Male_Adult_06', 'Male_Adult_08'];
const FEMALE = ['Female_Adult_02', 'Female_Adult_03', 'Female_Adult_05', 'Female_Adult_06', 'Female_Adult_07'];
const pick = (a) => a[Math.floor(Math.random() * a.length)], clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const SCALE = 0.0096;

export const People = {
  ready: false, tpl: {}, clips: {}, live: [], N: 0,
  async load(onProgress) {
    const L = new GLTFLoader(), names = [...MALE, ...FEMALE]; let done = 0;
    const a = await L.loadAsync(BASE + 'anims.glb');
    for (const c of a.animations) { c.tracks = c.tracks.filter(t => /^Bip01/.test(t.name) && !/Footsteps/.test(t.name)); this.clips[c.name] = c; }
    await Promise.all(names.map(async (n) => { const g = await L.loadAsync(BASE + n + '.glb'); this.tpl[n] = g.scene; done++; if (onProgress) onProgress(done / names.length); }));
    this.ready = true;
  },
  create(o = {}) {
    const female = o.female != null ? o.female : (typeof o.real === 'string' ? o.real.startsWith('Female') : Math.random() < 0.42);
    const name = typeof o.real === 'string' && this.tpl[o.real] ? o.real : pick(female ? FEMALE : MALE), pre = name.startsWith('Female') ? 'f_' : 'm_';
    const root = SU.clone(this.tpl[name]); root.scale.setScalar(SCALE); root.traverse(c => { if (c.isSkinnedMesh) { c.castShadow = true; c.receiveShadow = false; c.frustumCulled = false; } });
    const g = new THREE.Group(); g.add(root); g.userData.real = name;
    const mixer = new THREE.AnimationMixer(root), act = {}, want = { idle: ['idle_neutral_01'], walk: ['walk_neutral_01'], run: ['run_neutral_01'], sit: ['sit_chair_idle_neutral_01'], talk: ['gestic_talk_' + (pre === 'f_' ? 'cool' : 'neutral_01')], wave: ['wave_01'] };
    for (const [k, v] of Object.entries(want)) { const c = this.clips[pre + v[0]]; if (!c) continue; const a = mixer.clipAction(c); a.play(); a.setEffectiveWeight(k === 'idle' ? 1 : 0); a.time = Math.random() * c.duration; act[k] = a; }
    if (pre === 'm_' && Math.random() < 0.4 && this.clips.m_walk_stroll_01) { const old = act.walk; old.stop(); act.walk = mixer.clipAction(this.clips.m_walk_stroll_01); act.walk.play(); act.walk.setEffectiveWeight(0); }
    const sh = () => ({ rotation: new THREE.Euler() }); g.legL = sh(); g.legR = sh(); g.armL = sh(); g.armR = sh(); g.tail = null;
    Object.assign(g.userData, { mixer, act, w: { idle: 1 }, last: null, speed: 0, mode: 'idle', phase: Math.random() * 100, act_override: null });
    g.userData.root = root; this.live.push(g); return g;
  },
  bone(g, name) { let b = null; g.traverse(c => { if (!b && c.name === name) b = c; }); return b; },
  /** Force a pose for a while: 'wave' | 'talk' | null */
  pose(g, mode) { g.userData.act_override = mode; },
  update(dt, px, pz) {
    const live = this.live; dt = Math.min(dt, 0.1);
    for (let i = live.length - 1; i >= 0; i--) {
      const g = live[i], u = g.userData;
      if (!g.parent && !u.orphan) { u.orphan = (u.orphan || 0) + 1; }
      let p = g; let attached = false; while (p) { if (p.isScene) { attached = true; break; } p = p.parent; }
      if (!attached) { if (++u.gone > 120) live.splice(i, 1); continue; } u.gone = 0;
      if (!g.visible) continue;
      g.getWorldPosition(this._v || (this._v = new THREE.Vector3()));
      const wx = this._v.x, wz = this._v.z, d2 = (wx - px) * (wx - px) + (wz - pz) * (wz - pz);
      if (d2 > 75 * 75) { u.last = null; continue; }                                               // far away: freeze the pose
      if (u.last) { const mv = Math.hypot(wx - u.last[0], wz - u.last[1]); u.speed += ((mv > 6 ? 0 : mv / Math.max(dt, 1e-3)) - u.speed) * Math.min(1, dt * 8); }
      u.last = [wx, wz];
      const sit = g.legL.rotation.x < -0.9;
      let mode = sit ? 'sit' : u.act_override || (u.speed > 3.4 ? 'run' : u.speed > 0.4 ? 'walk' : 'idle');
      if (g.userData.mode !== mode) { g.userData.mode = mode; }
      const k = Math.min(1, dt * 7);
      for (const key in u.act) { const t = key === mode ? 1 : 0, cur = u.w[key] || 0, nv = cur + (t - cur) * k; u.w[key] = nv; u.act[key].setEffectiveWeight(nv < 0.01 ? 0 : nv); }
      if (u.act.walk) u.act.walk.timeScale = clamp(u.speed / 1.35, 0.55, 1.6); if (u.act.run) u.act.run.timeScale = clamp(u.speed / 4.4, 0.7, 1.4);
      u.mixer.update(dt);
    }
  },
};
