import { modeId } from './theory-model.js';
import { fingeringId } from './vis-spec.js';

const OCTAVE = 12;
const MAX_SPAN = 4;
const LOW_BIAS = 0.05;
const JUMP_COST = 3;
const OCTAVE_REACH = 4;
const BOX_BELOW = 1;
const BOX_ABOVE = 3;
const PENTATONIC_SIZE = 5;
const TRITONE = 6;
const SHIFTS = [0, -OCTAVE, OCTAVE, -2 * OCTAVE, 2 * OCTAVE];

export const GUITAR = Object.freeze({ strings: Object.freeze([40, 45, 50, 55, 59, 64]), frets: 15 });

export const showId = Object.freeze({ position: 'position', neck: 'neck' });
export const matchId = Object.freeze({ unison: 'unison', octaves: 'octaves' });

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

function anchorOf(positions) {
  const fretted = positions.filter((p) => p.fret > 0);
  return fretted.length ? fretted.reduce((sum, p) => sum + p.fret, 0) / fretted.length : 0;
}

function byFret(a, b) {
  return a.fret - b.fret || a.string - b.string;
}

function shapeSearch(notes, instrument, strict) {
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
      if (!strict || fits(chosen)) {
        used.add(position.string);
        search(i + 1);
        used.delete(position.string);
      }
      chosen.pop();
    }
  };
  search(0);
  return best?.shape ?? null;
}

export function chordPositions(midis, instrument) {
  const notes = [...midis].sort((a, b) => a - b).slice(0, instrument.strings.length);
  for (const shift of SHIFTS) {
    const shape = shapeSearch(notes.map((midi) => midi + shift), instrument, true);
    if (shape) return shape;
  }
  return shapeSearch(notes, instrument, false) ?? [];
}

function adjacentShape(notes, first, octave, { strings, frets }) {
  const shape = notes.map((note, i) => {
    const midi = note + octave * OCTAVE;
    return { string: first + i, fret: midi - strings[first + i], midi };
  });
  return shape.every(({ fret }) => fret >= 0 && fret <= frets) && fits(shape) ? shape : null;
}

export function chordVoicings(midis, instrument) {
  const notes = [...midis].sort((a, b) => a - b);
  const shapes = [];
  for (let first = 0; first + notes.length <= instrument.strings.length; first += 1) {
    for (let octave = -OCTAVE_REACH; octave <= OCTAVE_REACH; octave += 1) {
      const shape = adjacentShape(notes, first, octave, instrument);
      if (shape) shapes.push(shape);
    }
  }
  if (!shapes.length) return [chordPositions(notes, instrument)];
  return shapes.sort((a, b) => anchorOf(a) - anchorOf(b) || a[0].string - b[0].string);
}

function pentatonicOf(pcs) {
  if (pcs.length <= PENTATONIC_SIZE) return pcs;
  const tritone = pcs.filter((pc) => pcs.includes((pc + TRITONE) % OCTAVE));
  return tritone.length === 2 ? pcs.filter((pc) => !tritone.includes(pc)) : pcs;
}

function anchorFrets(pcs, { strings }) {
  return Array.from({ length: OCTAVE }, (_, fret) => fret).filter((fret) => pcs.includes((strings[0] + fret) % OCTAVE));
}

function nextInScale(midi, pcs) {
  let next = midi + 1;
  while (!pcs.includes(next % OCTAVE)) next += 1;
  return next;
}

function boxPatterns(pcs, instrument) {
  const { strings, frets } = instrument;
  return anchorFrets(pentatonicOf(pcs), instrument).map((anchor) => {
    const low = Math.max(0, anchor - BOX_BELOW);
    const high = Math.min(frets, anchor + BOX_ABOVE);
    const pattern = [];
    let last = -Infinity;
    strings.forEach((open, string) => {
      for (let fret = low; fret <= high; fret += 1) {
        const midi = open + fret;
        if (midi <= last || !pcs.includes(midi % OCTAVE)) continue;
        pattern.push({ string, fret, midi });
        last = midi;
      }
    });
    return pattern;
  });
}

function perStringPatterns(pcs, instrument) {
  const { strings, frets } = instrument;
  const perString = pcs.length > PENTATONIC_SIZE ? 3 : 2;
  return anchorFrets(pcs, instrument).map((anchor) => {
    const pattern = [];
    let midi = strings[0] + anchor;
    strings.forEach((open, string) => {
      for (let n = 0; n < perString; n += 1) {
        const fret = midi - open;
        if (fret >= 0 && fret <= frets) pattern.push({ string, fret, midi });
        midi = nextInScale(midi, pcs);
      }
    });
    return pattern;
  });
}

function stringPatterns(pcs, instrument) {
  const all = pcPositions(pcs, instrument);
  return instrument.strings.map((_, string) => all.filter((p) => p.string === string));
}

const FINGERINGS = {
  [fingeringId.caged]: boxPatterns,
  [fingeringId.threePerString]: perStringPatterns,
  [fingeringId.oneString]: stringPatterns,
};

export function scalePatterns(pcs, instrument, fingering = fingeringId.caged) {
  return FINGERINGS[fingering](pcs, instrument).filter((pattern) => pattern.length);
}

function notePlaces({ shown, shownPcs }, instrument, match) {
  const places = match === matchId.octaves ? pcPositions(shownPcs, instrument) : positionsOf(shown[0], instrument);
  return places.sort(byFret).map((p) => [p]);
}

function samePlace(a, b) {
  return a.string === b.string && a.fret === b.fret;
}

function regionCost(option, region) {
  if (!region) return anchorOf(option) * LOW_BIAS;
  const frets = region.map((p) => p.fret);
  const low = Math.min(...frets);
  const high = Math.max(...frets);
  return option.reduce((sum, p) => (region.some((r) => samePlace(r, p)) ? sum : sum + JUMP_COST + Math.max(0, low - p.fret, p.fret - high)), 0);
}

function stepOptions(midis, instrument) {
  if (midis.length > 1) return [chordPositions(midis, instrument)];
  const options = positionsOf(midis[0], instrument).map((position) => [position]);
  return options.length ? options : [[]];
}

export function runPositions(steps, instrument, region = null) {
  if (!steps.length) return [];
  const options = steps.map((midis) => stepOptions(midis, instrument));
  let paths = options[0].map((option) => ({ cost: regionCost(option, region), path: [option] }));
  for (const choices of options.slice(1)) {
    paths = choices.map((option) => {
      const anchor = anchorOf(option);
      const own = regionCost(option, region);
      let best = null;
      for (const prev of paths) {
        const move = Math.abs(anchorOf(prev.path.at(-1)) - anchor);
        const cost = prev.cost + move + (move >= MAX_SPAN ? JUMP_COST : 0) + own;
        if (!best || cost < best.cost) best = { cost, path: [...prev.path, option] };
      }
      return best;
    });
  }
  return paths.reduce((a, b) => (b.cost < a.cost ? b : a)).path;
}

const SHAPES = {
  [modeId.scale]: (model, instrument, { fingering }) => scalePatterns(model.shownPcs, instrument, fingering),
  [modeId.chord]: (model, instrument) => chordVoicings(model.shown, instrument),
  [modeId.note]: (model, instrument, { match }) => notePlaces(model, instrument, match),
};

function wrap(index, count) {
  return ((index % count) + count) % count;
}

function dotBoard() {
  const dots = new Map();
  const at = (position) => {
    const id = `${position.string}:${position.fret}`;
    if (!dots.has(id)) dots.set(id, { ...position, steps: [], faint: true });
    return dots.get(id);
  };
  return { at, list: () => [...dots.values()] };
}

function sequenceLayout(model, instrument, { position, fingering }) {
  const patterns = position === null ? [] : scalePatterns(model.scalePcs, instrument, fingering);
  const region = patterns.length ? patterns[wrap(position, patterns.length)] : null;
  const path = runPositions(model.run, instrument, region);
  const board = dotBoard();
  path.forEach((positions, step) => positions.forEach((p) => {
    const dot = board.at(p);
    dot.faint = false;
    dot.steps.push(step);
  }));
  const columns = path.map((positions, step) => ({ step, positions }));
  return { instrument, dots: board.list(), muted: [], run: model.run, columns, count: 1, position: 0 };
}

export function fretLayout(model, instrument = GUITAR, options = {}) {
  const { show = showId.position, position = null, fingering = fingeringId.caged, match = matchId.unison } = options;
  if (model.mode === modeId.sequence) return sequenceLayout(model, instrument, { position, fingering });
  const shapes = SHAPES[model.mode](model, instrument, { fingering, match });
  const count = shapes.length;
  const current = count ? wrap(position ?? 0, count) : 0;
  const shape = shapes[current] ?? [];
  const run = model.mode === modeId.scale ? shape.map((p) => [p.midi]) : [];
  const board = dotBoard();
  if (show === showId.neck) shapes.flat().forEach(board.at);
  shape.forEach((p, step) => {
    const dot = board.at(p);
    dot.faint = false;
    if (run.length) dot.steps.push(step);
  });
  const sounding = new Set(shape.map((p) => p.string));
  const muted = model.mode === modeId.chord ? instrument.strings.map((_, string) => string).filter((string) => !sounding.has(string)) : [];
  const columns = run.length ? shape.map((p, step) => ({ step, positions: [p] })) : [{ step: null, positions: shape }];
  return { instrument, dots: board.list(), muted, run, columns, count, position: current };
}
