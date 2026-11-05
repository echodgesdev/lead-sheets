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
  const doneBtn = create('button', { class: 'btn primary', type: 'button' });
  doneBtn.append(icon('check'), 'Done');
  head.append(create('h2', { class: 'modal-title', id: 'modal-title' }, title), doneBtn);

  dialog.append(head, ...rows);
  document.body.append(dialog);

  doneBtn.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => dialog.remove());

  dialog.showModal();
  return dialog;
}
