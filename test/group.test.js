import { test, eq } from './harness.js';
import { groupSongs, groupSetlists } from '../js/group.js';

const songs = [
  { id: '1', title: 'Bright Harbor', artist: 'The Driftwood Kites', meta: ['opener', 'Fast'] },
  { id: '2', title: 'in the quiet', artist: 'The Driftwood Kites', meta: ['fast'] },
  { id: '3', title: '42 Lanterns', artist: '', meta: [] },
  { id: '4', title: 'Zebra', artist: 'Amber Lane', meta: ['opener', 'opener'] },
];

const shape = (groups) => groups.map((g) => [g.name, g.songs.map((s) => s.id)]);

test('group by artist, missing values last', () => {
  eq(shape(groupSongs(songs, 'artist')), [
    ['Amber Lane', ['4']],
    ['The Driftwood Kites', ['1', '2']],
    ['No artist', ['3']],
  ]);
});

test('songs within a group are sorted by title regardless of input order', () => {
  eq(shape(groupSongs([...songs].reverse(), 'artist'))[1], ['The Driftwood Kites', ['1', '2']]);
});

test('group by meta lists a song under each term, case-insensitive', () => {
  eq(shape(groupSongs(songs, 'meta')), [
    ['Fast', ['1', '2']],
    ['opener', ['1', '4']],
    ['No meta', ['3']],
  ]);
});

test('setlist groups keep set order and skip missing songs', () => {
  const sets = [
    { id: 's1', name: 'Fri', entries: [{ songId: '4' }, { songId: 'gone' }, { songId: '1' }] },
    { id: 's2', name: '', entries: [] },
  ];
  eq(shape(groupSetlists(songs, sets, false)), [['Fri', ['4', '1']]]);
  eq(shape(groupSetlists(songs, sets, true)), [['Fri', ['4', '1']], ['Untitled setlist', []]]);
});

test('group by title uses first letter, non-letters last', () => {
  eq(shape(groupSongs(songs, 'title')), [
    ['B', ['1']],
    ['I', ['2']],
    ['Z', ['4']],
    ['#', ['3']],
  ]);
});
