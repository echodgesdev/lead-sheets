import { test, eq } from './harness.js';
import { wedgeNames, keyWedges, keyChords, chordNotes, wedgeNotes, displayName, pitchNames, chordPitches, noteMidi, voicing } from '../js/sheet/circle.js';

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
  eq(keyChords(1, false).at(-1), { chord: 'F#dim', numeral: 'vii°', index: 1, ring: 'dim', pc: 6, quality: 'diminished' });
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
  eq(pitchNames(0)[10], 'A#');
  eq(pitchNames(9)[10], 'Bb');
  eq(displayName('Bb'), 'B♭');
  eq(displayName('F#m'), 'F♯m');
});

test('circle chord pitches and voicings', () => {
  eq(chordPitches(9, 'minor'), [9, 0, 4]);
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
