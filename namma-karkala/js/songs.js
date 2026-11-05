// Original compositions (made for this game, so there is nothing to license). Each song is data for studio.js:
// tempo, scale, a 4-bar chord loop (scale degrees), drum patterns (16 steps per bar, x = hit, X = accent, o = ghost),
// two hook melodies [step, degree, length-in-steps, 'g' = gamaka slide], and the sections that switch layers on and off.
// Degrees index into the scale (0 = Sa) and keep climbing into the next octave (5 = Sa' in a 5-note scale).
// `lyrics` = [bar, lineId]: lines live in voice/script.json so they can be sung/chanted in Kannada or Tulu.

const N = (a) => ({ len: 32, notes: a });
const sections = (o) => [
  { name: 'intro', bars: 4, layers: o.intro, hook: 'A' },
  { name: 'verse', bars: 8, layers: o.verse, hook: 'A', counter: null },
  { name: 'hook', bars: 8, layers: o.hook, hook: 'B', counter: 'A' },
  { name: 'break', bars: 4, layers: o.brk, hook: 'A' },
  { name: 'hook2', bars: 8, layers: o.hook2, hook: 'B', counter: 'A' },
  { name: 'outro', bars: 4, layers: o.outro, hook: 'A' },
];

/** Verse lines a,b then chorus lines c,d, laid out over the 36-bar form (verse at bar 4, chorus at 12 and 24). */
const LY = ([a, b, c, d]) => [[4, a], [6, b], [8, a], [10, b], [12, c], [14, d], [16, c], [18, d], [24, c], [26, d], [28, c], [30, d], [32, d, 3]];

export const SONGS = {
  /* =============================================================== Radio Karkala: Tulunadu folk fusion */
  chande: {
    id: 'chande', vox: { vel: 1 }, title: 'Chande Chaitra', artist: 'Tulunadu Collective', bpm: 108, swing: 0.1, root: 146.83, scale: 'mohanam', seed: 11,
    prog: [0, 0, 3, 4], lead: 'nadas', leadOct: 2, counter: 'flute', counterOct: 4, padKind: 'harmonium', padRetrig: true, fill: 'chenda',
    pat: {
      kick: 'x.......x..x....', snare: '....x.......x...', clap: '....x.......x...', hat: 'x.x.x.x.x.x.x.xO',
      chenda: ['x.xx.xx.x.xx.x.x', 'x.xx.xxxx.xx.xbx'], dollu: 'x.......x..x....', tassa: '..x...x...x...x.',
      bass: 'x..x..x.x..x..8.', bassLen: 1.8,
    },
    hooks: {
      A: N([[0, 5, 3], [3, 4, 1], [4, 3, 2, 'g'], [6, 2, 2], [8, 3, 3], [11, 2, 1], [12, 0, 4], [16, 2, 2], [18, 3, 1], [19, 4, 2], [21, 5, 3, 'g'], [24, 7, 2], [26, 6, 1], [27, 5, 1], [28, 4, 4]]),
      B: N([[0, 7, 2], [2, 6, 1], [3, 5, 2, 'g'], [5, 4, 1], [6, 5, 2], [8, 7, 4], [12, 6, 2], [14, 5, 2], [16, 4, 2], [18, 3, 1], [19, 2, 1], [20, 3, 4, 'g'], [24, 2, 2], [26, 0, 2], [28, 2, 1], [29, 3, 1], [30, 2, 2]]),
    },
    sections: sections({
      intro: ['drone', 'pad', 'chenda', 'hook', 'fx'], verse: ['pad', 'chenda', 'dollu', 'kick', 'bass', 'hook', 'hat'],
      hook: ['pad', 'chenda', 'dollu', 'kick', 'snare', 'clap', 'bass', 'hook', 'counter', 'choir', 'hat', 'tassa', 'fx', 'fill'],
      brk: ['pad', 'chenda', 'dollu', 'hook', 'fx', 'fill'], hook2: ['pad', 'chenda', 'dollu', 'kick', 'snare', 'clap', 'bass', 'hook', 'counter', 'choir', 'hat', 'tassa', 'fx', 'fill'],
      outro: ['drone', 'pad', 'chenda', 'hook', 'fx'],
    }),
    lyrics: LY(["S01", "S02", "S03", "S04"]),
  },
  kambala: {
    id: 'kambala', vox: { vel: 1, startDeg: 3 }, title: 'Kambala Gallop', artist: 'Miyar Buffalo Brigade', bpm: 124, swing: 0.06, root: 164.81, scale: 'hamsadhwani', seed: 23,
    prog: [0, 3, 4, 3], lead: 'nadas', leadOct: 2, counter: 'pluck', counterOct: 4, padKind: 'harmonium', padRetrig: true, fill: 'tassa',
    pat: {
      kick: ['x..x..x.x..x..x.', 'x..x..x.x..x.xx.'], snare: '....x.......x..x', clap: '....x.......x...', hat: 'x.xxx.xxx.xxx.xx',
      chenda: 'x.x.xx.xx.x.xx.x', dollu: 'x..x....x..x....', tassa: ['..x.x.x...x.x.x.', 'x.x.x.x.xxx.x.xx'], bass: 'x.x.x..xx.x.x.8.', bassLen: 1.4,
    },
    hooks: {
      A: N([[0, 4, 2], [2, 4, 1], [3, 5, 1], [4, 7, 3, 'g'], [8, 6, 2], [10, 5, 1], [11, 4, 1], [12, 3, 4], [16, 3, 2], [18, 4, 1], [19, 5, 1], [20, 6, 2, 'g'], [22, 7, 2], [24, 8, 4], [28, 7, 2], [30, 6, 2]]),
      B: N([[0, 8, 3], [3, 7, 1], [4, 6, 2], [6, 5, 2], [8, 4, 2, 'g'], [10, 5, 2], [12, 6, 4], [16, 8, 2], [18, 9, 2], [20, 8, 2], [22, 7, 2], [24, 6, 3], [27, 5, 1], [28, 4, 4]]),
    },
    sections: sections({
      intro: ['kick', 'chenda', 'tassa', 'hook', 'fx'], verse: ['pad', 'chenda', 'dollu', 'kick', 'bass', 'hook', 'hat', 'tassa'],
      hook: ['pad', 'chenda', 'dollu', 'kick', 'snare', 'clap', 'bass', 'hook', 'counter', 'choir', 'hat', 'tassa', 'fx', 'fill'],
      brk: ['chenda', 'tassa', 'dollu', 'hook', 'fx', 'fill'], hook2: ['pad', 'chenda', 'dollu', 'kick', 'snare', 'clap', 'bass', 'hook', 'counter', 'choir', 'hat', 'tassa', 'fx', 'fill'],
      outro: ['chenda', 'tassa', 'pad', 'hook', 'fx'],
    }),
    lyrics: LY(["S05", "S06", "S07", "S08"]),
  },
  /* =============================================================== Pili Beats FM: tiger-dance bass */
  pili: {
    id: 'pili', vox: { vel: 1.1, startDeg: 3, top: 5 }, title: 'Pili Vesha', artist: 'DJ Hulibande', bpm: 150, swing: 0, root: 138.59, scale: 'mayamalavagowla', seed: 31,
    prog: [0, 0, 1, 0], lead: 'supersaw', leadOct: 2, counter: 'nadas', counterOct: 4, bass: 'sub', padKind: 'strings', padRetrig: false, fill: 'tassa',
    pat: {
      kick: 'x...x...x...x...', snare: '....x.......x...', clap: '....x.......x...', hat: 'x.x.x.x.x.x.x.xO',
      tassa: ['x.xxx.xxx.xxx.xx', 'x.xxx.xx..xxxxxx'], dollu: 'x..x..x...x.x...', chenda: '..x...x...x...x.', bass: 'x.x.x.x.x.x.x.x8', bassLen: 1.5,
    },
    hooks: {
      A: N([[0, 7, 2], [2, 7, 1], [3, 6, 1], [4, 5, 2], [6, 4, 2], [8, 5, 2], [10, 4, 1], [11, 3, 1], [12, 2, 4, 'g'], [16, 7, 2], [18, 7, 1], [19, 8, 1], [20, 7, 2], [22, 6, 1], [23, 5, 1], [24, 4, 4], [28, 3, 2], [30, 4, 2]]),
      B: N([[0, 4, 1], [1, 4, 1], [2, 5, 2], [4, 4, 1], [5, 3, 1], [6, 2, 2, 'g'], [8, 1, 1], [9, 2, 1], [10, 3, 2], [12, 2, 4], [16, 0, 2], [18, 1, 2], [20, 2, 2], [22, 4, 2], [24, 3, 2], [26, 2, 2], [28, 1, 2], [30, 0, 2]]),
    },
    sections: sections({
      intro: ['tassa', 'dollu', 'pad', 'fx', 'hook'], verse: ['kick', 'tassa', 'dollu', 'bass', 'hat', 'hook', 'fx'],
      hook: ['kick', 'snare', 'clap', 'tassa', 'dollu', 'chenda', 'bass', 'hat', 'hook', 'counter', 'pad', 'fx', 'fill'],
      brk: ['tassa', 'dollu', 'pad', 'hook', 'fx', 'fill'], hook2: ['kick', 'snare', 'clap', 'tassa', 'dollu', 'chenda', 'bass', 'hat', 'hook', 'counter', 'choir', 'pad', 'fx', 'fill'],
      outro: ['tassa', 'dollu', 'kick', 'hook', 'fx'],
    }),
    lyrics: LY(["S09", "S10", "S11", "S12"]),
  },
  tigerdrop: {
    id: 'tigerdrop', vox: { vel: 1.05, startDeg: 2, top: 4 }, title: 'Tiger Drop', artist: 'DJ Hulibande', bpm: 160, swing: 0, root: 130.81, scale: 'todi', seed: 37,
    prog: [0, 0, 5, 4], lead: 'supersaw', leadOct: 2, counter: 'nadas', counterOct: 4, bass: 'sub', padKind: 'strings', padRetrig: false, fill: 'tassa',
    pat: {
      kick: ['x..x..x.x..x..x.', 'x..x..x.x..xx.x.'], snare: '....x.......x.x.', clap: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx',
      tassa: 'x.xxx.xxx.xxx.xx', dollu: 'x..x..x.x..x....', chenda: 'x.x.x.x.x.x.xxx.', bass: 'x.xx.xx.x.xx.xx8', bassLen: 1.2,
    },
    hooks: {
      A: N([[0, 7, 1], [1, 7, 1], [2, 6, 2], [4, 5, 1], [5, 4, 1], [6, 3, 2, 'g'], [8, 7, 1], [9, 7, 1], [10, 6, 2], [12, 5, 1], [13, 4, 1], [14, 2, 2], [16, 3, 1], [17, 3, 1], [18, 4, 2], [20, 5, 2], [22, 6, 2], [24, 7, 4], [28, 6, 2], [30, 5, 2]]),
      B: N([[0, 0, 2], [2, 1, 1], [3, 2, 1], [4, 3, 2, 'g'], [6, 4, 2], [8, 5, 2], [10, 4, 1], [11, 3, 1], [12, 2, 2], [14, 1, 2], [16, 0, 2], [18, 3, 2], [20, 2, 2], [22, 1, 2], [24, 0, 4], [28, 1, 2], [30, 2, 2]]),
    },
    sections: sections({
      intro: ['tassa', 'dollu', 'fx', 'hook', 'pad'], verse: ['kick', 'tassa', 'dollu', 'bass', 'hat', 'hook', 'fx', 'chenda'],
      hook: ['kick', 'snare', 'clap', 'tassa', 'dollu', 'chenda', 'bass', 'hat', 'hook', 'counter', 'choir', 'pad', 'fx', 'fill'],
      brk: ['tassa', 'dollu', 'hook', 'fx', 'fill', 'pad'], hook2: ['kick', 'snare', 'clap', 'tassa', 'dollu', 'chenda', 'bass', 'hat', 'hook', 'counter', 'choir', 'pad', 'fx', 'fill'],
      outro: ['tassa', 'dollu', 'kick', 'hook', 'fx'],
    }),
    lyrics: LY(["S13", "S14", "S15", "S16"]),
  },
  /* =============================================================== Sandalwood Retro: golden Kannada film style */
  mallige: {
    id: 'mallige', vox: { vel: 0.9, formantShift: 1.15, chorus: true, startDeg: 3, wet: 0.5 }, title: 'Mallige Kanasu', artist: 'Savitha & The Mysore Strings', bpm: 96, swing: 0.14, root: 146.83, scale: 'shankarabharana', seed: 41,
    prog: [0, 5, 3, 4], lead: 'flute', leadOct: 4, counter: 'pluck', counterOct: 4, padKind: 'strings', padRetrig: false, fill: 'chenda',
    pat: {
      kick: 'x.......x.x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', tabla: 'x.t.g.t.x.t.g.tt', bass: 'x..x....x..x..5.', bassLen: 1.6,
    },
    hooks: {
      A: N([[0, 7, 3], [3, 6, 1], [4, 4, 2], [6, 5, 2], [8, 4, 3], [11, 2, 1], [12, 4, 4], [16, 5, 3], [19, 4, 1], [20, 2, 2], [22, 3, 2], [24, 2, 4], [28, 1, 2], [30, 0, 2]]),
      B: N([[0, 4, 2], [2, 5, 2], [4, 6, 2], [6, 7, 2], [8, 8, 4], [12, 7, 2], [14, 6, 2], [16, 5, 3], [19, 4, 1], [20, 5, 2], [22, 4, 2], [24, 2, 4], [28, 4, 4]]),
    },
    sections: sections({
      intro: ['pad', 'tabla', 'hook'], verse: ['pad', 'tabla', 'bass', 'hook', 'hat'], hook: ['pad', 'tabla', 'kick', 'snare', 'bass', 'hook', 'counter', 'choir', 'hat', 'fx'],
      brk: ['pad', 'tabla', 'hook', 'fx'], hook2: ['pad', 'tabla', 'kick', 'snare', 'bass', 'hook', 'counter', 'choir', 'hat', 'fx', 'fill'], outro: ['pad', 'tabla', 'hook'],
    }),
    lyrics: LY(["S17", "S18", "S19", "S20"]),
  },
  kanasu: {
    id: 'kanasu', vox: { vel: 0.9, formantShift: 1.15, chorus: true, startDeg: 3, wet: 0.5 }, title: 'Bus Nildana', artist: 'Savitha & The Mysore Strings', bpm: 104, swing: 0.12, root: 130.81, scale: 'kharaharapriya', seed: 43,
    prog: [0, 3, 4, 0], lead: 'strings', leadOct: 2, counter: 'flute', counterOct: 4, padKind: 'strings', padRetrig: false, fill: 'chenda',
    pat: {
      kick: 'x.......x.x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', tabla: 'x.t.g.t.x.tt.g.t', bass: 'x..x..x.x..x..5.', bassLen: 1.6,
    },
    hooks: {
      A: N([[0, 7, 3], [3, 6, 1], [4, 5, 2], [6, 4, 2], [8, 5, 3], [11, 3, 1], [12, 2, 4], [16, 4, 3], [19, 3, 1], [20, 2, 2], [22, 1, 2], [24, 0, 4], [28, 2, 2], [30, 1, 2]]),
      B: N([[0, 2, 2], [2, 4, 2], [4, 5, 2], [6, 7, 2], [8, 9, 4, 'g'], [12, 8, 2], [14, 7, 2], [16, 6, 3], [19, 5, 1], [20, 4, 2], [22, 2, 2], [24, 3, 4], [28, 2, 4]]),
    },
    sections: sections({
      intro: ['pad', 'tabla', 'hook'], verse: ['pad', 'tabla', 'bass', 'hook', 'hat'], hook: ['pad', 'tabla', 'kick', 'snare', 'bass', 'hook', 'counter', 'choir', 'hat', 'fx'],
      brk: ['pad', 'tabla', 'hook', 'fx'], hook2: ['pad', 'tabla', 'kick', 'snare', 'bass', 'hook', 'counter', 'choir', 'hat', 'fx', 'fill'], outro: ['pad', 'tabla', 'hook'],
    }),
    lyrics: LY(["S21", "S22", "S23", "S24"]),
  },
  /* =============================================================== Kere FM: lake-side chill */
  kere: {
    id: 'kere', vox: { vel: 0.8, wet: 0.7, vib: 0.016, startDeg: 2 }, title: 'Kere Sandhye', artist: 'Aanekere Sessions', bpm: 76, swing: 0.2, root: 130.81, scale: 'madhyamavathi', seed: 51,
    prog: [0, 3, 0, 4], lead: 'pluck', leadOct: 2, counter: 'flute', counterOct: 4, padKind: 'strings', padRetrig: false, fill: 'chenda',
    pat: { kick: 'x.......x.......', snare: '........x.......', hat: 'x.o.x.o.x.o.x.oo', tabla: 'x...t...g...t...', bass: 'x.......x.....5.', bassLen: 3 },
    hooks: {
      A: N([[0, 5, 4], [4, 4, 2], [6, 3, 2], [8, 2, 4], [12, 3, 2], [14, 2, 2], [16, 0, 4], [20, 2, 4], [24, 3, 4], [28, 2, 4]]),
      B: N([[0, 7, 4], [4, 6, 2], [6, 5, 2], [8, 4, 4], [12, 3, 2], [14, 4, 2], [16, 5, 6], [24, 4, 2], [26, 3, 2], [28, 2, 4]]),
    },
    sections: sections({
      intro: ['drone', 'pad', 'vinyl', 'hook'], verse: ['pad', 'vinyl', 'tabla', 'bass', 'hook', 'hat'], hook: ['pad', 'vinyl', 'tabla', 'kick', 'snare', 'bass', 'hook', 'counter', 'hat'],
      brk: ['drone', 'pad', 'vinyl', 'hook'], hook2: ['pad', 'vinyl', 'tabla', 'kick', 'snare', 'bass', 'hook', 'counter', 'hat', 'choir'], outro: ['drone', 'pad', 'vinyl', 'hook'],
    }),
    lyrics: LY(["S25", "S26", "S27", "S28"]),
  },
  malnad: {
    id: 'malnad', vox: { vel: 0.8, wet: 0.7, vib: 0.016, startDeg: 2 }, title: 'Malenaadu Mazhe', artist: 'Aanekere Sessions', bpm: 70, swing: 0.18, root: 146.83, scale: 'hamsadhwani', seed: 53,
    prog: [0, 4, 3, 0], lead: 'pluck', leadOct: 2, counter: 'flute', counterOct: 4, padKind: 'strings', padRetrig: false, fill: 'chenda',
    pat: { kick: 'x.......x.......', snare: '........x.......', hat: 'x.o.x.o.x.o.x.oo', tabla: 'x...t...g...t...', bass: 'x.......x.....8.', bassLen: 3 },
    hooks: {
      A: N([[0, 4, 4], [4, 3, 2], [6, 2, 2], [8, 3, 4], [12, 4, 2], [14, 5, 2], [16, 4, 4], [20, 2, 4], [24, 0, 4], [28, 2, 4]]),
      B: N([[0, 5, 4], [4, 7, 2], [6, 6, 2], [8, 5, 4], [12, 4, 4], [16, 3, 4], [20, 4, 2], [22, 5, 2], [24, 4, 8]]),
    },
    sections: sections({
      intro: ['drone', 'pad', 'vinyl', 'hook'], verse: ['pad', 'vinyl', 'tabla', 'bass', 'hook', 'hat'], hook: ['pad', 'vinyl', 'tabla', 'kick', 'snare', 'bass', 'hook', 'counter', 'hat', 'choir'],
      brk: ['drone', 'pad', 'vinyl', 'hook'], hook2: ['pad', 'vinyl', 'tabla', 'kick', 'snare', 'bass', 'hook', 'counter', 'hat', 'choir'], outro: ['drone', 'pad', 'vinyl', 'hook'],
    }),
    lyrics: LY(["S29", "S30", "S31", "S32"]),
  },

  /* =============================================================== culture: bhajane, Yakshagana, paddana */
  bhajane: {
    id: 'bhajane', vox: { vel: 1, startDeg: 3, wet: 0.5, chorus: true }, title: 'Hari Om Bhajane', artist: 'Durga Mahila Bhajana Mandali', bpm: 100, swing: 0.05, root: 130.81, scale: 'shankarabharana', seed: 71,
    prog: [0, 3, 4, 0], lead: 'flute', leadOct: 4, counter: 'pluck', counterOct: 4, padKind: 'harmonium', padRetrig: true, fill: 'chenda', bass: 'sub',
    pat: { tabla: 'x...t...g...t.t.', jhanj: 'x.x.x.x.x.x.x.xO', clap: '....x.......x...', bass: 'x.......x.......', bassLen: 3, dollu: 'x.......x.......' },
    hooks: {
      A: N([[0, 4, 2], [2, 5, 2], [4, 4, 2], [6, 2, 2], [8, 3, 4], [12, 2, 2], [14, 0, 2], [16, 2, 2], [18, 4, 2], [20, 5, 4], [24, 4, 2], [26, 2, 2], [28, 0, 4]]),
      B: N([[0, 7, 2], [2, 6, 2], [4, 5, 2], [6, 4, 2], [8, 5, 4], [12, 4, 2], [14, 2, 2], [16, 4, 2], [18, 5, 2], [20, 7, 4], [24, 5, 2], [26, 4, 2], [28, 2, 4]]),
    },
    sections: sections({
      intro: ['drone', 'pad', 'hook', 'tabla'], verse: ['pad', 'tabla', 'jhanj', 'bass', 'hook'], hook: ['pad', 'tabla', 'jhanj', 'clap', 'bass', 'hook', 'counter', 'choir', 'conch'],
      brk: ['pad', 'tabla', 'jhanj', 'hook'], hook2: ['pad', 'tabla', 'jhanj', 'clap', 'bass', 'hook', 'counter', 'choir', 'dollu', 'conch'], outro: ['drone', 'pad', 'jhanj', 'hook'],
    }),
    lyrics: LY(["S41", "S42", "S43", "S44"]),
  },
  yaksha: {
    id: 'yaksha', vox: { vel: 1.15, nasal: true, formantShift: 1.04, startDeg: 4, top: 8, vib: 0.016 }, title: 'Yakshagana Ranga Pravesha', artist: 'Bhagavatha Mela', bpm: 132, swing: 0.04, root: 146.83, scale: 'kharaharapriya', seed: 73,
    prog: [0, 0, 3, 4], lead: 'nadas', leadOct: 2, counter: 'flute', counterOct: 4, padKind: 'harmonium', padRetrig: true, fill: 'chenda',
    pat: { chenda: ['x.xxx.xxx.xxx.xx', 'xxxxx.xxxxxxxbx'], maddale: 'x..b..x.x..b.x..', jhanj: 'x.x.x.x.x.x.x.x.', dollu: 'x.......x.......', tassa: '..x...x...x...x.', bass: 'x..x....x..x..8.', bassLen: 1.4, kick: 'x.......x.......' },
    hooks: {
      A: N([[0, 5, 2], [2, 6, 1], [3, 5, 1], [4, 4, 2, 'g'], [6, 3, 2], [8, 4, 2], [10, 3, 1], [11, 2, 1], [12, 0, 4], [16, 2, 2], [18, 3, 2], [20, 4, 2], [22, 5, 2], [24, 6, 2, 'g'], [26, 5, 2], [28, 4, 4]]),
      B: N([[0, 7, 2], [2, 8, 1], [3, 7, 1], [4, 6, 2, 'g'], [6, 5, 2], [8, 6, 4], [12, 5, 2], [14, 4, 2], [16, 5, 2], [18, 4, 2], [20, 3, 4, 'g'], [24, 2, 2], [26, 3, 2], [28, 4, 2], [30, 2, 2]]),
    },
    sections: sections({
      intro: ['drone', 'pad', 'chenda', 'maddale', 'hook', 'fx'], verse: ['pad', 'chenda', 'maddale', 'jhanj', 'bass', 'hook', 'dollu'],
      hook: ['pad', 'chenda', 'maddale', 'jhanj', 'dollu', 'kick', 'tassa', 'bass', 'hook', 'counter', 'choir', 'fx', 'fill'],
      brk: ['pad', 'chenda', 'maddale', 'hook', 'fx', 'fill'], hook2: ['pad', 'chenda', 'maddale', 'jhanj', 'dollu', 'kick', 'tassa', 'bass', 'hook', 'counter', 'choir', 'fx', 'fill'], outro: ['drone', 'pad', 'chenda', 'maddale', 'hook'],
    }),
    lyrics: LY(["S45", "S46", "S47", "S48"]),
  },
  paddana: {
    id: 'paddana', vox: { vel: 1.1, nasal: true, startDeg: 2, top: 5, vib: 0.014, wet: 0.55 }, title: 'Koti Chennaya Paddana', artist: 'Tulu Paddana Sangha', bpm: 84, swing: 0.1, root: 130.81, scale: 'madhyamavathi', seed: 79,
    prog: [0, 0, 2, 0], lead: 'pluck', leadOct: 2, counter: 'flute', counterOct: 4, padKind: 'strings', padRetrig: false, fill: 'chenda', bass: 'sub',
    pat: { dollu: 'x.......x..x....', tassa: '..x...x...x...x.', chenda: ['........x...x...', '........x..xx.xb'], bass: 'x......x........', bassLen: 4 },
    hooks: {
      A: N([[0, 3, 4], [4, 2, 2], [6, 1, 2], [8, 2, 4, 'g'], [12, 0, 4], [16, 1, 2], [18, 2, 2], [20, 3, 4, 'g'], [24, 2, 4], [28, 0, 4]]),
      B: N([[0, 5, 4, 'g'], [4, 4, 2], [6, 3, 2], [8, 4, 4], [12, 3, 4], [16, 2, 2], [18, 3, 2], [20, 4, 4, 'g'], [24, 3, 4], [28, 2, 4]]),
    },
    sections: sections({
      intro: ['drone', 'pad', 'hook', 'conch'], verse: ['drone', 'pad', 'dollu', 'tassa', 'hook', 'bass'], hook: ['drone', 'pad', 'dollu', 'tassa', 'chenda', 'hook', 'counter', 'choir', 'bass', 'fx'],
      brk: ['drone', 'pad', 'chenda', 'hook'], hook2: ['drone', 'pad', 'dollu', 'tassa', 'chenda', 'hook', 'counter', 'choir', 'bass', 'fx'], outro: ['drone', 'pad', 'hook', 'gong'],
    }),
    lyrics: LY(["S49", "S50", "S51", "S52"]),
  },
  /* =============================================================== public-domain devotional songs (Dasara Pada FM) */
  bhagyada: {
    id: 'bhagyada', vox: { vel: 1.05, vib: 0.016, wet: 0.5, startDeg: 3 }, voxOct: 2, title: "Bhagyada Lakshmi Baramma", artist: "Purandara Dasa (c. 1540), new arrangement", bpm: 88, swing: 0.1, root: 146.83, scale: 'madhyamavathi', seed: 81,
    prog: [0, 0, 2, 0], lead: 'flute', leadOct: 4, counter: 'pluck', counterOct: 4, padKind: 'harmonium', padRetrig: true, fill: 'chenda', bass: 'sub',
    pat: { tabla: 'x...t...g...t.t.', jhanj: 'x.x.x.x.x.x.x.xO', bass: 'x.......x.......', bassLen: 3 },
    hooks: {
      A: N([[0,3,2],[2,4,2],[4,5,4],[8,4,2],[10,3,2],[12,2,4],[16,3,2],[18,2,2],[20,1,4],[24,2,2],[26,3,2],[28,2,4]]),
      B: N([[0,5,2],[2,5,2],[4,4,2],[6,3,2],[8,4,4],[12,3,2],[14,2,2],[16,3,4],[20,2,2],[22,1,2],[24,2,4],[28,0,4]]),
    },
    sections: sections({
      intro: ['drone', 'pad', 'hook', 'tabla'], verse: ['drone', 'pad', 'tabla', 'bass', 'hook'], hook: ['drone', 'pad', 'tabla', 'bass', 'hook', 'counter', 'choir'],
      brk: ['drone', 'pad', 'tabla', 'hook'], hook2: ['drone', 'pad', 'tabla', 'bass', 'hook', 'counter', 'choir', 'jhanj'], outro: ['drone', 'pad', 'hook'],
    }),
    lyrics: [[4, "S53", 2, {"notes": [1, 2, 3, 3, 2, 1, 2, 3, 3, 2, 1, 0]}], [6, "S54", 2, {"notes": [2, 3, 3, 4, 3, 2, 1, 2, 3, 2, 1, 0]}], [8, "S53", 2, {"notes": [1, 2, 3, 3, 2, 1, 2, 3, 3, 2, 1, 0]}], [10, "S54", 2, {"notes": [2, 3, 3, 4, 3, 2, 1, 2, 3, 2, 1, 0]}], [12, "S55", 2, {"notes": [3, 3, 4, 5, 5, 4, 3, 4, 3, 2], "startDeg": 3}], [14, "S56", 2, {"notes": [2, 2, 3, 4, 4, 3, 2, 1, 2, 3, 2, 1, 0]}], [16, "S55", 2, {"notes": [3, 3, 4, 5, 5, 4, 3, 4, 3, 2]}], [18, "S56", 2, {"notes": [2, 2, 3, 4, 4, 3, 2, 1, 2, 3, 2, 1, 0]}], [24, "S55", 2, {"notes": [3, 3, 4, 5, 5, 4, 3, 4, 3, 2]}], [26, "S56", 2, {"notes": [2, 2, 3, 4, 4, 3, 2, 1, 2, 3, 2, 1, 0]}], [28, "S55", 2, {"notes": [3, 3, 4, 5, 5, 4, 3, 4, 3, 2]}], [30, "S56", 2, {"notes": [2, 2, 3, 4, 4, 3, 2, 1, 2, 3, 2, 1, 0]}], [32, "S56", 3, {"notes": [2, 2, 3, 4, 4, 3, 2, 1, 2, 3, 2, 1, 0]}]],
  },
  baagilanu: {
    id: 'baagilanu', vox: { vel: 1.05, vib: 0.016, wet: 0.5, startDeg: 3 }, voxOct: 2, title: "Baagilanu Teredu", artist: "Kanaka Dasa (c. 1550), new arrangement", bpm: 80, swing: 0.1, root: 130.81, scale: 'madhyamavathi', seed: 83,
    prog: [0, 0, 2, 0], lead: 'flute', leadOct: 4, counter: 'pluck', counterOct: 4, padKind: 'harmonium', padRetrig: true, fill: 'chenda', bass: 'sub',
    pat: { tabla: 'x...t...g...t.t.', jhanj: 'x.x.x.x.x.x.x.xO', bass: 'x.......x.......', bassLen: 3 },
    hooks: {
      A: N([[0,2,4],[4,3,2],[6,4,2],[8,3,4],[12,2,2],[14,1,2],[16,2,4],[20,3,2],[22,2,2],[24,1,4],[28,0,4]]),
      B: N([[0,4,2],[2,5,2],[4,4,4],[8,3,2],[10,4,2],[12,3,4],[16,2,2],[18,3,2],[20,2,4],[24,1,4],[28,2,4]]),
    },
    sections: sections({
      intro: ['drone', 'pad', 'hook', 'tabla'], verse: ['drone', 'pad', 'tabla', 'bass', 'hook'], hook: ['drone', 'pad', 'tabla', 'bass', 'hook', 'counter', 'choir'],
      brk: ['drone', 'pad', 'tabla', 'hook'], hook2: ['drone', 'pad', 'tabla', 'bass', 'hook', 'counter', 'choir', 'jhanj'], outro: ['drone', 'pad', 'hook'],
    }),
    lyrics: [[4, "S57", 2, {"notes": [1, 2, 3, 3, 2, 1, 2, 3, 3, 2, 1, 0]}], [6, "S58", 2, {"notes": [2, 3, 3, 4, 3, 2, 1, 2, 3, 2, 1, 0]}], [8, "S57", 2, {"notes": [1, 2, 3, 3, 2, 1, 2, 3, 3, 2, 1, 0]}], [10, "S58", 2, {"notes": [2, 3, 3, 4, 3, 2, 1, 2, 3, 2, 1, 0]}], [12, "S59", 2, {"notes": [3, 3, 4, 5, 5, 4, 3, 4, 3, 2], "startDeg": 3}], [14, "S60", 2, {"notes": [2, 2, 3, 4, 4, 3, 2, 1, 2, 3, 2, 1, 0]}], [16, "S59", 2, {"notes": [3, 3, 4, 5, 5, 4, 3, 4, 3, 2]}], [18, "S60", 2, {"notes": [2, 2, 3, 4, 4, 3, 2, 1, 2, 3, 2, 1, 0]}], [24, "S59", 2, {"notes": [3, 3, 4, 5, 5, 4, 3, 4, 3, 2]}], [26, "S60", 2, {"notes": [2, 2, 3, 4, 4, 3, 2, 1, 2, 3, 2, 1, 0]}], [28, "S59", 2, {"notes": [3, 3, 4, 5, 5, 4, 3, 4, 3, 2]}], [30, "S60", 2, {"notes": [2, 2, 3, 4, 4, 3, 2, 1, 2, 3, 2, 1, 0]}], [32, "S60", 3, {"notes": [2, 2, 3, 4, 4, 3, 2, 1, 2, 3, 2, 1, 0]}]],
  },
  kallu: {
    id: 'kallu', vox: { vel: 1.05, vib: 0.016, wet: 0.5, startDeg: 3 }, voxOct: 2, title: "Kallu Sakkare KollirO", artist: "Purandara Dasa (c. 1540), new arrangement", bpm: 104, swing: 0.1, root: 138.59, scale: 'madhyamavathi', seed: 85,
    prog: [0, 0, 2, 0], lead: 'pluck', leadOct: 4, counter: 'pluck', counterOct: 4, padKind: 'harmonium', padRetrig: true, fill: 'chenda', bass: 'sub',
    pat: { tabla: 'x...t...g...t.t.', jhanj: 'x.x.x.x.x.x.x.xO', bass: 'x.......x.......', bassLen: 3 },
    hooks: {
      A: N([[0,4,2],[2,4,2],[4,3,2],[6,4,2],[8,5,4],[12,4,2],[14,3,2],[16,2,2],[18,3,2],[20,4,4],[24,3,2],[26,2,2],[28,1,4]]),
      B: N([[0,5,2],[2,5,2],[4,4,2],[6,5,2],[8,5,2],[10,4,2],[12,3,4],[16,4,2],[18,3,2],[20,2,2],[22,3,2],[24,2,4],[28,0,4]]),
    },
    sections: sections({
      intro: ['drone', 'pad', 'hook', 'tabla'], verse: ['drone', 'pad', 'tabla', 'bass', 'hook', 'clap'], hook: ['drone', 'pad', 'tabla', 'bass', 'hook', 'counter', 'choir', 'clap'],
      brk: ['drone', 'pad', 'tabla', 'hook'], hook2: ['drone', 'pad', 'tabla', 'bass', 'hook', 'counter', 'choir', 'jhanj', 'clap'], outro: ['drone', 'pad', 'hook'],
    }),
    lyrics: [[4, "S61", 2, {"notes": [1, 2, 3, 3, 2, 1, 2, 3, 3, 2, 1, 0]}], [6, "S62", 2, {"notes": [2, 3, 3, 4, 3, 2, 1, 2, 3, 2, 1, 0]}], [8, "S61", 2, {"notes": [1, 2, 3, 3, 2, 1, 2, 3, 3, 2, 1, 0]}], [10, "S62", 2, {"notes": [2, 3, 3, 4, 3, 2, 1, 2, 3, 2, 1, 0]}], [12, "S63", 2, {"notes": [3, 3, 4, 5, 5, 4, 3, 4, 3, 2], "startDeg": 3}], [14, "S64", 2, {"notes": [2, 2, 3, 4, 4, 3, 2, 1, 2, 3, 2, 1, 0]}], [16, "S63", 2, {"notes": [3, 3, 4, 5, 5, 4, 3, 4, 3, 2]}], [18, "S64", 2, {"notes": [2, 2, 3, 4, 4, 3, 2, 1, 2, 3, 2, 1, 0]}], [24, "S63", 2, {"notes": [3, 3, 4, 5, 5, 4, 3, 4, 3, 2]}], [26, "S64", 2, {"notes": [2, 2, 3, 4, 4, 3, 2, 1, 2, 3, 2, 1, 0]}], [28, "S63", 2, {"notes": [3, 3, 4, 5, 5, 4, 3, 4, 3, 2]}], [30, "S64", 2, {"notes": [2, 2, 3, 4, 4, 3, 2, 1, 2, 3, 2, 1, 0]}], [32, "S64", 3, {"notes": [2, 2, 3, 4, 4, 3, 2, 1, 2, 3, 2, 1, 0]}]],
  },
  ulluvaru: {
    id: 'ulluvaru', vox: { vel: 1.05, vib: 0.016, wet: 0.5, startDeg: 3 }, voxOct: 2, title: "Ulluvaru Shivalaya", artist: "Basavanna (12th c. vachana), new arrangement", bpm: 72, swing: 0.1, root: 146.83, scale: 'madhyamavathi', seed: 87,
    prog: [0, 0, 2, 0], lead: 'flute', leadOct: 4, counter: 'pluck', counterOct: 4, padKind: 'harmonium', padRetrig: true, fill: 'chenda', bass: 'sub',
    pat: { tabla: 'x...t...g...t.t.', jhanj: 'x.x.x.x.x.x.x.xO', bass: 'x.......x.......', bassLen: 3 },
    hooks: {
      A: N([[0,3,4],[4,2,4],[8,3,2],[10,4,2],[12,3,4],[16,2,4],[20,1,4],[24,0,8]]),
      B: N([[0,5,4],[4,4,4],[8,3,4],[12,4,2],[14,3,2],[16,2,4],[20,3,4],[24,0,8]]),
    },
    sections: sections({
      intro: ['drone', 'pad', 'hook', 'tabla'], verse: ['drone', 'pad', 'tabla', 'bass', 'hook'], hook: ['drone', 'pad', 'tabla', 'bass', 'hook', 'counter', 'choir'],
      brk: ['drone', 'pad', 'tabla', 'hook'], hook2: ['drone', 'pad', 'tabla', 'bass', 'hook', 'counter', 'choir', 'jhanj'], outro: ['drone', 'pad', 'hook'],
    }),
    lyrics: [[4, "S65", 2, {"notes": [1, 2, 3, 3, 2, 1, 2, 3, 3, 2, 1, 0]}], [6, "S66", 2, {"notes": [2, 3, 3, 4, 3, 2, 1, 2, 3, 2, 1, 0]}], [8, "S65", 2, {"notes": [1, 2, 3, 3, 2, 1, 2, 3, 3, 2, 1, 0]}], [10, "S66", 2, {"notes": [2, 3, 3, 4, 3, 2, 1, 2, 3, 2, 1, 0]}], [12, "S67", 2, {"notes": [3, 3, 4, 5, 5, 4, 3, 4, 3, 2], "startDeg": 3}], [14, "S68", 2, {"notes": [2, 2, 3, 4, 4, 3, 2, 1, 2, 3, 2, 1, 0]}], [16, "S67", 2, {"notes": [3, 3, 4, 5, 5, 4, 3, 4, 3, 2]}], [18, "S68", 2, {"notes": [2, 2, 3, 4, 4, 3, 2, 1, 2, 3, 2, 1, 0]}], [24, "S67", 2, {"notes": [3, 3, 4, 5, 5, 4, 3, 4, 3, 2]}], [26, "S68", 2, {"notes": [2, 2, 3, 4, 4, 3, 2, 1, 2, 3, 2, 1, 0]}], [28, "S67", 2, {"notes": [3, 3, 4, 5, 5, 4, 3, 4, 3, 2]}], [30, "S68", 2, {"notes": [2, 2, 3, 4, 4, 3, 2, 1, 2, 3, 2, 1, 0]}], [32, "S68", 3, {"notes": [2, 2, 3, 4, 4, 3, 2, 1, 2, 3, 2, 1, 0]}]],
  },
  /* =============================================================== game score */
  theme: {
    id: 'theme', vox: { vel: 0.9, startDeg: 3 }, title: 'Namma Karkala', artist: 'Game theme', bpm: 100, swing: 0.08, root: 146.83, scale: 'mohanam', seed: 61,
    prog: [0, 3, 4, 3], lead: 'nadas', leadOct: 2, counter: 'strings', counterOct: 2, padKind: 'strings', padRetrig: false, fill: 'chenda',
    pat: {
      kick: 'x.......x..x....', snare: '........x.......', hat: 'x.x.x.x.x.x.x.xO', chenda: ['x.x.xx.x.x.xx.x.', 'x.x.xx.x.xxxx.xb'], dollu: 'x.......x.......', tassa: '..x...x...x...x.',
      bass: 'x.....x.x.....8.', bassLen: 2.2,
    },
    hooks: {
      A: N([[0, 5, 4], [4, 4, 2], [6, 3, 2], [8, 2, 4], [12, 3, 2], [14, 4, 2], [16, 5, 4], [20, 7, 2, 'g'], [22, 6, 2], [24, 5, 4], [28, 4, 2], [30, 3, 2]]),
      B: N([[0, 7, 6, 'g'], [6, 6, 2], [8, 5, 4], [12, 4, 2], [14, 5, 2], [16, 6, 4], [20, 5, 2], [22, 4, 2], [24, 3, 6], [30, 2, 2]]),
    },
    sections: sections({
      intro: ['drone', 'pad', 'chenda', 'hook', 'fx'], verse: ['pad', 'chenda', 'dollu', 'kick', 'bass', 'hook', 'hat'],
      hook: ['pad', 'chenda', 'dollu', 'kick', 'snare', 'bass', 'hook', 'counter', 'choir', 'hat', 'tassa', 'fx', 'fill'],
      brk: ['pad', 'chenda', 'dollu', 'hook', 'fx', 'fill'], hook2: ['pad', 'chenda', 'dollu', 'kick', 'snare', 'bass', 'hook', 'counter', 'choir', 'hat', 'tassa', 'fx', 'fill'],
      outro: ['drone', 'pad', 'chenda', 'hook', 'fx'],
    }),
    lyrics: LY(["S33", "S34", "S35", "S36"]),
  },
  bahubali: {
    id: 'bahubali', vox: { vel: 1.1, wet: 0.75, vib: 0.008, top: 4, startDeg: 2 }, voxOct: 1, title: 'Bahubali Betta', artist: 'Game theme', bpm: 62, swing: 0, root: 146.83, scale: 'hamsadhwani', seed: 67,
    prog: [0, 3, 4, 0], lead: 'flute', leadOct: 4, counter: 'strings', counterOct: 2, padKind: 'strings', padRetrig: false, fill: 'chenda',
    pat: { dollu: 'x...............', kick: 'x...............', chenda: '........x.......', bass: 'x...............', bassLen: 6 },
    hooks: {
      A: N([[0, 5, 8], [8, 4, 4], [12, 3, 4], [16, 2, 8], [24, 3, 4], [28, 0, 4]]),
      B: N([[0, 7, 8], [8, 6, 4], [12, 5, 4], [16, 4, 8], [24, 3, 4], [28, 5, 4]]),
    },
    sections: sections({
      intro: ['drone', 'pad', 'hook', 'gong'], verse: ['drone', 'pad', 'hook', 'dollu', 'gong', 'conch'], hook: ['drone', 'pad', 'hook', 'choir', 'dollu', 'bass', 'counter', 'fx', 'gong', 'conch'],
      brk: ['drone', 'pad', 'hook', 'gong'], hook2: ['drone', 'pad', 'hook', 'choir', 'dollu', 'bass', 'counter', 'chenda', 'fx', 'gong', 'conch'], outro: ['drone', 'pad', 'hook', 'choir', 'gong', 'conch'],
    }),
    lyrics: LY(["S37", "S38", "S39", "S40"]),
  },
};

export const STATIONS = [
  { id: 'karkala', name: 'Radio Karkala 91.1', tag: 'Tulunadu folk fusion', color: '#fbbf24', songs: ['chande', 'kambala'], ident: 'R01' },
  { id: 'pili', name: 'Pili Beats FM', tag: 'Tiger-dance bass', color: '#f97316', songs: ['pili', 'tigerdrop'], ident: 'R02' },
  { id: 'retro', name: 'Sandalwood Retro', tag: 'Golden Kannada hits', color: '#a78bfa', songs: ['mallige', 'kanasu'], ident: 'R03' },
  { id: 'paddana', name: 'Tulu Paddana FM 94.5', tag: 'Bhajane, Yakshagana, paddana', color: '#ef4444', songs: ['paddana', 'bhajane', 'yaksha'], ident: 'R05' },
  { id: 'dasara', name: 'Dasara Pada FM 101.3', tag: 'Purandara Dasa, Kanaka Dasa, Basavanna', color: '#22c55e', songs: ['bhagyada', 'baagilanu', 'kallu', 'ulluvaru'], ident: 'R06' },
  { id: 'kere', name: 'Kere FM', tag: 'Lake-side chill', color: '#38bdf8', songs: ['kere', 'malnad'], ident: 'R04' },
];

/** Which songs play for each game state when there is no radio. */
export const SCORE = { title: 'theme', day: 'theme', trailer: 'theme', build: 'tigerdrop', evening: 'malnad', night: 'kere', rain: 'kere', chase: 'tigerdrop', ending: 'bahubali', silent: null };
