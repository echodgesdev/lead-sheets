import * as backup from '../data/backup.js';
import { themeId, getTheme, setTheme } from '../data/theme.js';
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
import { modalRow, choiceRow, chipsRow, textSizeRow } from './rows.js';
import { input, p, span, labeledButton } from '../core/dom.js';
import { evt } from '../core/events.js';
import { iconId } from '../core/icons.js';

const THEMES = [
  { id: themeId.system, icon: iconId.circleHalfStroke, label: 'Auto' },
  { id: themeId.dark, icon: iconId.moon, label: 'Dark' },
  { id: themeId.light, icon: iconId.sun, label: 'Light' },
];

function backupRows(onImport) {
  const exportBtn = labeledButton(iconId.arrowUpFromBracket, 'Share library');
  const importBtn = labeledButton(iconId.fileImport, 'Import');
  const fileInput = input({
    type: 'file',
    accept: '.json,.md,.txt,application/json,text/plain',
    hidden: '',
  });
  const row = modalRow('Backup', exportBtn, importBtn, fileInput);
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
  const value = span('info-value');
  const row = modalRow('Version', value);
  row.hidden = true;
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
