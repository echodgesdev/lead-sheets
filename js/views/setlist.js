import * as store from '../store.js';
import * as setlists from '../setlists.js';
import { capoFret, placeCapo, transposeKey, signed, MAX_SHIFT } from '../sheet/transpose.js';
import { icon } from '../components/icons.js';
import { div, h1, header, input, p, small, span, iconButton, labeledButton, cls } from '../dom.js';
import { evt } from '../events.js';
import { routes, NEW_ID } from '../routes.js';
import { createAutosave } from '../autosave.js';
import { strings } from '../strings.js';
import { searchBox, rowMain, mountNotFound } from '../components/parts.js';

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

  const screen = div('set-screen');
  const headerEl = header('hdr');
  const deleteBtn = iconButton('trash-can', 'Delete setlist', 'btn icon danger');
  const status = span('hdr-alert');
  const doneBtn = labeledButton('check', 'Done', 'btn primary');
  headerEl.append(deleteBtn, h1('hdr-title', 'Setlist'), status, doneBtn);

  const nameBar = div('toolbar');
  const nameInput = input({ class: 'field', type: 'text', placeholder: 'Setlist name', 'aria-label': 'Setlist name' });
  nameInput.value = existing?.name ?? '';
  nameBar.append(nameInput);

  const entriesLabel = div('section-label');
  const entriesEl = div('list set-entries');
  const emptyEntries = p('status', 'Add songs below');

  const addLabel = div('section-label');
  addLabel.append(span(null, 'Add songs'));
  const searchBar = div('toolbar');
  const { box: searchField, input: search } = searchBox();
  searchBar.append(searchField);
  const resultsEl = div('list set-results');

  screen.append(headerEl, nameBar, entriesLabel, entriesEl, emptyEntries, addLabel, searchBar, resultsEl);
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
    const toggle = div('seg-toggle');
    const down = iconButton('minus', 'Transpose down');
    const up = iconButton('plus', 'Transpose up');
    const placed = placeCapo(capoFret(song.capo), entry.shift);
    const label = span({ class: 'btn live-key', title: 'Capo' });
    label.append(small(null, 'Capo'), span(null, placed.shift ? `${placed.capo} ${signed(placed.shift)}` : String(placed.capo)));
    label.classList.toggle(cls.active, entry.shift !== 0);
    down.disabled = entry.shift <= -MAX_SHIFT;
    up.disabled = entry.shift >= MAX_SHIFT;
    down.addEventListener(evt.click, () => { entry.shift--; change(); });
    up.addEventListener(evt.click, () => { entry.shift++; change(); });
    toggle.append(down, label, up);
    return toggle;
  }

  function tempoField(entry, song) {
    const inputEl = input({
      class: 'field set-tempo',
      type: 'text',
      inputmode: 'numeric',
      placeholder: 'Tempo',
      'aria-label': 'Tempo',
    });
    inputEl.value = entry.tempo || song.tempo || '';
    inputEl.addEventListener(evt.input, () => {
      const value = inputEl.value.trim();
      entry.tempo = value === (song.tempo ?? '') ? '' : value;
      autosave.schedule();
    });
    return inputEl;
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
    const row = div('row set-row');
    row.dataset.songId = entry.songId;
    const grip = iconButton('grip-vertical', 'Drag to reorder', 'btn icon set-grip');
    grip.addEventListener(evt.pointerdown, (e) => startDrag(e, row));
    const main = rowMain(song, song.artist);
    const remove = iconButton('xmark', 'Remove from setlist', 'btn icon set-remove');
    remove.addEventListener(evt.click, () => {
      entries = entries.filter((e) => e !== entry);
      change();
    });
    const controls = div('set-controls');
    controls.append(capoControl(entry, song));
    if (song.key) controls.append(span('badge', `Key ${transposeKey(song.key, entry.shift)}`));
    controls.append(tempoField(entry, song));
    row.append(grip, main, remove, controls);
    return row;
  }

  function renderEntries() {
    const shown = entries.filter((e) => store.get(e.songId));
    entriesLabel.replaceChildren(span(null, 'Songs'), span('group-count', String(shown.length)));
    entriesEl.replaceChildren(...shown.map(entryRow));
    emptyEntries.hidden = shown.length > 0;
  }

  function resultRow(rec) {
    const row = labeledButton('plus', rowMain(rec, rec.artist), 'row set-add');
    if (rec.key) row.append(span('badge', rec.key));
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
