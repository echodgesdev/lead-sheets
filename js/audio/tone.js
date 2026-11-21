import { audioContext } from './context.js';

const A4_HZ = 440;
const A4_MIDI = 69;
const LEVEL = 0.2;
const SUSTAIN = 0.6;
const ATTACK_S = 0.01;
const DECAY_S = 0.4;
const RELEASE_S = 0.6;
const MAX_HOLD_S = 30;
const SILENT = 0.0001;
const RUN_STEP_S = 0.32;
const RUN_NOTE_S = 0.5;

function hz(midi) {
  return A4_HZ * 2 ** ((midi - A4_MIDI) / 12);
}

export function startNotes(midis) {
  const ctx = audioContext();
  const now = ctx.currentTime;
  const peak = LEVEL / Math.sqrt(midis.length);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(SILENT, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + ATTACK_S);
  gain.gain.setTargetAtTime(peak * SUSTAIN, now + ATTACK_S, DECAY_S);
  gain.connect(ctx.destination);
  const oscs = midis.map((midi) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = hz(midi);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + MAX_HOLD_S);
    return osc;
  });

  return function stop() {
    const t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(Math.max(gain.gain.value, SILENT), t);
    gain.gain.exponentialRampToValueAtTime(SILENT, t + RELEASE_S);
    for (const osc of oscs) osc.stop(t + RELEASE_S);
  };
}

export function playRun(midis, onStep) {
  const ctx = audioContext();
  const start = ctx.currentTime;
  const voices = midis.map((midi, i) => {
    const at = start + i * RUN_STEP_S;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(SILENT, at);
    gain.gain.exponentialRampToValueAtTime(LEVEL, at + ATTACK_S);
    gain.gain.exponentialRampToValueAtTime(SILENT, at + RUN_NOTE_S);
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = hz(midi);
    osc.connect(gain);
    osc.start(at);
    osc.stop(at + RUN_NOTE_S);
    return { gain, osc };
  });
  const timers = midis.map((midi, i) => setTimeout(() => onStep?.(midi), i * RUN_STEP_S * 1000));
  timers.push(setTimeout(() => onStep?.(null), midis.length * RUN_STEP_S * 1000));

  return function stop() {
    timers.forEach(clearTimeout);
    const t = ctx.currentTime;
    for (const { gain, osc } of voices) {
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(SILENT, t);
      osc.stop(t);
    }
    onStep?.(null);
  };
}
