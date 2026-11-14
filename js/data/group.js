import { strings } from '../strings.js';

export const groupId = Object.freeze({
  title: 'title',
  artist: 'artist',
  album: 'album',
  genre: 'genre',
  key: 'key',
  meta: 'meta',
  setlist: 'setlist',
});

export const GROUPS = [
  { id: groupId.title, label: 'Title' },
  { id: groupId.artist, label: 'Artist' },
  { id: groupId.album, label: 'Album' },
  { id: groupId.genre, label: 'Genre' },
  { id: groupId.key, label: 'Key' },
  { id: groupId.meta, label: 'Meta' },
  { id: groupId.setlist, label: 'Setlist' },
];

const OTHER = '#';

function keysOf(rec, by) {
  if (Array.isArray(rec[by])) return rec[by];
  if (by === groupId.title) {
    const c = (rec.title ?? '').trim().charAt(0).toUpperCase();
    return [/[A-Z]/.test(c) ? c : OTHER];
  }
  const value = (rec[by] ?? '').trim();
  return value ? [value] : [];
}

function compare(a, b) {
  return (a ?? '').localeCompare(b ?? '', undefined, { sensitivity: 'base', numeric: true });
}

function byName(a, b) {
  if (a.name === OTHER) return 1;
  if (b.name === OTHER) return -1;
  return compare(a.name, b.name);
}

function byTitle(a, b) {
  return compare(a.title, b.title);
}

export function groupSongs(songs, by) {
  const groups = new Map();
  const none = [];
  for (const rec of songs) {
    const keys = keysOf(rec, by);
    if (!keys.length) none.push(rec);
    const seen = new Set();
    for (const name of keys) {
      const id = name.toLowerCase();
      if (seen.has(id)) continue;
      seen.add(id);
      if (!groups.has(id)) groups.set(id, { name, songs: [] });
      groups.get(id).songs.push(rec);
    }
  }
  const out = [...groups.values()].sort(byName);
  if (none.length) out.push({ name: `No ${by}`, songs: none, empty: true });
  for (const g of out) g.songs.sort(byTitle);
  return out;
}

export function groupSetlists(songs, sets, keepEmpty) {
  const byId = new Map(songs.map((rec) => [rec.id, rec]));
  return sets
    .map((set) => ({ name: set.name || strings.untitledSetlist, set, songs: set.entries.map((e) => byId.get(e.songId)).filter(Boolean) }))
    .filter((g) => keepEmpty || g.songs.length);
}
