import { diatonic, keyOf, fifthsIndex, flatSide, spellingOf, intervalSpelling, noteName, parseKey, nameSignature, signatureKey, SIGNATURES, FIFTHS, RELATIVE_MINOR, IONIAN, AEOLIAN } from './chords.js';
import { roman } from './transpose.js';
import { OCTAVE, mod12 } from '../core/math.js';

export { keyOf, fifthsIndex as wedgeOf };

export const WEDGES = FIFTHS.length;

const DIM_ROOT_OFFSET = 2;
const LOWEST_TONIC = 53;
const MAJOR_THIRD = 4;
const NATURAL_ELEVENTH = 17;
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];
const HARMONIC_MINOR = [0, 2, 3, 5, 7, 8, 11];

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
  stack7: '7th',
  stack9: '9th',
  stack11: '11th',
  lydian: 'maj7#11',
  sixth: '6',
  sixNine: '6/9',
  seventh: '7',
  major7: 'maj7',
  sus2: 'sus2',
  sus4: 'sus4',
  add9: 'add9',
});

const STACK_SIZES = {
  [shapeId.triad]: 3,
  [shapeId.stack7]: 4,
  [shapeId.stack9]: 5,
  [shapeId.stack11]: 6,
};

const SHAPES = {
  [shapeId.lydian]: { add: [11, 18], names: { [qualityId.major]: 'maj7#11' }, inKeyOnly: true },
  [shapeId.sixth]: { add: [9], names: { [qualityId.major]: '6', [qualityId.minor]: 'm6' } },
  [shapeId.sixNine]: { add: [9, 14], names: { [qualityId.major]: '6/9' } },
  [shapeId.seventh]: { add: [10], names: { [qualityId.major]: '7', [qualityId.minor]: 'm7', [qualityId.diminished]: 'ø7' } },
  [shapeId.major7]: { add: [11], names: { [qualityId.major]: 'maj7', [qualityId.minor]: 'mM7', [qualityId.diminished]: '°M7' } },
  [shapeId.sus2]: { steps: [0, 2, 7], names: everyQuality('sus2') },
  [shapeId.sus4]: { steps: [0, 5, 7], names: everyQuality('sus4') },
  [shapeId.add9]: { add: [14], names: { [qualityId.major]: 'add9', [qualityId.minor]: 'madd9', [qualityId.diminished]: '°add9' } },
};

const STACK_NAMES = {
  '0,4,7': '',
  '0,3,7': 'm',
  '0,3,6': 'dim',
  '0,4,7,11': 'maj7',
  '0,4,7,10': '7',
  '0,3,7,10': 'm7',
  '0,3,6,10': 'ø7',
  '0,3,7,11': 'mM7',
  '0,3,6,9': '°7',
  '0,4,7,11,14': 'maj9',
  '0,4,7,10,14': '9',
  '0,4,7,10,13': '7b9',
  '0,3,7,10,14': 'm9',
  '0,3,7,10,13': 'm7b9',
  '0,3,6,10,13': 'ø7b9',
  '0,3,6,10,14': 'ø9',
  '0,4,7,11,14,18': 'maj9#11',
  '0,3,7,10,14,17': 'm11',
  '0,3,7,10,13,17': 'm11b9',
  '0,3,6,10,13,17': 'ø11b9',
  '0,3,6,10,14,17': 'ø11',
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

const MAJOR_BORROWED = [
  [5, qualityId.minor, AEOLIAN],
  [3, qualityId.major, AEOLIAN],
  [8, qualityId.major, AEOLIAN],
  [10, qualityId.major, AEOLIAN],
];

const MINOR_BORROWED = [
  [7, qualityId.major, HARMONIC_MINOR],
  [5, qualityId.major, DORIAN],
  [1, qualityId.major, PHRYGIAN],
];

const QUALITY_SUFFIX = { [qualityId.major]: '', [qualityId.minor]: 'm' };

function everyQuality(suffix) {
  return Object.fromEntries(Object.values(qualityId).map((quality) => [quality, suffix]));
}

export function wedgeNames(index, minor) {
  return [...new Set([true, false].map((flat) => keyOf(index, minor, flat)))];
}

export function keyTonic(index, minor) {
  return mod12(FIFTHS[index] + (minor ? RELATIVE_MINOR : 0));
}

const ALPHABET = 'ABCDEFG';
const ACCIDENTAL_ORDER = ['b', '', '#'];

function alphabetical(a, b) {
  return ALPHABET.indexOf(a.name[0]) - ALPHABET.indexOf(b.name[0]) || ACCIDENTAL_ORDER.indexOf(a.name.slice(1).replace('m', '')) - ACCIDENTAL_ORDER.indexOf(b.name.slice(1).replace('m', ''));
}

export function keyChoices(minor) {
  return SIGNATURES.map((signature) => {
    const { index, flat } = signatureKey(signature);
    return { signature, index, flat, name: keyOf(index, minor, flat) };
  }).sort(alphabetical);
}

export function keyFromName(name) {
  const parsed = parseKey(name);
  return parsed && { ...signatureKey(nameSignature(name)), minor: parsed.minor };
}

export function parallelKey({ index, minor, flat }) {
  const letter = keyOf(index, minor, flat)[0];
  const target = fifthsIndex(keyTonic(index, minor), !minor);
  const spelled = [true, false].find((choice) => keyOf(target, !minor, choice)[0] === letter);
  return { index: target, minor: !minor, flat: spelled ?? flatSide(target) };
}

export function keyWedges(index) {
  const around = [mod12(index - 1), index, mod12(index + 1)];
  return { outer: around, inner: around };
}

export function keyScale(index, minor) {
  return stepPitches(keyTonic(index, minor), minor ? AEOLIAN : IONIAN);
}

function borrowedChords(index, minor, flat) {
  const pc = keyTonic(index, minor);
  const names = pitchNames(index, minor, flat);
  return (minor ? MINOR_BORROWED : MAJOR_BORROWED).map(([step, quality, steps]) => {
    const root = mod12(pc + step);
    const chord = `${names[root]}${QUALITY_SUFFIX[quality]}`;
    const inner = quality === qualityId.minor;
    const ring = inner ? ringId.inner : ringId.outer;
    return { chord, numeral: roman(chord, { pc }), index: fifthsIndex(root, inner), ring, pc: root, quality, scalePcs: stepPitches(pc, steps), borrowed: true };
  });
}

export function keyChords(index, minor, flat) {
  const pc = keyTonic(index, minor);
  const layout = minor ? MINOR_LAYOUT : MAJOR_LAYOUT;
  const scalePcs = keyScale(index, minor);
  const chords = diatonic(keyOf(index, minor, flat)).map((chord, i) => {
    const [offset, ring, quality] = layout[i];
    const at = mod12(index + offset);
    const root = ring === ringId.dim ? keyTonic(mod12(index + DIM_ROOT_OFFSET), true) : keyTonic(at, ring === ringId.inner);
    return { chord, numeral: roman(chord, { pc }), index: at, ring, pc: root, quality, scalePcs };
  });
  return [...chords, ...borrowedChords(index, minor, flat)];
}

export function displayName(name) {
  return name
    .replace(/#/g, '♯')
    .replace(/([A-G])(b+)/g, (_, letter, flats) => letter + '♭'.repeat(flats.length))
    .replace(/b(?=\d)/g, '♭');
}

export function pitchSpelling(index, minor, flat) {
  return spellingOf(keyOf(index, minor, flat));
}

export function pitchNames(index, minor, flat) {
  return pitchSpelling(index, minor, flat).map(noteName);
}

export function intervalNames(chord) {
  return intervalSpelling(chord).map(noteName);
}

export function noteMidi(pc, tonic) {
  return LOWEST_TONIC + mod12(tonic - LOWEST_TONIC) + mod12(pc - tonic);
}

function stackSteps(keyPcs, degree, size) {
  return Array.from({ length: size }, (_, k) => {
    const pc = keyPcs[(degree + 2 * k) % keyPcs.length];
    return mod12(pc - keyPcs[degree]) + (2 * k >= keyPcs.length ? OCTAVE : 0);
  });
}

function rootName(item) {
  return item.chord.replace(/(m|dim)$/, '');
}

function fitsKey(pc, steps, keyPcs) {
  return stepPitches(pc, steps).every((each) => keyPcs.includes(each));
}

function stackShape(item, size) {
  const { scalePcs } = item;
  const steps = stackSteps(scalePcs, scalePcs.indexOf(item.pc), size);
  if (steps.includes(MAJOR_THIRD) && steps.includes(NATURAL_ELEVENTH)) return null;
  return { steps, name: `${rootName(item)}${STACK_NAMES[steps.join(',')] ?? ''}` };
}

function addedShape(item, shape) {
  const { steps, add, names, inKeyOnly } = SHAPES[shape];
  const suffix = names[item.quality];
  if (suffix === undefined) return null;
  const all = steps ?? [...TRIADS[item.quality], ...add];
  if (inKeyOnly && !fitsKey(item.pc, all, item.scalePcs)) return null;
  return { steps: all, name: `${rootName(item)}${suffix}` };
}

function buildShape(item, shape) {
  return STACK_SIZES[shape] ? stackShape(item, STACK_SIZES[shape]) : addedShape(item, shape);
}

export function chordShape(item, shape = shapeId.triad) {
  return buildShape(item, shape) ?? buildShape(item, shapeId.triad);
}

const SHAPE_ORDER = [
  shapeId.triad,
  shapeId.stack7,
  shapeId.stack9,
  shapeId.stack11,
  shapeId.lydian,
  shapeId.sixth,
  shapeId.sixNine,
  shapeId.sus2,
  shapeId.sus4,
  shapeId.add9,
  shapeId.seventh,
  shapeId.major7,
];

export function shapeChoices(item, keyPcs) {
  const seen = new Set();
  return SHAPE_ORDER.map((id) => ({ id, ...buildShape(item, id) }))
    .filter(({ steps }) => steps && !seen.has(steps.join()) && seen.add(steps.join()))
    .map((choice) => ({ ...choice, inKey: fitsKey(item.pc, choice.steps, keyPcs) }));
}

export function stepPitches(pc, steps) {
  return steps.map((step) => mod12(pc + step));
}

export function voiceNotes(pc, steps, tonic, inversion = 0) {
  const root = noteMidi(pc, tonic);
  const raised = inversion % steps.length;
  return steps.map((step, i) => root + step + (i < raised ? OCTAVE : 0)).sort((a, b) => a - b);
}

export function chordNotes(pc, quality, chord, tonic, inversion = 0) {
  return chord ? voiceNotes(pc, TRIADS[quality], tonic, inversion) : [noteMidi(pc, tonic)];
}

export function wedgeNotes(index, minor, chord, tonic, inversion = 0) {
  return chordNotes(keyTonic(index, minor), minor ? qualityId.minor : qualityId.major, chord, tonic, inversion);
}

export function degreeMidi(index, minor, degree, shift = 0) {
  const pcs = keyScale(index, minor);
  const at = degree - 1;
  return noteMidi(pcs[0], pcs[0]) + mod12(pcs[at % pcs.length] - pcs[0]) + OCTAVE * Math.floor(at / pcs.length) + shift;
}

export function spelledNotes({ pc, steps, bass }, tonic) {
  const notes = voiceNotes(pc, steps, tonic);
  if (bass === null || bass === pc) return notes;
  const low = noteMidi(bass, tonic);
  return [low >= notes[0] ? low - OCTAVE : low, ...notes];
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
  { id: scaleId.ionian, name: 'Ionian', short: 'Ionian', offset: 0, steps: IONIAN },
  { id: scaleId.dorian, name: 'Dorian', short: 'Dorian', offset: 2, steps: DORIAN },
  { id: scaleId.phrygian, name: 'Phrygian', short: 'Phryg.', offset: 4, steps: PHRYGIAN },
  { id: scaleId.lydian, name: 'Lydian', short: 'Lydian', offset: 5, steps: [0, 2, 4, 6, 7, 9, 11] },
  { id: scaleId.mixolydian, name: 'Mixolydian', short: 'Mixo.', offset: 7, steps: [0, 2, 4, 5, 7, 9, 10] },
  { id: scaleId.aeolian, name: 'Aeolian', short: 'Aeolian', offset: 9, steps: AEOLIAN },
  { id: scaleId.locrian, name: 'Locrian', short: 'Locrian', offset: 11, steps: [0, 1, 3, 5, 6, 8, 10] },
  { id: scaleId.majorPentatonic, name: 'Major pentatonic', short: 'Maj pent', offset: 0, steps: [0, 2, 4, 7, 9] },
  { id: scaleId.minorPentatonic, name: 'Minor pentatonic', short: 'Min pent', offset: 9, steps: [0, 3, 5, 7, 10] },
];

function scaleOf(id) {
  return SCALES.find((scale) => scale.id === id);
}

export function scalePitches(tonic, id) {
  return scaleOf(id).steps.map((step) => mod12(tonic + step));
}

export function scaleRun(tonic, id) {
  const base = noteMidi(tonic, tonic);
  return [...scaleOf(id).steps.map((step) => base + step), base + OCTAVE];
}

export function scaleRoot(index, minor, id, inKey) {
  return inKey ? mod12(keyTonic(index, false) + scaleOf(id).offset) : keyTonic(index, minor);
}
