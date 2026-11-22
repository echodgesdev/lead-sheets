import { modeId } from './theory-model.js';

const OCTAVE = 12;
const MAX_SPAN = 4;
const LOW_BIAS = 0.05;
const JUMP_COST = 3;

export const GUITAR = Object.freeze({ strings: Object.freeze([40, 45, 50, 55, 59, 64]), frets: 15 });

export function positionsOf(midi, { strings, frets }) {
  return strings.flatMap((open, string) => {
    const fret = midi - open;
    return fret >= 0 && fret <= frets ? [{ string, fret, midi }] : [];
  });
}

export function pcPositions(pcs, { strings, frets }) {
  return strings.flatMap((open, string) => Array.from({ length: frets + 1 }, (_, fret) => ({ string, fret, midi: open + fret })))
    .filter(({ midi }) => pcs.includes(midi % OCTAVE));
}

function frettedSpan(chosen) {
  const fretted = chosen.filter((p) => p.fret > 0).map((p) => p.fret);
  return fretted.length ? { low: Math.min(...fretted), high: Math.max(...fretted) } : { low: 0, high: 0 };
}

function shapeCost(chosen) {
  const { low, high } = frettedSpan(chosen);
  return high + (high - low);
}

function fits(chosen) {
  const { low, high } = frettedSpan(chosen);
  return high - low < MAX_SPAN;
}

function loosePositions(notes, instrument) {
  return notes
    .map((midi) => positionsOf(midi, instrument).sort((a, b) => a.fret - b.fret)[0])
    .filter(Boolean);
}

export function chordPositions(midis, instrument) {
  const notes = [...midis].sort((a, b) => a - b);
  let best = null;
  const chosen = [];
  const used = new Set();
  const search = (i) => {
    if (i === notes.length) {
      const cost = shapeCost(chosen);
      if (!best || cost < best.cost) best = { cost, shape: [...chosen] };
      return;
    }
    for (const position of positionsOf(notes[i], instrument)) {
      if (used.has(position.string)) continue;
      chosen.push(position);
      if (fits(chosen)) {
        used.add(position.string);
        search(i + 1);
        used.delete(position.string);
      }
      chosen.pop();
    }
  };
  search(0);
  return best ? best.shape : loosePositions(notes, instrument);
}

function anchorOf(positions) {
  const fretted = positions.filter((p) => p.fret > 0);
  return fretted.length ? fretted.reduce((sum, p) => sum + p.fret, 0) / fretted.length : 0;
}

function stepOptions(midis, instrument) {
  if (midis.length > 1) return [chordPositions(midis, instrument)];
  const options = positionsOf(midis[0], instrument).map((position) => [position]);
  return options.length ? options : [[]];
}

export function runPositions(steps, instrument) {
  if (!steps.length) return [];
  const options = steps.map((midis) => stepOptions(midis, instrument));
  let paths = options[0].map((option) => ({ cost: anchorOf(option) * LOW_BIAS, path: [option] }));
  for (const choices of options.slice(1)) {
    paths = choices.map((option) => {
      const anchor = anchorOf(option);
      let best = null;
      for (const prev of paths) {
        const move = Math.abs(anchorOf(prev.path.at(-1)) - anchor);
        const cost = prev.cost + move + (move >= MAX_SPAN ? JUMP_COST : 0) + anchor * LOW_BIAS;
        if (!best || cost < best.cost) best = { cost, path: [...prev.path, option] };
      }
      return best;
    });
  }
  return paths.reduce((a, b) => (b.cost < a.cost ? b : a)).path;
}

function baseDots({ mode, shown, shownPcs }, path, instrument) {
  if (mode === modeId.scale) return pcPositions(shownPcs, instrument);
  if (mode === modeId.note) return shown.flatMap((midi) => positionsOf(midi, instrument));
  if (mode === modeId.chord) return chordPositions(shown, instrument);
  return path.flat();
}

export function fretLayout(model, instrument) {
  const path = runPositions(model.run, instrument);
  const dots = new Map();
  const dotAt = (position) => {
    const id = `${position.string}:${position.fret}`;
    if (!dots.has(id)) dots.set(id, { ...position, steps: [] });
    return dots.get(id);
  };
  baseDots(model, path, instrument).forEach(dotAt);
  path.forEach((positions, step) => positions.forEach((position) => dotAt(position).steps.push(step)));
  const list = [...dots.values()];
  const sounding = new Set(list.map((dot) => dot.string));
  const muted = model.mode === modeId.chord ? instrument.strings.map((_, string) => string).filter((string) => !sounding.has(string)) : [];
  return { dots: list, muted };
}
