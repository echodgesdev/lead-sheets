import { audioContext } from './context.js';

const A4_HZ = 440;
const A4_MIDI = 69;
const LEVEL = 0.2;
const ATTACK_S = 0.01;
const RELEASE_S = 1.4;
const SILENT = 0.0001;

function hz(midi) {
  return A4_HZ * 2 ** ((midi - A4_MIDI) / 12);
}

export function playNotes(midis) {
  const ctx = audioContext();
  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(SILENT, now);
  gain.gain.exponentialRampToValueAtTime(LEVEL / Math.sqrt(midis.length), now + ATTACK_S);
  gain.gain.exponentialRampToValueAtTime(SILENT, now + RELEASE_S);
  gain.connect(ctx.destination);
  for (const midi of midis) {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = hz(midi);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + RELEASE_S);
  }
}
