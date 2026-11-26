import { test, eq } from './harness.js';
import { chordSpelling, isKeyName, keySpelling, keyName, noteName, mapChord, chordQuality, SIGNATURES, signatureOf, signatureKey, keyOf, nameSignature, spellingOf } from '../js/sheet/chords.js';

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

test('chord spelling lets altered tensions replace natural ones', () => {
  eq(steps('Em11b9'), [0, 3, 7, 10, 13, 17]);
  eq(steps('C13b9'), [0, 4, 7, 10, 13, 21]);
  eq(steps('Fmaj7#11'), [0, 4, 7, 11, 18]);
  eq(steps('C6/9'), [0, 4, 7, 9, 14]);
  eq(steps('Dm6'), [0, 3, 7, 9]);
});

test('chord parts map notes and read qualities', () => {
  eq(mapChord('G/B*', (pc) => String(pc)), '7/11*');
  eq(mapChord('N.C.', (pc) => String(pc)), 'N.C.');
  eq(chordQuality('m7b5').mark, 'ø');
  eq(chordQuality('maj7'), null);
});

test('key spelling names every pitch class from the tonic', () => {
  const names = (pc, minor) => keySpelling(pc, minor).map(noteName);
  eq(names(0, false), ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']);
  eq(names(9, true), ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B']);
  eq(keySpelling(7, false).filter((s) => s.inKey && s.acc).map(noteName), ['F#']);
  eq([keyName(8, false), keyName(3, true), keyName(6, false)], ['Ab', 'D#m', 'F#']);
});

test('key signatures run from seven sharps to seven flats, enharmonics apart', () => {
  const keys = (minor) => SIGNATURES.map((signature) => {
    const { index, flat } = signatureKey(signature);
    return keyOf(index, minor, flat);
  });
  eq(SIGNATURES.length, 15);
  eq(keys(false), ['C#', 'F#', 'B', 'E', 'A', 'D', 'G', 'C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb']);
  eq(keys(true), ['A#m', 'D#m', 'G#m', 'C#m', 'F#m', 'Bm', 'Em', 'Am', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm']);
  eq(SIGNATURES.map((signature) => signatureKey(signature).index).map((index, i) => signatureOf(index, SIGNATURES[i] < 0)), SIGNATURES);
});

test('key signatures default to the usual spelling and keep the chosen one', () => {
  eq([5, 6, 7].map((index) => signatureOf(index)), [5, 6, -5]);
  eq([5, 6, 7].map((index) => signatureOf(index, true)), [-7, -6, -5]);
  eq([5, 6, 7].map((index) => signatureOf(index, false)), [5, 6, 7]);
  eq([0, 2, 11].map((index) => signatureOf(index, true)), [0, 2, -1]);
  eq(['Gb', 'F#', 'Cb', 'B', 'C#', 'Db', 'Ebm', 'D#m', 'G', 'F', 'nope'].map(nameSignature), [-6, 6, -7, 5, 7, -5, -6, 6, 1, -1, null]);
  eq(spellingOf('Gb').map(noteName)[11], 'Cb');
  eq(spellingOf('F#').map(noteName)[5], 'E#');
  eq(spellingOf('nope'), null);
});

test('key names are checked whole', () => {
  eq(['G', 'Bbm', 'F# minor', 'eb'].map(isKeyName), [true, true, true, true]);
  eq(['H', 'foo', ''].map(isKeyName), [false, false, false]);
});
