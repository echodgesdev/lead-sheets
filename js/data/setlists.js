import { SETLISTS, dbAll, dbPut, dbDelete } from './db.js';

const sets = new Map();
let loading = null;

function makeEntry(e) {
  return { songId: e.songId, shift: Number(e.shift) || 0, tempo: e.tempo ?? '' };
}

function makeSetlist(s) {
  return {
    id: s.id,
    name: s.name ?? '',
    entries: Array.isArray(s.entries) ? s.entries.filter((e) => e?.songId).map(makeEntry) : [],
    updatedAt: Number(s.updatedAt) || 0,
  };
}

export function load() {
  loading ??= (async () => {
    for (const s of await dbAll(SETLISTS)) sets.set(s.id, makeSetlist(s));
  })();
  return loading;
}

export function all() {
  return [...sets.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));
}

export function get(id) {
  return sets.get(id);
}

export async function save(id, { name, entries }) {
  await load();
  const set = makeSetlist({ id: id ?? crypto.randomUUID(), name, entries, updatedAt: Date.now() });
  await dbPut(SETLISTS, set);
  sets.set(set.id, set);
  return set;
}

export async function remove(id) {
  await load();
  await dbDelete(SETLISTS, id);
  sets.delete(id);
}

export async function merge(records) {
  await load();
  let count = 0;
  for (const r of records) {
    if (!r?.id) continue;
    const set = makeSetlist(r);
    const cur = sets.get(set.id);
    if (cur && cur.updatedAt >= set.updatedAt) continue;
    await dbPut(SETLISTS, set);
    sets.set(set.id, set);
    count++;
  }
  return count;
}
