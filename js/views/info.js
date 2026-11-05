import { TAGS, TEXT_SIZE, getTextSize, setTextSize, tagValue } from '../prefs.js';
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

export function textSizeRow(onSize) {
  const r = create('div', { class: 'modal-row' });
  const slider = create('input', {
    class: 'slider',
    type: 'range',
    min: TEXT_SIZE.min,
    max: TEXT_SIZE.max,
    step: 1,
    'aria-label': 'Text size',
  });
  slider.value = getTextSize();
  const out = create('span', { class: 'slider-value' }, slider.value);
  slider.addEventListener('input', () => {
    const size = Number(slider.value);
    out.textContent = slider.value;
    setTextSize(size);
    onSize?.(size);
  });
  r.append(create('span', { class: 'modal-label' }, 'Text size'), out, slider);
  return r;
}

export function openInfo(rec, onSize) {
  const rows = TAGS.map((t) => [t.label, tagValue(rec, t.id)])
    .concat(Object.entries(rec.extra ?? {}).map(([k, v]) => [capitalize(k), v]))
    .filter(([, value]) => value)
    .map(([label, value]) => row(label, value));
  if (!rows.length) rows.push(create('p', { class: 'modal-note info-empty' }, 'No tags on this song'));
  openModal(rec.title || 'Untitled', textSizeRow(onSize), ...rows);
}
