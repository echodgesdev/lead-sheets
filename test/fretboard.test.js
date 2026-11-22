import { test, eq } from './harness.js';
import { GUITAR, positionsOf, pcPositions, chordPositions, runPositions, fretLayout } from '../js/sheet/fretboard.js';
import { modeId } from '../js/sheet/theory-model.js';

const BASS = { strings: [28, 33, 38, 43], frets: 20 };
const where = (positions) => positions.map(({ string, fret }) => [string, fret]);

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

test('fretboard runs stay playable and in position', () => {
  const run = [60, 62, 64, 65, 67, 69, 71, 72].map((midi) => [midi]);
  const path = runPositions(run, GUITAR);
  eq(path.map((step, i) => step[0].midi === run[i][0]), run.map(() => true));
  const anchors = path.map((step) => step[0].fret);
  eq(anchors.slice(1).every((fret, i) => Math.abs(fret - anchors[i]) < 5 || fret === 0 || anchors[i] === 0), true);
});

test('fretboard layout mutes unused strings for chords and tags run steps', () => {
  const chord = fretLayout({ mode: modeId.chord, shown: [60, 64, 67], shownPcs: [0, 4, 7], run: [] }, GUITAR);
  eq(chord.muted, [0, 1, 2]);
  eq(chord.dots.length, 3);
  const scale = fretLayout({ mode: modeId.scale, shown: [], shownPcs: [0, 2, 4, 5, 7, 9, 11], run: [[60], [62], [64]] }, GUITAR);
  eq(scale.dots.filter((dot) => dot.steps.length).length, 3);
  eq(scale.muted, []);
});
