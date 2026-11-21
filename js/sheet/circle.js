import { diatonic } from './chords.js';
import { roman } from './transpose.js';

export const WEDGES = 12;

const FIFTHS = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
const MAJOR = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
const MINOR = ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'Bbm', 'Fm', 'Cm', 'Gm', 'Dm'];
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const ENHARMONIC = { 6: { major: 'Gb', minor: 'Ebm' } };
const RELATIVE_MINOR = 9;
const SHARP_SIDE = 6;
const DIM_ROOT_OFFSET = 2;
const LOWEST_TONIC = 53;

export const ringId = Object.freeze({
  outer: 'outer',
  inner: 'inner',
  dim: 'dim',
});

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
  [0, ringId.outer, qualityId.major],
  [-1, ringId.inner, qualityId.minor],
  [1, ringId.inner, qualityId.minor],
  [-1, ringId.outer, qualityId.major],
  [1, ringId.outer, qualityId.major],
  [0, ringId.inner, qualityId.minor],
  [0, ringId.dim, qualityId.diminished],
];

const MINOR_LAYOUT = [
  [0, ringId.inner, qualityId.minor],
  [0, ringId.dim, qualityId.diminished],
  [0, ringId.outer, qualityId.major],
  [-1, ringId.inner, qualityId.minor],
  [1, ringId.inner, qualityId.minor],
  [-1, ringId.outer, qualityId.major],
  [1, ringId.outer, qualityId.major],
];

function wrap(i) {
  return ((i % WEDGES) + WEDGES) % WEDGES;
}

export function keyOf(index, minor) {
  return (minor ? MINOR : MAJOR)[index];
}

export function wedgeNames(index, minor, keyIndex) {
  const name = keyOf(index, minor);
  const alt = ENHARMONIC[index]?.[minor ? 'minor' : 'major'];
  if (!alt) return [name];
  return keyIndex > SHARP_SIDE ? [alt, name] : [name, alt];
}

export function keyTonic(index, minor) {
  return (FIFTHS[index] + (minor ? RELATIVE_MINOR : 0)) % WEDGES;
}

export function keyWedges(index) {
  const around = [wrap(index - 1), index, wrap(index + 1)];
  return { outer: around, inner: around };
}

export function keyChords(index, minor) {
  const pc = keyTonic(index, minor);
  const layout = minor ? MINOR_LAYOUT : MAJOR_LAYOUT;
  return diatonic(keyOf(index, minor)).map((chord, i) => {
    const [offset, ring, quality] = layout[i];
    const at = wrap(index + offset);
    const root = ring === ringId.dim ? keyTonic(wrap(index + DIM_ROOT_OFFSET), true) : keyTonic(at, ring === ringId.inner);
    return { chord, numeral: roman(chord, { pc }), index: at, ring, pc: root, quality };
  });
}

export function displayName(name) {
  return name.replace(/#/g, '♯').replace(/([A-G])b/g, '$1♭');
}

export function pitchNames(keyIndex) {
  return keyIndex > SHARP_SIDE ? FLAT_NAMES : SHARP_NAMES;
}

export function chordSteps(quality) {
  return TRIADS[quality];
}

export function chordPitches(pc, quality) {
  return TRIADS[quality].map((step) => (pc + step) % WEDGES);
}

export function noteMidi(pc, tonic) {
  return LOWEST_TONIC + wrap(tonic - LOWEST_TONIC) + wrap(pc - tonic);
}

export function chordNotes(pc, quality, chord, tonic) {
  const root = noteMidi(pc, tonic);
  return chord ? TRIADS[quality].map((step) => root + step) : [root];
}

export function wedgeNotes(index, minor, chord, tonic) {
  return chordNotes(keyTonic(index, minor), minor ? qualityId.minor : qualityId.major, chord, tonic);
}

export function voicing(pc, quality, inversion, tonic) {
  return chordNotes(pc, quality, true, tonic)
    .map((midi, i) => (i < inversion ? midi + WEDGES : midi))
    .sort((a, b) => a - b);
}
