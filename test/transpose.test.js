import { test, eq } from './harness.js';
import { parse } from '../js/sheet/parse.js';
import { transposeChord, nashville, roman, transposeKey, hasKey, viewChords } from '../js/sheet/transpose.js';

const chordsOf = (parsed) => parsed.blocks
  .filter((b) => b.type === 'pair')
  .map((b) => b.segments.map((s) => s.chord));

test('transposeChord', () => {
  eq(transposeChord('G', 2, false), 'A');
  eq(transposeChord('Bb', 1, false), 'B');
  eq(transposeChord('F#m7', -1, true), 'Fm7');
  eq(transposeChord('G/B*', 2, false), 'A/C#*');
  eq(transposeChord('C', 1, true), 'Db');
  eq(transposeChord('am', 2, false), 'Bm');
  eq(transposeChord('Cmaj7', -12, false), 'Cmaj7');
  eq(transposeChord('N.C.', 3, false), 'N.C.');
});

test('nashville numbers', () => {
  const c = { pc: 0 };
  eq(nashville('C', c), '1');
  eq(nashville('Am7', c), '6m⁷');
  eq(nashville('Bb', c), 'b7');
  eq(nashville('G/B', c), '5/7');
  eq(nashville('Dsus4*', c), '2sus⁴*');
  eq(nashville('E', { pc: 9 }), '5');
});

test('transposeKey and hasKey', () => {
  eq(transposeKey('G', 1), 'Ab');
  eq(transposeKey('Em', 1), 'Fm');
  eq(transposeKey('G major', 2), 'A');
  eq(transposeKey('E minor', -2), 'Dm');
  eq(transposeKey('G major', 0), 'G major');
  eq(transposeKey(undefined, 2), undefined);
  eq([hasKey('F#m'), hasKey(''), hasKey(undefined), hasKey('?')], [true, false, false, false]);
});

test('viewChords transposes pairs and keeps chord-line columns', () => {
  const parsed = parse('T\nKey: G\n\nG  C | D\n\nG    C\nHello world');
  const up = viewChords(parsed, { key: 'G', shift: 1 });
  eq(up.blocks[0], { type: 'chords', line: 'Ab Db | Eb' });
  eq(chordsOf(up), [['Ab', 'Db']]);
  eq(viewChords(parse('T\n\nBb  C'), { shift: 1 }).blocks[0].line, 'B   C#');
  eq(viewChords(parsed, { key: 'G' }), parsed);
});

test('viewChords numbers ignore shift and need a key', () => {
  const parsed = parse('T\nKey: G\n\nG    C/E\nHello world');
  eq(chordsOf(viewChords(parsed, { key: 'G', shift: 3, numbers: 'nashville' })), [['1', '4/6']]);
  eq(chordsOf(viewChords(parsed, { numbers: 'nashville' })), [['G', 'C/E']]);
});

test('roman numerals', () => {
  const c = { pc: 0 };
  const cases = [
    ['C', 'I'],
    ['Am7', 'vi⁷'],
    ['G/B', 'V⁶'],
    ['G7/B', 'V⁶₅'],
    ['Bb', '♭VII'],
    ['Bdim', 'vii°'],
    ['Bm7b5', 'viiø⁷'],
    ['Cmaj7', 'Imaj⁷'],
    ['Faug', 'IV+'],
    ['C/D', 'I/2'],
  ];
  for (const [chord, want] of cases) eq(roman(chord, c), want, chord);
  eq(roman('Am', { pc: 9 }), 'i');
  eq(roman('E7*', { pc: 9 }), 'V⁷*');
});

test('viewChords roman style', () => {
  const parsed = parse('T\nKey: G\n\nG    C/E\nHello world');
  eq(chordsOf(viewChords(parsed, { key: 'G', numbers: 'roman' })), [['I', 'IV⁶']]);
});
