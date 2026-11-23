import * as store from './store.js';
import * as setlists from './setlists.js';
import { compress, decompress } from '../core/compress.js';
import { saveFile } from '../core/files.js';
import { dateStamp } from '../core/time.js';

const FORMAT = { app: 'tabs', version: 3 };
const VERSIONS = [1, 2, 3];
const GZIP = 'gzip';
const GZIP_MAGIC = [0x1f, 0x8b];

function backupSong({ id, text, updatedAt, scrollSpeed }) {
  return { id, text, updatedAt, scrollSpeed };
}

export function backupData(songs, sets) {
  return { ...FORMAT, songs: songs.map(backupSong), setlists: sets };
}

export async function exportAll() {
  const body = JSON.stringify(backupData(store.all(), setlists.all()));
  const name = `lead-sheets-backup-${dateStamp(new Date())}.json.gz`;
  const file = new File([await compress(body, GZIP)], name, { type: 'application/gzip' });
  await saveFile(file, 'Lead Sheets backup');
}


async function applyBackup(data) {
  if (data?.app !== FORMAT.app || !VERSIONS.includes(data.version) || !Array.isArray(data.songs)) {
    throw new Error('Not a Lead Sheets backup file');
  }
  const songs = await store.merge(data.songs);
  return songs + await setlists.merge(Array.isArray(data.setlists) ? data.setlists : []);
}

async function isGzip(file) {
  const head = new Uint8Array(await file.slice(0, GZIP_MAGIC.length).arrayBuffer());
  return GZIP_MAGIC.every((byte, i) => head[i] === byte);
}

export async function importFile(file) {
  if (await isGzip(file)) return applyBackup(JSON.parse(await decompress(file, GZIP)));
  if (/\.json$/i.test(file.name) || file.type === 'application/json') {
    return applyBackup(JSON.parse(await file.text()));
  }
  if (/\.(md|txt)$/i.test(file.name)) {
    await store.save(null, await file.text());
    return 1;
  }
  throw new Error(`Unsupported file: ${file.name}`);
}
