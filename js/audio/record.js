import { openMic, closeMic } from './mic.js';
import { evt } from '../core/events.js';

const MIME_TYPES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
const EXTENSIONS = { 'audio/mp4': 'm4a', 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3' };
const DEFAULT_EXTENSION = 'webm';
const CHUNK_MS = 1000;
const INACTIVE = 'inactive';

export function pickMimeType(isSupported) {
  return MIME_TYPES.find((type) => isSupported(type)) ?? '';
}

export function extensionOf(mimeType) {
  const base = (mimeType ?? '').split(';')[0].trim().toLowerCase();
  return EXTENSIONS[base] ?? (base.split('/')[1] || DEFAULT_EXTENSION);
}

export async function startRecording() {
  if (!globalThis.MediaRecorder) throw new Error('Recording unavailable');
  const stream = await openMic();
  const preferred = pickMimeType((type) => MediaRecorder.isTypeSupported(type));
  let recorder;
  try {
    recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
  } catch (err) {
    closeMic(stream);
    throw err;
  }
  const chunks = [];
  const startedAt = Date.now();
  recorder.addEventListener(evt.dataavailable, (e) => {
    if (e.data.size) chunks.push(e.data);
  });
  const done = new Promise((resolve) => {
    recorder.addEventListener(evt.stop, () => {
      closeMic(stream);
      const mimeType = recorder.mimeType || preferred;
      resolve({ blob: new Blob(chunks, { type: mimeType }), mimeType, duration: Date.now() - startedAt });
    }, { once: true });
  });
  recorder.start(CHUNK_MS);
  return {
    startedAt,
    done,
    stop() {
      if (recorder.state !== INACTIVE) recorder.stop();
      return done;
    },
  };
}
