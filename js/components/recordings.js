import * as store from '../data/store.js';
import { allRecordings, songRecordings, deleteRecording, recordingBlob, groupRecordings } from '../data/recordings.js';
import { openModal } from './modal.js';
import { modalRow } from './rows.js';
import { rowMain, songTitle } from './parts.js';
import { toast } from './toast.js';
import { audio, div, span, iconButton } from '../core/dom.js';
import { iconId } from '../core/icons.js';
import { evt } from '../core/events.js';
import { clockTime } from '../core/time.js';
import { saveFile } from '../core/files.js';

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
  const player = audio();
  const blobs = new Map();
  let recs = [];
  let current = null;
  let closed = false;

  function release() {
    player.pause();
    player.removeAttribute('src');
    if (current) URL.revokeObjectURL(current.url);
    current = null;
  }

  async function blobOf(rec) {
    const blob = blobs.get(rec.id) ?? await recordingBlob(rec.id);
    if (blob) blobs.set(rec.id, blob);
    return blob;
  }

  function prefetch() {
    for (const rec of recs) blobOf(rec).catch(() => {});
  }

  function playing(rec) {
    return current?.id === rec.id && !player.paused;
  }

  function play() {
    player.play().catch(() => toast('Could not play the recording'));
  }

  async function togglePlay(rec) {
    if (current?.id === rec.id) {
      if (player.paused) play();
      else player.pause();
      return;
    }
    const blob = blobs.get(rec.id) ?? await blobOf(rec);
    if (!blob || closed) return;
    release();
    current = { id: rec.id, url: URL.createObjectURL(blob) };
    player.src = current.url;
    play();
    render();
  }

  async function saveRecording(rec) {
    const blob = blobs.get(rec.id) ?? await blobOf(rec);
    if (!blob) return;
    try {
      await saveFile(new File([blob], rec.name, { type: rec.mimeType }), rec.name);
    } catch {
      toast('Could not save the recording');
    }
  }

  async function removeRecording(rec) {
    if (!confirm('Delete this recording?')) return;
    if (current?.id === rec.id) release();
    await deleteRecording(rec.id);
    recs = recs.filter((r) => r.id !== rec.id);
    blobs.delete(rec.id);
    render();
  }

  function rowFor(rec) {
    const on = playing(rec);
    const playBtn = iconButton(on ? iconId.pause : iconId.play, on ? 'Pause' : 'Play');
    const saveBtn = iconButton(iconId.arrowUpFromBracket, 'Save');
    const deleteBtn = iconButton(iconId.trashCan, 'Delete', 'danger');
    playBtn.addEventListener(evt.click, () => togglePlay(rec));
    saveBtn.addEventListener(evt.click, () => saveRecording(rec));
    deleteBtn.addEventListener(evt.click, () => removeRecording(rec).catch(() => toast('Could not delete the recording')));
    return modalRow(null, rowMain({ title: rec.name }, subtitle(rec)), playBtn, saveBtn, deleteBtn);
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

  player.addEventListener(evt.play, render);
  player.addEventListener(evt.pause, render);
  modal.addEventListener(evt.close, () => {
    closed = true;
    release();
  });

  (song ? songRecordings(song.id) : allRecordings()).then(
    (loaded) => {
      if (closed) return;
      recs = loaded;
      render();
      prefetch();
    },
    () => toast('Could not load recordings'),
  );
}
