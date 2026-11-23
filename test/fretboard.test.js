import { test, eq } from './harness.js';
import { GUITAR, showId, matchId, positionsOf, pcPositions, chordPositions, chordVoicings, scalePatterns, runPositions, fretLayout } from '../js/sheet/fretboard.js';
import { modeId } from '../js/sheet/theory-model.js';
import { fingeringId } from '../js/sheet/vis-spec.js';

const BASS = { strings: [28, 33, 38, 43], frets: 20 };
const C_MAJOR = [0, 2, 4, 5, 7, 9, 11];
const A_MINOR_PENTATONIC = [9, 0, 2, 4, 7];
const where = (positions) => positions.map(({ string, fret }) => [string, fret]);
const ascending = (pattern) => pattern.every((p, i) => i === 0 || p.midi > pattern[i - 1].midi);
const perString = (pattern, count) => Array.from({ length: count }, (_, s) => pattern.filter((p) => p.string === s).length);
const uniqueStrings = (shape) => new Set(shape.map((p) => p.string)).size === shape.length;

test('fretboard finds every place a note can be played', () => {
  eq(where(positionsOf(45, GUITAR)), [[0, 5], [1, 0]]);
  eq(positionsOf(30, GUITAR), []);
  eq(where(positionsOf(33, BASS)), [[0, 5], [1, 0]]);
});

test('fretboard maps pitch classes across the neck', () => {
  const es = pcPositions([4], GUITAR);
  eq(es.every(({ midi }) => midi % 12 === 4), true);
  eq(es.length, 9);
});

test('fretboard chord shapes use one string per note within a hand span', () => {
  eq(where(chordPositions([60, 64, 67], GUITAR)), [[3, 5], [4, 5], [5, 3]]);
  eq(where(chordPositions([36, 40, 43], BASS)), [[1, 3], [2, 2], [3, 0]]);
});

test('fretboard chord shapes drop an octave rather than stack a string', () => {
  const shape = chordPositions([71, 74, 77], GUITAR);
  eq(shape.length, 3);
  eq(uniqueStrings(shape), true);
  eq(where(shape), [[3, 4], [4, 3], [5, 1]]);
});

test('fretboard chord voicings walk the neck on adjacent strings', () => {
  const voicings = chordVoicings([60, 64, 67], GUITAR);
  eq(voicings.length, 5);
  eq(where(voicings[0]), [[1, 3], [2, 2], [3, 0]]);
  eq(voicings.every(uniqueStrings), true);
  eq(voicings.every((shape) => shape.every((p, i) => i === 0 || p.string === shape[i - 1].string + 1)), true);
  eq(chordVoicings([36, 40, 43], BASS).every((shape) => shape.every((p) => p.string < 4)), true);
});

test('fretboard CAGED boxes give five ascending positions', () => {
  const boxes = scalePatterns(C_MAJOR, GUITAR, fingeringId.caged);
  eq(boxes.length, 5);
  eq(boxes.every(ascending), true);
  eq(boxes.every((box) => box.every((p) => C_MAJOR.includes(p.midi % 12))), true);
  eq(boxes[0].every((p) => p.fret <= 3), true);
  eq(scalePatterns(A_MINOR_PENTATONIC, GUITAR, fingeringId.caged).length, 5);
  eq(scalePatterns(C_MAJOR, BASS, fingeringId.caged).every((box) => box.every((p) => p.string < 4)), true);
});

test('fretboard three-per-string patterns start on each scale note', () => {
  const patterns = scalePatterns(C_MAJOR, GUITAR, fingeringId.threePerString);
  eq(patterns.length, 7);
  eq(perString(patterns[0], 6), [3, 3, 3, 3, 3, 3]);
  eq(patterns.every(ascending), true);
  eq(perString(scalePatterns(A_MINOR_PENTATONIC, GUITAR, fingeringId.threePerString)[0], 6), [2, 2, 2, 2, 2, 2]);
});

test('fretboard one-string patterns run along each string', () => {
  const patterns = scalePatterns(C_MAJOR, GUITAR, fingeringId.oneString);
  eq(patterns.length, 6);
  eq(patterns.every((pattern, s) => pattern.every((p) => p.string === s)), true);
});

test('fretboard runs stay playable and in position', () => {
  const run = [60, 62, 64, 65, 67, 69, 71, 72].map((midi) => [midi]);
  const path = runPositions(run, GUITAR);
  eq(path.map((step, i) => step[0].midi === run[i][0]), run.map(() => true));
  const anchors = path.map((step) => step[0].fret);
  eq(anchors.slice(1).every((fret, i) => Math.abs(fret - anchors[i]) < 5 || fret === 0 || anchors[i] === 0), true);
});

test('fretboard layout shows one chord voicing and mutes the rest', () => {
  const model = { mode: modeId.chord, shown: [60, 64, 67], shownPcs: [0, 4, 7], run: [] };
  const chord = fretLayout(model, GUITAR);
  eq([chord.count, chord.position], [5, 0]);
  eq(chord.muted, [0, 4, 5]);
  eq(chord.dots.length, 3);
  eq(fretLayout(model, GUITAR, { position: -1 }).position, 4);
  const neck = fretLayout(model, GUITAR, { show: showId.neck });
  eq(neck.dots.filter((dot) => !dot.faint).length, 3);
  eq(neck.dots.length > 3, true);
});

test('fretboard layout plays the scale position it shows', () => {
  const model = { mode: modeId.scale, shown: [], shownPcs: C_MAJOR, run: [] };
  const scale = fretLayout(model, GUITAR, { position: 1 });
  eq(scale.count, 5);
  eq(scale.run.length, scale.dots.length);
  eq(scale.dots.every((dot) => dot.steps.length === 1), true);
  eq(scale.muted, []);
});

test('fretboard layout finds a note in unison or every octave', () => {
  const model = { mode: modeId.note, shown: [60], shownPcs: [0], run: [] };
  const unison = fretLayout(model, GUITAR);
  eq(unison.count, 4);
  eq(where(unison.dots), [[4, 1]]);
  eq(fretLayout(model, GUITAR, { match: matchId.octaves }).count, pcPositions([0], GUITAR).length);
});

test('fretboard sequences follow the chosen position', () => {
  const run = [60, 62, 64, 65, 67].map((midi) => [midi]);
  const model = { mode: modeId.sequence, shown: [], shownPcs: [], scalePcs: C_MAJOR, run };
  const open = fretLayout(model, GUITAR, { position: 0 });
  eq(open.dots.every((dot) => dot.fret <= 3), true);
  const high = fretLayout(model, GUITAR, { position: 3 });
  eq(high.dots.every((dot) => dot.fret >= 7 && dot.fret <= 11), true);
  eq(high.run, run);
});

test('fretboard layout orders tab columns by what plays', () => {
  const scale = fretLayout({ mode: modeId.scale, shown: [], shownPcs: C_MAJOR, run: [] }, GUITAR);
  eq(scale.columns.length, scale.run.length);
  eq(scale.columns.map((column) => column.step), scale.run.map((_, i) => i));
  const chord = fretLayout({ mode: modeId.chord, shown: [60, 64, 67], shownPcs: [0, 4, 7], run: [] }, GUITAR);
  eq(chord.columns.map((column) => [column.step, column.positions.length]), [[null, 3]]);
  const run = [[60], [64, 67, 72]];
  const sequence = fretLayout({ mode: modeId.sequence, shown: [], shownPcs: [], scalePcs: C_MAJOR, run }, GUITAR);
  eq(sequence.columns.map((column) => [column.step, column.positions.length]), [[0, 1], [1, 3]]);
});
