import * as store from './store.js';
import * as setlists from './setlists.js';
import { a } from '../core/dom.js';
import { compress, decompress, toBase64Url, fromBase64Url } from '../core/compress.js';
import { routes, views, parseRoute } from '../routes.js';

const FORMAT = { app: 'tabs', version: 3 };
const VERSIONS = [1, 2, 3];
const GZIP = 'gzip';
const DEFLATE = 'deflate-raw';
const GZIP_MAGIC = [0x1f, 0x8b];

function localDate() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = a({ href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function backupSong({ id, text, updatedAt, scrollSpeed }) {
  return { id, text, updatedAt, scrollSpeed };
}

export async function exportAll() {
  const body = JSON.stringify({ ...FORMAT, songs: store.all().map(backupSong), setlists: setlists.all() });
  const name = `lead-sheets-backup-${localDate()}.json.gz`;
  const file = new File([await compress(body, GZIP)], name, { type: 'application/gzip' });
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

export async function songLink(text) {
  const code = toBase64Url(await compress(text, DEFLATE));
  return new URL(routes.shared(code), location.href).href;
}

export async function receiveSong(code) {
  const text = await decompress(fromBase64Url(code), DEFLATE);
  return store.all().find((rec) => rec.text === text) ?? store.save(null, text);
}

async function applyBackup(data) {
  if (data?.app !== FORMAT.app || !VERSIONS.includes(data.version) || !Array.isArray(data.songs)) {
    throw new Error('Not a Lead Sheets backup file');
  }
  const songs = await store.merge(data.songs);
  return songs + await setlists.merge(Array.isArray(data.setlists) ? data.setlists : []);
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function sharedCode(text) {
  const at = text.indexOf('#/');
  if (at < 0) return null;
  const { view, params } = parseRoute(text.slice(at).split(/\s/)[0]);
  return view === views.shared ? params.code : null;
}

export async function importText(text) {
  const code = sharedCode(text);
  if (code) return { count: 1, id: (await receiveSong(code)).id };
  const data = parseJson(text);
  if (data?.app === FORMAT.app) return { count: await applyBackup(data) };
  const rec = await store.save(null, text);
  return { count: 1, id: rec.id };
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
