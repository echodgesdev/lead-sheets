import { confirmDialog, openModal } from './modal.js';
import { modalRow, liveSettingsRows } from './rows.js';
import { labeledButton } from '../core/dom.js';
import { evt } from '../core/events.js';
import { strings } from '../strings.js';
import { iconId } from '../core/icons.js';
import { shareSong } from './share.js';
import { songTitle } from './parts.js';

export function openSongActions(rec, { onEdit, onDelete }) {
  const shareBtn = labeledButton(iconId.arrowUpFromBracket, 'Share song');
  const editBtn = labeledButton(iconId.penToSquare, 'Edit song');
  const deleteBtn = labeledButton(iconId.trashCan, 'Delete', 'danger');
  const dialog = openModal(songTitle(rec), modalRow(null, shareBtn, editBtn, deleteBtn));
  deleteBtn.addEventListener(evt.click, async () => {
    dialog.close();
    if (await confirmDialog({ title: strings.confirmDeleteSong, message: songTitle(rec), confirmLabel: strings.delete, danger: true })) onDelete();
  });
  shareBtn.addEventListener(evt.click, () => {
    dialog.close();
    shareSong(songTitle(rec), rec.text);
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
  shareBtn.addEventListener(evt.click, () => shareSong(songTitle(rec), rec.text));
  dialog.addEventListener(evt.close, onClose);
  editBtn.addEventListener(evt.click, () => {
    dialog.close();
    onEdit();
  });
}
