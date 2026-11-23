import { audioContext } from './context.js';
import { detectPitch, noteOf } from './pitch.js';
import { openMic, closeMic } from './mic.js';

const FFT_SIZE = 4096;
const HOLD_MS = 500;
const MEDIAN_SIZE = 5;
const SMOOTHING = 0.3;
const JUMP_CENTS = 50;

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function centsBetween(a, b) {
  return 1200 * Math.log2(a / b);
}

export async function listen(onNote) {
  // start audio while still inside the user gesture
  audioContext();
  const stream = await openMic();
  const ctx = audioContext();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = FFT_SIZE;
  source.connect(analyser);

  const buf = new Float32Array(analyser.fftSize);
  const recent = [];
  let freq = 0;
  let heardAt = 0;
  let raf = 0;
  let stopped = false;

  function update(found, now) {
    if (found === null) {
      if (now - heardAt > HOLD_MS) {
        recent.length = 0;
        freq = 0;
      }
      return;
    }
    heardAt = now;
    recent.push(found);
    if (recent.length > MEDIAN_SIZE) recent.shift();
    const mid = median(recent);
    const near = freq && Math.abs(centsBetween(mid, freq)) < JUMP_CENTS;
    freq = near ? freq + SMOOTHING * (mid - freq) : mid;
  }

  function frame(now) {
    analyser.getFloatTimeDomainData(buf);
    update(detectPitch(buf, ctx.sampleRate), now);
    onNote(freq ? { ...noteOf(freq), freq } : null);
    if (!stopped) raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    source.disconnect();
    closeMic(stream);
  }

  raf = requestAnimationFrame(frame);
  return stop;
}
