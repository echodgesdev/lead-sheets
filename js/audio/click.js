import { audioContext } from './context.js';

export const MIN_BPM = 30;
export const MAX_BPM = 250;
export const DEFAULT_BPM = 100;

const BEATS_PER_BAR = 4;
const TAP_WINDOW = 4;
const TAP_GAP_MS = 2000;
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.1;
const START_DELAY_S = 0.05;
const CLICK_S = 0.03;
const ATTACK_S = 0.002;
const ACCENT_HZ = 1600;
const BEAT_HZ = 1000;
const ACCENT_GAIN = 0.9;
const BEAT_GAIN = 0.6;
const SILENT_GAIN = 0.0001;

function clampBpm(n) {
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(n)));
}

export function parseBpm(tempo) {
  const match = /\d+(?:\.\d+)?/.exec(String(tempo ?? ''));
  return match ? clampBpm(Number(match[0])) : null;
}

export function createTapper() {
  let taps = [];
  return function tap(nowMs) {
    if (taps.length && nowMs - taps[taps.length - 1] > TAP_GAP_MS) taps = [];
    taps.push(nowMs);
    if (taps.length > TAP_WINDOW + 1) taps.shift();
    if (taps.length < 2) return null;
    const interval = (nowMs - taps[0]) / (taps.length - 1);
    return clampBpm(60000 / interval);
  };
}

export function createMetronome(onBeat) {
  let ctx = null;
  let bpm = DEFAULT_BPM;
  let timer = 0;
  let nextTime = 0;
  let beat = 0;
  const pending = new Set();
  const voices = new Set();

  function blip(time, accent) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    voices.add(gain);
    osc.onended = () => voices.delete(gain);
    osc.frequency.value = accent ? ACCENT_HZ : BEAT_HZ;
    gain.gain.setValueAtTime(SILENT_GAIN, time);
    gain.gain.exponentialRampToValueAtTime(accent ? ACCENT_GAIN : BEAT_GAIN, time + ATTACK_S);
    gain.gain.exponentialRampToValueAtTime(SILENT_GAIN, time + CLICK_S);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + CLICK_S);
  }

  function announce(time, index) {
    const id = setTimeout(() => {
      pending.delete(id);
      onBeat(index);
    }, Math.max(0, (time - ctx.currentTime) * 1000));
    pending.add(id);
  }

  function schedule() {
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime;
    while (nextTime < ctx.currentTime + SCHEDULE_AHEAD_S) {
      blip(nextTime, beat === 0);
      announce(nextTime, beat);
      nextTime += 60 / bpm;
      beat = (beat + 1) % BEATS_PER_BAR;
    }
  }

  function setBpm(next) {
    bpm = clampBpm(next);
  }

  function start(next = bpm) {
    setBpm(next);
    if (timer) return;
    ctx = audioContext();
    beat = 0;
    nextTime = ctx.currentTime + START_DELAY_S;
    timer = setInterval(schedule, LOOKAHEAD_MS);
    schedule();
  }

  function stop() {
    clearInterval(timer);
    timer = 0;
    for (const id of pending) clearTimeout(id);
    pending.clear();
    for (const gain of voices) gain.disconnect();
    voices.clear();
  }

  return {
    start,
    stop,
    setBpm,
    get running() {
      return timer !== 0;
    },
  };
}
