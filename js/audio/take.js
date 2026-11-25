import { audioContext } from './context.js';

const PEAK_PLACES = 1000;

export async function decodeTake(blob) {
  return audioContext().decodeAudioData(await blob.arrayBuffer());
}

export function peaksOf(buffer, count) {
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
  const size = Math.max(1, Math.ceil(buffer.length / count));
  return Array.from({ length: count }, (_, i) => {
    let peak = 0;
    const end = Math.min(buffer.length, (i + 1) * size);
    for (const data of channels) {
      for (let j = i * size; j < end; j++) peak = Math.max(peak, Math.abs(data[j]));
    }
    return Math.round(Math.min(peak, 1) * PEAK_PLACES) / PEAK_PLACES;
  });
}

export function createTakePlayer(buffer, onEnd) {
  let source = null;
  let from = 0;
  let startedAt = 0;
  let paused = 0;

  function position() {
    return source ? from + (audioContext().currentTime - startedAt) : paused;
  }

  function pause() {
    if (!source) return;
    paused = position();
    const node = source;
    source = null;
    node.onended = null;
    node.stop();
  }

  function play(startS, endS) {
    pause();
    const ctx = audioContext();
    const node = ctx.createBufferSource();
    node.buffer = buffer;
    node.connect(ctx.destination);
    node.onended = () => {
      if (source !== node) return;
      source = null;
      paused = endS;
      onEnd();
    };
    source = node;
    from = startS;
    startedAt = ctx.currentTime;
    node.start(0, startS, Math.max(0, endS - startS));
  }

  return {
    play,
    pause,
    position,
    get playing() {
      return source !== null;
    },
  };
}
