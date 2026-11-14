import { SHARPS } from '../sheet/chords.js';
import { mod12 } from '../core/math.js';

const MIN_FREQ = 60;
const MAX_FREQ = 1100;
const MIN_RMS = 0.01;
const PEAK_RATIO = 0.9;
const MIN_CLARITY = 0.9;
const A4_FREQ = 440;
const A4_MIDI = 69;

function centered(buf) {
  let mean = 0;
  for (let i = 0; i < buf.length; i++) mean += buf[i];
  mean /= buf.length;
  return Float32Array.from(buf, (v) => v - mean);
}

function rms(x) {
  let sum = 0;
  for (let i = 0; i < x.length; i++) sum += x[i] * x[i];
  return Math.sqrt(sum / x.length);
}

function nsdf(x, maxLag) {
  const size = x.length;
  const curve = new Float64Array(maxLag + 1);
  let norm = 0;
  for (let i = 0; i < size; i++) norm += 2 * x[i] * x[i];
  curve[0] = 1;
  for (let lag = 1; lag <= maxLag; lag++) {
    norm -= x[lag - 1] * x[lag - 1] + x[size - lag] * x[size - lag];
    let acf = 0;
    for (let i = 0; i < size - lag; i++) acf += x[i] * x[i + lag];
    curve[lag] = norm > 0 ? (2 * acf) / norm : 0;
  }
  return curve;
}

function keyMaxima(curve) {
  const peaks = [];
  let best = 0;
  for (let lag = 1; lag < curve.length; lag++) {
    if (curve[lag] <= 0) {
      if (best) peaks.push(best);
      best = 0;
    } else if (curve[lag - 1] <= 0 || (best && curve[lag] > curve[best])) {
      best = lag;
    }
  }
  if (best && best < curve.length - 1) peaks.push(best);
  return peaks;
}

function refine(curve, lag) {
  const a = curve[lag - 1];
  const b = curve[lag];
  const c = curve[lag + 1];
  const bend = a - 2 * b + c;
  return bend < 0 ? lag + (a - c) / (2 * bend) : lag;
}

export function detectPitch(buf, sampleRate) {
  const x = centered(buf);
  if (rms(x) < MIN_RMS) return null;
  const minLag = Math.floor(sampleRate / MAX_FREQ);
  const maxLag = Math.min(x.length - 1, Math.ceil(sampleRate / MIN_FREQ) + 1);
  const curve = nsdf(x, maxLag);
  const peaks = keyMaxima(curve);
  const top = Math.max(...peaks.map((p) => curve[p]));
  const peak = peaks.find((p) => curve[p] >= PEAK_RATIO * top);
  if (!peak || peak < minLag || curve[peak] < MIN_CLARITY) return null;
  return sampleRate / refine(curve, peak);
}

export function noteOf(freq) {
  const exact = A4_MIDI + 12 * Math.log2(freq / A4_FREQ);
  const midi = Math.round(exact);
  return {
    name: SHARPS[mod12(midi)],
    octave: Math.floor(midi / 12) - 1,
    cents: Math.round((exact - midi) * 100),
    midi,
  };
}
