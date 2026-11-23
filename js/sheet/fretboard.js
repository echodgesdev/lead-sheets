import { modeId } from './theory-model.js';
import { fingeringId, neckShapeId } from './vis-spec.js';
import { OCTAVE, mod12 } from '../core/math.js';

const MAX_SPAN = 4;
const MAX_FINGERS = 4;
const MIN_VOICED = 3;
const TRIAD_SIZE = 3;
const FIFTH = 7;
const MINOR_THIRD = 3;
const MAJOR_THIRD = 4;
const SIXTH = 9;
const MINOR_SEVENTH = 10;
const MAJOR_SEVENTH = 11;
const REACH_BELOW = 2;
const REACH_ABOVE = 3;
const LOW_BIAS = 0.05;
const JUMP_COST = 3;
const OCTAVE_REACH = 4;
const BOX_BELOW = 1;
const BOX_ABOVE = 3;
const PENTATONIC_SIZE = 5;
const TRITONE = 6;
const SHIFTS = [0, -OCTAVE, OCTAVE, -2 * OCTAVE, 2 * OCTAVE];
const CHART_MIN_ROWS = 4;
const CHART_MAX_ROWS = 5;

const CAGED_FORMS = Object.freeze([
  { root: 1, offsets: [null, 0, -1, -3, -2, -3] },
  { root: 1, offsets: [null, 0, 2, 2, 2, 0] },
  { root: 0, offsets: [0, -1, -3, -3, -3, 0] },
  { root: 0, offsets: [0, 2, 2, 1, 0, 0] },
  { root: 2, offsets: [null, null, 0, 2, 3, 2] },
]);

const FORM_QUALITIES = Object.freeze({
  major: [0, 4, 7],
  minor: [0, 3, 7],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  sixth: [0, 4, 7, 9],
  minorSixth: [0, 3, 7, 9],
  seventh: [0, 4, 7, 10],
  minorSeventh: [0, 3, 7, 10],
  majorSeventh: [0, 4, 7, 11],
});

const FORM_KEYS = new Set(Object.values(FORM_QUALITIES).map(String));

const POWER_GRIP = Object.freeze({
  slots: [[0], [FIFTH], [OCTAVE]],
  sets: [[0, 1, 2], [1, 2, 3], [2, 3, 4]],
});

const SHELL_GRIP = Object.freeze({
  slots: [[0], [MINOR_SEVENTH, MAJOR_SEVENTH, SIXTH], [OCTAVE + MINOR_THIRD, OCTAVE + MAJOR_THIRD]],
  sets: [[0, 2, 3], [1, 3, 4]],
});

const CLOSED_SPREADS = Object.freeze([
  { drop: 0, min: TRIAD_SIZE },
  { drop: 2, min: TRIAD_SIZE + 1 },
]);

const SHAPE_FALLBACKS = [neckShapeId.caged, neckShapeId.closed, neckShapeId.triad];

export const GUITAR = Object.freeze({
  strings: Object.freeze([40, 45, 50, 55, 59, 64]),
  frets: 15,
  forms: CAGED_FORMS,
  grips: Object.freeze({ [neckShapeId.power]: POWER_GRIP, [neckShapeId.shell]: SHELL_GRIP }),
});

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

function placeOn(midis, set, { strings, frets }) {
  const shape = midis.map((midi, i) => ({ string: set[i], fret: midi - strings[set[i]], midi }));
  return shape.every(({ fret }) => fret >= 0 && fret <= frets) && playable(shape) ? shape : null;
}

function placeFromBass(steps, sets, bassPc, instrument) {
  const { strings, frets } = instrument;
  return sets.flatMap((set) => {
    const shapes = [];
    for (let fret = mod12(bassPc - strings[set[0]]); fret <= frets; fret += OCTAVE) {
      const shape = placeOn(steps.map((step) => strings[set[0]] + fret + step), set, instrument);
      if (shape) shapes.push(shape);
    }
    return shapes;
  });
}

function adjacentSets(size, { strings }) {
  return Array.from({ length: strings.length - size + 1 }, (_, first) => Array.from({ length: size }, (_, i) => first + i));
}

function adjacentVoicings(notes, instrument) {
  const shapes = [];
  for (const set of adjacentSets(notes.length, instrument)) {
    for (let octave = -OCTAVE_REACH; octave <= OCTAVE_REACH; octave += 1) {
      const shape = placeOn(notes.map((note) => note + octave * OCTAVE), set, instrument);
      if (shape) shapes.push(shape);
    }
  }
  return shapes.sort((a, b) => anchorOf(a) - anchorOf(b) || a[0].string - b[0].string);
}

function toneOf(midi, rootPc) {
  return mod12(midi - rootPc);
}

function toneSet(notes, rootPc) {
  return [...new Set(notes.map((midi) => toneOf(midi, rootPc)))].sort((a, b) => a - b);
}

function covers(shape, rootPc, tones) {
  return tones.every((tone) => shape.some((p) => toneOf(p.midi, rootPc) === tone));
}

function needsBarre(shape) {
  return shape.filter((p) => p.fret > 0).length > MAX_FINGERS;
}

function playable(shape) {
  if (!fits(shape)) return false;
  if (!needsBarre(shape)) return true;
  const fretted = shape.filter((p) => p.fret > 0);
  const { low } = frettedSpan(shape);
  const barre = shape.find((p) => p.fret === low).string;
  return fretted.filter((p) => p.fret > low).length < MAX_FINGERS && !shape.some((p) => p.fret === 0 && p.string > barre);
}

function formTemplate({ root, offsets }, rootPc, { strings, frets }) {
  let fret = mod12(rootPc - strings[root]);
  while (fret + Math.min(...offsets.filter((o) => o !== null)) < 0) fret += OCTAVE;
  const template = offsets.map((o) => (o === null ? null : fret + o));
  return Math.max(...template.filter((f) => f !== null)) <= frets ? template : null;
}

function nearTones(template, rootPc, tones, { strings }) {
  return template.flatMap((at, string) => {
    if (at === null) return [];
    const near = [];
    for (let fret = Math.max(0, at - REACH_BELOW); fret <= at + REACH_ABOVE; fret += 1) {
      const midi = strings[string] + fret;
      if (tones.includes(toneOf(midi, rootPc))) near.push({ string, fret, midi, cost: Math.abs(fret - at) });
    }
    return [near];
  });
}

function fitForm(template, rootPc, tones, required, instrument) {
  const options = nearTones(template, rootPc, tones, instrument);
  let best = null;
  const chosen = [];
  const search = (i, cost) => {
    if (best && cost >= best.cost) return;
    if (i === options.length) {
      if (toneOf(chosen[0].midi, rootPc) === 0 && covers(chosen, rootPc, required) && playable(chosen)) {
        best = { cost, shape: chosen.map(({ string, fret, midi }) => ({ string, fret, midi })) };
      }
      return;
    }
    for (const option of options[i]) {
      chosen.push(option);
      search(i + 1, cost + option.cost);
      chosen.pop();
    }
  };
  search(0, 0);
  return best?.shape ?? null;
}

function onBass(shape, rootPc, bassPc, required) {
  const start = shape.findIndex((p) => mod12(p.midi) === bassPc);
  const rest = start < 0 ? [] : shape.slice(start);
  return rest.length >= MIN_VOICED && covers(rest, rootPc, required) ? rest : null;
}

function lowestFret(shape) {
  return Math.min(...shape.map((p) => p.fret));
}

function byPosition(a, b) {
  return lowestFret(a) - lowestFret(b) || anchorOf(a) - anchorOf(b);
}

function formVoicings(rootPc, notes, instrument) {
  const tones = toneSet(notes, rootPc);
  if (!instrument.forms || !FORM_KEYS.has(String(tones))) return [];
  const required = tones.length > TRIAD_SIZE ? tones.filter((tone) => tone !== FIFTH) : tones;
  return instrument.forms
    .map((form) => formTemplate(form, rootPc, instrument))
    .map((template) => template && fitForm(template, rootPc, tones, required, instrument))
    .map((shape) => shape && onBass(shape, rootPc, mod12(notes[0]), required))
    .filter(Boolean)
    .sort(byPosition);
}

function triadVoicings(rootPc, notes, instrument) {
  return notes.length === TRIAD_SIZE ? adjacentVoicings(notes, instrument) : [];
}

function closedStacks(tones) {
  const rotations = tones.map((_, i) => [...tones.slice(i), ...tones.slice(0, i).map((tone) => tone + OCTAVE)]);
  return CLOSED_SPREADS.filter(({ min }) => tones.length >= min).flatMap(({ drop }) => rotations.map((stack) => stack
    .map((tone, i) => (drop && i === stack.length - drop ? tone - OCTAVE : tone))
    .sort((a, b) => a - b)));
}

function closedVoicings(rootPc, notes, instrument) {
  const tones = toneSet(notes, rootPc);
  const bassPc = mod12(notes[0]);
  const sets = adjacentSets(tones.length, instrument);
  return closedStacks(tones)
    .filter((stack) => mod12(rootPc + stack[0]) === bassPc)
    .flatMap((stack) => placeFromBass(stack.map((tone) => tone - stack[0]), sets, bassPc, instrument))
    .sort(byPosition);
}

function gripVoicings(grip, rootPc, notes, instrument) {
  if (!grip || mod12(notes[0]) !== rootPc) return [];
  const tones = toneSet(notes, rootPc);
  const steps = grip.slots.map((slot) => slot.find((step) => tones.includes(mod12(step))));
  if (steps.includes(undefined)) return [];
  return placeFromBass(steps, grip.sets, rootPc, instrument).sort(byPosition);
}

function gripsOf(id) {
  return (rootPc, notes, instrument) => gripVoicings(instrument.grips?.[id], rootPc, notes, instrument);
}

const VOICINGS = {
  [neckShapeId.caged]: formVoicings,
  [neckShapeId.closed]: closedVoicings,
  [neckShapeId.triad]: triadVoicings,
  [neckShapeId.power]: gripsOf(neckShapeId.power),
  [neckShapeId.shell]: gripsOf(neckShapeId.shell),
};

function distinct(shapes) {
  const seen = new Set();
  return shapes.filter((shape) => {
    const id = shape.map((p) => `${p.string}:${p.fret}`).join();
    return !seen.has(id) && seen.add(id);
  });
}

export function chordVoicings(rootPc, midis, instrument, shape = neckShapeId.caged) {
  const notes = [...midis].sort((a, b) => a - b);
  const groups = Object.fromEntries(Object.entries(VOICINGS).map(([id, voicings]) => [id, distinct(voicings(rootPc, notes, instrument))]));
  const shapes = Object.keys(groups).filter((id) => groups[id].length);
  const picked = [shape, ...SHAPE_FALLBACKS].find((id) => shapes.includes(id)) ?? null;
  return { shape: picked, shapes, positions: picked ? groups[picked] : [chordPositions(notes, instrument)] };
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

function stepOptions(midis, instrument, rootPc, shape) {
  if (midis.length > 1) return shape ? chordVoicings(rootPc, midis, instrument, shape).positions : [chordPositions(midis, instrument)];
  const options = positionsOf(midis[0], instrument).map((position) => [position]);
  return options.length ? options : [[]];
}

export function runPositions(steps, instrument, region = null, { roots = [], shape = null } = {}) {
  if (!steps.length) return [];
  const options = steps.map((midis, i) => stepOptions(midis, instrument, roots[i], shape));
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
  [modeId.scale]: (model, instrument, { fingering }) => ({ positions: scalePatterns(model.shownPcs, instrument, fingering) }),
  [modeId.chord]: (model, instrument, { shape }) => chordVoicings(model.rootPc, model.shown, instrument, shape),
  [modeId.note]: (model, instrument, { match }) => ({ positions: notePlaces(model, instrument, match) }),
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

function sequenceLayout(model, instrument, { position, fingering, shape }) {
  const patterns = position === null ? [] : scalePatterns(model.scalePcs, instrument, fingering);
  const region = patterns.length ? patterns[wrap(position, patterns.length)] : null;
  const path = runPositions(model.run, instrument, region, { roots: model.steps.map((step) => step.rootPc), shape });
  const board = dotBoard();
  path.forEach((positions, step) => positions.forEach((p) => {
    const dot = board.at(p);
    dot.faint = false;
    dot.steps.push(step);
  }));
  const columns = path.map((positions, step) => ({ step, positions }));
  return { instrument, dots: board.list(), muted: [], run: model.run, voicing: [], columns, count: 1, position: 0, shape: null, shapes: [] };
}

export function fretLayout(model, instrument = GUITAR, options = {}) {
  const { show = showId.position, position = null, fingering = fingeringId.caged, match = matchId.unison, shape: chosen = null } = options;
  if (model.mode === modeId.sequence) return sequenceLayout(model, instrument, { position, fingering, shape: chosen });
  const found = SHAPES[model.mode](model, instrument, { fingering, match, shape: chosen });
  const shapes = found.positions;
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
  const voicing = model.mode === modeId.chord ? shape.map((p) => p.midi).sort((a, b) => a - b) : [];
  const columns = run.length ? shape.map((p, step) => ({ step, positions: [p] })) : [{ step: null, positions: shape }];
  return { instrument, dots: board.list(), muted, run, voicing, columns, count, position: current, shape: found.shape ?? null, shapes: found.shapes ?? [] };
}

export function chartLayout({ instrument, dots, muted, voicing }) {
  const shown = dots.filter((dot) => !dot.faint);
  const fretted = shown.filter((dot) => dot.fret > 0);
  const { low, high } = frettedSpan(shown);
  const start = high <= CHART_MAX_ROWS ? 1 : low;
  const atLow = fretted.filter((dot) => dot.fret === low).map((dot) => dot.string);
  const barred = voicing.length > 0 && needsBarre(shown) && atLow.length > 1;
  return {
    instrument,
    start,
    rows: Math.max(CHART_MIN_ROWS, high - start + 1),
    nut: start === 1,
    dots: fretted,
    open: shown.filter((dot) => dot.fret === 0),
    muted,
    barre: barred ? { fret: low, from: Math.min(...atLow), to: Math.max(...atLow) } : null,
  };
}
