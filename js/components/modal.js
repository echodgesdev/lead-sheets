import { dialog, div, h2, iconButton, labeledButton } from '../core/dom.js';
import { evt, keys } from '../core/events.js';
import { iconId } from '../core/icons.js';
import { textField } from './controls.js';
import { modalRow } from './rows.js';

let modalCount = 0;

export function openModal(title, ...rows) {
  const titleId = `modal-title-${++modalCount}`;
  const modal = dialog(title ? { class: 'modal', 'aria-labelledby': titleId } : 'modal');
  const head = div('modal-head');
  const closeBtn = iconButton(iconId.xmark, 'Close', 'modal-close');
  if (title) head.append(h2({ class: 'modal-title', id: titleId }, title));
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

export function promptNumber(title, value, { min, max }, onSet) {
  const field = textField(title, null, { type: 'number', inputmode: 'numeric', min, max, step: 1 });
  field.value = String(value);
  const setBtn = labeledButton(iconId.check, 'Set', 'primary');
  const modal = openModal(title, modalRow(null, field, setBtn));

  function apply() {
    const n = Number(field.value);
    if (field.value.trim() && Number.isFinite(n)) onSet(Math.round(n));
    modal.close();
  }

  setBtn.addEventListener(evt.click, apply);
  field.addEventListener(evt.keydown, (e) => {
    if (e.key !== keys.enter) return;
    e.preventDefault();
    apply();
  });
  field.focus();
  field.select();
}
