import * as store from '../store.js';
import * as setlists from '../setlists.js';
import { capoFret, placeCapo, transposeKey, signed, MAX_SHIFT } from '../sheet/transpose.js';
import { icon } from '../icons.js';
import { create, iconButton, labeledButton, cls } from '../dom.js';
import { evt } from '../events.js';
import { routes, NEW_ID } from '../routes.js';
import { createAutosave } from '../autosave.js';
import { strings } from '../strings.js';
import { searchBox, rowMain, mountNotFound } from './parts.js';

const SAVE_DELAY_MS = 500;
const DRAG_EDGE = 60;
const DRAG_EDGE_TOP = 120;
const DRAG_SCROLL = 12;

function middle(node) {
  const box = node.getBoundingClientRect();
  return box.top + box.height / 2;
}

export function mount(el, { id }) {
  const existing = id === NEW_ID ? null : setlists.get(id);
  if (id !== NEW_ID && !existing) return mountNotFound(el, strings.setlistNotFound);

  let currentId = existing?.id ?? null;
  let entries = (existing?.entries ?? []).map((e) => ({ ...e }));
  let disposed = false;
  const listening = new AbortController();

  const screen = create('div', { class: 'set-screen' });
  const header = create('header', { class: 'hdr' });
  const deleteBtn = iconButton('trash-can', 'Delete setlist', 'btn icon danger');
  const status = create('span', { class: 'hdr-alert' });
  const doneBtn = labeledButton('check', 'Done', 'btn primary');
  header.append(deleteBtn, create('h1', { class: 'hdr-title' }, 'Setlist'), status, doneBtn);

  const nameBar = create('div', { class: 'toolbar' });
  const nameInput = create('input', { class: 'field', type: 'text', placeholder: 'Setlist name', 'aria-label': 'Setlist name' });
  nameInput.value = existing?.name ?? '';
  nameBar.append(nameInput);

  const entriesLabel = create('div', { class: 'section-label' });
  const entriesEl = create('div', { class: 'list set-entries' });
  const emptyEntries = create('p', { class: 'status' }, 'Add songs below');

  const addLabel = create('div', { class: 'section-label' });
  addLabel.append(create('span', {}, 'Add songs'));
  const searchBar = create('div', { class: 'toolbar' });
  const { box: searchField, input: search } = searchBox();
  searchBar.append(searchField);
  const resultsEl = create('div', { class: 'list set-results' });

  screen.append(header, nameBar, entriesLabel, entriesEl, emptyEntries, addLabel, searchBar, resultsEl);
  el.append(screen);

  function syncChrome() {
    deleteBtn.hidden = !currentId;
  }

  async function persist(name, list) {
    if (!currentId && !name.trim() && !list.length) return;
    const set = await setlists.save(currentId, { name: name.trim(), entries: list });
    if (!currentId) {
      currentId = set.id;
      syncChrome();
      if (!disposed) history.replaceState(null, '', routes.setlist(set.id));
    }
    status.textContent = '';
  }

  const autosave = createAutosave({
    snapshot: () => ({ name: nameInput.value, list: entries.map((e) => ({ ...e })) }),
    persist: ({ name, list }) => persist(name, list),
    delayMs: SAVE_DELAY_MS,
    onError: () => { status.textContent = strings.notSaved; },
    signal: listening.signal,
  });

  function change() {
    autosave.schedule();
    renderEntries();
    renderResults();
  }

  function capoControl(entry, song) {
    const toggle = create('div', { class: 'seg-toggle' });
    const down = iconButton('minus', 'Transpose down');
    const up = iconButton('plus', 'Transpose up');
    const placed = placeCapo(capoFret(song.capo), entry.shift);
    const label = create('span', { class: 'btn live-key', title: 'Capo' });
    label.append(create('small', {}, 'Capo'), create('span', {}, placed.shift ? `${placed.capo} ${signed(placed.shift)}` : String(placed.capo)));
    label.classList.toggle(cls.active, entry.shift !== 0);
    down.disabled = entry.shift <= -MAX_SHIFT;
    up.disabled = entry.shift >= MAX_SHIFT;
    down.addEventListener(evt.click, () => { entry.shift--; change(); });
    up.addEventListener(evt.click, () => { entry.shift++; change(); });
    toggle.append(down, label, up);
    return toggle;
  }

  function tempoField(entry, song) {
    const input = create('input', {
      class: 'field set-tempo',
      type: 'text',
      inputmode: 'numeric',
      placeholder: 'Tempo',
      'aria-label': 'Tempo',
    });
    input.value = entry.tempo || song.tempo || '';
    input.addEventListener(evt.input, () => {
      const value = input.value.trim();
      entry.tempo = value === (song.tempo ?? '') ? '' : value;
      autosave.schedule();
    });
    return input;
  }

  function startDrag(event, row) {
    event.preventDefault();
    const grip = event.currentTarget;
    grip.setPointerCapture(event.pointerId);
    row.classList.add(cls.dragging);

    function move(e) {
      for (;;) {
        const prev = row.previousElementSibling;
        const next = row.nextElementSibling;
        if (prev && e.clientY < middle(prev)) entriesEl.insertBefore(prev, next);
        else if (next && e.clientY > middle(next)) entriesEl.insertBefore(next, row);
        else break;
      }
      if (e.clientY < DRAG_EDGE_TOP) window.scrollBy(0, -DRAG_SCROLL);
      else if (e.clientY > window.innerHeight - DRAG_EDGE) window.scrollBy(0, DRAG_SCROLL);
    }

    function end() {
      grip.removeEventListener(evt.pointermove, move);
      grip.removeEventListener(evt.pointerup, end);
      grip.removeEventListener(evt.pointercancel, end);
      grip.removeEventListener(evt.lostpointercapture, end);
      row.classList.remove(cls.dragging);
      const order = [...entriesEl.children].map((r) => r.dataset.songId);
      entries = order.map((songId) => entries.find((e) => e.songId === songId));
      change();
    }

    grip.addEventListener(evt.pointermove, move);
    grip.addEventListener(evt.pointerup, end);
    grip.addEventListener(evt.pointercancel, end);
    grip.addEventListener(evt.lostpointercapture, end);
  }

  function entryRow(entry) {
    const song = store.get(entry.songId);
    const row = create('div', { class: 'row set-row' });
    row.dataset.songId = entry.songId;
    const grip = iconButton('grip-vertical', 'Drag to reorder', 'btn icon set-grip');
    grip.addEventListener(evt.pointerdown, (e) => startDrag(e, row));
    const main = rowMain(song, song.artist);
    const remove = iconButton('xmark', 'Remove from setlist', 'btn icon set-remove');
    remove.addEventListener(evt.click, () => {
      entries = entries.filter((e) => e !== entry);
      change();
    });
    const controls = create('div', { class: 'set-controls' });
    controls.append(capoControl(entry, song));
    if (song.key) controls.append(create('span', { class: 'badge' }, `Key ${transposeKey(song.key, entry.shift)}`));
    controls.append(tempoField(entry, song));
    row.append(grip, main, remove, controls);
    return row;
  }

  function renderEntries() {
    const shown = entries.filter((e) => store.get(e.songId));
    entriesLabel.replaceChildren(create('span', {}, 'Songs'), create('span', { class: 'group-count' }, String(shown.length)));
    entriesEl.replaceChildren(...shown.map(entryRow));
    emptyEntries.hidden = shown.length > 0;
  }

  function resultRow(rec) {
    const row = create('button', { class: 'row set-add', type: 'button' });
    const main = rowMain(rec, rec.artist);
    row.append(icon('plus'), main);
    if (rec.key) row.append(create('span', { class: 'badge' }, rec.key));
    row.addEventListener(evt.click, () => {
      entries.push({ songId: rec.id, shift: 0, tempo: '' });
      change();
    });
    return row;
  }

  function renderResults() {
    const used = new Set(entries.map((e) => e.songId));
    resultsEl.replaceChildren(...store.search(search.value).filter((rec) => !used.has(rec.id)).map(resultRow));
  }

  async function onDone() {
    await autosave.flush();
    location.hash = routes.home;
  }

  async function onDelete() {
    if (!currentId || !confirm('Delete this setlist? The songs stay in your library.')) return;
    await autosave.cancel();
    await setlists.remove(currentId);
    location.hash = routes.home;
  }

  nameInput.addEventListener(evt.input, autosave.schedule);
  search.addEventListener(evt.input, renderResults);
  doneBtn.addEventListener(evt.click, onDone);
  deleteBtn.addEventListener(evt.click, onDelete);

  syncChrome();
  renderEntries();
  renderResults();
  if (!currentId) nameInput.focus();

  return () => {
    disposed = true;
    autosave.flush();
    listening.abort();
  };
}
