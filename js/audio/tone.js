import { audioContext } from './context.js';
import { midiToHz } from './pitch.js';

const LEVEL = 0.2;
const SUSTAIN = 0.6;
const ATTACK_S = 0.01;
const DECAY_S = 0.4;
const RELEASE_S = 0.6;
const MAX_HOLD_S = 30;
const SILENT = 0.0001;
const RUN_STEP_S = 0.32;
const RUN_NOTE_S = 0.5;

function voice(ctx, midis, at, end) {
  const peak = LEVEL / Math.sqrt(midis.length);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(SILENT, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + ATTACK_S);
  gain.connect(ctx.destination);
  const oscs = midis.map((midi) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = midiToHz(midi);
    osc.connect(gain);
    osc.start(at);
    osc.stop(end);
    return osc;
  });
  return { gain, oscs, peak };
}

export function startNotes(midis) {
  const ctx = audioContext();
  const now = ctx.currentTime;
  const { gain, oscs, peak } = voice(ctx, midis, now, now + MAX_HOLD_S);
  gain.gain.setTargetAtTime(peak * SUSTAIN, now + ATTACK_S, DECAY_S);

  return function stop() {
    const t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(Math.max(gain.gain.value, SILENT), t);
    gain.gain.exponentialRampToValueAtTime(SILENT, t + RELEASE_S);
    for (const osc of oscs) osc.stop(t + RELEASE_S);
  };
}

export function playRun(steps, onStep) {
  const ctx = audioContext();
  const start = ctx.currentTime;
  const voices = steps.map((midis, i) => {
    const at = start + i * RUN_STEP_S;
    const v = voice(ctx, midis, at, at + RUN_NOTE_S);
    v.gain.gain.exponentialRampToValueAtTime(SILENT, at + RUN_NOTE_S);
    return v;
  });
  const timers = steps.map((_, i) => setTimeout(() => onStep?.(i), i * RUN_STEP_S * 1000));
  timers.push(setTimeout(() => onStep?.(null), steps.length * RUN_STEP_S * 1000));

  return function stop() {
    timers.forEach(clearTimeout);
    const t = ctx.currentTime;
    for (const { gain, oscs } of voices) {
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(SILENT, t);
      for (const osc of oscs) osc.stop(t);
    }
    onStep?.(null);
  };
}
