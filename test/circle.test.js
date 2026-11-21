import { test, eq } from './harness.js';
import { wedgeNames, keyWedges, keyChords, chordNotes, wedgeNotes, displayName, pitchNames, noteMidi, voicing, scalePitches, scaleRun, chordShape, stepPitches, voiceNotes, scaleRoot, wedgeOf } from '../js/sheet/circle.js';

const C = 0;
const G = 7;

test('circle wedge names lead with the key spelling', () => {
  eq(wedgeNames(0, false, 0), ['C']);
  eq(wedgeNames(11, true, 0), ['Dm']);
  eq(wedgeNames(6, false, 0), ['F#', 'Gb']);
  eq(wedgeNames(6, false, 6), ['F#', 'Gb']);
  eq(wedgeNames(6, false, 9), ['Gb', 'F#']);
  eq(wedgeNames(6, true, 10), ['Ebm', 'D#m']);
});

test('circle key window wraps around', () => {
  eq(keyWedges(0), { outer: [11, 0, 1], inner: [11, 0, 1] });
  eq(keyWedges(11), { outer: [10, 11, 0], inner: [10, 11, 0] });
});

test('circle key chords with numerals', () => {
  eq(keyChords(0, false).map((c) => c.numeral), ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
  eq(keyChords(0, true).map((c) => `${c.chord} ${c.numeral}`), ['Am i', 'Bdim ii°', 'C ♭III', 'Dm iv', 'Em v', 'F ♭VI', 'G ♭VII']);
});

test('circle key chords sit on their wedges', () => {
  const at = (c) => `${c.chord}@${c.ring}${c.index}`;
  eq(keyChords(0, false).map(at), ['C@outer0', 'Dm@inner11', 'Em@inner1', 'F@outer11', 'G@outer1', 'Am@inner0', 'Bdim@dim0']);
  eq(keyChords(0, true).map(at), ['Am@inner0', 'Bdim@dim0', 'C@outer0', 'Dm@inner11', 'Em@inner1', 'F@outer11', 'G@outer1']);
  eq(keyChords(1, false).at(-1), { chord: 'F#dim', numeral: 'vii°', index: 1, ring: 'dim', pc: 6, quality: 'diminished', role: 'dominant' });
});

test('circle notes rise through the key from its tonic', () => {
  eq([0, 2, 4, 5, 7, 9, 11].map((pc) => chordNotes(pc, 'major', false, C)), [[60], [62], [64], [65], [67], [69], [71]]);
  eq([7, 9, 11, 0, 2, 4, 6].map((pc) => chordNotes(pc, 'major', false, G)), [[55], [57], [59], [60], [62], [64], [66]]);
});

test('circle chord notes by quality', () => {
  eq(chordNotes(11, 'diminished', true, C), [71, 74, 77]);
  eq(chordNotes(0, 'major', true, C), [60, 64, 67]);
});

test('circle wedge notes follow the key', () => {
  eq(wedgeNotes(0, false, false, C), [60]);
  eq(wedgeNotes(1, false, false, C), [67]);
  eq(wedgeNotes(0, true, true, C), [69, 72, 76]);
  eq(wedgeNotes(0, false, false, G), [60]);
});

test('circle note names follow the key side', () => {
  const cMajor = [0, 2, 4, 5, 7, 9, 11];
  const eMajor = [4, 6, 8, 9, 11, 1, 3];
  eq(pitchNames(0, cMajor)[10], 'Bb');
  eq(pitchNames(4, eMajor)[8], 'G#');
  eq(pitchNames(4, eMajor)[10], 'Bb');
  eq(pitchNames(9, [8, 10, 0, 1, 3, 5, 7])[10], 'Bb');
  eq(displayName('Bb'), 'B♭');
  eq(displayName('F#m'), 'F♯m');
});

test('circle chord pitches and voicings', () => {
  eq(stepPitches(9, [0, 3, 7]), [9, 0, 4]);
  eq(noteMidi(0, C), 60);
  eq(voicing(0, 'major', 0, C), [60, 64, 67]);
  eq(voicing(0, 'major', 1, C), [64, 67, 72]);
  eq(voicing(0, 'major', 2, C), [67, 72, 76]);
});

test('circle chord sounds follow the voicing', () => {
  eq(chordNotes(0, 'major', true, C, 1), [64, 67, 72]);
  eq(wedgeNotes(1, false, true, C, 2), [74, 79, 83]);
  eq(wedgeNotes(1, false, false, C, 2), [67]);
});

test('circle scales from the tonic', () => {
  eq(scalePitches(C, 'dorian'), [0, 2, 3, 5, 7, 9, 10]);
  eq(scalePitches(G, 'minorPentatonic'), [7, 10, 0, 2, 5]);
  eq(scaleRun(C, 'majorPentatonic'), [60, 62, 64, 67, 69, 72]);
  eq(scaleRun(G, 'ionian'), [55, 57, 59, 60, 62, 64, 66, 67]);
});

test('circle chord shapes stack within the key', () => {
  const cMajor = [0, 2, 4, 5, 7, 9, 11];
  const items = keyChords(0, false);
  eq(items.map((item) => chordShape(item, cMajor, '7th').name), ['Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bø7']);
  eq(items.map((item) => chordShape(item, cMajor, '9th').name), ['Cmaj9', 'Dm9', 'Em7♭9', 'Fmaj9', 'G9', 'Am9', 'Bø7♭9']);
  eq(chordShape(items[3], cMajor, '11th').name, 'Fmaj9♯11');
  eq(chordShape(items[0], cMajor, '9th').steps, [0, 4, 7, 11, 14]);
  eq(chordShape(items[0], cMajor, 'triad').name, 'C');
  eq(items.map((item) => item.role), ['tonic', 'subdominant', 'tonic', 'subdominant', 'dominant', 'tonic', 'dominant']);
  eq(keyChords(0, true).map((item) => item.role), ['tonic', 'subdominant', 'tonic', 'subdominant', 'dominant', 'subdominant', 'dominant']);
});

test('circle borrowed chord shapes', () => {
  const cMajor = [0, 2, 4, 5, 7, 9, 11];
  const items = keyChords(0, false);
  eq(chordShape(items[0], cMajor, '7'), { steps: [0, 4, 7, 10], name: 'C7' });
  eq(chordShape(items[1], cMajor, 'maj7').name, 'DmM7');
  eq(chordShape(items[0], cMajor, 'sus4'), { steps: [0, 5, 7], name: 'Csus4' });
  eq(chordShape(items[6], cMajor, '7').name, 'Bø7');
  eq(voiceNotes(0, [0, 4, 7, 10], C, 1), [64, 67, 70, 72]);
});

test('circle scale roots in the key or on the tonic', () => {
  eq(scaleRoot(0, false, 'dorian', true), 2);
  eq(scaleRoot(0, false, 'dorian', false), 0);
  eq(scaleRoot(0, true, 'ionian', true), 0);
  eq(scaleRoot(0, true, 'dorian', false), 9);
  eq(scaleRoot(1, false, 'minorPentatonic', true), 4);
  eq(scalePitches(scaleRoot(0, false, 'dorian', true), 'dorian'), [2, 4, 5, 7, 9, 11, 0]);
  eq(wedgeOf(7), 1);
});
