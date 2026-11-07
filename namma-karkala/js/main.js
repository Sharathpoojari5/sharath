import { Game } from './game.js';
import { setScript } from './story.js';
import { Voice, LANG_NAME } from './voice.js';

const $ = (id) => document.getElementById(id);
const TIPS = [
  'Karkala has two seasons: rain, and getting ready for rain.',
  'Every private bus here has a name. Most of them are gods.',
  'The conductor says there is space. There is always space.',
  'Bahubali has stood on that hill since 1432. Be patient at the junction.',
  'A cow on the road has right of way. This is not a rule. It is physics.',
  'Goli baje tastes 30% better when it rains.',
  'Aanekere means elephant lake. Please do not look for the elephant.',
  'Chaturmukha Basadi has four identical doors, so you can never use the wrong one.',
  'If you hear "pom pom", it is an auto. If you hear nothing, it is also an auto.',
  'Your progress saves in this browser. No login. No OTP.',
  'Deliveries pay 30% extra in the rain. So, basically always.',
];
let tipI = Math.floor(Math.random() * TIPS.length);
const tip = () => { $('tip').textContent = TIPS[tipI++ % TIPS.length]; };
tip(); const tipTimer = setInterval(tip, 3500);

async function boot() {
  const bar = $('bar'), msg = $('loadmsg');
  const progress = (p, m) => { bar.style.width = Math.round(p * 100) + '%'; if (m) msg.textContent = m + '…'; };
  progress(0.03, 'Downloading Karkala');
  setScript(await (await fetch('voice/script.json')).json());
  try { Voice.manifest = await (await fetch('voice/manifest.json')).json(); } catch (e) { Voice.manifest = { kn: [], tcy: [], en: [] }; }   // no recordings yet: fall back to browser speech / text
  const map = await (await fetch('data/karkala.json')).json();
  progress(0.1, 'Waking up the town');
  await new Promise(r => setTimeout(r, 30));
  try { const { People } = await import('./people.js'); await People.load((f) => progress(0.1 + f * 0.04, 'Meeting the people')); } catch (e) { console.warn('people', e); }
  const game = new Game(map);
  await game.init(progress);
  window.__game = game;                                    // handy for debugging from the console
  progress(1, 'Ready');
  game.renderer.render(game.scene, game.cam);
  $('loading').classList.add('done');
  const paint = () => document.querySelectorAll('.lang button').forEach(b => b.classList.toggle('on', b.dataset.l === Voice.lang));
  document.querySelectorAll('.lang button').forEach(b => b.onclick = () => { Voice.setLang(b.dataset.l); paint(); });
  paint();
  const hasSave = game.save.done.length > 0;
  $('play').textContent = hasSave ? 'Continue' : 'Play';
  $('play').disabled = false; $('trailer').disabled = false; $('trailerSave').disabled = !window.MediaRecorder;
  $('play').onclick = () => { clearInterval(tipTimer); $('title').classList.add('gone'); game.start(); };
  const back = () => { $('title').classList.remove('gone'); };
  $('trailer').onclick = () => game.playTrailer({ onEnd: back });
  $('trailerSave').onclick = () => { $('trailerSave').textContent = 'Recording… (about a minute)'; game.playTrailer({ record: true, onEnd: back, onVideo: (blob) => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'namma-karkala-trailer.' + (blob.type.includes('mp4') ? 'mp4' : 'webm'); document.body.appendChild(a); a.click(); a.remove(); $('trailerSave').textContent = '⬇ Save trailer as video'; } }); };
}
boot().catch((e) => { console.error(e); $('loadmsg').textContent = 'Could not load: ' + e.message; });
