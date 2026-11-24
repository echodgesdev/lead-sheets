import { test, eq, fixture } from './harness.js';
import { lintSong, textRange } from '../js/sheet/lint.js';
import { lineKind, lineKinds } from '../js/sheet/parse.js';
import { parseVisSpec } from '../js/sheet/vis-spec.js';
import { strayChordTokens, strayInlineChords } from '../js/sheet/chords.js';
import { MIN_BPM, MAX_BPM } from '../js/sheet/tempo.js';

const at = (line, start, end, message) => ({ line, start, end, message });

test('lineKinds follows the parser', () => {
  const kinds = lineKinds('\nT\nKey: G\n\nVerse:\nG  C\nhello\n[G]hi\n{vis: piano}\nKey change: A\n(soft)\ne|--0--|').map((e) => e.kind);
  eq(kinds, [
    lineKind.blank, lineKind.title, lineKind.header, lineKind.blank, lineKind.section, lineKind.chords,
    lineKind.lyric, lineKind.inline, lineKind.vis, lineKind.key, lineKind.note, lineKind.tab,
  ]);
});

test('lineKinds carries header fields and key changes', () => {
  const entries = lineKinds('T\nBPM: 96\n\nKey change: Bb');
  eq(entries[1], { kind: lineKind.header, field: 'tempo', value: '96' });
  eq(entries[3], { kind: lineKind.key, value: 'Bb' });
});

test('strayChordTokens only on lines that would be chord lines', () => {
  eq(strayChordTokens('G Hm C'), [{ chord: 'Hm', col: 2 }]);
  eq(strayChordTokens('| Am | E/H |'), [{ chord: 'E/H', col: 7 }]);
  eq(strayChordTokens('Hm'), []);
  eq(strayChordTokens('A Bad Day'), []);
  eq(strayChordTokens('G Hm what'), []);
  eq(strayInlineChords('[G]la [Hm]la [Verse] [ch]'), [{ chord: 'Hm', index: 6, end: 10 }]);
});

test('lint: tokens that are not chords on chord lines', () => {
  eq(lintSong('T\n\nG Hm C\nGmaj13# D'), [
    at(2, 2, 4, '"Hm" isn\'t a chord'),
    at(3, 0, 7, '"Gmaj13#" isn\'t a chord'),
  ]);
});

test('lint: lyric lines are left alone', () => {
  eq(lintSong('T\n\nHm, what a day\nHm\nA Bad Day\nAm I blue'), []);
});

test('lint: inline bracket chords', () => {
  eq(lintSong('T\n\n[G]Hello [Hm]world'), [at(2, 9, 13, '"Hm" isn\'t a chord')]);
  eq(lintSong('T\n\n[Verse]\n[ch]G[/ch] [ch]C[/ch]\n[Hm]'), []);
});

test('lint: vis lines report what vis-spec cannot read', () => {
  const line = '{vis: banjo, seq: 1 Hm 3, controls: loop, key: H, speed: 2}';
  const errors = parseVisSpec(line).errors;
  eq(errors.length, 5);
  eq(lintSong(`T\n\n${line}`), errors.map((message) => at(2, 0, line.length, message)));
  eq(lintSong('T\n\n  {vis: piano, seq: 1 3 5}'), []);
});

test('lint: header Key', () => {
  eq(lintSong('T\nKey: H\n\nG'), [at(1, 5, 6, '"H" isn\'t a key')]);
  eq(lintSong('T\nKey: F#m\n\nG'), []);
});

test('lint: header Capo', () => {
  eq(lintSong('T\nCapo: 13'), [at(1, 6, 8, 'Capo should be 0–12')]);
  eq(lintSong('T\nCapo: two'), [at(1, 6, 9, 'Capo should be 0–12')]);
  eq(lintSong('T\nCapo: 0'), []);
  eq(lintSong('T\nCapo: 12'), []);
  eq(lintSong('T\nCapo: 2nd fret'), []);
});

test('lint: header Tempo', () => {
  const message = `Tempo should be ${MIN_BPM}–${MAX_BPM}`;
  eq(lintSong(`T\nTempo: ${MAX_BPM + 1}`), [at(1, 7, 10, message)]);
  eq(lintSong('T\nTempo: fast'), [at(1, 7, 11, message)]);
  eq(lintSong('T\nBPM: 0'), [at(1, 5, 6, message)]);
  eq(lintSong('T\nTempo: 96 bpm'), []);
  eq(lintSong(`T\nTempo: ${MIN_BPM}`), []);
});

test('lint: header Tuning', () => {
  eq(lintSong('T\nTuning: banjo'), [at(1, 8, 13, '"banjo" isn\'t a tuning')]);
  eq(lintSong('T\nTuning: D A D'), [at(1, 8, 13, '"D A D" isn\'t a tuning')]);
  eq(lintSong('T\nTuning: Drop D'), []);
  eq(lintSong('T\nTuning: DADGAD'), []);
  eq(lintSong('T\nTuning: E A D G B E'), []);
});

test('lint: empty header values pass', () => {
  eq(lintSong('New Song\nArtist: \nKey: \nCapo: \nTempo: \n\nVerse 1:\n'), []);
});

test('lint: Key change', () => {
  eq(lintSong('T\n\nKey change: H'), [at(2, 12, 13, '"H" isn\'t a key')]);
  eq(lintSong('T\n\nKey change: A'), []);
});

test('lint: offsets are in the raw line', () => {
  eq(lintSong('T\r\n\r\n\tG Hm'), [at(2, 3, 5, '"Hm" isn\'t a chord')]);
  eq(lintSong(''), []);
});

test('textRange maps a warning to text offsets', () => {
  const text = 'T\n\nG Hm C';
  const [warning] = lintSong(text);
  const { start, end } = textRange(text, warning);
  eq(text.slice(start, end), 'Hm');
  eq(textRange('T\r\nKey: H', { line: 1, start: 5, end: 6 }), { start: 8, end: 9 });
});

for (const name of ['clean', 'chordpro', 'bracket-markup', 'tabs', 'messy']) {
  test(`lint: fixture ${name} has no warnings`, async () => {
    eq(lintSong(await fixture(name)), []);
  });
}
