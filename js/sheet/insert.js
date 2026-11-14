import { chordsIn, diatonic } from './chords.js';
import { parse } from './parse.js';

function headerKey(text) {
  const head = text.replace(/^\s+/, '').split(/\n[ \t]*\r?\n/)[0];
  return parse(head).meta.key || '';
}

function inBrackets(before) {
  const line = before.slice(before.lastIndexOf('\n') + 1);
  return line.lastIndexOf('[') > line.lastIndexOf(']');
}

function nextVerseNumber(text) {
  let max = 0;
  for (const m of text.matchAll(/^[ \t]*(?:\[|#+\s*)?verse\s+(\d+)/gim)) max = Math.max(max, Number(m[1]));
  return max + 1;
}

export function chordChips(text) {
  const used = chordsIn(text);
  const shown = new Set(used);
  return used.concat(diatonic(headerKey(text)).filter((c) => !shown.has(c)));
}

export function chordText(text, pos, chord) {
  const before = text.slice(0, pos);
  const prev = before.slice(-1);
  const bare = !prev || /\s/.test(prev) || prev === '[' || inBrackets(before);
  return bare ? chord : ` ${chord}`;
}

export function sectionText(text, pos, word) {
  const prev = text.charAt(pos - 1);
  const name = word === 'Verse' ? `Verse ${nextVerseNumber(text)}` : word;
  const lead = !prev || prev === '\n' ? '' : '\n';
  return `${lead}${name}:\n`;
}
