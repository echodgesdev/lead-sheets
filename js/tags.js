const KEY = 'tabs.liveTags';
const DEFAULT_SHOWN = ['key', 'capo'];

export const TAGS = [
  { id: 'artist', label: 'Artist' },
  { id: 'album', label: 'Album' },
  { id: 'genre', label: 'Genre' },
  { id: 'key', label: 'Key', prefix: true },
  { id: 'capo', label: 'Capo', prefix: true },
  { id: 'tempo', label: 'Tempo', prefix: true },
  { id: 'tuning', label: 'Tuning', prefix: true },
  { id: 'meta', label: 'Meta' },
  { id: 'setlist', label: 'Setlist' },
  { id: 'notes', label: 'Notes' },
];

export function getShownTags() {
  try {
    const ids = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(ids)) return ids.filter((id) => TAGS.some((t) => t.id === id));
  } catch {
    // fall through to defaults
  }
  return DEFAULT_SHOWN;
}

export function setShownTags(ids) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // not persisted in private mode
  }
}

export function tagValue(rec, id) {
  const value = rec[id];
  return Array.isArray(value) ? value.join(', ') : (value ?? '');
}
