import { test, eq } from './harness.js';
import { chordSpelling, isKeyName } from '../js/sheet/chords.js';

const steps = (name) => chordSpelling(name).steps;

test('chord spelling triads and qualities', () => {
  eq(chordSpelling('C'), { pc: 0, steps: [0, 4, 7], bass: null });
  eq(chordSpelling('F#m'), { pc: 6, steps: [0, 3, 7], bass: null });
  eq(steps('Bdim'), [0, 3, 6]);
  eq(steps('Caug'), [0, 4, 8]);
  eq(steps('C5'), [0, 7]);
});

test('chord spelling sevenths and extensions', () => {
  eq(steps('G7'), [0, 4, 7, 10]);
  eq(steps('Cmaj7'), [0, 4, 7, 11]);
  eq(steps('Am7'), [0, 3, 7, 10]);
  eq(steps('CmM7'), [0, 3, 7, 11]);
  eq(steps('Bø7'), [0, 3, 6, 10]);
  eq(steps('Bm7b5'), [0, 3, 6, 10]);
  eq(steps('Cdim7'), [0, 3, 6, 9]);
  eq(steps('C9'), [0, 4, 7, 10, 14]);
  eq(steps('C6'), [0, 4, 7, 9]);
});

test('chord spelling sus, add and alterations', () => {
  eq(steps('Dsus2'), [0, 2, 7]);
  eq(steps('Dsus4'), [0, 5, 7]);
  eq(steps('C7sus4'), [0, 5, 7, 10]);
  eq(steps('Cadd9'), [0, 4, 7, 14]);
  eq(steps('C7b9'), [0, 4, 7, 10, 13]);
});

test('chord spelling slash bass and non-chords', () => {
  eq(chordSpelling('C/E'), { pc: 0, steps: [0, 4, 7], bass: 4 });
  eq(chordSpelling('N.C.'), null);
  eq(chordSpelling('hello'), null);
});

test('chord spelling reads aug fives, bare sus numbers, dash minors and parenthesised tensions', () => {
  eq(steps('C+5'), [0, 4, 8]);
  eq(steps('C2'), [0, 2, 7]);
  eq(steps('C4'), [0, 5, 7]);
  eq(steps('C-7'), [0, 3, 7, 10]);
  eq(steps('C7(9)'), [0, 4, 7, 10, 14]);
  eq(steps('Cmaj7(9)'), [0, 4, 7, 11, 14]);
});

test('key names are checked whole', () => {
  eq(['G', 'Bbm', 'F# minor', 'eb'].map(isKeyName), [true, true, true, true]);
  eq(['H', 'foo', ''].map(isKeyName), [false, false, false]);
});
