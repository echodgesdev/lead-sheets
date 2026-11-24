import { test, eq } from './harness.js';
import { parseVisSpec, visId, alignId, visControlId, stepKind, fingeringId, neckShapeId } from '../js/sheet/vis-spec.js';

const deg = (degree, shift = 0) => ({ kind: stepKind.degree, degree, shift });
const chord = (name) => ({ kind: stepKind.chord, chord: name });

test('parseVisSpec ignores lines that are not vis directives', () => {
  const lines = ['', 'Hello', 'vis: piano', '{title: Song}', '{c: play softly}', '{seq: 1 2, vis: piano}', '{vis piano}', '[vis: piano]', '{vis: piano'];
  lines.forEach((l) => eq(parseVisSpec(l), null, JSON.stringify(l)));
  eq(parseVisSpec(undefined), null);
});

test('parseVisSpec reads a piano with degrees and controls', () => {
  eq(parseVisSpec('{vis: piano, seq: 1 2 3 5 8 1, controls: play}'), {
    vis: visId.piano,
    align: alignId.root,
    key: null,
    seq: [deg(1), deg(2), deg(3), deg(5), deg(8), deg(1)],
    controls: [visControlId.play],
    position: null,
    fingering: fingeringId.caged,
    shape: null,
    errors: [],
  });
});

test('parseVisSpec reads a clock with a key and chords', () => {
  eq(parseVisSpec('{vis: clock, key: G, seq: G Em C D}'), {
    vis: visId.clock,
    align: alignId.root,
    key: 'G',
    seq: [chord('G'), chord('Em'), chord('C'), chord('D')],
    controls: [],
    position: null,
    fingering: fingeringId.caged,
    shape: null,
    errors: [],
  });
});

test('parseVisSpec keys is an alias for piano and degrees take accidentals', () => {
  const spec = parseVisSpec('{vis: keys, seq: 1 b3 5 b7}');
  eq(spec.vis, visId.piano);
  eq(spec.seq, [deg(1), deg(3, -1), deg(5), deg(7, -1)]);
  eq(parseVisSpec('{vis: keys, seq: #4 ♭7 ♯5 15}').seq, [deg(4, 1), deg(7, -1), deg(5, 1), deg(15)]);
});

test('parseVisSpec reads every vis id', () => {
  Object.values(visId).forEach((id) => eq(parseVisSpec(`{vis: ${id}}`).vis, id, id));
});

test('parseVisSpec reads a tonnetz', () => {
  const spec = parseVisSpec('{vis: Tonnetz, seq: C Am F G, controls: play}');
  eq([spec.vis, spec.seq, spec.errors], [visId.tonnetz, [chord('C'), chord('Am'), chord('F'), chord('G')], []]);
});

test('parseVisSpec reads intervals on the root and notes as intervals on the key', () => {
  const intervals = parseVisSpec('{vis: intervals, seq: G C}');
  eq([intervals.vis, intervals.align], [visId.intervals, alignId.root]);
  const notes = parseVisSpec('{vis: Notes, seq: G C}');
  eq([notes.vis, notes.align, notes.errors], [visId.intervals, alignId.key, []]);
});

test('parseVisSpec is case-insensitive and forgiving of whitespace', () => {
  eq(parseVisSpec('  {  VIS : Clock ,KEY: F#m ,  Seq:  Am   C  , Controls: PLAY ,}  '), {
    vis: visId.clock,
    align: alignId.root,
    key: 'F#m',
    seq: [chord('Am'), chord('C')],
    controls: [visControlId.play],
    position: null,
    fingering: fingeringId.caged,
    shape: null,
    errors: [],
  });
});

test('parseVisSpec defaults an unknown vis to piano with an error', () => {
  const spec = parseVisSpec('{vis: banjo, seq: 1}');
  eq(spec.vis, visId.piano);
  eq(spec.seq, [deg(1)]);
  eq(spec.errors, ['Unknown vis "banjo", showing piano']);
});

test('parseVisSpec skips bad steps, reserving brackets for later', () => {
  const spec = parseVisSpec('{vis: piano, seq: 1 16 0 x [1 3 5] Hello Bbm7}');
  eq(spec.seq, [deg(1), chord('Bbm7')]);
  eq(spec.errors, ['Skipped step "16"', 'Skipped step "0"', 'Skipped step "x"', 'Skipped step "[1 3 5]"', 'Skipped step "Hello"']);
});

test('parseVisSpec reports unknown fields and controls', () => {
  const spec = parseVisSpec('{vis: notes, foo: 1, controls: play loop, bare}');
  eq([spec.vis, spec.align], [visId.intervals, alignId.key]);
  eq(spec.controls, [visControlId.play]);
  eq(spec.errors, ['Unknown field "foo"', 'Unknown control "loop"', 'Expected "name: value", got "bare"']);
});

test('parseVisSpec leaves key null when omitted or empty', () => {
  eq(parseVisSpec('{vis: fifths}'), { vis: visId.fifths, align: alignId.root, key: null, seq: [], controls: [], position: null, fingering: fingeringId.caged, shape: null, errors: [] });
  eq(parseVisSpec('{vis: fifths, key: }').key, null);
});

test('parseVisSpec reports unreadable keys and chords it cannot spell', () => {
  const spec = parseVisSpec('{vis: piano, key: H, seq: 1 N.C. G}');
  eq(spec.key, null);
  eq(spec.seq.map((s) => s.chord ?? s.degree), [1, 'G']);
  eq(spec.errors, ['Unknown key "H", using the song key', 'Skipped step "N.C."']);
});

test('parseVisSpec reads a fretboard position and fingering', () => {
  const spec = parseVisSpec('{vis: guitar, position: 3, fingering: 3NPS}');
  eq([spec.position, spec.fingering, spec.errors], [2, fingeringId.threePerString, []]);
  const bad = parseVisSpec('{vis: guitar, position: 0, fingering: chair}');
  eq([bad.position, bad.fingering], [null, fingeringId.caged]);
  eq(bad.errors, ['Unknown position "0"', 'Unknown fingering "chair", using caged']);
});

test('parseVisSpec reads a chord chart and its neck shape', () => {
  const spec = parseVisSpec('{vis: chord, seq: G, shape: Power}');
  eq([spec.vis, spec.shape, spec.errors], [visId.chart, neckShapeId.power, []]);
  eq(parseVisSpec('{vis: diagram}').vis, visId.chart);
  eq(Object.values(neckShapeId).map((id) => parseVisSpec(`{vis: tab, shape: ${id}}`).shape), Object.values(neckShapeId));
  const bad = parseVisSpec('{vis: guitar, shape: barre}');
  eq([bad.shape, bad.errors], [null, ['Unknown shape "barre"']]);
});
