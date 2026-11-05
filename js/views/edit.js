import * as store from '../store.js';
import { infer } from '../sheet/infer.js';
import { attachKeybar } from '../edit/keybar.js';
import { icon } from '../icons.js';
import { toast } from '../toast.js';

const NEW_TEMPLATE = 'New Song\nArtist: \nAlbum: \nGenre: \nKey: \nCapo: \nTuning: \nMeta: \nSetlist: \nNotes: \n\nVerse 1:\n\nChorus:\n';
const SAVE_DELAY_MS = 800;

function create(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

function iconButton(name, label, className = 'btn icon') {
  const b = create('button', { class: className, type: 'button', 'aria-label': label, title: label });
  b.append(icon(name));
  return b;
}

function titleOf(text) {
  const line = text.split('\n').map((l) => l.trim()).find(Boolean) ?? '';
  return line.replace(/^#\s*/, '') || 'Untitled';
}

export function mount(el, { id }) {
  let currentId = id === 'new' ? null : id;
  let dirty = false;
  let disposed = false;
  let timer = null;
  let queue = Promise.resolve();
  let dismissToast = null;

  const screen = create('div', { class: 'screen' });
  const header = create('header', { class: 'hdr' });
  const doneBtn = create('button', { class: 'btn primary', type: 'button' });
  doneBtn.append(icon('check'), 'Done');
  const title = create('h1', { class: 'hdr-title' });
  const status = create('span', { class: 'hdr-alert' });
  const inferBtn = iconButton('wand-magic-sparkles', 'Infer format');
  const deleteBtn = iconButton('trash-can', 'Delete', 'btn icon danger');
  const editor = create('textarea', {
    class: 'editor',
    autocapitalize: 'off',
    autocomplete: 'off',
    autocorrect: 'off',
    spellcheck: 'false',
    wrap: 'off',
  });
  header.append(deleteBtn, title, status, inferBtn, doneBtn);
  screen.append(header, editor);
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
    if (!disposed) history.replaceState(null, '', `#/edit/${newId}`);
  }

  async function persist(text) {
    if (!currentId && text === NEW_TEMPLATE) return;
    const rec = await store.save(currentId, text);
    if (!currentId) adopt(rec.id);
    setStatus('');
  }

  function flush() {
    clearTimeout(timer);
    timer = null;
    if (dirty) {
      dirty = false;
      const text = editor.value;
      queue = queue.then(() => persist(text)).catch(() => setStatus('Not saved'));
    }
    return queue;
  }

  function scheduleSave() {
    dirty = true;
    clearTimeout(timer);
    timer = setTimeout(flush, SAVE_DELAY_MS);
  }

  function onInput() {
    refreshTitle();
    scheduleSave();
  }

  function replaceText(text) {
    editor.setRangeText(text, 0, editor.value.length);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
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

  async function onDone() {
    await flush();
    location.hash = currentId ? `#/preview/${currentId}` : '#/';
  }

  async function onDelete() {
    if (!currentId || !confirm('Delete this song?')) return;
    clearTimeout(timer);
    dirty = false;
    await queue;
    await store.remove(currentId);
    location.hash = '#/';
  }

  function onVisibility() {
    if (document.hidden) flush();
  }

  function onKeydown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      flush();
    }
  }

  editor.addEventListener('input', onInput);
  doneBtn.addEventListener('click', onDone);
  inferBtn.addEventListener('click', onInfer);
  deleteBtn.addEventListener('click', onDelete);
  document.addEventListener('visibilitychange', onVisibility);
  document.addEventListener('keydown', onKeydown);

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
    flush();
    detachKeybar();
    document.removeEventListener('visibilitychange', onVisibility);
    document.removeEventListener('keydown', onKeydown);
  };
}
