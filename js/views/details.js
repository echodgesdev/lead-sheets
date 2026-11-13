import { TAGS, tagValue } from '../prefs.js';
import { openModal } from '../modal.js';
import { create } from '../dom.js';

function capitalize(name) {
  return name.replace(/(^|[\s-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
}

function row(label, value) {
  const r = create('div', { class: 'modal-row' });
  r.append(create('span', { class: 'modal-label' }, label), create('span', { class: 'info-value' }, value));
  return r;
}

function infoRows(rec) {
  const rows = TAGS.map((t) => [t.label, tagValue(rec, t.id)])
    .concat(Object.entries(rec.extra ?? {}).map(([k, v]) => [capitalize(k), v]))
    .filter(([, value]) => value)
    .map(([label, value]) => row(label, value));
  if (!rows.length) rows.push(create('p', { class: 'modal-note info-empty' }, 'No tags on this song'));
  return rows;
}

export function openSongDetails(rec) {
  openModal(rec.title || 'Untitled', ...infoRows(rec));
}
