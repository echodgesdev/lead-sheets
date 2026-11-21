import { test, eq } from './harness.js';
import { wedgeLabel, signature, keyWedges, keyChords, wedgeNotes } from '../js/sheet/circle.js';

test('circle labels', () => {
  eq(wedgeLabel(0, false), 'C');
  eq(wedgeLabel(0, true), 'Am');
  eq(wedgeLabel(6, false), 'F#/Gb');
  eq(wedgeLabel(6, true), 'D#m/Ebm');
  eq(wedgeLabel(11, true), 'Dm');
});

test('circle key signatures', () => {
  eq(signature(0), '');
  eq(signature(2), '2♯');
  eq(signature(6), '6♯/6♭');
  eq(signature(9), '3♭');
  eq(signature(11), '1♭');
});

test('circle key window wraps around', () => {
  eq(keyWedges(0), { outer: [11, 0, 1], inner: [11, 0, 1], diminished: 2 });
  eq(keyWedges(11), { outer: [10, 11, 0], inner: [10, 11, 0], diminished: 1 });
});

test('circle key chords with numerals', () => {
  eq(keyChords(0, false).map((c) => c.numeral), ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
  eq(keyChords(0, true).map((c) => `${c.chord} ${c.numeral}`), ['Am i', 'Bdim ii°', 'C ♭III', 'Dm iv', 'Em v', 'F ♭VI', 'G ♭VII']);
});

test('circle wedge notes', () => {
  eq(wedgeNotes(0, false, false), [60]);
  eq(wedgeNotes(1, false, true), [55, 59, 62]);
  eq(wedgeNotes(0, true, true), [57, 60, 64]);
  eq(wedgeNotes(6, false, false), [66]);
});
