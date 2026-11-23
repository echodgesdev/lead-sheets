import { clamp } from '../core/math.js';

export const MIN_BPM = 30;
export const MAX_BPM = 250;

const NUMBER_RE = /\d+(?:\.\d+)?/;

export function tempoNumber(tempo) {
  const match = NUMBER_RE.exec(String(tempo ?? ''));
  return match ? Number(match[0]) : null;
}

export function clampBpm(n) {
  return clamp(Math.round(n), MIN_BPM, MAX_BPM);
}

export function parseBpm(tempo) {
  const n = tempoNumber(tempo);
  return n === null ? null : clampBpm(n);
}

export function inBpmRange(tempo) {
  const n = tempoNumber(tempo);
  return n !== null && n >= MIN_BPM && n <= MAX_BPM;
}
