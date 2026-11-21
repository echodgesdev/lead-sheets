import { dialog, div, h2, iconButton } from '../core/dom.js';
import { evt } from '../core/events.js';
import { iconId } from '../core/icons.js';

export function openModal(title, ...rows) {
  const modal = dialog(title ? { class: 'modal', 'aria-labelledby': 'modal-title' } : 'modal');
  const head = div('modal-head');
  const closeBtn = iconButton(iconId.xmark, 'Close', 'modal-close');
  if (title) head.append(h2({ class: 'modal-title', id: 'modal-title' }, title));
  head.append(closeBtn);

  modal.append(head, ...rows);
  document.body.append(modal);

  closeBtn.addEventListener(evt.click, () => modal.close());
  modal.addEventListener(evt.click, (e) => {
    if (e.target === modal) modal.close();
  });
  modal.addEventListener(evt.close, () => modal.remove());

  modal.showModal();
  return modal;
}

export function attachDialog(trigger, title, open) {
  let openDialog = null;
  let onClose = null;

  function teardown() {
    const fn = onClose;
    openDialog = null;
    onClose = null;
    fn?.();
  }

  trigger.addEventListener(evt.click, () => {
    if (openDialog) return;
    const opened = open();
    const current = openModal(title, ...opened.rows);
    openDialog = current;
    onClose = opened.onClose;
    current.addEventListener(evt.close, () => {
      if (openDialog === current) teardown();
    });
  });

  return function dispose() {
    const current = openDialog;
    teardown();
    current?.close();
  };
}
