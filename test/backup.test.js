import { test, eq } from './harness.js';
import { backupData } from '../js/data/backup.js';

async function source(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} not found (serve the folder over http)`);
  return res.text();
}

test('backup holds only songs and setlists, never recordings', () => {
  const song = { id: '1', text: 'Song', updatedAt: 2, scrollSpeed: 3, title: 'Song', recordings: ['r1'] };
  const set = { id: 's', name: 'Fri', entries: [{ songId: '1' }] };
  const data = backupData([song], [set]);
  eq(Object.keys(data), ['app', 'version', 'songs', 'setlists']);
  eq(data.songs, [{ id: '1', text: 'Song', updatedAt: 2, scrollSpeed: 3 }]);
});

test('backup and share links never read the recordings store', async () => {
  for (const path of ['../js/data/backup.js', '../js/data/links.js', '../js/components/share.js']) {
    eq(/recording|RECORDINGS/i.test(await source(path)), false, path);
  }
});
