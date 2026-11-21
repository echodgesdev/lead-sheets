import { diatonic } from './chords.js';
import { roman } from './transpose.js';

export const WEDGES = 12;

const FIFTHS = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
const MAJOR = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
const MINOR = ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'Bbm', 'Fm', 'Cm', 'Gm', 'Dm'];
const ENHARMONIC = { 6: { major: 'Gb', minor: 'Ebm' } };
const SHARP_SIDE = 6;
const RELATIVE_MINOR = 9;
const LOWEST_ROOT = 55;

const qualityId = Object.freeze({
  major: 'major',
  minor: 'minor',
  diminished: 'diminished',
});

const TRIADS = {
  [qualityId.major]: [0, 4, 7],
  [qualityId.minor]: [0, 3, 7],
  [qualityId.diminished]: [0, 3, 6],
};

const MAJOR_LAYOUT = [
  [0, false, qualityId.major],
  [-1, true, qualityId.minor],
  [1, true, qualityId.minor],
  [-1, false, qualityId.major],
  [1, false, qualityId.major],
  [0, true, qualityId.minor],
  [2, true, qualityId.diminished],
];

const MINOR_LAYOUT = [
  [0, true, qualityId.minor],
  [2, true, qualityId.diminished],
  [0, false, qualityId.major],
  [-1, true, qualityId.minor],
  [1, true, qualityId.minor],
  [-1, false, qualityId.major],
  [1, false, qualityId.major],
];

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
  const layout = minor ? MINOR_LAYOUT : MAJOR_LAYOUT;
  return diatonic(keyOf(index, minor)).map((chord, i) => {
    const [offset, onInner, quality] = layout[i];
    const at = wrap(index + offset);
    return { chord, numeral: roman(chord, { pc }), index: at, minor: onInner, pc: rootPc(at, onInner), quality };
  });
}

export function chordNotes(pc, quality, chord) {
  const root = LOWEST_ROOT + wrap(pc - LOWEST_ROOT);
  return chord ? TRIADS[quality].map((step) => root + step) : [root];
}

export function wedgeNotes(index, minor, chord) {
  return chordNotes(rootPc(index, minor), minor ? qualityId.minor : qualityId.major, chord);
}
