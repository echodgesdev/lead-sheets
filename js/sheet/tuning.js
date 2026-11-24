import { GUITAR, retune } from './fretboard.js';
import { SHARPS, FLATS, pitchOf } from './chords.js';
import { OCTAVE, mod12 } from '../core/math.js';

const STANDARD_PC = 4;
const WHOLE_STEP = 2;
const HALF_OCTAVE = OCTAVE / 2;
const NOTE = '([a-g])([#b]?)';
const STANDARD_RE = new RegExp(`^(?:${NOTE} )?standard$`);
const DROP_RE = new RegExp(`^drop ${NOTE}$`);
const LIST_RE = /^(?:[a-g][#b]?)+$/;
const SHIFTED = new Map([['half step down', -1], ['whole step down', -WHOLE_STEP]]);
const NAMED = new Map([
  ['double drop d', 'd a d g b d'],
  ['open g', 'd g d g b d'],
  ['open d', 'd a d f# a d'],
  ['open e', 'e b e g# b e'],
  ['open c', 'c g c g c e'],
]);

function normalized(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/♭/g, 'b')
    .replace(/♯/g, '#')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/ tuning$/, '');
}

function signedStep(steps) {
  const up = mod12(steps);
  return up < HALF_OCTAVE ? up : up - OCTAVE;
}

function nearest(pc, target) {
  return target + signedStep(pc - target);
}

function noteNames(text, count) {
  const letters = text.replace(/[\s,]+/g, '');
  if (!LIST_RE.test(letters)) return null;
  const read = (at, notes) => {
    if (at === letters.length) return notes.length === count ? notes : null;
    if (notes.length === count) return null;
    const letter = letters[at].toUpperCase();
    const acc = letters[at + 1];
    if (acc === '#' || acc === 'b') {
      const found = read(at + 2, [...notes, letter + acc]);
      if (found || acc === '#') return found;
    }
    return read(at + 1, [...notes, letter]);
  };
  return read(0, []);
}

function fromNames(names) {
  const strings = names.map((name, string) => nearest(pitchOf(name[0], name.slice(1)), GUITAR.strings[string]));
  return { strings, names };
}

function fromShift(shift, acc, drop = 0) {
  const strings = GUITAR.strings.map((open, string) => open + shift - (string === 0 ? drop : 0));
  const spelling = acc === '#' || (!acc && shift >= 0) ? SHARPS : FLATS;
  return { strings, names: strings.map((midi) => spelling[mod12(midi)]) };
}

function shiftTo(letter, acc, above = 0) {
  return signedStep(pitchOf(letter, acc) + above - STANDARD_PC);
}

function readTuning(text) {
  if (SHIFTED.has(text)) return fromShift(SHIFTED.get(text), '');
  if (NAMED.has(text)) return fromNames(noteNames(NAMED.get(text), GUITAR.strings.length));
  const standard = STANDARD_RE.exec(text);
  if (standard) return fromShift(standard[1] ? shiftTo(standard[1], standard[2]) : 0, standard[2] ?? '');
  const drop = DROP_RE.exec(text);
  if (drop) return fromShift(shiftTo(drop[1], drop[2], WHOLE_STEP), drop[2], WHOLE_STEP);
  const names = noteNames(text, GUITAR.strings.length);
  return names && fromNames(names);
}

export function parseTuning(text) {
  const value = normalized(text);
  const tuning = value ? readTuning(value) : null;
  return tuning && Object.freeze({ ...retune(GUITAR, tuning.strings), names: Object.freeze(tuning.names) });
}

export function stringNames(instrument) {
  return instrument.names ?? instrument.strings.map((midi) => SHARPS[mod12(midi)]);
}

export function nearestString({ strings }, midi) {
  return strings.reduce((best, open, string) => (Math.abs(midi - open) < Math.abs(midi - strings[best]) ? string : best), 0);
}
