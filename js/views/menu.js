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
} from '../prefs.js';
import { openModal } from '../modal.js';
import { labeledButton, choiceRow, chipsRow, textSizeRow } from './rows.js';

function create(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  if (text !== undefined) node.textContent = text;
  return node;
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
    editRow,
  );
  dialog.addEventListener('close', onClose);
  editBtn.addEventListener('click', () => {
    dialog.close();
    onEdit();
  });
}
