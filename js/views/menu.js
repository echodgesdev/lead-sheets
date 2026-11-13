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
import { choiceRow, chipsRow, textSizeRow } from './rows.js';
import { create, labeledButton } from '../dom.js';
import { evt } from '../events.js';
import { strings } from '../strings.js';

export function openSongMenu(rec, { onSize, onClose, onEdit }) {
  const editRow = create('div', { class: 'modal-row' });
  const editBtn = labeledButton('pen-to-square', 'Edit song');
  editRow.append(editBtn);
  const dialog = openModal(
    rec.title || strings.untitled,
    textSizeRow(onSize),
    chipsRow('Live controls', CONTROLS, getShownControls(), setShownControls),
    choiceRow('Numbers', NUMBER_STYLES, getNumberStyle(), setNumberStyle),
    choiceRow('Page turner', PEDAL_MODES, getPedalMode(), setPedalMode),
    chipsRow('Live tags', TAGS, getShownTags(), setShownTags),
    editRow,
  );
  dialog.addEventListener(evt.close, onClose);
  editBtn.addEventListener(evt.click, () => {
    dialog.close();
    onEdit();
  });
}
