import { clamp } from '../core/math.js';

const HEADER_BYTES = 44;
const SAMPLE_BYTES = 2;
const BITS = 16;
const PCM = 1;
const FMT_BYTES = 16;
const MAX_NEGATIVE = 0x8000;
const MAX_POSITIVE = 0x7fff;
export const WAV_TYPE = 'audio/wav';

function writeText(view, offset, text) {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}

export function encodeWav(buffer, startS, endS) {
  const rate = buffer.sampleRate;
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
  const first = clamp(Math.floor(startS * rate), 0, buffer.length);
  const last = clamp(Math.ceil(endS * rate), first, buffer.length);
  const frameBytes = channels.length * SAMPLE_BYTES;
  const size = (last - first) * frameBytes;
  const view = new DataView(new ArrayBuffer(HEADER_BYTES + size));
  writeText(view, 0, 'RIFF');
  view.setUint32(4, HEADER_BYTES - 8 + size, true);
  writeText(view, 8, 'WAVE');
  writeText(view, 12, 'fmt ');
  view.setUint32(16, FMT_BYTES, true);
  view.setUint16(20, PCM, true);
  view.setUint16(22, channels.length, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * frameBytes, true);
  view.setUint16(32, frameBytes, true);
  view.setUint16(34, BITS, true);
  writeText(view, 36, 'data');
  view.setUint32(40, size, true);
  let offset = HEADER_BYTES;
  for (let i = first; i < last; i++) {
    for (const data of channels) {
      const s = clamp(data[i], -1, 1);
      view.setInt16(offset, s < 0 ? s * MAX_NEGATIVE : s * MAX_POSITIVE, true);
      offset += SAMPLE_BYTES;
    }
  }
  return new Blob([view], { type: WAV_TYPE });
}
