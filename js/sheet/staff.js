import { keySpelling } from './chords.js';
import { qualityId } from './circle.js';
import { OCTAVE } from '../core/math.js';

const LETTERS = 7;
const TREBLE_FLOOR = 53;
const BASS_CEILING = 64;
const MIDDLE_C = 60;
const SHARP_STEPS = [38, 35, 39, 36, 33, 37, 34];
const FLAT_STEPS = [34, 37, 33, 36, 32, 35, 31];

export const clefId = Object.freeze({ treble: 'treble', bass: 'bass' });

export const STAVES = Object.freeze({
  [clefId.treble]: Object.freeze({ top: 38, shift: 0 }),
  [clefId.bass]: Object.freeze({ top: 26, shift: -14 }),
});

function keySignature(spelling) {
  const altered = spelling.filter((s) => s.inKey && s.acc);
  const acc = Math.sign(altered[0]?.acc ?? 0);
  const letters = new Map(altered.map((s) => [s.letter, s.acc]));
  return { acc, count: altered.length, letters };
}

export function signatureSteps({ acc, count }, clef) {
  const steps = acc > 0 ? SHARP_STEPS : FLAT_STEPS;
  return steps.slice(0, count).map((d) => d + STAVES[clef].shift);
}

function clefsFor(midis) {
  if (!midis.length || Math.min(...midis) >= TREBLE_FLOOR) return [clefId.treble];
  if (Math.max(...midis) <= BASS_CEILING) return [clefId.bass];
  return [clefId.treble, clefId.bass];
}

function spelledNote(midi, spelling, signature) {
  const pc = midi % OCTAVE;
  const { letter, acc } = spelling[pc];
  const octave = Math.floor((midi - acc) / OCTAVE) - 1;
  const keyAcc = signature.letters.get(letter) ?? 0;
  return { midi, pc, d: letter + octave * LETTERS, acc: acc === keyAcc ? null : acc };
}

function markSeconds(notes) {
  let previous = null;
  for (const note of notes) {
    note.offset = Boolean(previous && previous.staff === note.staff && note.d - previous.d === 1 && !previous.offset);
    previous = note;
  }
  return notes;
}

export function staffLayout(model) {
  const [tonic] = model.items;
  const spelling = keySpelling(tonic.pc, tonic.quality === qualityId.minor);
  const signature = keySignature(spelling);
  const steps = model.run.length ? model.run : [model.shown];
  const clefs = clefsFor(steps.flat());
  const clefOf = (midi) => (clefs.length === 1 ? clefs[0] : midi >= MIDDLE_C ? clefId.treble : clefId.bass);
  const columns = steps.map((midis, i) => ({
    step: model.run.length ? i : null,
    notes: markSeconds([...midis].sort((a, b) => a - b).map((midi) => ({ ...spelledNote(midi, spelling, signature), staff: clefOf(midi) }))),
  }));
  return { clefs, signature, columns };
}
