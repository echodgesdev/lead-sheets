import * as backup from '../backup.js';
import { getTheme, setTheme } from '../theme.js';
import {
  TAGS,
  CONTROLS,
  NUMBER_STYLES,
  PEDAL_MODES,
  EDITOR_OPTIONS,
  getShownTags,
  setShownTags,
  getShownControls,
  setShownControls,
  getNumberStyle,
  setNumberStyle,
  getPedalMode,
  setPedalMode,
  getEditorOptions,
  setEditorOptions,
} from '../prefs.js';
import { openModal } from '../modal.js';
import { labeledButton, choiceRow, chipsRow, textSizeRow } from './rows.js';

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

function backupRows(onImport) {
  const row = create('div', { class: 'modal-row' });
  const exportBtn = labeledButton('arrow-up-from-bracket', 'Share library');
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

function versionRow() {
  const row = create('div', { class: 'modal-row', hidden: '' });
  const value = create('span', { class: 'info-value' });
  row.append(create('span', { class: 'modal-label' }, 'Version'), value);
  globalThis.caches?.keys().then((keys) => {
    const key = keys.filter((k) => k.startsWith('tabs-')).at(-1);
    if (!key) return;
    value.textContent = key.slice('tabs-'.length);
    row.hidden = false;
  }).catch(() => {});
  return row;
}

export function openSettings({ onImport } = {}) {
  openModal(
    'Settings',
    choiceRow('Theme', THEMES, getTheme(), setTheme),
    textSizeRow(),
    chipsRow('Live controls', CONTROLS, getShownControls(), setShownControls),
    choiceRow('Numbers', NUMBER_STYLES, getNumberStyle(), setNumberStyle),
    choiceRow('Page turner', PEDAL_MODES, getPedalMode(), setPedalMode),
    chipsRow('Live tags', TAGS, getShownTags(), setShownTags),
    chipsRow('Editor', EDITOR_OPTIONS, getEditorOptions(), setEditorOptions),
    ...backupRows(onImport),
    versionRow(),
  );
}
