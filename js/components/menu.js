import { TAGS, getShownTags, setShownTags } from '../data/prefs.js';
import { openModal } from './modal.js';
import { modalRow, chipsRow, textSizeRow, liveControlRows } from './rows.js';
import { labeledButton } from '../core/dom.js';
import { evt } from '../core/events.js';
import { strings } from '../strings.js';
import { iconId } from '../core/icons.js';

export function openSongMenu(rec, { onSize, onClose, onEdit }) {
  const editBtn = labeledButton(iconId.penToSquare, 'Edit song');
  const dialog = openModal(
    rec.title || strings.untitled,
    textSizeRow(onSize),
    ...liveControlRows(),
    chipsRow('Live tags', TAGS, getShownTags(), setShownTags),
    modalRow(null, editBtn),
  );
  dialog.addEventListener(evt.close, onClose);
  editBtn.addEventListener(evt.click, () => {
    dialog.close();
    onEdit();
  });
}
