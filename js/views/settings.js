import * as backup from '../backup.js';
import { getTheme, setTheme } from '../theme.js';
import {
  TAGS,
  CONTROLS,
  NUMBER_STYLES,
  PEDAL_MODES,
  EDITOR_OPTIONS,
  TEXT_SIZE,
  getShownTags,
  setShownTags,
  getShownControls,
  setShownControls,
  getNumberStyle,
  setNumberStyle,
  getPedalMode,
  setPedalMode,
  getTextSize,
  setTextSize,
  getEditorOptions,
  setEditorOptions,
} from '../prefs.js';
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
  if (name) b.append(icon(name));
  b.append(text);
  return b;
}

function choiceRow(label, options, value, save) {
  const row = create('div', { class: 'modal-row' });
  const toggle = create('div', { class: 'seg-toggle' });
  const buttons = options.map((o) => [o.id, labeledButton(o.icon, o.label)]);

  function apply(id) {
    save(id);
    for (const [bid, b] of buttons) b.classList.toggle('active', bid === id);
  }

  for (const [id, b] of buttons) b.addEventListener('click', () => apply(id));
  toggle.append(...buttons.map(([, b]) => b));
  row.append(create('span', { class: 'modal-label' }, label), toggle);
  apply(value);
  return row;
}

function chipsRow(label, items, shownIds, save) {
  const row = create('div', { class: 'modal-row' });
  const chips = create('div', { class: 'chips' });
  const shown = new Set(shownIds);

  for (const t of items) {
    const b = create('button', { class: 'btn chip', type: 'button' }, t.label);
    const sync = () => {
      b.classList.toggle('active', shown.has(t.id));
      b.setAttribute('aria-pressed', String(shown.has(t.id)));
    };
    b.addEventListener('click', () => {
      if (shown.has(t.id)) shown.delete(t.id);
      else shown.add(t.id);
      save(items.filter((x) => shown.has(x.id)).map((x) => x.id));
      sync();
    });
    sync();
    chips.append(b);
  }

  row.append(create('span', { class: 'modal-label' }, label), chips);
  return row;
}

function sizeRow(label, range, value, save) {
  const row = create('div', { class: 'modal-row' });
  const slider = create('input', {
    class: 'slider',
    type: 'range',
    min: range.min,
    max: range.max,
    step: 1,
    'aria-label': label,
  });
  slider.value = value;
  const out = create('span', { class: 'slider-value' }, String(value));
  slider.addEventListener('input', () => {
    out.textContent = slider.value;
    save(Number(slider.value));
  });
  row.append(create('span', { class: 'modal-label' }, label), out, slider);
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
  openModal(
    'Settings',
    choiceRow('Theme', THEMES, getTheme(), setTheme),
    sizeRow('Live text size', TEXT_SIZE, getTextSize(), setTextSize),
    chipsRow('Live controls', CONTROLS, getShownControls(), setShownControls),
    choiceRow('Numbers', NUMBER_STYLES, getNumberStyle(), setNumberStyle),
    choiceRow('Page turner', PEDAL_MODES, getPedalMode(), setPedalMode),
    chipsRow('Live tags', TAGS, getShownTags(), setShownTags),
    chipsRow('Editor', EDITOR_OPTIONS, getEditorOptions(), setEditorOptions),
    ...backupRows(onImport),
  );
}
