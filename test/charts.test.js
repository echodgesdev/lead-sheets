import { test, eq } from './harness.js';
import { songChords, chordShapes, chordChart } from '../js/sheet/charts.js';
import { GUITAR, retune } from '../js/sheet/fretboard.js';
import { parse } from '../js/sheet/parse.js';
import { viewChords } from '../js/sheet/transpose.js';
import { neckShapeId } from '../js/sheet/vis-spec.js';

const DROP_D = retune(GUITAR, [38, 45, 50, 55, 59, 64]);

test('charts list the song chords in order of first appearance', () => {
  eq(songChords(parse('T\n\nG  C*\nhello\nAm\n[D]la [G]la')), ['G', 'C', 'Am', 'D']);
  eq(songChords(parse('T\n\nhello')), []);
});

test('charts follow transpose and keep the shapes under numbers', () => {
  const parsed = parse('T\nKey: G\n\nG  C\nhi\nD | Em x2');
  const up = viewChords(parsed, { key: 'G', shift: 2 });
  eq(songChords(up), ['A', 'D', 'E', 'F#m']);
  const tagged = chordShapes(viewChords(parsed, { key: 'G', numbers: 'nashville' }), viewChords(parsed, { key: 'G' }));
  eq(tagged.blocks[0].segments.map((s) => [s.chord, s.shape]), [['1', 'G'], ['4', 'C']]);
  eq(tagged.blocks[1].parts, [
    { text: '5', chord: 'D' },
    { text: ' | ', chord: null },
    { text: '6m', chord: 'Em' },
    { text: ' x2', chord: null },
  ]);
});

test('charts voice a chord name as a chord box', () => {
  const c = chordChart('C', GUITAR);
  eq([c.voicing, c.shape, c.position, c.count, c.rootPc], [[48, 52, 55, 60, 64], neckShapeId.caged, 0, 5, 0]);
  eq([c.chart.start, c.chart.nut, c.chart.muted], [1, true, [0]]);
  eq(chordChart('C', GUITAR, { shape: neckShapeId.power }).voicing, [48, 55, 60]);
  eq(chordChart('C', GUITAR, { position: -1 }).position, 4);
  eq(chordChart('D', DROP_D).voicing, [50, 57, 62, 66]);
});

test('charts skip what they cannot voice', () => {
  eq(chordChart('N.C.', GUITAR), null);
  eq(chordChart('Hm', GUITAR), null);
});
