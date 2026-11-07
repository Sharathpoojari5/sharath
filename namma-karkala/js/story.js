// The spoken script (voice/script.json) is loaded at start-up. Every line has an id, a speaker, and
// English (en), Kannada (kn) and Tulu (tcy) text. Edit voice/script.json to change wording.
export let LINES = {};
export let SPEAKERS = {};
export let CHATTER = {};
export function setScript(json) { LINES = json.lines || {}; SPEAKERS = json.speakers || {}; CHATTER = json.chatter || {}; }
