import * as store from '../data/store.js';
import * as setlists from '../data/setlists.js';
import { openSettings } from '../components/settings.js';
import { icon, iconId } from '../core/icons.js';
import { GROUPS, groupId, groupSongs, groupSetlists } from '../data/group.js';
import { transposeKey } from '../sheet/transpose.js';
import { importText } from '../data/backup.js';
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
} from '../data/prefs.js';
import { toast } from '../components/toast.js';
import { a, div, h1, header, label, option, p, select, span, iconButton, labeledButton, iconLink, cls } from '../core/dom.js';
import { evt } from '../core/events.js';
import { routes, NEW_ID } from '../routes.js';
import { searchBox, rowMain } from '../components/parts.js';
import { segToggle } from '../components/controls.js';
import { createLearnPanel } from '../components/learn.js';

const EMPTY_HINT = 'Tap Edit, then +, or import a backup from Settings';
const NO_SETS_HINT = 'No setlists yet. Tap Edit to make one';

function subtitleOf(rec, by) {
  return [by !== 'artist' && rec.artist, by !== 'album' && rec.album].filter(Boolean).join(' · ');
}

export function mount(el) {
  let mode = getListMode();
  let groupBy = getListGroup();

  const screen = div();
  const top = div('list-top');

  const headerEl = header('hdr');
  const modeBtns = {
    [modeId.live]: labeledButton(iconId.play, 'Live'),
    [modeId.edit]: labeledButton(iconId.penToSquare, 'Edit'),
    [modeId.learn]: labeledButton(null, 'Learn'),
  };
  const modeToggle = segToggle(...Object.values(modeBtns));
  modeToggle.setAttribute('role', 'group');
  modeToggle.setAttribute('aria-label', 'Mode');
  const gearBtn = iconButton(iconId.gear, 'Settings');
  const newLink = iconLink(iconId.plus, 'New song', routes.edit(NEW_ID));
  const pasteBtn = iconButton(iconId.paste, 'Paste song');
  headerEl.append(h1('hdr-title brand', 'Lead Sheets'), modeToggle, pasteBtn, newLink, gearBtn);

  const searchBar = div('toolbar');
  const { box: searchField, input: search } = searchBox();
  search.value = getListQuery();

  const groupBox = label('input-icon compact');
  const groupSelect = select({ class: 'field', 'aria-label': 'Group by' });
  for (const g of GROUPS) groupSelect.append(option({ value: g.id }, `By ${g.label}`));
  groupSelect.value = groupBy;
  groupBox.append(icon(iconId.layerGroup), groupSelect, icon(iconId.chevronDown));
  searchBar.append(searchField, groupBox);


  const groupsEl = div('groups');
  const empty = p({ class: 'status', hidden: '' });
  const learnEl = div();
  let learnPanel = null;

  top.append(headerEl, searchBar);
  screen.append(top, groupsEl, empty, learnEl);
  el.append(screen);

  function hrefFor(rec, set) {
    if (mode === modeId.edit) return routes.edit(rec.id);
    return set ? routes.set(set.id, rec.id) : routes.live(rec.id);
  }

  function rowFor(rec, ids, set) {
    const row = a({ class: 'row', href: hrefFor(rec, set) });
    row.append(rowMain(rec, subtitleOf(rec, groupBy)));
    const shift = set?.entries.find((e) => e.songId === rec.id)?.shift ?? 0;
    if (rec.key) row.append(span('badge', transposeKey(rec.key, shift)));
    row.addEventListener(evt.click, () => setSongOrder(ids));
    return row;
  }

  function renderGroup(group) {
    const ids = group.songs.map((rec) => rec.id);
    const labelEl = div(group.empty ? 'section-label muted-group' : 'section-label');
    labelEl.append(span('group-name', group.name), span('group-count', String(ids.length)));
    if (group.set && mode === modeId.edit) {
      const pen = a({ class: 'group-edit', href: routes.setlist(group.set.id), 'aria-label': `Edit ${group.name}`, title: 'Edit setlist' });
      pen.append(icon(iconId.penToSquare));
      labelEl.append(pen);
    }
    const list = div('list');
    list.append(...group.songs.map((rec) => rowFor(rec, ids, group.set)));
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
    if (mode === modeId.learn) return;
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
    for (const [id, btn] of Object.entries(modeBtns)) {
      btn.classList.toggle(cls.active, id === mode);
      btn.setAttribute('aria-pressed', String(id === mode));
    }
    const edit = mode === modeId.edit;
    const learn = mode === modeId.learn;
    newLink.hidden = !edit;
    pasteBtn.hidden = !edit || !hasFeature(featureId.share);
    searchBar.hidden = learn;
    groupsEl.hidden = learn;
    if (learn) {
      empty.hidden = true;
      learnPanel ??= createLearnPanel();
      learnEl.replaceChildren(learnPanel.el);
      return;
    }
    disposeLearn();
    renderList();
  }

  function disposeLearn() {
    learnPanel?.dispose();
    learnPanel = null;
    learnEl.replaceChildren();
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
  for (const [id, btn] of Object.entries(modeBtns)) btn.addEventListener(evt.click, () => setMode(id));
  pasteBtn.addEventListener(evt.click, onPaste);
  gearBtn.addEventListener(evt.click, () => openSettings({ onImport: renderList, onClose: applyMode }));

  applyMode();

  return disposeLearn;
}
