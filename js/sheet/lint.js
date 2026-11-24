import { lineKind, lineKinds } from './parse.js';
import { parseKey, strayChordTokens, strayInlineChords } from './chords.js';
import { capoFret } from './transpose.js';
import { MIN_BPM, MAX_BPM, inBpmRange } from './tempo.js';
import { parseTuning } from './tuning.js';

const MAX_CAPO_FRET = 12;
const LINE_BREAK_RE = /\r\n?|\n/g;
const DIGIT_RE = /\d/;
const BRACKET_KINDS = new Set([lineKind.lyric, lineKind.inline, lineKind.chords]);

function notChord(chord) {
  return `"${chord}" isn't a chord`;
}

function notKey(key) {
  return `"${key}" isn't a key`;
}

function wholeLine(raw) {
  return { start: raw.length - raw.trimStart().length, end: raw.length };
}

function valueRange(raw, value) {
  const start = raw.indexOf(value, raw.indexOf(':') + 1);
  return start < 0 ? wholeLine(raw) : { start, end: start + value.length };
}

function keyMessage(value) {
  return parseKey(value) ? null : notKey(value);
}

function capoMessage(value) {
  return DIGIT_RE.test(value) && capoFret(value) <= MAX_CAPO_FRET ? null : `Capo should be 0–${MAX_CAPO_FRET}`;
}

function tempoMessage(value) {
  return inBpmRange(value) ? null : `Tempo should be ${MIN_BPM}–${MAX_BPM}`;
}

function tuningMessage(value) {
  return parseTuning(value) ? null : `"${value}" isn't a tuning`;
}

function headerMessage({ field, value }) {
  if (!value) return null;
  if (field === 'key') return keyMessage(value);
  if (field === 'capo') return capoMessage(value);
  if (field === 'tempo') return tempoMessage(value);
  if (field === 'tuning') return tuningMessage(value);
  return null;
}

function valueWarning(raw, value, message) {
  return message ? [{ ...valueRange(raw, value), message }] : [];
}

function tokenWarnings(raw, kind) {
  if (kind !== lineKind.lyric) return [];
  return strayChordTokens(raw).map(({ chord, col }) => ({ start: col, end: col + chord.length, message: notChord(chord) }));
}

function bracketWarnings(raw, kind) {
  if (!BRACKET_KINDS.has(kind)) return [];
  return strayInlineChords(raw).map(({ chord, index, end }) => ({ start: index, end, message: notChord(chord) }));
}

function chordWarnings(raw, kind) {
  return [...tokenWarnings(raw, kind), ...bracketWarnings(raw, kind)].sort((a, b) => a.start - b.start);
}

function lineWarnings(raw, entry) {
  if (entry.kind === lineKind.header) return valueWarning(raw, entry.value, headerMessage(entry));
  if (entry.kind === lineKind.key) return valueWarning(raw, entry.value, keyMessage(entry.value));
  if (entry.kind === lineKind.vis) return entry.spec.errors.map((message) => ({ ...wholeLine(raw), message }));
  return chordWarnings(raw, entry.kind);
}

export function lintSong(text) {
  const raw = String(text ?? '').split(LINE_BREAK_RE);
  return lineKinds(text).flatMap((entry, line) => lineWarnings(raw[line] ?? '', entry).map((warning) => ({ line, ...warning })));
}

export function textRange(text, { line, start, end }) {
  const before = line > 0 ? [...String(text ?? '').matchAll(LINE_BREAK_RE)][line - 1] : null;
  const offset = before ? before.index + before[0].length : 0;
  return { start: offset + start, end: offset + end };
}
