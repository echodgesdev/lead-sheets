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
} from '../data/prefs.js';
import { openModal } from './modal.js';
import { modalRow, choiceRow, chipsRow, textSizeRow } from './rows.js';
import { labeledButton } from '../core/dom.js';
import { evt } from '../core/events.js';
import { strings } from '../strings.js';
import { iconId } from '../core/icons.js';

export function openSongMenu(rec, { onSize, onClose, onEdit }) {
  const editBtn = labeledButton(iconId.penToSquare, 'Edit song');
  const dialog = openModal(
    rec.title || strings.untitled,
    textSizeRow(onSize),
    chipsRow('Live controls', CONTROLS, getShownControls(), setShownControls),
    choiceRow('Numbers', NUMBER_STYLES, getNumberStyle(), setNumberStyle),
    choiceRow('Page turner', PEDAL_MODES, getPedalMode(), setPedalMode),
    chipsRow('Live tags', TAGS, getShownTags(), setShownTags),
    modalRow(null, editBtn),
  );
  dialog.addEventListener(evt.close, onClose);
  editBtn.addEventListener(evt.click, () => {
    dialog.close();
    onEdit();
  });
}
