import { test, eq } from './harness.js';
import { parseTuning, stringNames, nearestString } from '../js/sheet/tuning.js';
import { GUITAR } from '../js/sheet/fretboard.js';

const strings = (text) => parseTuning(text)?.strings ?? null;
const STANDARD = [40, 45, 50, 55, 59, 64];
const HALF_DOWN = [39, 44, 49, 54, 58, 63];
const WHOLE_DOWN = [38, 43, 48, 53, 57, 62];
const DROP_D = [38, 45, 50, 55, 59, 64];

test('tuning reads standard and its names', () => {
  for (const text of ['Standard', 'E standard', 'standard tuning', 'E A D G B E', 'EADGBE']) eq(strings(text), STANDARD, text);
  eq(parseTuning('Standard').frets, GUITAR.frets);
});

test('tuning reads whole-neck shifts', () => {
  for (const text of ['Eb standard', 'E♭ standard', 'Half step down', 'Half-step down', 'D# standard']) eq(strings(text), HALF_DOWN, text);
  for (const text of ['D standard', 'Whole step down', 'whole-step down']) eq(strings(text), WHOLE_DOWN, text);
});

test('tuning reads drop tunings', () => {
  for (const text of ['Drop D', 'drop d tuning', 'D A D G B E', 'DADGBE', 'dadgbe']) eq(strings(text), DROP_D, text);
  eq(strings('Drop C#'), [37, 44, 49, 54, 58, 63]);
  eq(strings('Drop C'), [36, 43, 48, 53, 57, 62]);
  eq(strings('Double drop D'), [38, 45, 50, 55, 59, 62]);
});

test('tuning reads open tunings and note lists', () => {
  eq(strings('DADGAD'), [38, 45, 50, 55, 57, 62]);
  eq(strings('Open G'), [38, 43, 50, 55, 59, 62]);
  eq(strings('Open D'), [38, 45, 50, 54, 57, 62]);
  eq(strings('Open E'), [40, 47, 52, 56, 59, 64]);
  eq(strings('Open C'), [36, 43, 48, 55, 60, 64]);
  eq(strings('C# G# C# F# A# D#'), [37, 44, 49, 54, 58, 63]);
  eq(strings('Eb Ab Db Gb Bb Eb'), HALF_DOWN);
  eq(strings('ebabdbgbbbeb'), HALF_DOWN);
});

test('tuning keeps the spelling it was given', () => {
  eq(stringNames(parseTuning('Eb standard')), ['Eb', 'Ab', 'Db', 'Gb', 'Bb', 'Eb']);
  eq(stringNames(parseTuning('Drop C#')), ['C#', 'G#', 'C#', 'F#', 'A#', 'D#']);
  eq(stringNames(parseTuning('Drop C')), ['C', 'G', 'C', 'F', 'A', 'D']);
  eq(stringNames(parseTuning('Open D')), ['D', 'A', 'D', 'F#', 'A', 'D']);
  eq(stringNames(GUITAR), ['E', 'A', 'D', 'G', 'B', 'E']);
});

test('tuning rejects what it cannot read', () => {
  for (const text of ['', '  ', 'banjo', 'Drop H', 'D A D', 'D A D G C E A', 'Eb', 'constructor', null]) eq(parseTuning(text), null, String(text));
});

test('tuning finds the open string nearest a pitch', () => {
  const dropD = parseTuning('Drop D');
  eq(nearestString(dropD, 38.2), 0);
  eq(nearestString(dropD, 40), 0);
  eq(nearestString(dropD, 52), 2);
  eq(nearestString(dropD, 63.6), 5);
  eq(nearestString(GUITAR, 45), 1);
});
