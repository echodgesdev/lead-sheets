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

export const qualityId = Object.freeze({
  major: 'major',
  minor: 'minor',
  diminished: 'diminished',
});

const TRIADS = {
  [qualityId.major]: [0, 4, 7],
  [qualityId.minor]: [0, 3, 7],
  [qualityId.diminished]: [0, 3, 6],
};

export const shapeId = Object.freeze({
  triad: 'triad',
  seventh: '7',
  major7: 'maj7',
  sus2: 'sus2',
  sus4: 'sus4',
  add9: 'add9',
  ninth: '9',
  eleventh: '11',
});

const SHAPES = {
  [shapeId.triad]: { add: [] },
  [shapeId.seventh]: { add: [10] },
  [shapeId.major7]: { add: [11] },
  [shapeId.sus2]: { steps: [0, 2, 7] },
  [shapeId.sus4]: { steps: [0, 5, 7] },
  [shapeId.add9]: { add: [14] },
  [shapeId.ninth]: { add: [10, 14] },
  [shapeId.eleventh]: { add: [10, 14, 17] },
};

const SUFFIXES = {
  [qualityId.major]: { [shapeId.triad]: '', [shapeId.seventh]: '7', [shapeId.major7]: 'maj7', [shapeId.add9]: 'add9', [shapeId.ninth]: '9', [shapeId.eleventh]: '11' },
  [qualityId.minor]: { [shapeId.triad]: 'm', [shapeId.seventh]: 'm7', [shapeId.major7]: 'mM7', [shapeId.add9]: 'madd9', [shapeId.ninth]: 'm9', [shapeId.eleventh]: 'm11' },
  [qualityId.diminished]: { [shapeId.triad]: 'dim', [shapeId.seventh]: 'ø7', [shapeId.major7]: '°M7', [shapeId.add9]: '°add9', [shapeId.ninth]: 'ø9', [shapeId.eleventh]: 'ø11' },
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

export function pitchNames(keyIndex, keyPcs = []) {
  const names = keyIndex > SHARP_SIDE ? FLAT_NAMES : SHARP_NAMES;
  return names.map((name, pc) => (keyPcs.includes(pc) ? name : FLAT_NAMES[pc]));
}

export function noteMidi(pc, tonic) {
  return LOWEST_TONIC + wrap(tonic - LOWEST_TONIC) + wrap(pc - tonic);
}

export function shapeSteps(quality, shape = shapeId.triad) {
  const { steps, add } = SHAPES[shape];
  return steps ?? [...TRIADS[quality], ...add];
}

export function shapePitches(pc, quality, shape) {
  return shapeSteps(quality, shape).map((step) => (pc + step) % WEDGES);
}

export function shapeName(chord, quality, shape) {
  const root = chord.replace(/(m|dim)$/, '');
  return shape === shapeId.sus2 || shape === shapeId.sus4 ? `${root}${shape}` : `${root}${SUFFIXES[quality][shape]}`;
}

export function chordNotes(pc, quality, chord, tonic, inversion = 0, shape = shapeId.triad) {
  const root = noteMidi(pc, tonic);
  if (!chord) return [root];
  return shapeSteps(quality, shape).map((step, i) => root + step + (i < inversion ? WEDGES : 0)).sort((a, b) => a - b);
}

export function wedgeNotes(index, minor, chord, tonic, inversion = 0, shape = shapeId.triad) {
  return chordNotes(keyTonic(index, minor), minor ? qualityId.minor : qualityId.major, chord, tonic, inversion, shape);
}

export function voicing(pc, quality, inversion, tonic, shape = shapeId.triad) {
  return chordNotes(pc, quality, true, tonic, inversion, shape);
}

export const scaleId = Object.freeze({
  ionian: 'ionian',
  dorian: 'dorian',
  phrygian: 'phrygian',
  lydian: 'lydian',
  mixolydian: 'mixolydian',
  aeolian: 'aeolian',
  locrian: 'locrian',
  majorPentatonic: 'majorPentatonic',
  minorPentatonic: 'minorPentatonic',
});

export const SCALES = [
  { id: scaleId.ionian, name: 'Ionian', short: 'Ionian', tag: '1', steps: [0, 2, 4, 5, 7, 9, 11] },
  { id: scaleId.dorian, name: 'Dorian', short: 'Dorian', tag: '2', steps: [0, 2, 3, 5, 7, 9, 10] },
  { id: scaleId.phrygian, name: 'Phrygian', short: 'Phryg.', tag: '3', steps: [0, 1, 3, 5, 7, 8, 10] },
  { id: scaleId.lydian, name: 'Lydian', short: 'Lydian', tag: '4', steps: [0, 2, 4, 6, 7, 9, 11] },
  { id: scaleId.mixolydian, name: 'Mixolydian', short: 'Mixo.', tag: '5', steps: [0, 2, 4, 5, 7, 9, 10] },
  { id: scaleId.aeolian, name: 'Aeolian', short: 'Aeolian', tag: '6', steps: [0, 2, 3, 5, 7, 8, 10] },
  { id: scaleId.locrian, name: 'Locrian', short: 'Locrian', tag: '7', steps: [0, 1, 3, 5, 6, 8, 10] },
  { id: scaleId.majorPentatonic, name: 'Major pentatonic', short: 'Pent.', tag: 'maj', steps: [0, 2, 4, 7, 9] },
  { id: scaleId.minorPentatonic, name: 'Minor pentatonic', short: 'Pent.', tag: 'min', steps: [0, 3, 5, 7, 10] },
];

export function scaleOf(id) {
  return SCALES.find((scale) => scale.id === id);
}

export function scalePitches(tonic, id) {
  return scaleOf(id).steps.map((step) => (tonic + step) % WEDGES);
}

export function scaleRun(tonic, id) {
  const base = noteMidi(tonic, tonic);
  return [...scaleOf(id).steps.map((step) => base + step), base + WEDGES];
}
