// Writes tools/song_plans.json: for every song, lyric cue and language, the melody (one note per syllable) that the
// in-game singer uses. tools/make_sung.py turns the same melody into a sung line using a real speaking voice.
//   node export_song_plans.mjs ../voice/script.json > song_plans.json
import { readFileSync } from 'node:fs';
import { SONGS } from '../js/songs.js';
import { SCALES } from '../js/studio.js';
import { planLine } from '../js/singer.js';

const script = JSON.parse(readFileSync(process.argv[2] || new URL('../voice/script.json', import.meta.url), 'utf8')).lines;
const plans = {};
for (const S of Object.values(SONGS)) {
  const sc = SCALES[S.scale], n = sc.length, step = 60 / S.bpm / 4;
  const deg = (d) => { const o = Math.floor(d / n), k = ((d % n) + n) % n; return S.root * (S.voxOct || 2) * Math.pow(2, (sc[k] + 12 * o) / 12); };
  const lines = {};
  for (const [bar, id, span = 2, vo] of S.lyrics || []) {
    const key = `${id}_${span}`; if (lines[key]) continue;
    const rec = script[id]; if (!rec) continue;
    const opts = { ...(S.vox || {}), ...(vo || {}) };
    lines[key] = { id, span, female: (opts.formantShift || 1) > 1.08, seconds: span * 16 * step, notes: Object.fromEntries(['kn', 'tcy', 'en'].map(l => [l, { text: rec[l] || rec.en, plan: planLine(rec[l] || rec.en, span, step, deg, opts).map(p => ({ t: +p.t.toFixed(4), dur: +p.dur.toFixed(4), f: +p.f.toFixed(2) })) }])) };
  }
  plans[S.id] = { bpm: S.bpm, lines };
}
process.stdout.write(JSON.stringify(plans));
