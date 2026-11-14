import { TAGS, tagValue } from '../data/prefs.js';
import { openModal } from './modal.js';
import { div, p, span } from '../core/dom.js';
import { strings } from '../strings.js';

function capitalize(name) {
  return name.replace(/(^|[\s-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
}

function row(label, value) {
  const r = div('modal-row');
  r.append(span('modal-label', label), span('info-value', value));
  return r;
}

function infoRows(rec) {
  const rows = TAGS.map((t) => [t.label, tagValue(rec, t.id)])
    .concat(Object.entries(rec.extra ?? {}).map(([k, v]) => [capitalize(k), v]))
    .filter(([, value]) => value)
    .map(([label, value]) => row(label, value));
  if (!rows.length) rows.push(p('modal-note info-empty', 'No tags on this song'));
  return rows;
}

export function openSongDetails(rec) {
  openModal(rec.title || strings.untitled, ...infoRows(rec));
}
