import { test, eq } from './harness.js';
import { GUITAR, showId, matchId, positionsOf, pcPositions, chordPositions, chordVoicings, scalePatterns, runPositions, fretLayout, chartLayout } from '../js/sheet/fretboard.js';
import { modeId } from '../js/sheet/theory-model.js';
import { fingeringId, neckShapeId } from '../js/sheet/vis-spec.js';

const BASS = { strings: [28, 33, 38, 43], frets: 20 };
const C_MAJOR = [0, 2, 4, 5, 7, 9, 11];
const A_MINOR_PENTATONIC = [9, 0, 2, 4, 7];
const where = (positions) => positions.map(({ string, fret }) => [string, fret]);
const ascending = (pattern) => pattern.every((p, i) => i === 0 || p.midi > pattern[i - 1].midi);
const perString = (pattern, count) => Array.from({ length: count }, (_, s) => pattern.filter((p) => p.string === s).length);
const uniqueStrings = (shape) => new Set(shape.map((p) => p.string)).size === shape.length;
const grip = (shape) => GUITAR.strings.map((_, s) => shape.find((p) => p.string === s)?.fret ?? 'x').join('');
const grips = (root, steps, shape) => chordVoicings(root, steps.map((step) => 60 + root + step), GUITAR, shape).positions.map(grip);
const adjacent = (shape) => shape.every((p, i) => i === 0 || p.string === shape[i - 1].string + 1);
const sequence = (run, roots) => ({ mode: modeId.sequence, shown: [], shownPcs: [], scalePcs: C_MAJOR, run, steps: roots.map((rootPc) => ({ rootPc })) });
const OPEN_SHAPES = [
  [0, [0, 4, 7], 'x32010'],
  [9, [0, 4, 7], 'x02220'],
  [7, [0, 4, 7], '320003'],
  [4, [0, 4, 7], '022100'],
  [2, [0, 4, 7], 'xx0232'],
  [9, [0, 3, 7], 'x02210'],
  [4, [0, 3, 7], '022000'],
  [2, [0, 3, 7], 'xx0231'],
  [7, [0, 4, 7, 10], '320001'],
  [0, [0, 4, 7, 10], 'x32310'],
  [2, [0, 4, 7, 10], 'xx0212'],
  [9, [0, 4, 7, 10], 'x02020'],
  [4, [0, 4, 7, 10], '020100'],
  [9, [0, 3, 7, 10], 'x02010'],
  [2, [0, 3, 7, 10], 'xx0211'],
  [0, [0, 4, 7, 11], 'x32000'],
  [9, [0, 4, 7, 11], 'x02120'],
  [2, [0, 4, 7, 11], 'xx0222'],
];
const playable = (shape) => {
  const frets = shape.map((p) => p.fret).filter((fret) => fret > 0);
  return !frets.length || Math.max(...frets) - Math.min(...frets) < 4;
};

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

test('fretboard chord voicings default to the CAGED shapes from the lowest fret', () => {
  const { shape, shapes, positions } = chordVoicings(0, [60, 64, 67], GUITAR);
  eq([shape, shapes], [neckShapeId.caged, [neckShapeId.caged, neckShapeId.closed, neckShapeId.triad, neckShapeId.power]]);
  eq(positions.map(grip), ['x32010', 'x35553', '875558', '81010988', 'xx10121312']);
  eq(positions.every(uniqueStrings), true);
  eq(positions.every(playable), true);
});

test('fretboard triad voicings sit on neighbouring strings', () => {
  const { shape, positions } = chordVoicings(0, [60, 64, 67], GUITAR, neckShapeId.triad);
  eq(shape, neckShapeId.triad);
  eq(where(positions[0]), [[1, 3], [2, 2], [3, 0]]);
  eq(positions.every((p) => p.length === 3 && adjacent(p) && playable(p)), true);
  eq(chordVoicings(0, [60, 64, 67, 71], GUITAR).shapes.includes(neckShapeId.triad), false);
});

test('fretboard closed voicings play every chord tone once on neighbouring strings', () => {
  eq(grips(5, [0, 4, 7, 11], neckShapeId.closed).includes('xx3210'), true);
  eq(grips(0, [0, 4, 7, 11], neckShapeId.closed).includes('x3545x'), true);
  eq(grips(0, [0, 4, 7, 11], neckShapeId.closed).includes('81099xx'), true);
  eq(grips(2, [0, 3, 7, 10], neckShapeId.closed).includes('xx0211'), true);
  const closed = chordVoicings(0, [60, 64, 67, 71], GUITAR, neckShapeId.closed);
  eq(closed.shape, neckShapeId.closed);
  eq(closed.positions.every((p) => p.length === 4 && adjacent(p) && playable(p) && p[0].midi % 12 === 0), true);
  const triads = grips(0, [0, 4, 7], neckShapeId.triad);
  const closedTriads = chordVoicings(0, [60, 64, 67], GUITAR, neckShapeId.closed).positions;
  eq(closedTriads.some((shape) => shape.length === 3 && triads.includes(grip(shape))), true);
});

test('fretboard power chords are root, fifth and octave on the low strings', () => {
  eq(grips(0, [0, 4, 7], neckShapeId.power), ['x355xx', '81010xxx', 'xx101213x']);
  eq(grips(4, [0, 3, 7, 10], neckShapeId.power)[0], '022xxx');
  const dim = chordVoicings(11, [71, 74, 77], GUITAR, neckShapeId.power);
  eq([dim.shape, dim.shapes], [neckShapeId.closed, [neckShapeId.closed, neckShapeId.triad]]);
});

test('fretboard shells keep the root, third and seventh or sixth', () => {
  eq(grips(0, [0, 4, 7, 11], neckShapeId.shell), ['x3x45x', '8x99xx']);
  eq(grips(0, [0, 4, 7, 10], neckShapeId.shell)[0], 'x3x35x');
  eq(grips(0, [0, 3, 7, 10], neckShapeId.shell)[0], 'x3x34x');
  eq(grips(0, [0, 4, 7, 9], neckShapeId.shell)[0], 'x3x25x');
  eq(grips(11, [0, 3, 6, 10], neckShapeId.shell).slice(0, 2), ['x2x23x', '7x77xx']);
  eq(chordVoicings(0, [60, 64, 67], GUITAR, neckShapeId.shell).shape, neckShapeId.caged);
});

test('fretboard neck shapes fall back when the chord has none of them', () => {
  const inverted = chordVoicings(0, [64, 67, 72], GUITAR, neckShapeId.power);
  eq([inverted.shape, inverted.shapes], [neckShapeId.caged, [neckShapeId.caged, neckShapeId.closed, neckShapeId.triad]]);
  const halfDiminished = chordVoicings(11, [71, 74, 77, 81], GUITAR);
  eq([halfDiminished.shape, halfDiminished.shapes], [neckShapeId.closed, [neckShapeId.closed, neckShapeId.shell]]);
  eq(halfDiminished.positions.map(grip).slice(0, 2), ['x2323x', '7877xx']);
  eq(chordVoicings(11, [71, 74, 77], GUITAR, neckShapeId.shell).shape, neckShapeId.closed);
});

test('fretboard chord voicings include the open chord shapes', () => {
  eq(OPEN_SHAPES.filter(([root, steps, shape]) => !grips(root, steps).includes(shape)), []);
  eq(grips(7, [0, 4, 7])[0], '320003');
  eq(grips(9, [0, 3, 7])[0], 'x02210');
});

test('fretboard chord voicings move the shapes to any root', () => {
  eq(grips(5, [0, 4, 7])[0], '133211');
  eq(grips(10, [0, 3, 7]).includes('x13321'), true);
  eq(grips(0, [0, 2, 7]).includes('x30013'), true);
  eq(chordVoicings(11, [71, 75, 78, 81], GUITAR).positions.every(playable), true);
});

test('fretboard chord voicings follow the inversion in the bass', () => {
  const voicings = chordVoicings(0, [64, 67, 72], GUITAR).positions;
  eq(grip(voicings[0]), 'xx2010');
  eq(voicings.every((shape) => shape[0].midi % 12 === 4), true);
  eq(chordVoicings(0, [64, 67, 72], GUITAR, neckShapeId.triad).positions.every((shape) => shape[0].midi % 12 === 4), true);
});

test('fretboard chord voicings fall back to neighbouring strings', () => {
  const dim = chordVoicings(11, [71, 74, 77], GUITAR).positions;
  eq(dim.every((shape) => shape.length === 3 && adjacent(shape)), true);
  eq(chordVoicings(0, [36, 40, 43], BASS).positions.every((shape) => shape.every((p) => p.string < 4)), true);
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

test('fretboard layout shows one chord voicing, mutes the rest and plays what it shows', () => {
  const model = { mode: modeId.chord, shown: [60, 64, 67], shownPcs: [0, 4, 7], rootPc: 0, run: [] };
  const chord = fretLayout(model, GUITAR);
  eq([chord.count, chord.position], [5, 0]);
  eq([chord.shape, chord.shapes], [neckShapeId.caged, [neckShapeId.caged, neckShapeId.closed, neckShapeId.triad, neckShapeId.power]]);
  eq(chord.muted, [0]);
  eq(grip(chord.dots), 'x32010');
  eq(chord.voicing, [48, 52, 55, 60, 64]);
  eq(fretLayout(model, GUITAR, { position: -1 }).position, 4);
  eq(fretLayout(model, GUITAR, { shape: neckShapeId.triad }).voicing, [48, 52, 55]);
  const power = fretLayout(model, GUITAR, { shape: neckShapeId.power });
  eq([grip(power.dots), power.muted, power.voicing], ['x355xx', [0, 4, 5], [48, 55, 60]]);
  const neck = fretLayout(model, GUITAR, { show: showId.neck });
  eq(neck.dots.filter((dot) => !dot.faint).length, 5);
  eq(neck.dots.length > 5, true);
  eq(fretLayout({ mode: modeId.scale, shown: [], shownPcs: C_MAJOR, run: [] }, GUITAR).voicing, []);
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
  const model = sequence(run, run.map(([midi]) => midi % 12));
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
  const chord = fretLayout({ mode: modeId.chord, shown: [60, 64, 67], shownPcs: [0, 4, 7], rootPc: 0, run: [] }, GUITAR);
  eq(chord.columns.map((column) => [column.step, column.positions.length]), [[null, 5]]);
  const steps = fretLayout(sequence([[60], [64, 67, 72]], [0, 0]), GUITAR);
  eq(steps.columns.map((column) => [column.step, column.positions.length]), [[0, 1], [1, 3]]);
});

test('fretboard sequences voice chords in the chosen neck shape', () => {
  const model = sequence([[60, 64, 67]], [0]);
  eq(where(fretLayout(model, GUITAR).dots), where(chordPositions([60, 64, 67], GUITAR)));
  eq(grip(fretLayout(model, GUITAR, { shape: neckShapeId.caged }).dots), 'x32010');
  eq(grip(fretLayout(model, GUITAR, { shape: neckShapeId.power }).dots), 'x355xx');
});

test('fretboard chart frames the position it shows', () => {
  const model = { mode: modeId.chord, shown: [60, 64, 67], shownPcs: [0, 4, 7], rootPc: 0, run: [] };
  const frame = (options) => {
    const chart = chartLayout(fretLayout(model, GUITAR, options));
    return [chart.start, chart.rows, chart.nut, chart.barre];
  };
  eq(frame({ position: 0 }), [1, 4, true, null]);
  eq(frame({ position: 1 }), [1, 5, true, { fret: 3, from: 1, to: 5 }]);
  eq(frame({ position: 3 }), [8, 4, false, { fret: 8, from: 0, to: 5 }]);
  const open = chartLayout(fretLayout(model, GUITAR));
  eq([open.open.map((dot) => dot.string), open.muted, open.dots.length], [[3, 5], [0], 3]);
  eq(chartLayout(fretLayout({ ...model, shown: [65, 69, 72], rootPc: 5 }, GUITAR)).barre, { fret: 1, from: 0, to: 5 });
  const neck = chartLayout(fretLayout(model, GUITAR, { show: showId.neck }));
  eq(neck.dots.length + neck.open.length, 5);
  const scale = chartLayout(fretLayout({ mode: modeId.scale, shown: [], shownPcs: C_MAJOR, run: [] }, GUITAR));
  eq([scale.start, scale.nut, scale.barre, scale.muted], [1, true, null, []]);
});
