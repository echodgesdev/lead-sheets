import { diatonic } from './chords.js';
import { roman } from './transpose.js';

export const WEDGES = 12;

const FIFTHS = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
const MAJOR = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
const MINOR = ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'Bbm', 'Fm', 'Cm', 'Gm', 'Dm'];
const ENHARMONIC = { 6: { major: 'Gb', minor: 'Ebm' } };
const SHARP_SIDE = 6;
const RELATIVE_MINOR = 9;
const MAJOR_THIRD = 4;
const MINOR_THIRD = 3;
const FIFTH = 7;
const LOWEST_ROOT = 55;

function wrap(i) {
  return ((i % WEDGES) + WEDGES) % WEDGES;
}

export function keyOf(index, minor) {
  return (minor ? MINOR : MAJOR)[index];
}

export function wedgeLabel(index, minor) {
  const alt = ENHARMONIC[index]?.[minor ? 'minor' : 'major'];
  return alt ? `${keyOf(index, minor)}/${alt}` : keyOf(index, minor);
}

export function signature(index) {
  if (index === 0) return '';
  if (index === SHARP_SIDE) return `${index}♯/${index}♭`;
  return index < SHARP_SIDE ? `${index}♯` : `${WEDGES - index}♭`;
}

function rootPc(index, minor) {
  return (FIFTHS[index] + (minor ? RELATIVE_MINOR : 0)) % WEDGES;
}

export function keyWedges(index) {
  const around = [wrap(index - 1), index, wrap(index + 1)];
  return { outer: around, inner: around, diminished: wrap(index + 2) };
}

export function keyChords(index, minor) {
  const pc = rootPc(index, minor);
  return diatonic(keyOf(index, minor)).map((chord) => ({ chord, numeral: roman(chord, { pc }) }));
}

export function wedgeNotes(index, minor, chord) {
  const root = LOWEST_ROOT + wrap(rootPc(index, minor) - LOWEST_ROOT);
  if (!chord) return [root];
  return [root, root + (minor ? MINOR_THIRD : MAJOR_THIRD), root + FIFTH];
}
