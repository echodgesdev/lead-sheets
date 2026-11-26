import * as store from '../data/store.js';
import { allRecordings, songRecordings, groupRecordings } from '../data/recordings.js';
import { openModal } from './modal.js';
import { modalRow } from './rows.js';
import { rowMain, songTitle } from './parts.js';
import { createTake } from './take.js';
import { toast } from './toast.js';
import { div, span, plainButton } from '../core/dom.js';
import { icon, iconId } from '../core/icons.js';
import { evt } from '../core/events.js';
import { clockTime } from '../core/time.js';

const DATE_FORMAT = { dateStyle: 'medium', timeStyle: 'short' };
const EMPTY = 'No recordings yet';

function titleOf(songId) {
  const rec = store.get(songId);
  return rec ? songTitle(rec) : null;
}

function subtitle(rec) {
  return `${new Date(rec.createdAt).toLocaleString(undefined, DATE_FORMAT)} · ${clockTime(rec.duration)}`;
}

export function openRecordings(song) {
  const list = div('rec-list');
  const modal = openModal(song ? `${song.title} recordings` : 'All recordings', list);
  let recs = [];
  let expanded = null;

  function collapse() {
    expanded?.take.dispose();
    expanded = null;
  }

  function replace(next) {
    recs = recs.map((rec) => (rec.id === next.id ? next : rec));
    render();
  }

  function remove(id) {
    if (expanded?.id === id) expanded = null;
    recs = recs.filter((rec) => rec.id !== id);
    render();
  }

  function toggle(rec) {
    const wasOpen = expanded?.id === rec.id;
    collapse();
    if (!wasOpen) expanded = { id: rec.id, take: createTake(rec, { onChange: replace, onDelete: () => remove(rec.id) }) };
    render();
  }

  function rowFor(rec) {
    const open = expanded?.id === rec.id;
    const head = plainButton(rowMain({ title: rec.name }, subtitle(rec)), 'rec-row');
    head.append(icon(iconId.chevronDown));
    head.setAttribute('aria-expanded', String(open));
    head.addEventListener(evt.click, () => toggle(rec));
    const item = div('rec-item');
    item.append(head, ...(open ? [expanded.take.el] : []));
    return item;
  }

  function render() {
    if (!recs.length) {
      list.replaceChildren(modalRow(null, span('row-sub', EMPTY)));
      return;
    }
    if (song) {
      list.replaceChildren(...recs.map(rowFor));
      return;
    }
    list.replaceChildren(...groupRecordings(recs, titleOf).flatMap((group) => [modalRow(group.name), ...group.recs.map(rowFor)]));
  }

  modal.addEventListener(evt.close, collapse);

  (song ? songRecordings(song.id) : allRecordings()).then(
    (loaded) => {
      if (!modal.isConnected) return;
      recs = loaded;
      render();
    },
    () => toast('Could not load recordings'),
  );
}
