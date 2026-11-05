const TAGS_KEY = 'tabs.liveTags';
const CONTROLS_KEY = 'tabs.liveControls';
const NUMBERS_KEY = 'tabs.numbers';
const NUMBER_STYLE_KEY = 'tabs.numberStyle';

export const NUMBER_STYLES = [
  { id: 'nashville', label: 'Nashville', short: '123', title: 'Nashville numbers' },
  { id: 'roman', label: 'Roman', short: 'I–V', title: 'Roman numerals' },
];

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

export const CONTROLS = [
  { id: 'autoscroll', label: 'Auto-scroll' },
  { id: 'transpose', label: 'Transpose' },
  { id: 'numbers', label: 'Numbers' },
];

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // not persisted in private mode
  }
}

function shownIds(key, items, fallback) {
  const ids = read(key);
  return Array.isArray(ids) ? ids.filter((id) => items.some((t) => t.id === id)) : fallback;
}

export function getShownTags() {
  return shownIds(TAGS_KEY, TAGS, ['key', 'capo']);
}

export function setShownTags(ids) {
  write(TAGS_KEY, ids);
}

export function getShownControls() {
  return shownIds(CONTROLS_KEY, CONTROLS, CONTROLS.map((c) => c.id));
}

export function setShownControls(ids) {
  write(CONTROLS_KEY, ids);
}

export function getNumbers() {
  return read(NUMBERS_KEY) === true;
}

export function setNumbers(on) {
  write(NUMBERS_KEY, on);
}

export function getNumberStyle() {
  const id = read(NUMBER_STYLE_KEY);
  return NUMBER_STYLES.some((s) => s.id === id) ? id : 'nashville';
}

export function setNumberStyle(id) {
  write(NUMBER_STYLE_KEY, id);
}

export function tagValue(rec, id) {
  const value = rec[id];
  return Array.isArray(value) ? value.join(', ') : (value ?? '');
}
