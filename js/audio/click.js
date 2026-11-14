import { audioContext } from './context.js';
import { clamp } from '../core/math.js';

export const MIN_BPM = 30;
export const MAX_BPM = 250;
export const DEFAULT_BPM = 100;
export const MIN_BEATS = 1;
export const MAX_BEATS = 12;
export const DEFAULT_BEATS = 4;

export const levelId = Object.freeze({
  accent: 'accent',
  normal: 'normal',
  soft: 'soft',
  mute: 'mute',
});

const LEVEL_CYCLE = [levelId.accent, levelId.normal, levelId.soft, levelId.mute];

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
const SOFT_GAIN = 0.2;
const SILENT_GAIN = 0.0001;

const SOUNDS = {
  [levelId.accent]: { hz: ACCENT_HZ, gain: ACCENT_GAIN },
  [levelId.normal]: { hz: BEAT_HZ, gain: BEAT_GAIN },
  [levelId.soft]: { hz: BEAT_HZ, gain: SOFT_GAIN },
};

export function clampBpm(n) {
  return clamp(Math.round(n), MIN_BPM, MAX_BPM);
}

export function parseBpm(tempo) {
  const match = /\d+(?:\.\d+)?/.exec(String(tempo ?? ''));
  return match ? clampBpm(Number(match[0])) : null;
}

export function defaultPattern(beats) {
  const n = clamp(Math.round(beats), MIN_BEATS, MAX_BEATS);
  return [levelId.accent, ...Array(n - 1).fill(levelId.normal)];
}

export function resizePattern(pattern, beats) {
  const n = clamp(Math.round(beats), MIN_BEATS, MAX_BEATS);
  if (!pattern.length) return defaultPattern(n);
  return [...pattern.slice(0, n), ...Array(Math.max(0, n - pattern.length)).fill(levelId.normal)];
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

  function blip(time, voice) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    voices.add(gain);
    osc.onended = () => voices.delete(gain);
    osc.frequency.value = voice.hz;
    gain.gain.setValueAtTime(SILENT_GAIN, time);
    gain.gain.exponentialRampToValueAtTime(voice.gain, time + ATTACK_S);
    gain.gain.exponentialRampToValueAtTime(SILENT_GAIN, time + CLICK_S);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + CLICK_S);
  }

  function announce(time, index, level) {
    const id = setTimeout(() => {
      pending.delete(id);
      onBeat(index, level);
    }, Math.max(0, (time - ctx.currentTime) * 1000));
    pending.add(id);
  }

  function schedule() {
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime;
    while (nextTime < ctx.currentTime + SCHEDULE_AHEAD_S) {
      const level = pattern[beat];
      if (level !== levelId.mute) blip(nextTime, SOUNDS[level]);
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
    get running() {
      return timer !== 0;
    },
  };
}
