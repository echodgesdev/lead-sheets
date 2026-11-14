import * as backup from '../data/backup.js';
import { getTheme, setTheme } from '../data/theme.js';
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
  FEATURES,
  getFeatures,
  setFeatures,
} from '../data/prefs.js';
import { openModal } from './modal.js';
import { choiceRow, chipsRow, textSizeRow } from './rows.js';
import { div, input, p, span, labeledButton } from '../core/dom.js';
import { evt } from '../core/events.js';

const THEMES = [
  { id: 'system', icon: 'circle-half-stroke', label: 'Auto' },
  { id: 'dark', icon: 'moon', label: 'Dark' },
  { id: 'light', icon: 'sun', label: 'Light' },
];

function backupRows(onImport) {
  const row = div('modal-row');
  const exportBtn = labeledButton('arrow-up-from-bracket', 'Share library');
  const importBtn = labeledButton('file-import', 'Import');
  const fileInput = input({
    type: 'file',
    accept: '.json,.md,.txt,application/json,text/plain',
    hidden: '',
  });
  row.append(span('modal-label', 'Backup'), exportBtn, importBtn, fileInput);
  const note = p({ class: 'modal-note', hidden: '' });

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

  exportBtn.addEventListener(evt.click, () => runAction(() => backup.exportAll()));
  importBtn.addEventListener(evt.click, () => fileInput.click());
  fileInput.addEventListener(evt.change, () => {
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
  const row = div({ class: 'modal-row', hidden: '' });
  const value = span('info-value');
  row.append(span('modal-label', 'Version'), value);
  globalThis.caches?.keys().then((keys) => {
    const key = keys.filter((k) => k.startsWith('tabs-')).at(-1);
    if (!key) return;
    value.textContent = key.slice('tabs-'.length);
    row.hidden = false;
  }).catch(() => {});
  return row;
}

export function openSettings({ onImport, onClose } = {}) {
  const dialog = openModal(
    'Settings',
    choiceRow('Theme', THEMES, getTheme(), setTheme),
    textSizeRow(),
    chipsRow('Live controls', CONTROLS, getShownControls(), setShownControls),
    choiceRow('Numbers', NUMBER_STYLES, getNumberStyle(), setNumberStyle),
    choiceRow('Page turner', PEDAL_MODES, getPedalMode(), setPedalMode),
    chipsRow('Live tags', TAGS, getShownTags(), setShownTags),
    chipsRow('Editor', EDITOR_OPTIONS, getEditorOptions(), setEditorOptions),
    ...backupRows(onImport),
    chipsRow('Experimental', FEATURES, getFeatures(), setFeatures),
    versionRow(),
  );
  if (onClose) dialog.addEventListener(evt.close, onClose);
}
