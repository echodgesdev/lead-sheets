import { openModal } from './modal.js';
import { modalRow, liveSettingsRows } from './rows.js';
import { labeledButton } from '../core/dom.js';
import { evt } from '../core/events.js';
import { strings } from '../strings.js';
import { iconId } from '../core/icons.js';
import { shareSong } from './share.js';

export function openSongActions(rec, { onEdit }) {
  const shareBtn = labeledButton(iconId.arrowUpFromBracket, 'Share song');
  const editBtn = labeledButton(iconId.penToSquare, 'Edit song');
  const dialog = openModal(rec.title || strings.untitled, modalRow(null, shareBtn, editBtn));
  shareBtn.addEventListener(evt.click, () => {
    dialog.close();
    shareSong(rec.title || strings.untitled, rec.text);
  });
  editBtn.addEventListener(evt.click, () => {
    dialog.close();
    onEdit();
  });
}

export function openSongMenu(rec, { onSize, onClose, onEdit }) {
  const editBtn = labeledButton(iconId.penToSquare, 'Edit song');
  const shareBtn = labeledButton(iconId.arrowUpFromBracket, 'Share song');
  const dialog = openModal(null, ...liveSettingsRows(onSize), modalRow(null, editBtn, shareBtn));
  shareBtn.addEventListener(evt.click, () => shareSong(rec.title || strings.untitled, rec.text));
  dialog.addEventListener(evt.close, onClose);
  editBtn.addEventListener(evt.click, () => {
    dialog.close();
    onEdit();
  });
}
