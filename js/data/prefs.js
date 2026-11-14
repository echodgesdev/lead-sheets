import { GROUPS, groupId } from './group.js';
import { clamp } from '../core/math.js';

const MODE_KEY = 'tabs.mode';
const GROUP_KEY = 'tabs.group';
const QUERY_KEY = 'tabs.q';
const ORDER_KEY = 'tabs.order';
const TAGS_KEY = 'tabs.liveTags';
const CONTROLS_KEY = 'tabs.liveControls';
const NUMBERS_KEY = 'tabs.numbers';
const NUMBER_STYLE_KEY = 'tabs.numberStyle';
const PEDAL_KEY = 'tabs.pedal';
const TEXT_SIZE_KEY = 'tabs.textSize';
const EDITOR_KEY = 'tabs.editor';
const FEATURES_KEY = 'tabs.features';

export const TEXT_SIZE = { min: 14, max: 36, fallback: 20 };

export const modeId = Object.freeze({
  live: 'live',
  edit: 'edit',
});

export const pedalId = Object.freeze({
  page: 'page',
  song: 'song',
});

export const editorId = Object.freeze({
  autofix: 'autofix',
});

export const featureId = Object.freeze({
  share: 'share',
});

export const numberStyleId = Object.freeze({
  nashville: 'nashville',
  roman: 'roman',
});

export const tagId = Object.freeze({
  artist: 'artist',
  album: 'album',
  genre: 'genre',
  key: 'key',
  capo: 'capo',
  tempo: 'tempo',
  tuning: 'tuning',
  meta: 'meta',
  notes: 'notes',
});

export const controlId = Object.freeze({
  autoscroll: 'autoscroll',
  capo: 'capo',
  transpose: 'transpose',
  numbers: 'numbers',
  details: 'details',
  tuner: 'tuner',
  metronome: 'metronome',
});

export const PEDAL_MODES = [
  { id: pedalId.page, label: 'Page' },
  { id: pedalId.song, label: 'Song' },
];

export const EDITOR_OPTIONS = [
  { id: editorId.autofix, label: 'Fix Format On Preview' },
];

export const FEATURES = [
  { id: featureId.share, label: 'Share & Paste Songs' },
];

export const NUMBER_STYLES = [
  { id: numberStyleId.nashville, label: 'Nashville', short: '123', title: 'Nashville numbers' },
  { id: numberStyleId.roman, label: 'Roman', short: 'I–V', title: 'Roman numerals' },
];

export const TAGS = [
  { id: tagId.artist, label: 'Artist' },
  { id: tagId.album, label: 'Album' },
  { id: tagId.genre, label: 'Genre' },
  { id: tagId.key, label: 'Key', prefix: true },
  { id: tagId.capo, label: 'Capo', prefix: true },
  { id: tagId.tempo, label: 'Tempo', prefix: true },
  { id: tagId.tuning, label: 'Tuning', prefix: true },
  { id: tagId.meta, label: 'Meta' },
  { id: tagId.notes, label: 'Notes' },
];

export const CONTROLS = [
  { id: controlId.autoscroll, label: 'Auto-scroll' },
  { id: controlId.capo, label: 'Capo' },
  { id: controlId.transpose, label: 'Transpose' },
  { id: controlId.numbers, label: 'Numbers' },
  { id: controlId.details, label: 'Details' },
  { id: controlId.tuner, label: 'Tuner' },
  { id: controlId.metronome, label: 'Metronome' },
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

function readRaw(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(storage, key, value) {
  try {
    storage.setItem(key, value);
  } catch {
    // not persisted in private mode
  }
}

function shownIds(key, items, fallback) {
  const ids = read(key);
  return Array.isArray(ids) ? ids.filter((id) => items.some((t) => t.id === id)) : fallback;
}

export function getListMode() {
  return readRaw(localStorage, MODE_KEY) === modeId.edit ? modeId.edit : modeId.live;
}

export function setListMode(mode) {
  writeRaw(localStorage, MODE_KEY, mode);
}

export function getListGroup() {
  const id = readRaw(localStorage, GROUP_KEY);
  return GROUPS.some((g) => g.id === id) ? id : groupId.title;
}

export function setListGroup(id) {
  writeRaw(localStorage, GROUP_KEY, id);
}

export function getListQuery() {
  return readRaw(sessionStorage, QUERY_KEY) ?? '';
}

export function setListQuery(query) {
  writeRaw(sessionStorage, QUERY_KEY, query);
}

export function getSongOrder() {
  try {
    const ids = JSON.parse(readRaw(sessionStorage, ORDER_KEY));
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

export function setSongOrder(ids) {
  writeRaw(sessionStorage, ORDER_KEY, JSON.stringify(ids));
}

export function getShownTags() {
  return shownIds(TAGS_KEY, TAGS, [tagId.key, tagId.capo]);
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
  return NUMBER_STYLES.some((s) => s.id === id) ? id : numberStyleId.nashville;
}

export function setNumberStyle(id) {
  write(NUMBER_STYLE_KEY, id);
}

export function getPedalMode() {
  const id = read(PEDAL_KEY);
  return PEDAL_MODES.some((m) => m.id === id) ? id : pedalId.page;
}

export function setPedalMode(id) {
  write(PEDAL_KEY, id);
}

export function getTextSize() {
  const n = read(TEXT_SIZE_KEY);
  return Number.isFinite(n) ? clamp(n, TEXT_SIZE.min, TEXT_SIZE.max) : TEXT_SIZE.fallback;
}

export function setTextSize(n) {
  write(TEXT_SIZE_KEY, n);
}

export function getEditorOptions() {
  return shownIds(EDITOR_KEY, EDITOR_OPTIONS, []);
}

export function setEditorOptions(ids) {
  write(EDITOR_KEY, ids);
}

export function getFeatures() {
  return shownIds(FEATURES_KEY, FEATURES, []);
}

export function setFeatures(ids) {
  write(FEATURES_KEY, ids);
}

export function hasFeature(id) {
  return getFeatures().includes(id);
}

export function tagValue(rec, id) {
  const value = rec[id];
  return Array.isArray(value) ? value.join(', ') : (value ?? '');
}
