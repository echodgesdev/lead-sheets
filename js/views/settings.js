import * as backup from '../backup.js';
import { getTheme, setTheme } from '../theme.js';
import { icon } from '../icons.js';

const THEMES = [
  { id: 'system', icon: 'circle-half-stroke', label: 'Auto' },
  { id: 'dark', icon: 'moon', label: 'Dark' },
  { id: 'light', icon: 'sun', label: 'Light' },
];

function create(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

function labeledButton(name, text) {
  const b = create('button', { class: 'btn', type: 'button' });
  b.append(icon(name), text);
  return b;
}

export function openSettings({ onImport } = {}) {
  const dialog = create('dialog', { class: 'modal', 'aria-labelledby': 'settings-title' });
  const head = create('div', { class: 'modal-head' });
  const doneBtn = create('button', { class: 'btn primary', type: 'button' });
  doneBtn.append(icon('check'), 'Done');
  head.append(create('h2', { class: 'modal-title', id: 'settings-title' }, 'Settings'), doneBtn);

  const themeRow = create('div', { class: 'modal-row' });
  const toggle = create('div', { class: 'seg-toggle' });
  const themeButtons = THEMES.map((t) => {
    const b = labeledButton(t.icon, t.label);
    b.addEventListener('click', () => applyTheme(t.id));
    return [t.id, b];
  });
  toggle.append(...themeButtons.map(([, b]) => b));
  themeRow.append(create('span', { class: 'modal-label' }, 'Theme'), toggle);

  const backupRow = create('div', { class: 'modal-row' });
  const exportBtn = labeledButton('file-export', 'Export');
  const importBtn = labeledButton('file-import', 'Import');
  const fileInput = create('input', {
    type: 'file',
    accept: '.json,.md,.txt,application/json,text/plain',
    hidden: '',
  });
  backupRow.append(create('span', { class: 'modal-label' }, 'Backup'), exportBtn, importBtn, fileInput);
  const note = create('p', { class: 'modal-note', hidden: '' });

  dialog.append(head, themeRow, backupRow, note);
  document.body.append(dialog);

  function applyTheme(theme) {
    setTheme(theme);
    for (const [id, b] of themeButtons) b.classList.toggle('active', id === theme);
  }

  function setNote(text) {
    note.textContent = text;
    note.hidden = !text;
  }

  async function runAction(action) {
    setNote('');
    try {
      await action();
    } catch (err) {
      setNote(err.message);
    }
  }

  exportBtn.addEventListener('click', () => runAction(() => backup.exportAll()));
  importBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    runAction(async () => {
      const count = await backup.importFile(file);
      setNote(`Imported ${count}`);
      onImport?.();
    });
  });
  doneBtn.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => dialog.remove());

  applyTheme(getTheme());
  dialog.showModal();
}
