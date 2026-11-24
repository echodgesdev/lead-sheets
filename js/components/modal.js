import { dialog, div, h2, iconButton, labeledButton } from '../core/dom.js';
import { evt, keys } from '../core/events.js';
import { iconId } from '../core/icons.js';
import { clamp } from '../core/math.js';
import { textField } from './controls.js';
import { modalRow } from './rows.js';

const POPOVER_GAP = 8;
const POPOVER_EDGE = 16;

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

export function openPopover(anchor, ...rows) {
  const popover = dialog('popover');
  popover.append(...rows);
  document.body.append(popover);
  const placing = new AbortController();

  function place() {
    const box = anchor.getBoundingClientRect();
    const width = popover.offsetWidth;
    const height = popover.offsetHeight;
    const below = box.bottom + POPOVER_GAP;
    const above = box.top - POPOVER_GAP - height;
    const flip = below + height > window.innerHeight - POPOVER_EDGE && above >= POPOVER_EDGE;
    popover.style.top = `${flip ? above : below}px`;
    popover.style.left = `${clamp(box.right - width, POPOVER_EDGE, window.innerWidth - width - POPOVER_EDGE)}px`;
  }

  popover.addEventListener(evt.click, (e) => {
    if (e.target === popover) popover.close();
  });
  popover.addEventListener(evt.close, () => {
    placing.abort();
    popover.remove();
  });
  window.addEventListener(evt.resize, place, { signal: placing.signal });

  popover.showModal();
  place();
  return popover;
}

function attach(trigger, show, open) {
  let openDialog = null;
  let onClose = null;

  function teardown() {
    const fn = onClose;
    openDialog = null;
    onClose = null;
    fn?.();
  }

  const close = () => openDialog?.close();

  trigger.addEventListener(evt.click, () => {
    if (openDialog) return;
    const opened = open(close);
    const current = show([opened.header, ...opened.rows].filter(Boolean));
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

export function attachDialog(trigger, title, open) {
  return attach(trigger, (rows) => openModal(title, ...rows), open);
}

export function attachPopover(trigger, open) {
  return attach(trigger, (rows) => openPopover(trigger, ...rows), open);
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
