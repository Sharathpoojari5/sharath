// The in-vehicle radio: four original stations, switched with R like in GTA. Songs play in order with a DJ ident
// (spoken when a recording exists) and the lyric line of the moment is shown on screen.
import { SONGS, STATIONS } from './songs.js';
import { Voice } from './voice.js';

const NO_RADIO = new Set(['cycle', 'scooter', 'scooty', 'moped', 'bike', 'sportbike', 'tractor', 'ambulance']);
const DEFAULT = { bus: 3, ksrtc: 3, schoolbus: 4, auto: 1, jeep: 1, car: 0, suv: 1, omni: 0, tempo: 3, pickup: 3, minitruck: 3, taxi: 2, hatch: 0, sedan: 0, lorry: 3, tanker: 5 };      // buses and lorries open on the Tulu station

export class Radio {
  constructor(game) {
    this.g = game; this.idx = -1; this.si = 0; this.active = false; this.lyricId = null; this.flash = 0; this.last = -1; this.live = null;
    try { this.pref = parseInt(localStorage.getItem('nk-station') || '-1', 10); } catch (e) { this.pref = -1; }
  }
  has(kind) { return !NO_RADIO.has(kind); }
  /** Called when the player gets into a vehicle. */
  start(kind) {
    if (!this.has(kind)) { this.stop(); return; }
    const i = this.pref >= 0 && this.pref < STATIONS.length ? this.pref : (DEFAULT[kind] ?? 0);
    this.setStation(i, false);
  }
  stop() { this.active = false; this.idx = -1; this.lyricId = null; this.g.audio.studio && (this.g.audio.studio.onBar = null); }
  /** R: next station; after the last one the radio is off (the game score returns). */
  next() {
    if (!this.g.car || !this.has(this.g.car.kind)) return;
    const n = this.idx >= STATIONS.length ? 0 : this.idx + 1; if (n >= STATIONS.length) { this.active = false; this.idx = STATIONS.length; this.lyricId = null; this.pref = STATIONS.length; this.flash = 2.4; } else this.setStation(n, true);
    try { localStorage.setItem('nk-station', String(this.pref)); } catch (e) { }
  }
  setStation(i, ident) {
    this.idx = i; this.pref = i; this.active = true; this.si = Math.floor(Math.random() * STATIONS[i].songs.length); this.lyricId = null; this.flash = 2.4; this.hookBars();
    const st = STATIONS[i]; if (ident && Voice.manifest && Voice.hasFile(st.ident) && !this.g.dlg) Voice.speak(st.ident, 'DJ');
  }
  get station() { return this.idx >= 0 && this.idx < STATIONS.length ? STATIONS[this.idx] : null; }
  get song() { const s = this.station; if (this.active && s) return SONGS[s.songs[this.si]]; return this.live ? SONGS[this.live.song] : null; }
  hookBars() {
    const st = this.g.audio.studio; if (!st) return;
    st.onBar = (bar) => {
      const song = this.song; if (!song || !song.lyrics) return;
      const e = song.lyrics.find(l => l[0] === bar);
      if (e) { this.lyricId = e[1]; }
    };
  }
  update(dt) {
    if (this.flash > 0) this.flash -= dt;
    const st = this.g.audio.studio, song = this.song; if (!st || !song) return;
    if (!st.onBar) this.hookBars();
    if (this.active && st.song === song && st.i >= st.totalBars * 16) {            // song finished: next one on this station
      const s = this.station; this.si = (this.si + 1) % s.songs.length; this.lyricId = null; this.flash = 2.4;
      if (Voice.manifest && Voice.hasFile(s.ident) && !this.g.dlg && Math.random() < 0.6) Voice.speak(s.ident, 'DJ');
    }
  }
}
