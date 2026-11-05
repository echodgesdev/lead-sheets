import * as store from './store.js';
import * as setlists from './setlists.js';

const FORMAT = { app: 'tabs', version: 2 };
const VERSIONS = [1, 2];

function localDate() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportAll() {
  const body = JSON.stringify({ ...FORMAT, songs: store.all(), setlists: setlists.all() }, null, 2);
  const name = `lead-sheets-backup-${localDate()}.json`;
  const file = new File([body], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Lead Sheets backup' });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }
  download(file, name);
}

async function importBackup(text) {
  const data = JSON.parse(text);
  if (data?.app !== FORMAT.app || !VERSIONS.includes(data.version) || !Array.isArray(data.songs)) {
    throw new Error('Not a Lead Sheets backup file');
  }
  const songs = await store.merge(data.songs);
  return songs + await setlists.merge(Array.isArray(data.setlists) ? data.setlists : []);
}

export async function importFile(file) {
  if (/\.json$/i.test(file.name) || file.type === 'application/json') {
    return importBackup(await file.text());
  }
  if (/\.(md|txt)$/i.test(file.name)) {
    await store.save(null, await file.text());
    return 1;
  }
  throw new Error(`Unsupported file: ${file.name}`);
}
