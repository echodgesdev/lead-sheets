import { test, eq } from './harness.js';
import { recordingName, forSong, groupRecordings, NO_SONG } from '../js/data/recordings.js';

const DATE = new Date(2026, 10, 23, 14, 5, 9);

test('recording name with a song is title, artist and time', () => {
  eq(recordingName({ id: 's1', title: 'Bright Harbor', artist: 'The Driftwood Kites' }, DATE, 'm4a'),
    'Bright Harbor - The Driftwood Kites - 2026-11-23 14-05-09.m4a');
});

test('recording name leaves out an empty artist', () => {
  eq(recordingName({ id: 's1', title: 'Zebra', artist: '' }, DATE, 'webm'), 'Zebra - 2026-11-23 14-05-09.webm');
});

test('recording name without a song', () => {
  eq(recordingName(null, DATE, 'webm'), 'Recording - 2026-11-23 14-05-09.webm');
});

test('recording name strips characters illegal in file names', () => {
  eq(recordingName({ id: 's1', title: 'What/Now?', artist: 'AC:DC' }, DATE, 'm4a'), 'What Now - AC DC - 2026-11-23 14-05-09.m4a');
});

const recs = [
  { id: 'a', songId: 's2', createdAt: 1 },
  { id: 'b', songId: null, createdAt: 2 },
  { id: 'c', songId: 's1', createdAt: 3 },
  { id: 'd', songId: 's2', createdAt: 4 },
  { id: 'e', songId: 'gone', createdAt: 5 },
];
const TITLES = { s1: 'zebra', s2: 'Bright Harbor' };
const titleOf = (id) => TITLES[id] ?? null;
const shape = (groups) => groups.map((g) => [g.name, g.recs.map((r) => r.id)]);

test('recordings for a song', () => {
  eq(forSong(recs, 's2').map((r) => r.id), ['a', 'd']);
  eq(forSong(recs, 'none'), []);
});

test('all recordings grouped by song name, newest first, unassigned and missing songs last', () => {
  eq(shape(groupRecordings(recs, titleOf)), [
    ['Bright Harbor', ['d', 'a']],
    ['zebra', ['c']],
    [NO_SONG, ['e', 'b']],
  ]);
});

test('no unassigned group when every recording has a song', () => {
  eq(shape(groupRecordings(forSong(recs, 's1'), titleOf)), [['zebra', ['c']]]);
  eq(groupRecordings([], titleOf), []);
});
