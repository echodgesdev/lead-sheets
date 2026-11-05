import { TAGS, tagValue } from '../tags.js';
import { openModal } from '../modal.js';

function create(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

function capitalize(name) {
  return name.replace(/(^|[\s-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
}

function row(label, value) {
  const r = create('div', { class: 'modal-row' });
  r.append(create('span', { class: 'modal-label' }, label), create('span', { class: 'info-value' }, value));
  return r;
}

export function openInfo(rec) {
  const rows = TAGS.map((t) => [t.label, tagValue(rec, t.id)])
    .concat(Object.entries(rec.extra ?? {}).map(([k, v]) => [capitalize(k), v]))
    .filter(([, value]) => value)
    .map(([label, value]) => row(label, value));
  if (!rows.length) rows.push(create('p', { class: 'modal-note info-empty' }, 'No tags on this song'));
  openModal(rec.title || 'Untitled', ...rows);
}
