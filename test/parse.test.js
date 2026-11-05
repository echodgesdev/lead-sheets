import { test, eq, fixture } from './harness.js';
import { isChord, isChordLine, chordTokens, isTabLine, diatonic, chordsIn } from '../js/sheet/chords.js';
import { parse, sectionName, splitTags, META_FIELDS } from '../js/sheet/parse.js';

const body = (s) => parse('T\n\n' + s).blocks;
const types = (blocks) => blocks.map((b) => b.type);
const joined = (pair) => pair.segments.map((s) => s.text).join('');

test('isChord positives', () => {
  const good = [
    'A', 'Am', 'E', 'Em7', 'Am7', 'F#m7b5', 'G/B', 'Bbmaj7', 'Dsus4', 'C#dim', 'E7#9', 'N.C.',
    'Cadd9', 'C(add9)', 'Dm/F', 'Gsus2', 'Aaug', 'C+', 'Bø', 'B°', 'A7sus4', 'Cmaj9', 'D6',
    'G13', 'Eb', 'Cm9', 'F#', 'Gmin7', 'CM7', 'E5', 'C7b9', 'D7#11', 'Dm7b5', 'Bb', 'a', 'em7',
  ];
  good.forEach((t) => eq(isChord(t), true, t));
});

test('isChord negatives', () => {
  const bad = ['Bad', 'Dog', 'Each', 'Ebb', 'Hello', 'I', 'The', 'Amen', 'Add', 'Dim', 'Cat', 'Gone', 'Abbot', 'H', 'x2', '', 'be', 'dad'];
  bad.forEach((t) => eq(isChord(t), false, t));
});

test('isChordLine accepts chord lines with filler', () => {
  const good = [
    'Em7  G  Dsus4  A7sus4',
    'em7 g d',
    '| Am | F | C | G |',
    'Am F x2',
    'C  G/B  Am  N.C.',
    'G  D',
    'A',
    'Am',
  ];
  good.forEach((t) => eq(isChordLine(t), true, t));
});

test('isChordLine rejects words and empty lines', () => {
  const bad = ['', '   ', 'a', 'am', 'Tonight we walk the harbor road', 'A dog', 'Bad Dad', 'x2', '| |', 'I am a Dog'];
  bad.forEach((t) => eq(isChordLine(t), false, JSON.stringify(t)));
});

test('diatonic', () => {
  eq(diatonic('G'), ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim']);
  eq(diatonic('F'), ['F', 'Gm', 'Am', 'Bb', 'C', 'Dm', 'Edim']);
  eq(diatonic('Bb'), ['Bb', 'Cm', 'Dm', 'Eb', 'F', 'Gm', 'Adim']);
  eq(diatonic('F#m'), ['F#m', 'G#dim', 'A', 'Bm', 'C#m', 'D', 'E']);
  eq(diatonic('Dm'), ['Dm', 'Edim', 'F', 'Gm', 'Am', 'Bb', 'C']);
  eq(diatonic('H'), []);
  eq(diatonic(''), []);
  eq(diatonic(undefined), []);
});

test('chordTokens columns', () => {
  eq(chordTokens('Em7  G  Dsus4'), [{ chord: 'Em7', col: 0 }, { chord: 'G', col: 5 }, { chord: 'Dsus4', col: 8 }]);
  eq(chordTokens('| Am | F |'), [{ chord: 'Am', col: 2 }, { chord: 'F', col: 7 }]);
  eq(chordTokens('Am F x2'), [{ chord: 'Am', col: 0 }, { chord: 'F', col: 3 }]);
});

test('isTabLine', () => {
  eq(isTabLine('e|-----0-----3-----|'), true);
  eq(isTabLine('B|---1h3---|'), true);
  eq(isTabLine('|-----0-----|'), true);
  eq(isTabLine('E: strum -- down'), false);
  eq(isTabLine('Tonight we walk the harbor road'), false);
  eq(isTabLine('Am  G'), false);
});

test('chordsIn', () => {
  eq(chordsIn('Em G\nsome words\n[D]hello [Am]there\nG\ne|---0---|'), ['Em', 'G', 'D', 'Am']);
});

test('sectionName forms', () => {
  eq(sectionName('Chorus:'), 'Chorus');
  eq(sectionName('Verse 2:'), 'Verse 2');
  eq(sectionName('[Verse 2]'), 'Verse 2');
  eq(sectionName('## Bridge'), 'Bridge');
  eq(sectionName('chorus'), 'Chorus');
  eq(sectionName('Verse 2'), 'Verse 2');
  eq(sectionName('VERSE 1'), 'Verse 1');
  eq(sectionName('pre-chorus'), 'Pre-Chorus');
  eq(sectionName('Intro'), 'Intro');
  eq(sectionName('Chorus x2'), 'Chorus x2');
  eq(sectionName('Lead In:'), 'Lead In');
});

test('sectionName rejects non-sections', () => {
  eq(sectionName('Tonight we walk the harbor road'), null);
  eq(sectionName(''), null);
  eq(sectionName('Em G'), null);
  eq(sectionName('Artist: The Kites'), null);
  eq(sectionName('Key:'), null);
  eq(sectionName('[G]'), null);
  eq(sectionName('[G] [C]'), null);
  eq(sectionName('A very long line that ends with a colon here:'), null);
});

test('META_FIELDS', () => {
  eq(META_FIELDS, ['artist', 'album', 'genre', 'key', 'capo', 'tempo', 'tuning', 'meta', 'notes']);
});

test('chords with * marks', () => {
  ['A*', 'G/B*', 'Em7**'].forEach((t) => eq(isChord(t), true, t));
  eq(isChord('*'), false);
  eq(isChordLine('A*  G  D*'), true);
  eq(chordsIn('A*  G\nhi\n[D*]there'), ['A', 'G', 'D']);
  eq(body('A*   G\nHello world')[0].segments, [{ chord: 'A*', text: 'Hello' }, { chord: 'G', text: ' world' }]);
});

test('Notes: in the header is a tag and in the body is a note', () => {
  const { meta, blocks } = parse('Song\nNotes: capo up\nTuning: DADGAD\n\nVerse 1:\nNotes: let ring\nAm G\nNotes: hold\nNotes:\nHi');
  eq([meta.notes, meta.tuning], ['capo up', 'DADGAD']);
  eq(blocks, [
    { type: 'section', name: 'Verse 1' },
    { type: 'note', text: 'let ring' },
    { type: 'chords', line: 'Am G' },
    { type: 'note', text: 'hold' },
    { type: 'section', name: 'Notes' },
    { type: 'lyric', text: 'Hi' },
  ]);
});

test('meta field and tags alias', () => {
  eq(parse('Song\nMeta: opener,  slow , drop D\n\nHi').meta.meta, 'opener,  slow , drop D');
  eq(parse('Song\nTags: opener\n\nHi').meta.meta, 'opener');
  eq(splitTags('opener,  slow , drop D,,'), ['opener', 'slow', 'drop D']);
  eq(splitTags(undefined), []);
});

test('header fields, empty values, bpm alias, extras', () => {
  const { meta, blocks } = parse('Song\nArtist: A B\nAlbum: \nBPM: 90\nCapo: 2\nMood: sad\n\nVerse 1:\nHi');
  eq(meta.title, 'Song');
  eq(meta.artist, 'A B');
  eq(meta.album, undefined);
  eq(meta.tempo, '90');
  eq(meta.capo, '2');
  eq(meta.extra, { mood: 'sad' });
  eq(blocks, [{ type: 'section', name: 'Verse 1' }, { type: 'lyric', text: 'Hi' }]);
});

test('header field names are case-insensitive', () => {
  const { meta } = parse('Song\nkey: F#m\nTEMPO: 80\n\nHi');
  eq(meta.key, 'F#m');
  eq(meta.tempo, '80');
});

test('blank line after title means no header', () => {
  const { meta, blocks } = parse('Song\n\nArtist: X\nHi');
  eq(meta.artist, undefined);
  eq(blocks, [{ type: 'lyric', text: 'Artist: X' }, { type: 'lyric', text: 'Hi' }]);
});

test('header ends at first blank line', () => {
  const { meta } = parse('Song\nArtist: X\n\nKey: G\nHi');
  eq(meta.artist, 'X');
  eq(meta.key, undefined);
});

test('section directly after title is not a header', () => {
  const { meta, blocks } = parse('Song\nVerse 1:\nHi');
  eq(meta.extra, {});
  eq(blocks[0], { type: 'section', name: 'Verse 1' });
});

test('title forms', () => {
  eq(parse('# My Song\n').meta.title, 'My Song');
  eq(parse('\n\n  Padded  \nHi').meta.title, 'Padded');
  eq(parse('Only'), { meta: { title: 'Only', extra: {} }, blocks: [] });
  eq(parse('').meta.title, '');
});

test('pair: chord columns map onto lyric characters', () => {
  eq(body('Am   G\nHello world'), [{
    type: 'pair',
    segments: [{ chord: 'Am', text: 'Hello' }, { chord: 'G', text: ' world' }],
  }]);
});

test('pair: leading text before the first chord gets a null segment', () => {
  eq(body('   Am  G\nHello world'), [{
    type: 'pair',
    segments: [{ chord: null, text: 'Hel' }, { chord: 'Am', text: 'lo w' }, { chord: 'G', text: 'orld' }],
  }]);
});

test('pair: chords past the lyric end pad the lyric', () => {
  eq(body('C   G   D\nHi'), [{
    type: 'pair',
    segments: [{ chord: 'C', text: 'Hi  ' }, { chord: 'G', text: '    ' }, { chord: 'D', text: ' ' }],
  }]);
  const [p] = body('Am   G\nHi');
  eq(p.segments, [{ chord: 'Am', text: 'Hi   ' }, { chord: 'G', text: ' ' }]);
});

test('chord line is standalone before blank, section, tab, chord line, note and EOF', () => {
  eq(body('Am G\n\nHello'), [{ type: 'chords', line: 'Am G' }, { type: 'blank' }, { type: 'lyric', text: 'Hello' }]);
  eq(body('Am G\nChorus:'), [{ type: 'chords', line: 'Am G' }, { type: 'section', name: 'Chorus' }]);
  eq(body('Am G\ne|-----|'), [{ type: 'chords', line: 'Am G' }, { type: 'tab', lines: ['e|-----|'] }]);
  eq(types(body('Am G\nC D\nHello')), ['chords', 'pair']);
  eq(body('Am G\nC D\nHello')[0], { type: 'chords', line: 'Am G' });
  eq(body('Am G\n(slow)'), [{ type: 'chords', line: 'Am G' }, { type: 'note', text: '(slow)' }]);
  eq(body('Am G'), [{ type: 'chords', line: 'Am G' }]);
});

test('inline chords produce pairs', () => {
  eq(body('Hello [G]world and [C]more'), [{
    type: 'pair',
    segments: [{ chord: null, text: 'Hello ' }, { chord: 'G', text: 'world and ' }, { chord: 'C', text: 'more' }],
  }]);
  eq(body('[G]Hello [C]world'), [{
    type: 'pair',
    segments: [{ chord: 'G', text: 'Hello ' }, { chord: 'C', text: 'world' }],
  }]);
});

test('inline-only line is a chord line', () => {
  eq(body('[G] [C] [D]'), [{ type: 'chords', line: 'G C D' }]);
});

test('bracketed section is checked before inline chords', () => {
  eq(body('[Verse 1]\n[G]Hello'), [
    { type: 'section', name: 'Verse 1' },
    { type: 'pair', segments: [{ chord: 'G', text: 'Hello' }] },
  ]);
});

test('tab lines group into one block', () => {
  eq(body('Riff:\ne|--0--|\nB|--1--|\nHello'), [
    { type: 'section', name: 'Riff' },
    { type: 'tab', lines: ['e|--0--|', 'B|--1--|'] },
    { type: 'lyric', text: 'Hello' },
  ]);
  eq(types(body('Hello\ne|-0-|\nB|-1-|\n\ne|-2-|')), ['lyric', 'tab', 'blank', 'tab']);
});

test('blank lines collapse and edges are dropped', () => {
  eq(types(body('Hello\n\n\n\nWorld')), ['lyric', 'blank', 'lyric']);
  eq(types(body('Hello\n   \n\t\nWorld')), ['lyric', 'blank', 'lyric']);
  eq(parse('T\n\n\n\nHello\n\n\n').blocks, [{ type: 'lyric', text: 'Hello' }]);
});

test('clean.txt parses to the canonical structure', async () => {
  const { meta, blocks } = parse(await fixture('clean'));
  eq(meta.title, 'Silver Mile');
  eq([meta.artist, meta.album, meta.key, meta.capo, meta.tempo], ['The Driftwood Kites', 'Small Hours', 'G', '2', '96']);
  eq(blocks.map((b) => b.type + (b.name ? ':' + b.name : '')), [
    'section:Intro', 'chords', 'blank',
    'section:Verse 1', 'pair', 'pair', 'blank',
    'section:Chorus', 'pair', 'pair', 'blank',
    'note',
  ]);
  eq(blocks[1].line, 'G  C  D');
  eq(blocks[4].segments, [{ chord: 'G', text: 'Walking down ' }, { chord: 'C', text: 'the silver mile' }]);
  eq(blocks[5].segments, [{ chord: 'Em', text: 'Counting ' }, { chord: 'D', text: 'every light' }]);
  eq(blocks[8].segments, [{ chord: 'C', text: 'Hold on, ' }, { chord: 'G', text: 'hold on' }]);
  eq(blocks[9].segments, [{ chord: 'D', text: 'Carry me back ' }, { chord: 'Em', text: 'home' }]);
  eq(blocks[11], { type: 'note', text: '(softly, then build)' });
});

test('bracket-markup.txt', async () => {
  const { meta, blocks } = parse(await fixture('bracket-markup'));
  eq(meta.title, 'Paper Lanterns by The Driftwood Kites');
  eq(meta.capo, '2nd fret');
  eq(meta.key, 'Am');
  eq(blocks.filter((b) => b.type === 'section').map((b) => b.name), ['Intro', 'Verse 1', 'Chorus', 'Verse 2']);
  const chorus = blocks.find((b) => b.type === 'pair');
  eq(chorus.segments.map((s) => s.chord), ['Am', 'F']);
  eq(joined(chorus), 'Carry the light, carry the light');
});

test('chordpro.txt inline chords', async () => {
  const text = await fixture('chordpro');
  const pair = parse(text).blocks.find((b) => b.type === 'pair');
  eq(pair.segments, [
    { chord: 'D', text: 'Harbor light, ' },
    { chord: 'G', text: 'guide me ' },
    { chord: 'D', text: 'home' },
  ]);
  eq(chordsIn(text), ['D', 'G', 'Em', 'A']);
});

test('messy.txt', async () => {
  const { meta, blocks } = parse(await fixture('messy'));
  eq(meta.title, 'Sunday Rain');
  eq(meta.artist, 'the kites');
  eq(types(blocks), ['section', 'pair', 'blank', 'pair', 'blank', 'section', 'pair', 'blank', 'section', 'chords', 'note']);
  eq(blocks.filter((b) => b.type === 'section').map((b) => b.name), ['Verse 1', 'Chorus', 'Bridge']);
  eq(blocks[1].segments, [{ chord: 'am', text: 'it rained ' }, { chord: 'g', text: 'all day on the old road' }]);
  eq(blocks[3].segments, [
    { chord: 'em7', text: 'and ' },
    { chord: 'g', text: 'we' },
    { chord: 'd', text: ' kept on walking' },
  ]);
  eq(blocks[6].segments.map((s) => s.chord), ['c', 'g', 'am']);
  eq(joined(blocks[6]).trim(), 'sing it low');
  eq(blocks[9], { type: 'chords', line: 'f  g' });
});

test('tabs.txt', async () => {
  const { blocks } = parse(await fixture('tabs'));
  eq(types(blocks), ['section', 'pair', 'blank', 'section', 'tab', 'blank', 'section', 'pair']);
  eq(blocks[4].lines.length, 6);
  eq(blocks[4].lines[0], 'e|-----0-----3-----|');
  eq(blocks[4].lines[5], 'E|-----------------|');
});

test('Key change: in the body is a key block', () => {
  const { meta, blocks } = parse('Song\nKey: G\n\nG\nKey change: A\nHi');
  eq(meta.key, 'G');
  eq(blocks.slice(1), [{ type: 'key', key: 'A' }, { type: 'lyric', text: 'Hi' }]);
});
