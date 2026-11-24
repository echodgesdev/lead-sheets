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

test('theory model shows borrowed chords only when asked', () => {
  const state = { index: 0, minor: false, mode: modeId.chord, chordIndex: 0, inversion: 0, shapes: [], scaleChoice: 'ionian', inKey: true, locked: false, minOctaves: 2 };
  eq(theoryModel(state).items.length, 7);
  eq(theoryModel({ ...state, borrowed: true }).items.length, 11);
  eq(theoryModel({ ...state, borrowed: true }).scalePcs, [0, 2, 4, 5, 7, 9, 11]);
});

test('theory model plays a borrowed chord by its index', () => {
  const state = { index: 0, minor: false, mode: modeId.chord, chordIndex: 9, inversion: 0, shapes: [], scaleChoice: 'ionian', inKey: true, borrowed: true, locked: false, minOctaves: 2 };
  const model = theoryModel(state);
  eq([model.chord.chord, model.chord.numeral, model.chord.borrowed], ['Ab', '♭VI', true]);
  eq(model.voiced, [68, 72, 75]);
  eq(model.shownPcs, [8, 0, 3]);
  eq(model.rootPc, 8);
  eq(model.note.name, 'Ab');
  const seventh = theoryModel({ ...state, chordIndex: 7, shapes: Object.assign([], { 7: '7th' }) });
  eq([seventh.shape, seventh.shapeOf(seventh.chord).name, seventh.shownPcs], ['7th', 'Fm7', [5, 8, 0, 3]]);
  const minor = theoryModel({ ...state, minor: true, chordIndex: 9 });
  eq([minor.chord.chord, minor.chord.numeral, minor.shownPcs], ['Bb', '♭II', [10, 2, 5]]);
});

test('theory model names raised degrees with sharps', () => {
  const model = sequenceModel({ index: 0, minor: false, steps: [degree(4, 1), degree(5, 1), degree(7, -1)], locked: true, minOctaves: 2 });
  eq(model.steps.map((s) => s.label), ['F♯', 'G♯', 'B♭']);
});
