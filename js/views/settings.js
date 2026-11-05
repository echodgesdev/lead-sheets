import * as backup from '../backup.js';
import { getTheme, setTheme } from '../theme.js';
import { TAGS, getShownTags, setShownTags } from '../tags.js';
import { openModal } from '../modal.js';
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

function themeRow() {
  const row = create('div', { class: 'modal-row' });
  const toggle = create('div', { class: 'seg-toggle' });
  const buttons = THEMES.map((t) => [t.id, labeledButton(t.icon, t.label)]);

  function apply(theme) {
    setTheme(theme);
    for (const [id, b] of buttons) b.classList.toggle('active', id === theme);
  }

  for (const [id, b] of buttons) b.addEventListener('click', () => apply(id));
  toggle.append(...buttons.map(([, b]) => b));
  row.append(create('span', { class: 'modal-label' }, 'Theme'), toggle);
  apply(getTheme());
  return row;
}

function tagsRow() {
  const row = create('div', { class: 'modal-row' });
  const chips = create('div', { class: 'chips' });
  const shown = new Set(getShownTags());

  for (const t of TAGS) {
    const b = create('button', { class: 'btn chip', type: 'button' }, t.label);
    const sync = () => {
      b.classList.toggle('active', shown.has(t.id));
      b.setAttribute('aria-pressed', String(shown.has(t.id)));
    };
    b.addEventListener('click', () => {
      if (shown.has(t.id)) shown.delete(t.id);
      else shown.add(t.id);
      setShownTags(TAGS.filter((x) => shown.has(x.id)).map((x) => x.id));
      sync();
    });
    sync();
    chips.append(b);
  }

  row.append(create('span', { class: 'modal-label' }, 'Show in Live'), chips);
  return row;
}

function backupRows(onImport) {
  const row = create('div', { class: 'modal-row' });
  const exportBtn = labeledButton('file-export', 'Export');
  const importBtn = labeledButton('file-import', 'Import');
  const fileInput = create('input', {
    type: 'file',
    accept: '.json,.md,.txt,application/json,text/plain',
    hidden: '',
  });
  row.append(create('span', { class: 'modal-label' }, 'Backup'), exportBtn, importBtn, fileInput);
  const note = create('p', { class: 'modal-note', hidden: '' });

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

  return [row, note];
}

export function openSettings({ onImport } = {}) {
  openModal('Settings', themeRow(), tagsRow(), ...backupRows(onImport));
}
