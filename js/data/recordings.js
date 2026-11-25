import { RECORDINGS, dbAll, dbGet, dbPut, dbDelete } from './db.js';
import { extensionOf } from '../audio/record.js';
import { safeFileName } from '../core/files.js';
import { dateTimeStamp } from '../core/time.js';
import { clamp } from '../core/math.js';

const UNASSIGNED_NAME = 'Recording';
const EXTENSION_RE = /\.[^.]+$/;
const TRIMMED_EXTENSION = 'wav';
export const NO_SONG = 'No song';
export const MIN_TAKE_MS = 250;

function withoutBlob({ blob, ...rec }) {
  return rec;
}

function newestFirst(a, b) {
  return b.createdAt - a.createdAt;
}

function byName(a, b) {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
}

export function recordingName(song, date, ext) {
  const label = song ? [song.title, song.artist] : [UNASSIGNED_NAME];
  const parts = [...label.map(safeFileName).filter(Boolean), dateTimeStamp(date)];
  return `${parts.join(' - ')}.${ext}`;
}

export function trimmedName(name) {
  return `${name.replace(EXTENSION_RE, '')} (trimmed).${TRIMMED_EXTENSION}`;
}

export function trimOf(rec, duration) {
  const start = clamp(rec.trim?.start ?? 0, 0, Math.max(0, duration - MIN_TAKE_MS));
  const end = clamp(rec.trim?.end ?? duration, start + MIN_TAKE_MS, duration);
  return { start, end };
}

export function isTrimmed(trim, duration) {
  return trim.start > 0 || trim.end < duration;
}

export function takeLength(rec) {
  return rec.trim ? rec.trim.end - rec.trim.start : rec.duration;
}

export function forSong(recs, songId) {
  return recs.filter((rec) => rec.songId === songId);
}

export function groupRecordings(recs, titleOf) {
  const groups = new Map();
  const none = [];
  for (const rec of [...recs].sort(newestFirst)) {
    const name = rec.songId ? titleOf(rec.songId) : null;
    if (!name) {
      none.push(rec);
      continue;
    }
    if (!groups.has(rec.songId)) groups.set(rec.songId, { name, recs: [] });
    groups.get(rec.songId).recs.push(rec);
  }
  const named = [...groups.values()].sort(byName);
  return none.length ? [...named, { name: NO_SONG, recs: none }] : named;
}

export async function addRecording({ song, createdAt, mimeType, duration, blob }) {
  const rec = {
    id: crypto.randomUUID(),
    songId: song?.id ?? null,
    name: recordingName(song, new Date(createdAt), extensionOf(mimeType)),
    mimeType,
    size: blob.size,
    duration,
    createdAt,
    blob,
  };
  await dbPut(RECORDINGS, rec);
  return withoutBlob(rec);
}

export async function allRecordings() {
  return (await dbAll(RECORDINGS)).map(withoutBlob).sort(newestFirst);
}

export async function songRecordings(songId) {
  return forSong(await allRecordings(), songId);
}

export async function updateRecording(id, patch) {
  const rec = await dbGet(RECORDINGS, id);
  if (!rec) return null;
  const next = { ...rec, ...patch };
  await dbPut(RECORDINGS, next);
  return withoutBlob(next);
}

export async function deleteRecording(id) {
  return dbDelete(RECORDINGS, id);
}

export async function recordingBlob(id) {
  return (await dbGet(RECORDINGS, id))?.blob ?? null;
}
