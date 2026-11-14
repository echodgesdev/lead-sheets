import { test, eq } from './harness.js';
import { parseBpm, createTapper, MIN_BPM, MAX_BPM, MAX_BEATS, levelId, defaultPattern, resizePattern, cycleLevel, parsePattern } from '../js/audio/click.js';
import { detectPitch, noteOf } from '../js/audio/pitch.js';

const SAMPLE_RATE = 48000;
const BUFFER_SIZE = 4096;
const MAX_CENTS = 3;

function tone(freq, amplitudes = [0.5]) {
  const buf = new Float32Array(BUFFER_SIZE);
  for (let i = 0; i < BUFFER_SIZE; i++) {
    let sample = 0;
    amplitudes.forEach((amp, h) => {
      sample += amp * Math.sin((2 * Math.PI * freq * (h + 1) * i) / SAMPLE_RATE);
    });
    buf[i] = sample;
  }
  return buf;
}

function expectNote(buf, name, octave, label) {
  const freq = detectPitch(buf, SAMPLE_RATE);
  if (freq === null) throw new Error(`${label}: no pitch detected`);
  const note = noteOf(freq);
  eq([note.name, note.octave], [name, octave], label);
  if (Math.abs(note.cents) > MAX_CENTS) throw new Error(`${label}: expected cents within ${MAX_CENTS} but got ${note.cents}`);
}

function tapAll(times) {
  const tap = createTapper();
  return times.map((t) => tap(t));
}

test('parseBpm reads the first number', () => {
  eq(parseBpm('120'), 120);
  eq(parseBpm('120 bpm'), 120);
  eq(parseBpm('~96'), 96);
  eq(parseBpm('96-100'), 96);
  eq(parseBpm('92.5'), 93);
});

test('parseBpm clamps to the bpm range', () => {
  eq(parseBpm('10'), MIN_BPM);
  eq(parseBpm('0'), MIN_BPM);
  eq(parseBpm('999 bpm'), MAX_BPM);
});

test('parseBpm returns null without a number', () => {
  eq(parseBpm(undefined), null);
  eq(parseBpm(''), null);
  eq(parseBpm('fast'), null);
});

test('createTapper needs two taps', () => {
  eq(tapAll([1000]), [null]);
});

test('createTapper averages the tap interval', () => {
  eq(tapAll([0, 500, 1000, 1500]), [null, 120, 120, 120]);
  eq(tapAll([0, 1000]), [null, 60]);
});

test('createTapper averages only the last four intervals', () => {
  eq(tapAll([0, 1000, 1500, 2000, 2500, 3000]).pop(), 120);
});

test('createTapper starts over after a gap over 2000 ms', () => {
  eq(tapAll([0, 500, 1000, 4000, 4500]), [null, 120, 120, null, 120]);
  eq(tapAll([0, 2000]), [null, 30]);
});

test('createTapper clamps to the bpm range', () => {
  eq(tapAll([0, 100]), [null, MAX_BPM]);
});

test('detectPitch and noteOf name pure tones', () => {
  expectNote(tone(82.41), 'E', 2, 'E2');
  expectNote(tone(110), 'A', 2, 'A2');
  expectNote(tone(196), 'G', 3, 'G3');
  expectNote(tone(329.63), 'E', 4, 'E4');
  expectNote(tone(440), 'A', 4, 'A4');
});

test('detectPitch avoids octave errors on a harmonic-rich low E', () => {
  const amplitudes = [1, 1 / 2, 1 / 3, 1 / 4, 1 / 5].map((a) => a * 0.3);
  expectNote(tone(82.41, amplitudes), 'E', 2, 'E2 harmonics');
});

test('detectPitch returns null for silence', () => {
  eq(detectPitch(new Float32Array(BUFFER_SIZE), SAMPLE_RATE), null);
});

const { primary, secondary, mute } = levelId;

test('defaultPattern starts with primary, then secondary', () => {
  eq(defaultPattern(4), [primary, secondary, secondary, secondary]);
  eq(defaultPattern(1), [primary]);
  eq(defaultPattern(0), [primary]);
  eq(defaultPattern(99).length, MAX_BEATS);
});

test('resizePattern keeps existing beats and pads with secondary', () => {
  eq(resizePattern([primary, mute, primary], 5), [primary, mute, primary, secondary, secondary]);
  eq(resizePattern([primary, mute, primary], 2), [primary, mute]);
  eq(resizePattern([mute], 0), [mute]);
  eq(resizePattern([], 3), [primary, secondary, secondary]);
});

test('cycleLevel goes primary, secondary, mute and wraps', () => {
  eq([primary, secondary, mute].map(cycleLevel), [secondary, mute, primary]);
});

test('parsePattern accepts only valid stored patterns', () => {
  eq(parsePattern([primary, mute]), [primary, mute]);
  eq(parsePattern(Array(MAX_BEATS).fill(secondary)).length, MAX_BEATS);
  eq(parsePattern(null), null);
  eq(parsePattern([]), null);
  eq(parsePattern([primary, 'accent']), null);
  eq(parsePattern(Array(MAX_BEATS + 1).fill(secondary)), null);
});
