import { test, eq } from './harness.js';
import { keyAt, sequenceModel, theoryModel, modeId } from '../js/sheet/theory-model.js';
import { stepKind } from '../js/sheet/vis-spec.js';

const degree = (n, shift = 0) => ({ kind: stepKind.degree, degree: n, shift });
const chord = (name) => ({ kind: stepKind.chord, chord: name });

test('theory model finds keys by name', () => {
  eq(keyAt('G'), { index: 1, minor: false });
  eq(keyAt('Em'), { index: 1, minor: true });
  eq(keyAt('nope'), null);
});

test('theory model sequences degrees and chords in the key', () => {
  const model = sequenceModel({ index: 0, minor: false, steps: [degree(1), degree(3, -1), degree(8), chord('G7'), chord('N.C.')], locked: true, minOctaves: 2 });
  eq(model.mode, modeId.sequence);
  eq(model.run, [[60], [63], [72], [67, 71, 74, 77]]);
  eq(model.steps.map((s) => s.top).slice(0, 3), ['1', '♭3', '8']);
  eq(model.steps.map((s) => s.label), ['C', 'E♭', 'C', 'G7']);
  eq(model.shown, [60, 63, 67, 71, 72, 74, 77]);
  eq(model.allowed, [0, 3, 7, 11, 2, 5]);
});

test('theory model scale runs are one note per step', () => {
  const model = theoryModel({ index: 0, minor: false, mode: modeId.scale, chordIndex: 0, inversion: 0, shapes: [], scaleChoice: 'dorian', inKey: true, locked: false, minOctaves: 2 });
  eq(model.scale.root, 2);
  eq(model.run, [[62], [64], [65], [67], [69], [71], [72], [74]]);
  eq(model.scales.length, 9);
});

test('theory model names raised degrees with sharps', () => {
  const model = sequenceModel({ index: 0, minor: false, steps: [degree(4, 1), degree(5, 1), degree(7, -1)], locked: true, minOctaves: 2 });
  eq(model.steps.map((s) => s.label), ['F♯', 'G♯', 'B♭']);
});
