import { audioContext } from './context.js';
import { clamp } from '../core/math.js';
import { evt } from '../core/events.js';
import { clampBpm } from '../sheet/tempo.js';

export const DEFAULT_BPM = 100;
export const MIN_BEATS = 1;
export const MAX_BEATS = 16;
export const DEFAULT_BEATS = 4;

export const levelId = Object.freeze({
  primary: 'primary',
  secondary: 'secondary',
  mute: 'mute',
});

const LEVEL_CYCLE = [levelId.primary, levelId.secondary, levelId.mute];

const TAP_WINDOW = 4;
const TAP_GAP_MS = 2000;
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.1;
const START_DELAY_S = 0.05;
const CLICK_S = 0.03;
const ATTACK_S = 0.002;
const PRIMARY_HZ = 1600;
const SECONDARY_HZ = 1000;
const CLICK_GAIN = 0.8;
const SILENT_GAIN = 0.0001;

const PITCH = {
  [levelId.primary]: PRIMARY_HZ,
  [levelId.secondary]: SECONDARY_HZ,
};

export function defaultPattern(beats) {
  const n = clamp(Math.round(beats), MIN_BEATS, MAX_BEATS);
  return [levelId.primary, ...Array(n - 1).fill(levelId.secondary)];
}

export function resizePattern(pattern, beats) {
  const n = clamp(Math.round(beats), MIN_BEATS, MAX_BEATS);
  if (!pattern.length) return defaultPattern(n);
  return [...pattern.slice(0, n), ...Array(Math.max(0, n - pattern.length)).fill(levelId.secondary)];
}

export function cycleLevel(level) {
  return LEVEL_CYCLE[(LEVEL_CYCLE.indexOf(level) + 1) % LEVEL_CYCLE.length];
}

export function parsePattern(value) {
  if (!Array.isArray(value) || value.length < MIN_BEATS || value.length > MAX_BEATS) return null;
  return value.every((level) => LEVEL_CYCLE.includes(level)) ? [...value] : null;
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
  let pattern = defaultPattern(DEFAULT_BEATS);
  const pending = new Set();
  const voices = new Set();

  function blip(time, hz) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    voices.add(gain);
    osc.onended = () => voices.delete(gain);
    osc.frequency.value = hz;
    gain.gain.setValueAtTime(SILENT_GAIN, time);
    gain.gain.exponentialRampToValueAtTime(CLICK_GAIN, time + ATTACK_S);
    gain.gain.exponentialRampToValueAtTime(SILENT_GAIN, time + CLICK_S);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + CLICK_S);
    return gain;
  }

  function msUntil(time) {
    return Math.max(0, (time - ctx.currentTime) * 1000);
  }

  function announce(time, index, level) {
    const id = setTimeout(() => {
      pending.delete(id);
      onBeat(index, level);
    }, msUntil(time));
    pending.add(id);
  }

  function nextDownbeat() {
    return nextTime + ((pattern.length - beat) % pattern.length) * (60 / bpm);
  }

  function countIn(onCount, signal) {
    if (signal?.aborted) return Promise.resolve(false);
    ctx = audioContext();
    const beatS = 60 / bpm;
    const bar = timer ? [] : defaultPattern(pattern.length);
    const first = timer ? nextDownbeat() : ctx.currentTime + START_DELAY_S;
    const gains = bar.map((level, i) => blip(first + i * beatS, PITCH[level]));
    const counts = bar.map((_, i) => setTimeout(() => onCount(bar.length - i), msUntil(first + i * beatS)));
    return new Promise((resolve) => {
      const onAbort = () => {
        for (const gain of gains) gain.disconnect();
        finish(false);
      };
      const done = setTimeout(() => finish(true), msUntil(first + bar.length * beatS));
      function finish(ok) {
        clearTimeout(done);
        counts.forEach(clearTimeout);
        signal?.removeEventListener(evt.abort, onAbort);
        resolve(ok);
      }
      signal?.addEventListener(evt.abort, onAbort);
    });
  }

  function schedule() {
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime;
    while (nextTime < ctx.currentTime + SCHEDULE_AHEAD_S) {
      const level = pattern[beat];
      if (level !== levelId.mute) blip(nextTime, PITCH[level]);
      announce(nextTime, beat, level);
      nextTime += 60 / bpm;
      beat = (beat + 1) % pattern.length;
    }
  }

  function setBpm(next) {
    bpm = clampBpm(next);
  }

  function setPattern(next) {
    pattern = [...next];
    if (beat >= pattern.length) beat = 0;
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
    setPattern,
    countIn,
    get running() {
      return timer !== 0;
    },
  };
}
