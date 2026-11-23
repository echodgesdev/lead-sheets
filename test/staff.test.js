import { test, eq } from './harness.js';
import { staffLayout, signatureSteps, clefId } from '../js/sheet/staff.js';
import { sequenceModel, keyAt } from '../js/sheet/theory-model.js';
import { stepKind } from '../js/sheet/vis-spec.js';

const degree = (n, shift = 0) => ({ kind: stepKind.degree, degree: n, shift });
const chord = (name) => ({ kind: stepKind.chord, chord: name });
const layoutOf = (key, steps) => staffLayout(sequenceModel({ ...keyAt(key), steps, locked: false, minOctaves: 2 }));
const notes = (layout) => layout.columns.map((column) => column.notes.map(({ d, acc, staff }) => [d % 7, acc, staff]));

test('staff places C major degrees on the treble clef without accidentals', () => {
  const layout = layoutOf('C', [degree(1), degree(2), degree(3)]);
  eq(layout.clefs, [clefId.treble]);
  eq(layout.signature.count, 0);
  eq(layout.columns.map((column) => column.notes[0].d), [28, 29, 30]);
  eq(layout.columns.map((column) => column.step), [0, 1, 2]);
});

test('staff spells notes against the key signature', () => {
  const layout = layoutOf('G', [degree(7), degree(4, 1), degree(7, -1)]);
  eq([layout.signature.acc, layout.signature.count], [1, 1]);
  eq(notes(layout), [[[3, null, clefId.treble]], [[0, 1, clefId.treble]], [[3, 0, clefId.treble]]]);
});

test('staff spells every degree of F sharp major on its own letter', () => {
  const layout = layoutOf('F#', [1, 2, 3, 4, 5, 6, 7].map((n) => degree(n)));
  eq(layout.signature.count, 6);
  eq(layout.columns.map((column) => column.notes[0].d % 7), [3, 4, 5, 6, 0, 1, 2]);
  eq(layout.columns.every((column) => column.notes[0].acc === null), true);
});

test('staff offsets seconds and splits wide chords across a grand staff', () => {
  eq(layoutOf('C', [chord('Csus2')]).columns[0].notes.map((note) => note.offset), [false, true, false]);
  const split = layoutOf('C', [chord('C/E')]);
  eq(split.clefs, [clefId.treble, clefId.bass]);
  eq(split.columns[0].notes.map((note) => note.staff), [clefId.bass, clefId.treble, clefId.treble, clefId.treble]);
});

test('staff key signatures sit on the standard lines', () => {
  eq(signatureSteps({ acc: 1, count: 2 }, clefId.treble), [38, 35]);
  eq(signatureSteps({ acc: -1, count: 3 }, clefId.bass), [20, 23, 19]);
});
