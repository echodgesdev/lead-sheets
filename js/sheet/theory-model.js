import {
  WEDGES,
  keyOf,
  keyTonic,
  keyChords,
  displayName,
  pitchNames,
  noteMidi,
  shapeId,
  chordShape,
  stepPitches,
  voiceNotes,
  SCALES,
  scalePitches,
  scaleRun,
  scaleRoot,
  wedgeOf,
  degreeMidi,
  spelledNotes,
} from './circle.js';
import { SHARPS, chordSpelling, parseKey } from './chords.js';
import { roman } from './transpose.js';
import { stepKind } from './vis-spec.js';

const SHIFT_MARKS = { [-1]: '♭', 0: '', 1: '♯' };

export const modeId = Object.freeze({
  note: 'note',
  chord: 'chord',
  scale: 'scale',
  sequence: 'sequence',
});

export function slotOf(index, ring) {
  return `${ring}${index}`;
}

export function chordRoot(chord) {
  return chord.replace(/(m|dim)$/, '');
}

export function keyItems(index, minor) {
  return keyChords(index, minor).map((item, degree) => ({ ...item, degree, slot: slotOf(item.index, item.ring) }));
}

export function itemShape(item, items, shapes) {
  return chordShape(item, items.map((each) => each.pc), shapes[item.degree] ?? shapeId.triad);
}

export function keyLabel(index, minor) {
  return { root: displayName(chordRoot(keyOf(index, minor))), quality: minor ? 'minor' : 'Major' };
}

export function keyAt(name) {
  const key = parseKey(name);
  return key ? { index: wedgeOf(key.pc, key.minor), minor: key.minor } : null;
}

function keyFrame({ index, minor, locked, minOctaves }) {
  const items = keyItems(index, minor);
  const keyPcs = items.map((item) => item.pc);
  const tonic = keyTonic(index, minor);
  return {
    items,
    keyPcs,
    tonic,
    frame: {
      items,
      locked,
      minOctaves,
      key: keyLabel(index, minor),
      keyTonicPc: tonic,
      keyTonicMidi: noteMidi(tonic, tonic),
      names: pitchNames(index, keyPcs),
      scalePcs: keyPcs,
    },
  };
}

function uniquePcs(midis) {
  return [...new Set(midis.map((midi) => midi % WEDGES))];
}

export function theoryModel(state) {
  const { index, minor, mode, chordIndex, inversion, shapes, scaleChoice, inKey } = state;
  const { items, keyPcs, tonic, frame } = keyFrame(state);
  const shapeOf = (item) => itemShape(item, items, shapes);
  const chord = items[chordIndex];
  const shaped = shapeOf(chord);
  const voiced = voiceNotes(chord.pc, shaped.steps, tonic, inversion);
  const note = { pc: chord.pc, midi: noteMidi(chord.pc, tonic), degree: chordIndex + 1, name: chordRoot(chord.chord) };
  const scales = SCALES.map((scale) => {
    const root = scaleRoot(index, minor, scale.id, inKey);
    const top = displayName(frame.names[root]);
    return { ...scale, root, top, pcs: scalePitches(root, scale.id), run: scaleRun(root, scale.id) };
  });
  const scale = scales.find((each) => each.id === scaleChoice);
  const display = mode === modeId.scale ? scale.root : tonic;
  const chordPcs = stepPitches(chord.pc, shaped.steps);
  const byMode = {
    [modeId.chord]: { shown: voiced, shownPcs: chordPcs, rootPc: chord.pc, allowed: chordPcs, run: [] },
    [modeId.note]: { shown: [note.midi], shownPcs: [note.pc], rootPc: note.pc, allowed: keyPcs, run: [] },
    [modeId.scale]: { shown: scale.run, shownPcs: scale.pcs, rootPc: scale.root, allowed: scale.pcs, run: scale.run.map((midi) => [midi]) },
  };
  return {
    ...frame,
    ...byMode[mode],
    mode,
    chordIndex,
    chord,
    voiced,
    note,
    scale,
    scales,
    shape: shapes[chordIndex] ?? shapeId.triad,
    shapeOf,
    tonic: display,
    tonicMidi: noteMidi(display, display),
    noteMidiOf: (pc) => noteMidi(pc, display),
  };
}

function degreeStep({ degree, shift }, { index, minor }, names) {
  const midi = degreeMidi(index, minor, degree, shift);
  const pc = midi % WEDGES;
  const name = shift > 0 ? SHARPS[pc] : names[pc];
  return { top: `${SHIFT_MARKS[shift]}${degree}`, label: displayName(name), midis: [midi], rootPc: pc };
}

function chordStep({ chord }, tonic) {
  const spelling = chordSpelling(chord);
  if (!spelling) return null;
  return { top: roman(chord, { pc: tonic }), label: displayName(chord), midis: spelledNotes(spelling, tonic), rootPc: spelling.pc };
}

export function sequenceModel(state) {
  const { tonic, frame } = keyFrame(state);
  const steps = state.steps
    .map((step) => (step.kind === stepKind.degree ? degreeStep(step, state, frame.names) : chordStep(step, tonic)))
    .filter(Boolean);
  const run = steps.map((step) => step.midis);
  const shown = [...new Set(run.flat())].sort((a, b) => a - b);
  const shownPcs = uniquePcs(shown);
  return {
    ...frame,
    mode: modeId.sequence,
    steps,
    run,
    shown,
    shownPcs,
    rootPc: tonic,
    allowed: shownPcs,
    tonic,
    tonicMidi: noteMidi(tonic, tonic),
    noteMidiOf: (pc) => noteMidi(pc, tonic),
  };
}
