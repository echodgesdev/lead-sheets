import { icon } from './icons.js';

function create(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

export function openModal(title, ...rows) {
  const dialog = create('dialog', { class: 'modal', 'aria-labelledby': 'modal-title' });
  const head = create('div', { class: 'modal-head' });
  const closeBtn = create('button', { class: 'btn icon modal-close', type: 'button', 'aria-label': 'Close', title: 'Close' });
  closeBtn.append(icon('xmark'));
  head.append(create('h2', { class: 'modal-title', id: 'modal-title' }, title), closeBtn);

  dialog.append(head, ...rows);
  document.body.append(dialog);

  closeBtn.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => dialog.remove());

  dialog.showModal();
  return dialog;
}
