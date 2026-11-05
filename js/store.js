import { parse, splitTags, fieldName, LIST_FIELDS } from './sheet/parse.js';
import { dbAll, dbPut, dbDelete } from './db.js';

const DEFAULT_SCROLL = 3;
const FIELD_TOKEN = /^(title|artist|album|genre|key|meta|tags?|setlists?):(.+)$/;
const PLAIN_FIELDS = ['title', 'artist', 'album', 'genre', ...LIST_FIELDS];
const songs = new Map();
let loading = null;

export function load() {
  loading ??= (async () => {
    for (const rec of await dbAll()) {
      songs.set(rec.id, makeRecord(rec.id, rec.text, rec.updatedAt, rec.scrollSpeed ?? DEFAULT_SCROLL));
    }
    navigator.storage?.persist?.();
  })();
  return loading;
}

function makeRecord(id, text, updatedAt, scrollSpeed) {
  const { meta } = parse(text);
  return {
    id,
    text,
    title: meta.title,
    artist: meta.artist,
    album: meta.album,
    genre: meta.genre,
    key: meta.key,
    capo: meta.capo,
    tempo: meta.tempo,
    tuning: meta.tuning,
    meta: splitTags(meta.meta),
    setlist: splitTags(meta.setlist),
    extra: meta.extra,
    updatedAt,
    scrollSpeed,
  };
}

export function all() {
  return [...songs.values()].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
}

export function get(id) {
  return songs.get(id);
}

export async function save(id, text) {
  await load();
  const recId = id ?? crypto.randomUUID();
  const scrollSpeed = songs.get(recId)?.scrollSpeed ?? DEFAULT_SCROLL;
  const rec = makeRecord(recId, text, Date.now(), scrollSpeed);
  await dbPut(rec);
  songs.set(recId, rec);
  return rec;
}

export async function remove(id) {
  await load();
  await dbDelete(id);
  songs.delete(id);
}

export async function setScrollSpeed(id, n) {
  await load();
  const rec = songs.get(id);
  if (!rec) return;
  const next = { ...rec, scrollSpeed: n };
  await dbPut(next);
  songs.set(id, next);
}

function hasText(value, needle) {
  return typeof value === 'string' && value.toLowerCase().includes(needle);
}

function fieldHas(rec, field, needle) {
  const value = rec[field];
  return Array.isArray(value) ? value.some((v) => hasText(v, needle)) : hasText(value, needle);
}

function matchesToken(rec, token) {
  const field = token.match(FIELD_TOKEN);
  if (field) return fieldHas(rec, fieldName(field[1] === 'tag' ? 'tags' : field[1]), field[2]);
  return PLAIN_FIELDS.some((f) => fieldHas(rec, f, token))
    || Object.values(rec.extra ?? {}).some((v) => hasText(v, token));
}

export function search(query) {
  const tokens = (query ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  return all().filter((rec) => tokens.every((token) => matchesToken(rec, token)));
}

export async function merge(records) {
  await load();
  let count = 0;
  for (const r of records) {
    if (!r?.id || typeof r.text !== 'string') continue;
    const updatedAt = Number(r.updatedAt) || 0;
    const cur = songs.get(r.id);
    if (cur && cur.updatedAt >= updatedAt) continue;
    const scrollSpeed = r.scrollSpeed ?? cur?.scrollSpeed ?? DEFAULT_SCROLL;
    const rec = makeRecord(r.id, r.text, updatedAt, scrollSpeed);
    await dbPut(rec);
    songs.set(rec.id, rec);
    count++;
  }
  return count;
}
