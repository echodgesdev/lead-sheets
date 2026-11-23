import { test, eq } from './harness.js';
import { wedgeNames, keyWedges, keyChords, chordNotes, wedgeNotes, displayName, pitchNames, intervalNames, noteMidi, scalePitches, scaleRun, chordShape, shapeChoices, shapeId, stepPitches, voiceNotes, scaleRoot, wedgeOf, degreeMidi, spelledNotes } from '../js/sheet/circle.js';
import { chordSpelling } from '../js/sheet/chords.js';

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

test('circle note names spell the key and its chromatic notes from the tonic', () => {
  eq(pitchNames(0, false), ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']);
  eq(pitchNames(4, false)[8], 'G#');
  eq(pitchNames(4, false)[10], 'A#');
  eq(pitchNames(9, false)[10], 'Bb');
  eq(pitchNames(0, true)[8], 'G#');
  eq(pitchNames(6, false)[5], 'E#');
  eq(pitchNames(6, true)[7], 'G');
  eq(displayName('Bb'), 'B♭');
  eq(displayName('F#m'), 'F♯m');
  eq(displayName('Bbm7b5'), 'B♭m7♭5');
});

test('circle interval names spell each note from the chord root', () => {
  eq(intervalNames('Dm')[6], 'F#');
  eq(intervalNames('Dm')[1], 'C#');
  eq(intervalNames('Em')[6], 'F#');
  eq(intervalNames('C')[6], 'Gb');
  eq(intervalNames('Bdim')[5], 'F');
  eq(intervalNames('F#')[5], 'E#');
});

test('circle chord pitches and voicings', () => {
  eq(stepPitches(9, [0, 3, 7]), [9, 0, 4]);
  eq(noteMidi(0, C), 60);
  eq(chordNotes(0, 'major', true, C, 0), [60, 64, 67]);
  eq(chordNotes(0, 'major', true, C, 1), [64, 67, 72]);
  eq(chordNotes(0, 'major', true, C, 2), [67, 72, 76]);
  eq(chordNotes(0, 'major', true, C, 3), [60, 64, 67]);
  eq(wedgeNotes(0, false, true, C, 4), [64, 67, 72]);
  eq(voiceNotes(0, [0, 4, 7, 10], C, 3), [70, 72, 76, 79]);
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
  eq(items.map((item) => chordShape(item, cMajor, '9th').name), ['Cmaj9', 'Dm9', 'Em7b9', 'Fmaj9', 'G9', 'Am9', 'Bø7b9']);
  eq(chordShape(items[3], cMajor, '11th').name, 'Fmaj9#11');
  eq(chordShape(items[0], cMajor, '9th').steps, [0, 4, 7, 11, 14]);
  eq(chordShape(items[0], cMajor, 'triad').name, 'C');
});

test('circle eleventh stacks skip the natural eleven over a major third', () => {
  const cMajor = [0, 2, 4, 5, 7, 9, 11];
  const items = keyChords(0, false);
  eq(chordShape(items[0], cMajor, shapeId.stack11), { steps: [0, 4, 7], name: 'C' });
  eq(chordShape(items[4], cMajor, shapeId.stack11).name, 'G');
  eq(chordShape(items[1], cMajor, shapeId.stack11).name, 'Dm11');
});

test('circle sixth, lydian and parallel minor shapes', () => {
  const cMajor = [0, 2, 4, 5, 7, 9, 11];
  const items = keyChords(0, false);
  eq(chordShape(items[0], cMajor, shapeId.sixth), { steps: [0, 4, 7, 9], name: 'C6' });
  eq(chordShape(items[0], cMajor, shapeId.sixNine), { steps: [0, 4, 7, 9, 14], name: 'C6/9' });
  eq(chordShape(items[1], cMajor, shapeId.sixth).name, 'Dm6');
  eq(chordShape(items[1], cMajor, shapeId.sixNine).name, 'Dm');
  eq(chordShape(items[3], cMajor, shapeId.lydian), { steps: [0, 4, 7, 11, 18], name: 'Fmaj7#11' });
  eq(chordShape(items[0], cMajor, shapeId.lydian).name, 'C');
  eq(chordShape(items[3], cMajor, shapeId.minor), { steps: [0, 3, 7], name: 'Fm' });
  eq(chordShape(items[6], cMajor, shapeId.sixth).name, 'Bdim');
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
  eq(wedgeOf(2, true), 11);
  eq(wedgeOf(9, true), 0);
});

test('circle shape choices are split by the notes of each chord', () => {
  const cMajor = [0, 2, 4, 5, 7, 9, 11];
  const items = keyChords(0, false);
  const split = (item) => {
    const choices = shapeChoices(item, cMajor);
    return [choices.filter((c) => c.inKey).map((c) => c.name), choices.filter((c) => !c.inKey).map((c) => c.name)];
  };
  eq(split(items[0]), [['C', 'Cmaj7', 'Cmaj9', 'C6', 'C6/9', 'Csus2', 'Csus4', 'Cadd9'], ['C7', 'Cm']]);
  eq(split(items[1]), [['Dm', 'Dm7', 'Dm9', 'Dm11', 'Dm6', 'Dsus2', 'Dsus4', 'Dmadd9'], ['DmM7']]);
  eq(split(items[3]), [['F', 'Fmaj7', 'Fmaj9', 'Fmaj9#11', 'Fmaj7#11', 'F6', 'F6/9', 'Fsus2', 'Fadd9'], ['Fsus4', 'F7', 'Fm']]);
  eq(split(items[4]), [['G', 'G7', 'G9', 'G6', 'G6/9', 'Gsus2', 'Gsus4', 'Gadd9'], ['Gmaj7', 'Gm']]);
  eq(split(items[6])[1], ['Bsus2', 'Bsus4', 'B°add9', 'B°M7']);
});

test('circle shape names parse back to their notes', () => {
  for (const [index, minor] of [[0, false], [0, true], [6, false], [9, true]]) {
    const items = keyChords(index, minor);
    const keyPcs = items.map((item) => item.pc);
    for (const item of items) {
      for (const choice of shapeChoices(item, keyPcs)) eq(chordSpelling(choice.name)?.steps, choice.steps, choice.name);
    }
  }
});

test('circle degrees climb the key and wrap to the octave', () => {
  eq([1, 3, 8].map((d) => degreeMidi(0, false, d)), [60, 64, 72]);
  eq(degreeMidi(0, false, 3, -1), 63);
  eq(degreeMidi(1, false, 2), 57);
});

test('circle spelled notes put a slash bass underneath', () => {
  eq(spelledNotes({ pc: C, steps: [0, 4, 7], bass: null }, C), [60, 64, 67]);
  eq(spelledNotes({ pc: C, steps: [0, 4, 7], bass: 4 }, C), [52, 60, 64, 67]);
});
