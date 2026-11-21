import * as store from '../data/store.js';
import { infer } from '../sheet/infer.js';
import { attachKeybar } from '../components/keybar.js';
import { iconId } from '../core/icons.js';
import { toast } from '../components/toast.js';
import { editorId, getEditorOptions } from '../data/prefs.js';
import { div, h1, header, span, textarea, iconButton, labeledButton } from '../core/dom.js';
import { evt, keys } from '../core/events.js';
import { routes, NEW_ID } from '../routes.js';
import { createAutosave } from '../core/autosave.js';
import { strings } from '../strings.js';

const NEW_TEMPLATE = 'New Song\nArtist: \nAlbum: \nGenre: \nKey: \nCapo: \nTuning: \nMeta: \nNotes: \n\nVerse 1:\n\nChorus:\n';
const SAVE_DELAY_MS = 800;

function titleOf(text) {
  const line = text.split('\n').map((l) => l.trim()).find(Boolean) ?? '';
  return line.replace(/^#\s*/, '') || strings.untitled;
}

export function mount(el, { id, back = null }) {
  let currentId = id === NEW_ID ? null : id;
  let disposed = false;
  let dismissToast = null;
  const listening = new AbortController();

  const screen = div('screen');
  const headerEl = header('hdr');
  const previewBtn = labeledButton(iconId.play, 'Preview', 'primary');
  const title = h1('hdr-title');
  const status = span('hdr-alert');
  const inferBtn = iconButton(iconId.wandMagicSparkles, 'Infer format');
  const deleteBtn = iconButton(iconId.trashCan, 'Delete', 'danger');
  const backBtn = iconButton(iconId.chevronLeft, strings.backToSongs);
  const editor = textarea({
    class: 'editor',
    autocapitalize: 'off',
    autocomplete: 'off',
    autocorrect: 'off',
    spellcheck: 'false',
    wrap: 'off',
  });
  headerEl.append(backBtn, title, status, deleteBtn, inferBtn, previewBtn);
  inferBtn.hidden = getEditorOptions().includes(editorId.hideFormat);
  screen.append(headerEl, editor);
  el.append(screen);

  function setStatus(text) {
    status.textContent = text;
  }

  function refreshTitle() {
    title.textContent = titleOf(editor.value);
  }

  function syncChrome() {
    deleteBtn.hidden = !currentId;
  }

  function adopt(newId) {
    currentId = newId;
    syncChrome();
    if (!disposed) history.replaceState(null, '', routes.edit(newId));
  }

  async function persist(text) {
    if (!currentId && text === NEW_TEMPLATE) return;
    const rec = await store.save(currentId, text);
    if (!currentId) adopt(rec.id);
    setStatus('');
  }

  const autosave = createAutosave({
    snapshot: () => editor.value,
    persist,
    delayMs: SAVE_DELAY_MS,
    onError: () => setStatus(strings.notSaved),
    signal: listening.signal,
  });

  function onInput() {
    refreshTitle();
    autosave.schedule();
  }

  function replaceText(text) {
    editor.setRangeText(text, 0, editor.value.length);
    editor.dispatchEvent(new Event(evt.input, { bubbles: true }));
  }

  function onInfer() {
    const before = editor.value;
    const after = infer(before);
    if (after === before) {
      dismissToast = toast('Nothing to fix');
      return;
    }
    replaceText(after);
    dismissToast = toast('Format fixed', { label: 'Undo', run: () => replaceText(before) });
  }

  async function onPreview() {
    const untouched = !currentId && editor.value === NEW_TEMPLATE;
    if (!untouched && getEditorOptions().includes(editorId.autofix)) {
      const after = infer(editor.value);
      if (after !== editor.value) {
        replaceText(after);
        toast('Format fixed');
      }
    }
    await autosave.flush();
    location.hash = currentId ? (back ?? routes.preview(currentId)) : routes.home;
  }

  async function onBack() {
    await autosave.flush();
    location.hash = routes.home;
  }

  async function onDelete() {
    if (!currentId || !confirm(strings.confirmDeleteSong)) return;
    await autosave.cancel();
    await store.remove(currentId);
    location.hash = routes.home;
  }

  function onKeydown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === keys.s) {
      event.preventDefault();
      autosave.flush();
    }
  }

  editor.addEventListener(evt.input, onInput);
  previewBtn.addEventListener(evt.click, onPreview);
  inferBtn.addEventListener(evt.click, onInfer);
  backBtn.addEventListener(evt.click, onBack);
  deleteBtn.addEventListener(evt.click, onDelete);
  document.addEventListener(evt.keydown, onKeydown, { signal: listening.signal });

  editor.value = currentId ? (store.get(currentId)?.text ?? '') : NEW_TEMPLATE;
  refreshTitle();
  syncChrome();
  const detachKeybar = attachKeybar(editor);

  if (!currentId) {
    const end = NEW_TEMPLATE.indexOf('\n');
    editor.focus();
    editor.setSelectionRange(end, end);
  }

  return () => {
    disposed = true;
    dismissToast?.();
    autosave.flush();
    detachKeybar();
    listening.abort();
  };
}
