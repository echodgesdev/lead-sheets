import * as store from '../store.js';
import * as setlists from '../setlists.js';
import { capoFret, placeCapo, transposeKey } from '../sheet/transpose.js';
import { icon } from '../icons.js';

const SAVE_DELAY_MS = 500;
const MAX_SHIFT = 11;
const DRAG_EDGE = 60;
const DRAG_EDGE_TOP = 120;
const DRAG_SCROLL = 12;

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

function signed(n) {
  return n > 0 ? `+${n}` : String(n);
}

function middle(node) {
  const box = node.getBoundingClientRect();
  return box.top + box.height / 2;
}

function mountMissing(el) {
  const wrap = create('div', { class: 'status' });
  const back = create('a', { class: 'btn', href: '#/' }, 'Back to songs');
  wrap.append(create('p', {}, 'Setlist not found.'), back);
  el.append(wrap);
  return () => {};
}

export function mount(el, { id }) {
  const existing = id === 'new' ? null : setlists.get(id);
  if (id !== 'new' && !existing) return mountMissing(el);

  let currentId = existing?.id ?? null;
  let entries = (existing?.entries ?? []).map((e) => ({ ...e }));
  let timer = null;
  let dirty = false;
  let disposed = false;
  let queue = Promise.resolve();

  const screen = create('div', { class: 'set-screen' });
  const header = create('header', { class: 'hdr' });
  const deleteBtn = iconButton('trash-can', 'Delete setlist', 'btn icon danger');
  const status = create('span', { class: 'hdr-alert' });
  const doneBtn = create('button', { class: 'btn primary', type: 'button' });
  doneBtn.append(icon('check'), 'Done');
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
  const searchBox = create('label', { class: 'input-icon' });
  const search = create('input', {
    class: 'field',
    type: 'search',
    placeholder: 'Search songs',
    autocapitalize: 'off',
    autocorrect: 'off',
    spellcheck: 'false',
  });
  searchBox.append(icon('magnifying-glass'), search);
  searchBar.append(searchBox);
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
      if (!disposed) history.replaceState(null, '', `#/setlist/${set.id}`);
    }
    status.textContent = '';
  }

  function flush() {
    clearTimeout(timer);
    timer = null;
    if (dirty) {
      dirty = false;
      const name = nameInput.value;
      const list = entries.map((e) => ({ ...e }));
      queue = queue.then(() => persist(name, list)).catch(() => { status.textContent = 'Not saved'; });
    }
    return queue;
  }

  function scheduleSave() {
    dirty = true;
    clearTimeout(timer);
    timer = setTimeout(flush, SAVE_DELAY_MS);
  }

  function change() {
    scheduleSave();
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
    label.classList.toggle('active', entry.shift !== 0);
    down.disabled = entry.shift <= -MAX_SHIFT;
    up.disabled = entry.shift >= MAX_SHIFT;
    down.addEventListener('click', () => { entry.shift--; change(); });
    up.addEventListener('click', () => { entry.shift++; change(); });
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
    input.addEventListener('input', () => {
      const value = input.value.trim();
      entry.tempo = value === (song.tempo ?? '') ? '' : value;
      scheduleSave();
    });
    return input;
  }

  function startDrag(event, row) {
    event.preventDefault();
    const grip = event.currentTarget;
    grip.setPointerCapture(event.pointerId);
    row.classList.add('dragging');

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
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', end);
      grip.removeEventListener('pointercancel', end);
      grip.removeEventListener('lostpointercapture', end);
      row.classList.remove('dragging');
      const order = [...entriesEl.children].map((r) => r.dataset.songId);
      entries = order.map((songId) => entries.find((e) => e.songId === songId));
      change();
    }

    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
    grip.addEventListener('lostpointercapture', end);
  }

  function entryRow(entry) {
    const song = store.get(entry.songId);
    const row = create('div', { class: 'row set-row' });
    row.dataset.songId = entry.songId;
    const grip = iconButton('grip-vertical', 'Drag to reorder', 'btn icon set-grip');
    grip.addEventListener('pointerdown', (e) => startDrag(e, row));
    const main = create('div', { class: 'row-main' });
    main.append(create('div', { class: 'row-title' }, song.title || 'Untitled'));
    if (song.artist) main.append(create('div', { class: 'row-sub' }, song.artist));
    const remove = iconButton('xmark', 'Remove from setlist', 'btn icon set-remove');
    remove.addEventListener('click', () => {
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
    const main = create('div', { class: 'row-main' });
    main.append(create('div', { class: 'row-title' }, rec.title || 'Untitled'));
    if (rec.artist) main.append(create('div', { class: 'row-sub' }, rec.artist));
    row.append(icon('plus'), main);
    if (rec.key) row.append(create('span', { class: 'badge' }, rec.key));
    row.addEventListener('click', () => {
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
    await flush();
    location.hash = '#/';
  }

  async function onDelete() {
    if (!currentId || !confirm('Delete this setlist? The songs stay in your library.')) return;
    clearTimeout(timer);
    dirty = false;
    await queue;
    await setlists.remove(currentId);
    location.hash = '#/';
  }

  function onVisibility() {
    if (document.hidden) flush();
  }

  nameInput.addEventListener('input', scheduleSave);
  search.addEventListener('input', renderResults);
  doneBtn.addEventListener('click', onDone);
  deleteBtn.addEventListener('click', onDelete);
  document.addEventListener('visibilitychange', onVisibility);

  syncChrome();
  renderEntries();
  renderResults();
  if (!currentId) nameInput.focus();

  return () => {
    disposed = true;
    flush();
    nameInput.removeEventListener('input', scheduleSave);
    search.removeEventListener('input', renderResults);
    doneBtn.removeEventListener('click', onDone);
    deleteBtn.removeEventListener('click', onDelete);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
