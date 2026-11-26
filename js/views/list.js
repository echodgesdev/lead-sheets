import * as store from '../data/store.js';
import * as setlists from '../data/setlists.js';
import { openSettings } from '../components/settings.js';
import { openSongActions } from '../components/menu.js';
import { icon, iconId } from '../core/icons.js';
import { GROUPS, groupId, groupSongs, groupSetlists } from '../data/group.js';
import { transposeKey } from '../sheet/transpose.js';
import {
  getListMode,
  setListMode,
  getListGroup,
  setListGroup,
  getListQuery,
  setListQuery,
  setSongOrder,
  listOptionId,
  hasListOption,
  getToolUtilities,
} from '../data/prefs.js';
import { a, div, h1, header, p, span, iconButton, iconLink, classes, cls } from '../core/dom.js';
import { evt } from '../core/events.js';
import { routes, listMode, NEW_ID } from '../routes.js';
import { searchBox, rowMain } from '../components/parts.js';
import { selectPill } from '../components/controls.js';
import { choiceToggle } from '../components/rows.js';
import { createToolsPanel, createUtilities } from '../components/tools.js';

const EMPTY_HINT = 'Tap Edit, then +, or import a backup from Settings';
const NO_SETS_HINT = 'No setlists yet. Tap Edit to make one';
const APP_NAME = 'Lead Sheets';
const INTRO_MS = 1200;

const MODES = [
  { id: listMode.live, icon: iconId.play, label: 'Live', title: 'Live' },
  { id: listMode.edit, icon: iconId.penToSquare, label: 'Edit', title: 'Edit' },
  { id: listMode.tools, icon: iconId.wrench, label: 'Tools', title: 'Tools' },
];

let introPlayed = false;

function subtitleOf(rec, by) {
  return [by !== 'artist' && rec.artist, by !== 'album' && rec.album].filter(Boolean).join(' · ');
}

export function mount(el, { mode: routed, query = {} } = {}) {
  const intro = !introPlayed;
  introPlayed = true;
  let mode = routed ?? (intro ? listMode.live : getListMode());
  let toolsState = query;
  let groupBy = getListGroup();

  const screen = div();
  const top = div('list-top');

  const headerEl = header(classes('hdr list-hdr', intro && cls.intro));
  const brand = h1('brand');
  brand.append(
    span({ class: 'brand-logo', role: 'img', 'aria-label': APP_NAME }),
    span({ class: 'brand-name', 'aria-hidden': 'true' }, APP_NAME),
  );
  const modeToggle = choiceToggle(MODES, mode, (id) => {
    if (id === mode) return;
    setMode(id);
  });
  modeToggle.setAttribute('role', 'group');
  modeToggle.setAttribute('aria-label', 'Mode');
  const menuBtn = iconButton(iconId.ellipsisVertical, 'Settings');
  const newLink = iconLink(iconId.plus, 'New song', routes.edit(NEW_ID));
  const actions = div('hdr-actions');
  actions.append(newLink, menuBtn);
  headerEl.append(brand, modeToggle, actions);
  const introTimer = intro ? setTimeout(() => headerEl.classList.remove(cls.intro), INTRO_MS) : 0;

  const searchBar = div('toolbar');
  const groupOptions = GROUPS.map((g) => ({ id: g.id, label: `By ${g.label}` }));
  const { pill: groupPill, select: groupSelect } = selectPill(iconId.layerGroup, 'Group by', groupOptions, groupBy);
  const { box: searchField, input: search } = searchBox(groupPill);
  search.value = getListQuery();
  searchBar.append(searchField);


  const groupsEl = div('groups');
  const empty = p({ class: 'status', hidden: '' });
  const toolsEl = div();
  let toolsPanel = null;
  let utilities = null;

  top.append(headerEl, searchBar);
  screen.append(top, groupsEl, empty, toolsEl);
  el.append(screen);

  function hrefFor(rec, set) {
    if (mode === listMode.edit) return routes.edit(rec.id);
    return set ? routes.set(set.id, rec.id) : routes.live(rec.id);
  }

  function rowFor(rec, ids, set, menus) {
    const row = a({ class: 'row', href: hrefFor(rec, set), 'data-id': rec.id });
    row.append(rowMain(rec, subtitleOf(rec, groupBy)));
    const shift = set?.entries.find((e) => e.songId === rec.id)?.shift ?? 0;
    if (rec.key) row.append(span('badge', transposeKey(rec.key, shift)));
    row.addEventListener(evt.click, () => setSongOrder(ids));
    if (!menus) return row;
    const item = div('row-item');
    const more = iconButton(iconId.ellipsisVertical, 'Song menu', 'row-menu');
    more.addEventListener(evt.click, () => openActions(rec));
    item.append(row, more);
    return item;
  }

  function openActions(rec) {
    openSongActions(rec, {
      onEdit: () => {
        location.hash = routes.edit(rec.id);
      },
      onDelete: async () => {
        await store.remove(rec.id);
        renderList();
      },
    });
  }

  function renderGroup(group, menus) {
    const ids = group.songs.map((rec) => rec.id);
    const labelEl = div(group.empty ? 'section-label muted-group' : 'section-label');
    labelEl.append(span('group-name', group.name), span('group-count', String(ids.length)));
    if (group.set && mode === listMode.edit) {
      const pen = a({ class: 'group-edit', href: routes.setlist(group.set.id), 'aria-label': `Edit ${group.name}`, title: 'Edit setlist' });
      pen.append(icon(iconId.penToSquare));
      labelEl.append(pen);
    }
    const list = div('list');
    list.append(...group.songs.map((rec) => rowFor(rec, ids, group.set, menus)));
    return [labelEl, list];
  }

  function newSetRow() {
    const row = a({ class: 'row new-row', href: routes.setlist(NEW_ID) });
    row.append(icon(iconId.plus), span('row-title', 'New setlist'));
    const list = div('list');
    list.append(row);
    return list;
  }

  function emptyText(bySet) {
    if (store.all().length === 0) return EMPTY_HINT;
    return bySet && !search.value.trim() ? NO_SETS_HINT : 'No matches';
  }

  function renderList() {
    if (mode === listMode.tools) return;
    const songs = store.search(search.value);
    const bySet = groupBy === groupId.setlist;
    const groups = bySet ? groupSetlists(songs, setlists.all(), !search.value.trim()) : groupSongs(songs, groupBy);
    const menus = hasListOption(listOptionId.rowMenus);
    const nodes = groups.flatMap((group) => renderGroup(group, menus));
    if (bySet && mode === listMode.edit) nodes.push(newSetRow());
    groupsEl.replaceChildren(...nodes);
    empty.hidden = bySet ? groups.length > 0 || mode === listMode.edit : songs.length > 0;
    empty.textContent = emptyText(bySet);
  }

  function applyMode() {
    const edit = mode === listMode.edit;
    const tools = mode === listMode.tools;
    newLink.hidden = !edit;
    searchBar.hidden = tools;
    groupsEl.hidden = tools;
    if (tools) {
      empty.hidden = true;
      toolsPanel ??= createToolsPanel({ initial: toolsState, onChange: onToolsChange });
      toolsEl.replaceChildren(toolsPanel.el);
      if (!utilities) {
        utilities = createUtilities();
        menuBtn.before(...utilities.buttons);
      }
      utilities.show(getToolUtilities());
      return;
    }
    disposeTools();
    renderList();
  }

  function disposeTools() {
    toolsPanel?.dispose();
    toolsPanel = null;
    toolsEl.replaceChildren();
    if (!utilities) return;
    utilities.dispose();
    for (const b of utilities.buttons) b.remove();
    utilities = null;
  }

  function rememberMode() {
    setListMode(mode);
    history.replaceState(history.state, '', routes.list(mode, mode === listMode.tools ? toolsState : null));
  }

  function onToolsChange(state) {
    toolsState = state;
    rememberMode();
  }

  function setMode(next) {
    mode = next;
    rememberMode();
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
  groupsEl.addEventListener(evt.contextmenu, (e) => {
    const rec = store.get(e.target.closest('.row[data-id]')?.dataset.id);
    if (!rec) return;
    e.preventDefault();
    openActions(rec);
  });
  menuBtn.addEventListener(evt.click, () => openSettings({ onImport: renderList, onClose: applyMode }));

  rememberMode();
  applyMode();

  return () => {
    clearTimeout(introTimer);
    disposeTools();
  };
}
