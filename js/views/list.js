import * as store from '../store.js';
import * as setlists from '../setlists.js';
import { openSettings } from './settings.js';
import { icon } from '../icons.js';
import { GROUPS, groupId, groupSongs, groupSetlists } from '../group.js';
import { transposeKey } from '../sheet/transpose.js';
import { importText } from '../backup.js';
import {
  modeId,
  featureId,
  hasFeature,
  getListMode,
  setListMode,
  getListGroup,
  setListGroup,
  getListQuery,
  setListQuery,
  setSongOrder,
} from '../prefs.js';
import { toast } from '../toast.js';
import { create, iconButton, labeledButton, cls } from '../dom.js';
import { evt } from '../events.js';
import { routes, NEW_ID } from '../routes.js';
import { searchBox, rowMain } from './parts.js';

const EMPTY_HINT = 'Tap Edit, then +, or import a backup from Settings';
const NO_SETS_HINT = 'No setlists yet. Tap Edit to make one';

function subtitleOf(rec, by) {
  return [by !== 'artist' && rec.artist, by !== 'album' && rec.album].filter(Boolean).join(' · ');
}

export function mount(el) {
  let mode = getListMode();
  let groupBy = getListGroup();

  const screen = create('div');
  const top = create('div', { class: 'list-top' });

  const header = create('header', { class: 'hdr' });
  const liveBtn = labeledButton('play', 'Live');
  const editBtn = labeledButton('pen-to-square', 'Edit');
  const modeToggle = create('div', { class: 'seg-toggle', role: 'group', 'aria-label': 'Mode' });
  modeToggle.append(liveBtn, editBtn);
  const gearBtn = iconButton('gear', 'Settings');
  const newLink = create('a', { class: 'btn icon', href: routes.edit(NEW_ID), 'aria-label': 'New song', title: 'New song' });
  newLink.append(icon('plus'));
  const pasteBtn = iconButton('paste', 'Paste song');
  header.append(create('h1', { class: 'hdr-title brand' }, 'Lead Sheets'), modeToggle, pasteBtn, newLink, gearBtn);

  const searchBar = create('div', { class: 'toolbar' });
  const { box: searchField, input: search } = searchBox();
  search.value = getListQuery();

  const groupBox = create('label', { class: 'input-icon compact' });
  const groupSelect = create('select', { class: 'field', 'aria-label': 'Group by' });
  for (const g of GROUPS) groupSelect.append(create('option', { value: g.id }, `By ${g.label}`));
  groupSelect.value = groupBy;
  groupBox.append(icon('layer-group'), groupSelect, icon('chevron-down'));
  searchBar.append(searchField, groupBox);


  const groupsEl = create('div', { class: 'groups' });
  const empty = create('p', { class: 'status', hidden: '' });

  top.append(header, searchBar);
  screen.append(top, groupsEl, empty);
  el.append(screen);

  function hrefFor(rec, set) {
    if (mode === modeId.edit) return routes.edit(rec.id);
    return set ? routes.set(set.id, rec.id) : routes.live(rec.id);
  }

  function rowFor(rec, ids, set) {
    const row = create('a', { class: 'row', href: hrefFor(rec, set) });
    row.append(rowMain(rec, subtitleOf(rec, groupBy)));
    const shift = set?.entries.find((e) => e.songId === rec.id)?.shift ?? 0;
    if (rec.key) row.append(create('span', { class: 'badge' }, transposeKey(rec.key, shift)));
    row.addEventListener(evt.click, () => setSongOrder(ids));
    return row;
  }

  function renderGroup(group) {
    const ids = group.songs.map((rec) => rec.id);
    const label = create('div', { class: group.empty ? 'section-label muted-group' : 'section-label' });
    label.append(create('span', { class: 'group-name' }, group.name), create('span', { class: 'group-count' }, String(ids.length)));
    if (group.set && mode === modeId.edit) {
      const pen = create('a', { class: 'group-edit', href: routes.setlist(group.set.id), 'aria-label': `Edit ${group.name}`, title: 'Edit setlist' });
      pen.append(icon('pen-to-square'));
      label.append(pen);
    }
    const list = create('div', { class: 'list' });
    list.append(...group.songs.map((rec) => rowFor(rec, ids, group.set)));
    return [label, list];
  }

  function newSetRow() {
    const row = create('a', { class: 'row new-row', href: routes.setlist(NEW_ID) });
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
    const bySet = groupBy === groupId.setlist;
    const groups = bySet ? groupSetlists(songs, setlists.all(), !search.value.trim()) : groupSongs(songs, groupBy);
    const nodes = groups.flatMap(renderGroup);
    if (bySet && mode === modeId.edit) nodes.push(newSetRow());
    groupsEl.replaceChildren(...nodes);
    empty.hidden = bySet ? groups.length > 0 || mode === modeId.edit : songs.length > 0;
    empty.textContent = emptyText(bySet);
  }

  function applyMode() {
    const live = mode === modeId.live;
    liveBtn.classList.toggle(cls.active, live);
    editBtn.classList.toggle(cls.active, !live);
    liveBtn.setAttribute('aria-pressed', String(live));
    editBtn.setAttribute('aria-pressed', String(!live));
    newLink.hidden = live;
    pasteBtn.hidden = live || !hasFeature(featureId.share);
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
        location.hash = routes.edit(id);
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
    setListMode(next);
    applyMode();
  }

  search.addEventListener(evt.input, () => {
    setListQuery(search.value);
    renderList();
  });
  groupSelect.addEventListener(evt.change, () => {
    groupBy = groupSelect.value;
    setListGroup(groupBy);
    renderList();
  });
  liveBtn.addEventListener(evt.click, () => setMode(modeId.live));
  editBtn.addEventListener(evt.click, () => setMode(modeId.edit));
  pasteBtn.addEventListener(evt.click, onPaste);
  gearBtn.addEventListener(evt.click, () => openSettings({ onImport: renderList, onClose: applyMode }));

  applyMode();

  return () => {};
}
