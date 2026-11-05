import { test, eq, fixture } from './harness.js';
import { infer } from '../js/sheet/infer.js';
import { parse } from '../js/sheet/parse.js';

const NAMES = ['bracket-markup', 'chordpro', 'messy', 'tabs', 'clean'];
const trimNl = (s) => s.replace(/\n+$/, '');
const types = (blocks) => blocks.map((b) => b.type);
const sections = (blocks) => blocks.filter((b) => b.type === 'section').map((b) => b.name);
const pairs = (text) => parse(text).blocks.filter((b) => b.type === 'pair').map((b) => b.segments);
const texts = (segs) => segs.map((p) => p.map((s) => s.text));
const chords = (segs) => segs.map((p) => p.map((s) => s.chord));
const joined = (segs) => segs.map((s) => s.text).join('');
const sp = (n) => ' '.repeat(n);

function same(input, want) {
  eq(infer(input), want, JSON.stringify(input));
  eq(infer(want), want, 'idempotent ' + JSON.stringify(want));
}

for (const name of NAMES) {
  test(`infer is idempotent on ${name}`, async () => {
    const once = infer(await fixture(name));
    eq(infer(once), once);
  });
}

test('infer leaves clean.txt unchanged', async () => {
  const src = await fixture('clean');
  eq(infer(src), trimNl(src));
});

test('infer leaves tabs.txt unchanged', async () => {
  const src = await fixture('tabs');
  eq(infer(src), trimNl(src));
  const { blocks } = parse(infer(src));
  const tab = blocks.find((b) => b.type === 'tab');
  eq(tab.lines.length, 6);
  eq(tab.lines[0], 'e|-----0-----3-----|');
  eq(tab.lines[5], 'E|-----------------|');
});

test('bracket-markup: metadata, markup and sections', async () => {
  const src = await fixture('bracket-markup');
  const out = infer(src);
  eq(out.split('\n').slice(0, 4), ['Paper Lanterns', 'Artist: The Driftwood Kites', 'Key: Am', 'Capo: 2']);
  eq(/\[\/?ch\]|\[Intro\]|\[Verse|\[Chorus/.test(out), false);
  const { meta, blocks } = parse(out);
  eq([meta.title, meta.artist, meta.key, meta.capo], ['Paper Lanterns', 'The Driftwood Kites', 'Am', '2']);
  eq(sections(blocks), ['Intro', 'Verse 1', 'Chorus', 'Verse 2']);
  const first = blocks.find((b) => b.type === 'chords');
  eq(first.line, 'Am  F  C  G');
  const chorus = pairs(out)[2];
  eq(chorus.map((s) => s.chord), ['Am', 'F']);
  eq(joined(chorus), 'Carry the light, carry the light');
  eq(out.includes('\n\n\n'), false);
});

test('chordpro: directives become header and sections', async () => {
  const src = await fixture('chordpro');
  const out = infer(src);
  eq(out.includes('{'), false);
  const { meta, blocks } = parse(out);
  eq([meta.title, meta.artist, meta.key], ['Harbor Light', 'The Driftwood Kites', 'D']);
  eq(sections(blocks), ['Chorus', 'Verse']);
  const p = pairs(out);
  eq(p[0], [
    { chord: 'D', text: 'Harbor light, ' },
    { chord: 'G', text: 'guide me ' },
    { chord: 'D', text: 'home' },
  ]);
  eq(p[1], [
    { chord: 'Em', text: 'Over the ' },
    { chord: 'A', text: 'water, ' },
    { chord: 'D', text: 'over the foam' },
  ]);
  eq(p[2], [
    { chord: 'D', text: 'Salt on the wind and ' },
    { chord: 'G', text: 'rope in my hands' },
  ]);
  eq(out.split('\n')[4], 'Chorus:');
});

test('messy: lowercase chords fixed, bare sections get colons', async () => {
  const src = await fixture('messy');
  const out = infer(src);
  const lines = out.split('\n');
  eq(lines.slice(0, 4), ['Sunday Rain', 'Artist: the kites', '', 'Verse 1:']);
  ['Verse 1:', 'Chorus:', 'Bridge:'].forEach((h) => eq(lines.includes(h), true, h));
  eq(lines.includes('chorus'), false);
  eq(out.includes('\n\n\n'), false);
  eq(out.endsWith('\n'), false);
  const before = parse(src).blocks;
  const after = parse(out).blocks;
  eq(types(after), types(before));
  eq(sections(after), ['Verse 1', 'Chorus', 'Bridge']);
  eq(texts(pairs(out)), texts(pairs(src)));
  eq(
    chords(pairs(out)),
    chords(pairs(src)).map((p) => p.map((c) => c && c[0].toUpperCase() + c.slice(1))),
  );
  eq(after[after.length - 2], { type: 'chords', line: 'F  G' });
  eq(after[after.length - 1], { type: 'note', text: '(slow down)' });
});

test('step 1: line endings, NBSP, tabs, trailing space', () => {
  same('T\r\n\r\nHi\u00A0you\t there  \r\n', 'T\n\nHi you' + sp(5) + 'there');
});

test('step 2: bracket markup is stripped', () => {
  same('T\n\n[tab]\n[ch]Am[/ch]  [ch]G[/ch]\nhello there\n[/tab]', 'T\n\nAm  G\nhello there');
});

test('step 3: ChordPro directives', () => {
  same(
    '{t: Foo}\n{st: Bar}\n{capo: 2}\n{c: slowly}\n{sov}\n[G]hi\n{eov}',
    'Foo\nArtist: Bar\nCapo: 2\n\n(slowly)\n\nVerse:\nG\nhi',
  );
  same('{title: Foo}\n{subtitle: Bar}\n{artist: Baz}\nhi', 'Foo\nArtist: Baz\n\nhi');
  same('{title: Foo}\n{start_of_chorus}\nhi\n{end_of_chorus}', 'Foo\n\nChorus:\nhi');
  same('{title: T}\n{sot}\ne|--0--|\nB|--1--|\n{eot}', 'T\n\ne|--0--|\nB|--1--|');
  same('{title: T}\n{comment: Capo up}\nhi', 'T\n\n(Capo up)\nhi');
});

test('step 4: title and header metadata', () => {
  same('Silver Mile - The Kites\n\nhi', 'Silver Mile\nArtist: The Kites\n\nhi');
  same('Foo by Bar\n\nhi', 'Foo\nArtist: Bar\n\nhi');
  same('Stay by the Water\nArtist: \n\nhi', 'Stay by the Water\nArtist:\n\nhi');
  same('Song\nTags: slow ,opener,, drop D\n\nhi', 'Song\nMeta: slow, opener, drop D\n\nhi');
  same('Song\nSetlists: Fri gig ,Sat\n\nhi', 'Song\nSetlist: Fri gig, Sat\n\nhi');
  same('Foo - Bar\nArtist: Baz\n\nhi', 'Foo - Bar\nArtist: Baz\n\nhi');
  same('# Heading\nAlbum: X\n\nhi', 'Heading\nAlbum: X\n\nhi');
  same('S\nMood: sad\nartist: X\n\nhi', 'S\nArtist: X\nMood: sad\n\nhi');
  same('S\nArtist: A\n\nCapo 2\nBPM 90\nhi', 'S\nArtist: A\nCapo: 2\nTempo: 90\n\nhi');
  same('S\nArtist: A\nCapo: 2nd fret\n\nhi', 'S\nArtist: A\nCapo: 2\n\nhi');
  same('S\n\nhi\nKey: Em\nthere', 'S\nKey: Em\n\nhi\nthere');
});

test('step 4: junk lines', () => {
  same(
    'Chords\nSong Name\nDifficulty: novice\nTuning: E A D G B E\nAuthor: x\nTabbed by: y\nKey: G\n\nhi',
    'Song Name\nKey: G\nTuning: E A D G B E\n\nhi',
  );});

test('step 5: section headers', () => {
  const cases = [
    ['[Verse 1]', 'Verse 1:'],
    ['VERSE 1', 'Verse 1:'],
    ['## Chorus', 'Chorus:'],
    ['(Chorus)', 'Chorus:'],
    ['Chorus x2', 'Chorus x2:'],
    ['chorus', 'Chorus:'],
    ['Verse 2:', 'Verse 2:'],
    ['pre-chorus', 'Pre-Chorus:'],
  ];
  for (const [from, to] of cases) same(`S\n\n${from}\nhi`, `S\n\n${to}\nhi`);
  same('S\n\n(slow down)\nhi', 'S\n\n(slow down)\nhi');
});

test('step 6: inline chords become chords-over-lyrics', () => {
  same('S\n\n[G]Hello [C]world', 'S\n\nG' + sp(5) + 'C\nHello world');
  same('S\n\nHello [G]world', 'S\n\n' + sp(6) + 'G\nHello world');
  same('S\n\n[Am7]a[G]b', 'S\n\nAm7 G\na' + sp(3) + 'b');
  same('S\n\n[G] [C] [D]', 'S\n\nG C D');
  same('S\n\n[am]hello', 'S\n\nA\nhello');
  same('S\n\nGo [x2] now', 'S\n\nGo [x2] now');
});

test('step 6: columns survive a parse round trip', () => {
  const lines = [
    '[D]Harbor light, [G]guide me [D]home',
    '[Em]Over the [A]water, [D]over the foam',
    'Hello [G]world and [C]more',
    '[G]Hello [C]world',
  ];
  for (const line of lines) {
    const out = infer('S\n\n' + line);
    const got = pairs(out);
    const want = pairs('S\n\n' + line);
    eq(got.length, 1, line);
    eq(joined(got[0]).replace(/\s+/g, ' '), joined(want[0]).replace(/\s+/g, ' '), line);
    eq(got[0].map((s) => s.chord), want[0].map((s) => s.chord), line);
  }
  ['[D]Harbor light, [G]guide me [D]home', 'Hello [G]world and [C]more'].forEach((line) => {
    eq(pairs(infer('S\n\n' + line)), pairs('S\n\n' + line), line);
  });
});

test('step 7: chord root case', () => {
  same('S\n\nem7 g d\nhello there', 'S\n\nEm7 G D\nhello there');
  same('S\n\ng/b d\nhello there', 'S\n\nG/B D\nhello there');
  same('S\n\nem7\nhello there', 'S\n\nEm7\nhello there');
  same('S\n\na\nhello there', 'S\n\na\nhello there');
  same('S\n\nam\nhello there', 'S\n\nam\nhello there');
  same('S\n\nAm\nhello there', 'S\n\nAm\nhello there');
  same('S\n\nI am a dog', 'S\n\nI am a dog');
});

test('step 7: tab blocks are never modified', () => {
  same('S\n\nRiff:\ne|--0--|  \nB|--1--|', 'S\n\nRiff:\ne|--0--|\nB|--1--|');
});

test('step 8: blank lines and section spacing', () => {
  same('S\n\nhi\nChorus:\nthere', 'S\n\nhi\n\nChorus:\nthere');
  same('S\n\nhi\n\n\n\nthere', 'S\n\nhi\n\nthere');
  same('S\n\n\n\nhi\n\n\n', 'S\n\nhi');
  same('S\nVerse 1:\nhi', 'S\n\nVerse 1:\nhi');
  same('Only title', 'Only title');
  same('', '');
});
