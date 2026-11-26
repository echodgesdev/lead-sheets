import { test, eq } from './harness.js';
import { peaksOf } from '../js/audio/take.js';
import { encodeWav, WAV_TYPE } from '../js/audio/wav.js';
import { clampTrim, isTrimmed, splitName, renamed, MIN_TAKE_MS } from '../js/data/recordings.js';

function fakeBuffer(channels, sampleRate = 4) {
  return {
    sampleRate,
    numberOfChannels: channels.length,
    length: channels[0].length,
    getChannelData: (i) => Float32Array.from(channels[i]),
  };
}

test('peaks are the loudest sample per bucket across channels', () => {
  const buffer = fakeBuffer([[0.1, -0.5, 0.2, 0], [0, 0.25, -0.75, 0.125]]);
  eq(peaksOf(buffer, 2), [0.5, 0.75]);
  eq(peaksOf(buffer, 4), [0.1, 0.5, 0.75, 0.125]);
});

test('peaks past the end of a short buffer are silent', () => {
  eq(peaksOf(fakeBuffer([[1, -1]]), 4), [1, 1, 0, 0]);
});

test('wav holds a 44-byte header and 16-bit frames for the trimmed range', async () => {
  const buffer = fakeBuffer([[0, 0.5, -1, 1, 0.25, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0]], 4);
  const blob = encodeWav(buffer, 0.5, 1.5);
  eq(blob.type, WAV_TYPE);
  const view = new DataView(await blob.arrayBuffer());
  const text = (at) => String.fromCharCode(...new Uint8Array(view.buffer, at, 4));
  eq([text(0), text(8), text(12), text(36)], ['RIFF', 'WAVE', 'fmt ', 'data']);
  eq(view.getUint16(22, true), 2);
  eq(view.getUint32(24, true), 4);
  eq(view.getUint32(40, true), 4 * 2 * 2);
  eq([view.getInt16(44, true), view.getInt16(48, true), view.getInt16(52, true), view.getInt16(56, true)], [-32768, 32767, 8191, 0]);
});

test('trim handles stay inside the take and a minimum apart', () => {
  eq(clampTrim({ start: 1000, end: 4000 }, 5000), { start: 1000, end: 4000 });
  eq(clampTrim({ start: -50, end: 9000 }, 5000), { start: 0, end: 5000 });
  eq(clampTrim({ start: 3000, end: 3000 }, 5000), { start: 3000, end: 3000 + MIN_TAKE_MS });
  eq(clampTrim({ start: 9000, end: 9500 }, 5000), { start: 5000 - MIN_TAKE_MS, end: 5000 });
});

test('a take is trimmed only when either end moved', () => {
  eq(isTrimmed({ start: 0, end: 5000 }, 5000), false);
  eq(isTrimmed({ start: 10, end: 5000 }, 5000), true);
  eq(isTrimmed({ start: 0, end: 4990 }, 5000), true);
});

test('a name splits into base and extension', () => {
  eq(splitName('Zebra - 2026-11-23 14-05-09.m4a'), { base: 'Zebra - 2026-11-23 14-05-09', ext: '.m4a' });
  eq(splitName('Take'), { base: 'Take', ext: '' });
});

test('renaming keeps the given extension, cleans the name and falls back to the old base', () => {
  eq(renamed('Old.m4a', 'New: take?', '.m4a'), 'New take.m4a');
  eq(renamed('Old.m4a', '  ', '.wav'), 'Old.wav');
});
