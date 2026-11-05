import {
  TAGS,
  CONTROLS,
  NUMBER_STYLES,
  PEDAL_MODES,
  getShownTags,
  setShownTags,
  getShownControls,
  setShownControls,
  getNumberStyle,
  setNumberStyle,
  getPedalMode,
  setPedalMode,
  tagValue,
} from '../prefs.js';
import { openModal } from '../modal.js';
import { labeledButton, choiceRow, chipsRow, textSizeRow } from './rows.js';

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

function infoRows(rec) {
  const rows = TAGS.map((t) => [t.label, tagValue(rec, t.id)])
    .concat(Object.entries(rec.extra ?? {}).map(([k, v]) => [capitalize(k), v]))
    .filter(([, value]) => value)
    .map(([label, value]) => row(label, value));
  if (!rows.length) rows.push(create('p', { class: 'modal-note info-empty' }, 'No tags on this song'));
  return rows;
}

export function openSongMenu(rec, { onSize, onClose, onEdit }) {
  const editRow = create('div', { class: 'modal-row' });
  const editBtn = labeledButton('pen-to-square', 'Edit song');
  editRow.append(editBtn);
  const dialog = openModal(
    rec.title || 'Untitled',
    textSizeRow(onSize),
    chipsRow('Live controls', CONTROLS, getShownControls(), setShownControls),
    choiceRow('Numbers', NUMBER_STYLES, getNumberStyle(), setNumberStyle),
    choiceRow('Page turner', PEDAL_MODES, getPedalMode(), setPedalMode),
    chipsRow('Live tags', TAGS, getShownTags(), setShownTags),
    ...infoRows(rec),
    editRow,
  );
  dialog.addEventListener('close', onClose);
  editBtn.addEventListener('click', () => {
    dialog.close();
    onEdit();
  });
}
