import * as store from '../store.js';
import * as setlists from '../setlists.js';
import { openSettings } from './settings.js';
import { icon } from '../icons.js';
import { GROUPS, groupSongs, groupSetlists } from '../group.js';
import { transposeKey } from '../sheet/transpose.js';
import { importText } from '../backup.js';
import { toast } from '../toast.js';

const MODE_KEY = 'tabs.mode';
const QUERY_KEY = 'tabs.q';
const ORDER_KEY = 'tabs.order';
const GROUP_KEY = 'tabs.group';
const EMPTY_HINT = 'Tap Edit, then +, or import a backup from Settings';
const NO_SETS_HINT = 'No setlists yet. Tap Edit to make one';

function create(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

function readValue(storage, key, fallback) {
  try {
    return storage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeValue(storage, key, value) {
  try {
    storage.setItem(key, value);
  } catch {
    return;
  }
}

function labeled(el, name, text) {
  el.replaceChildren(icon(name), text);
  return el;
}

function getMode() {
  return readValue(localStorage, MODE_KEY, 'live') === 'edit' ? 'edit' : 'live';
}

function getGroup() {
  const id = readValue(localStorage, GROUP_KEY, 'title');
  return GROUPS.some((g) => g.id === id) ? id : 'title';
}

function subtitleOf(rec, by) {
  return [by !== 'artist' && rec.artist, by !== 'album' && rec.album].filter(Boolean).join(' · ');
}

export function mount(el) {
  let mode = getMode();
  let groupBy = getGroup();

  const screen = create('div');
  const top = create('div', { class: 'list-top' });

  const header = create('header', { class: 'hdr' });
  const liveBtn = labeled(create('button', { class: 'btn', type: 'button' }), 'play', 'Live');
  const editBtn = labeled(create('button', { class: 'btn', type: 'button' }), 'pen-to-square', 'Edit');
  const modeToggle = create('div', { class: 'seg-toggle', role: 'group', 'aria-label': 'Mode' });
  modeToggle.append(liveBtn, editBtn);
  const gearBtn = create('button', { class: 'btn icon', type: 'button', 'aria-label': 'Settings', title: 'Settings' });
  gearBtn.append(icon('gear'));
  const newLink = create('a', { class: 'btn icon', href: '#/edit/new', 'aria-label': 'New song', title: 'New song' });
  newLink.append(icon('plus'));
  const pasteBtn = create('button', { class: 'btn icon', type: 'button', 'aria-label': 'Paste song', title: 'Paste song' });
  pasteBtn.append(icon('paste'));
  header.append(create('h1', { class: 'hdr-title brand' }, 'Lead Sheets'), modeToggle, pasteBtn, newLink, gearBtn);

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
  search.value = readValue(sessionStorage, QUERY_KEY, '');
  searchBox.append(icon('magnifying-glass'), search);

  const groupBox = create('label', { class: 'input-icon compact' });
  const groupSelect = create('select', { class: 'field', 'aria-label': 'Group by' });
  for (const g of GROUPS) groupSelect.append(create('option', { value: g.id }, `By ${g.label}`));
  groupSelect.value = groupBy;
  groupBox.append(icon('layer-group'), groupSelect, icon('chevron-down'));
  searchBar.append(searchBox, groupBox);


  const groupsEl = create('div', { class: 'groups' });
  const empty = create('p', { class: 'status', hidden: '' });

  top.append(header, searchBar);
  screen.append(top, groupsEl, empty);
  el.append(screen);

  function hrefFor(rec, set) {
    return set && mode === 'live' ? `#/set/${set.id}/${rec.id}` : `#/${mode}/${rec.id}`;
  }

  function rowFor(rec, ids, set) {
    const row = create('a', { class: 'row', href: hrefFor(rec, set) });
    const main = create('div', { class: 'row-main' });
    main.append(create('div', { class: 'row-title' }, rec.title || 'Untitled'));
    const sub = subtitleOf(rec, groupBy);
    if (sub) main.append(create('div', { class: 'row-sub' }, sub));
    row.append(main);
    const shift = set?.entries.find((e) => e.songId === rec.id)?.shift ?? 0;
    if (rec.key) row.append(create('span', { class: 'badge' }, transposeKey(rec.key, shift)));
    row.addEventListener('click', () => writeValue(sessionStorage, ORDER_KEY, JSON.stringify(ids)));
    return row;
  }

  function renderGroup(group) {
    const ids = group.songs.map((rec) => rec.id);
    const label = create('div', { class: group.empty ? 'section-label muted-group' : 'section-label' });
    label.append(create('span', { class: 'group-name' }, group.name), create('span', { class: 'group-count' }, String(ids.length)));
    if (group.set && mode === 'edit') {
      const pen = create('a', { class: 'group-edit', href: `#/setlist/${group.set.id}`, 'aria-label': `Edit ${group.name}`, title: 'Edit setlist' });
      pen.append(icon('pen-to-square'));
      label.append(pen);
    }
    const list = create('div', { class: 'list' });
    list.append(...group.songs.map((rec) => rowFor(rec, ids, group.set)));
    return [label, list];
  }

  function newSetRow() {
    const row = create('a', { class: 'row new-row', href: '#/setlist/new' });
    row.append(icon('plus'), create('span', { class: 'row-title' }, 'New setlist'));
    const list = create('div', { class: 'list' });
    list.append(row);
    return list;
  }

  function emptyText(bySet) {
    if (store.all().length === 0) return EMPTY_HINT;
    return bySet && !search.value.trim() ? NO_SETS_HINT : 'No matches';
  }

  function renderList() {
    const songs = store.search(search.value);
    const bySet = groupBy === 'setlist';
    const groups = bySet ? groupSetlists(songs, setlists.all(), !search.value.trim()) : groupSongs(songs, groupBy);
    const nodes = groups.flatMap(renderGroup);
    if (bySet && mode === 'edit') nodes.push(newSetRow());
    groupsEl.replaceChildren(...nodes);
    empty.hidden = bySet ? groups.length > 0 || mode === 'edit' : songs.length > 0;
    empty.textContent = emptyText(bySet);
  }

  function applyMode() {
    const live = mode === 'live';
    liveBtn.classList.toggle('active', live);
    editBtn.classList.toggle('active', !live);
    liveBtn.setAttribute('aria-pressed', String(live));
    editBtn.setAttribute('aria-pressed', String(!live));
    newLink.hidden = live;
    pasteBtn.hidden = live;
    renderList();
  }

  async function onPaste() {
    let text = '';
    try {
      text = (await navigator.clipboard.readText()).trim();
    } catch {
      text = '';
    }
    if (!text) {
      toast('Nothing to paste');
      return;
    }
    try {
      const { count, id } = await importText(text);
      if (id) {
        location.hash = `#/edit/${id}`;
        return;
      }
      toast(`Imported ${count}`);
      renderList();
    } catch (err) {
      toast(err.message);
    }
  }

  function setMode(next) {
    mode = next;
    writeValue(localStorage, MODE_KEY, next);
    applyMode();
  }

  search.addEventListener('input', () => {
    writeValue(sessionStorage, QUERY_KEY, search.value);
    renderList();
  });
  groupSelect.addEventListener('change', () => {
    groupBy = groupSelect.value;
    writeValue(localStorage, GROUP_KEY, groupBy);
    renderList();
  });
  liveBtn.addEventListener('click', () => setMode('live'));
  editBtn.addEventListener('click', () => setMode('edit'));
  pasteBtn.addEventListener('click', onPaste);
  gearBtn.addEventListener('click', () => openSettings({ onImport: renderList }));

  applyMode();

  return () => {};
}
