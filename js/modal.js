import { create, iconButton } from './dom.js';
import { evt } from './events.js';

export function openModal(title, ...rows) {
  const dialog = create('dialog', { class: 'modal', 'aria-labelledby': 'modal-title' });
  const head = create('div', { class: 'modal-head' });
  const closeBtn = iconButton('xmark', 'Close', 'btn icon modal-close');
  head.append(create('h2', { class: 'modal-title', id: 'modal-title' }, title), closeBtn);

  dialog.append(head, ...rows);
  document.body.append(dialog);

  closeBtn.addEventListener(evt.click, () => dialog.close());
  dialog.addEventListener(evt.click, (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener(evt.close, () => dialog.remove());

  dialog.showModal();
  return dialog;
}

export function attachDialog(trigger, title, open) {
  let dialog = null;
  let onClose = null;

  function teardown() {
    const fn = onClose;
    dialog = null;
    onClose = null;
    fn?.();
  }

  trigger.addEventListener(evt.click, () => {
    if (dialog) return;
    const opened = open();
    const current = openModal(title, ...opened.rows);
    dialog = current;
    onClose = opened.onClose;
    current.addEventListener(evt.close, () => {
      if (dialog === current) teardown();
    });
  });

  return function dispose() {
    const current = dialog;
    teardown();
    current?.close();
  };
}
