import { div, button } from '../dom.js';
import { evt } from '../events.js';

const SHOW_MS = 4000;
let current = null;

export function toast(text, action) {
  current?.();
  const node = div({ class: 'toast', role: 'status' }, text);
  const timer = setTimeout(dismiss, SHOW_MS);

  function dismiss() {
    clearTimeout(timer);
    node.remove();
    if (current === dismiss) current = null;
  }

  if (action) {
    const b = button(action.label, action.label, 'toast-action');
    b.addEventListener(evt.click, () => {
      dismiss();
      action.run();
    });
    node.append(b);
  }

  document.body.append(node);
  current = dismiss;
  return dismiss;
}
