import { svg, polar, annularSector } from '../core/svg.js';
import { div, span, plainButton, classes, cls } from '../core/dom.js';
import { qualityId, shapeId, displayName, stepPitches } from '../sheet/circle.js';
import { modeId, chordRoot } from '../sheet/theory-model.js';

const NOTES = 12;
const STEP = 360 / NOTES;
const OCTAVE = 12;
const CLOCK_RINGS = [42, 63, 84];
const CLOCK_HIT = [16, 100];
const CLOCK_LABEL = 93;
const HUB_MAIN_DY = '-0.25em';
const HUB_SUB_DY = '1.6em';
const DOT = 4.5;
const ROOT_DOT = 6;
const INTERVALS = ['R', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7'];
const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_PCS = { 1: 1, 3: 2, 6: 4, 8: 5, 10: 6 };
const FRET_NUT = 20;
const FRET_W = 22;
const FRET_END = 4;
const FRET_TOP = 8;
const FRET_BOTTOM = 18;
const STRING_GAP = 13;
const FRET_DOT_R = 5.2;
const FRET_INLAY_R = 2.6;
const FRET_INLAYS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
const FRET_NUM_DY = 13;
const FRET_STRING_W = 0.7;
const FRET_STRING_GROW = 0.25;
const PATTERN_ROWS = { [modeId.scale]: scaleRows, [modeId.sequence]: sequenceRows };

export const alignId = Object.freeze({
  root: 'root',
  key: 'key',
});

export const labelId = Object.freeze({
  none: 'none',
  name: 'name',
  degree: 'degree',
});

const QUALITY_LABELS = {
  [qualityId.major]: 'Major',
  [qualityId.minor]: 'minor',
  [qualityId.diminished]: 'diminished',
};

export function hubText(main, sub, className = '') {
  const text = svg('text', { class: `hub-name ${className}`.trim(), x: 0, y: 0 });
  text.append(svg('tspan', { x: 0, dy: HUB_MAIN_DY }, main), svg('tspan', { x: 0, dy: HUB_SUB_DY, class: 'hub-quality' }, sub));
  return text;
}

function notesAttr(midis) {
  return midis.join(',');
}

function angle(pc) {
  return pc * STEP - 90;
}

function ringOf(midi, tonicMidi) {
  return CLOCK_RINGS[Math.min(CLOCK_RINGS.length - 1, Math.max(0, Math.floor((midi - tonicMidi) / OCTAVE)))];
}

function points(list) {
  return list.map(([x, y]) => `${x},${y}`).join(' ');
}

function rootLetter(chord) {
  return displayName(chordRoot(chord));
}

function isBlocked({ locked, allowed }, pc) {
  return locked && !allowed.includes(pc);
}

function isOutside({ scalePcs }, pc) {
  return !scalePcs.includes(pc);
}

export function stepsOf(run, midi, drawn) {
  return run
    .flatMap((step, i) => (step.some((m) => m === midi || (!drawn.includes(m) && m % OCTAVE === midi % OCTAVE)) ? [i] : []))
    .join(' ');
}

function centerLabel({ mode, chord, voiced, names, note, scale, tonic, shape, shapeOf, key }) {
  if (mode === modeId.sequence) return hubText(key.root, key.quality, 'clock-center');
  if (mode === modeId.note) return hubText(displayName(note.name), `degree ${note.degree}`, 'clock-center');
  if (mode === modeId.scale) return hubText(displayName(names[tonic]), scale.name, 'clock-center');
  const bass = voiced[0] % OCTAVE === chord.pc ? '' : `/${displayName(names[voiced[0] % OCTAVE])}`;
  const root = rootLetter(chord.chord);
  const sub = shape === shapeId.triad ? QUALITY_LABELS[chord.quality] : displayName(shapeOf(chord).name).slice(root.length);
  return hubText(`${root}${bass}`, sub, 'clock-center');
}

export function renderClock(model) {
  const { names, scalePcs, shown, shownPcs, rootPc, tonicMidi, noteMidiOf, mode } = model;
  const dotted = mode === modeId.scale ? shown.slice(0, -1) : shown;
  const art = svg('svg', { class: 'clock-art', viewBox: '-100 -100 200 200', role: 'group', 'aria-label': 'Chromatic clock' });
  for (let pc = 0; pc < NOTES; pc++) {
    art.append(svg('path', {
      class: classes('clock-hit', isBlocked(model, pc) && cls.blocked),
      d: annularSector(CLOCK_HIT, angle(pc), STEP),
      role: 'button',
      tabindex: 0,
      'aria-label': displayName(names[pc]),
      'data-notes': notesAttr([noteMidiOf(pc)]),
    }));
  }
  for (const r of CLOCK_RINGS) art.append(svg('circle', { class: 'clock-ring', r }));
  for (let pc = 0; pc < NOTES; pc++) {
    const [x, y] = polar(CLOCK_RINGS.at(-1), angle(pc));
    const [lx, ly] = polar(CLOCK_LABEL, angle(pc));
    const shownHere = shownPcs.includes(pc);
    const label = classes('clock-label', scalePcs.includes(pc) && cls.inKey, shownHere && cls.voiced, shownHere && isOutside(model, pc) && cls.outside, isBlocked(model, pc) && cls.blocked);
    art.append(svg('line', { class: 'clock-spoke', x1: 0, y1: 0, x2: x, y2: y }), svg('text', { class: label, x: lx, y: ly }, displayName(names[pc])));
  }
  const keyShape = [...scalePcs].sort((a, b) => a - b).map((pc) => polar(CLOCK_RINGS.at(-1), angle(pc)));
  const dots = dotted.map((midi) => polar(ringOf(midi, tonicMidi), angle(midi % OCTAVE)));
  art.append(svg('polygon', { class: 'clock-scale', points: points(keyShape) }));
  if (mode !== modeId.note) art.append(svg('polygon', { class: 'clock-chord', points: points(dots) }));
  dotted.forEach((midi, i) => {
    const [cx, cy] = dots[i];
    const root = midi % OCTAVE === rootPc;
    art.append(svg('circle', {
      class: classes('clock-dot', root && cls.root, !root && isOutside(model, midi % OCTAVE) && cls.outside),
      cx,
      cy,
      r: root ? ROOT_DOT : DOT,
      role: 'button',
      tabindex: 0,
      'aria-label': displayName(names[midi % OCTAVE]),
      'data-notes': notesAttr([midi]),
      'data-step': stepsOf(model.run, midi, dotted),
    }));
  });
  art.append(centerLabel(model));
  return art;
}

function chainHead(align, names, tonic) {
  const head = div('chain-row chain-head');
  head.append(span());
  for (let c = 0; c < NOTES; c++) {
    head.append(span(null, align === alignId.root ? INTERVALS[c] : displayName(names[(tonic + c) % NOTES])));
  }
  return head;
}

function rowName(top, topClass, letter, slot) {
  const name = plainButton(span(topClass, top), 'chain-name');
  name.append(span(null, letter));
  if (slot) name.dataset.slot = slot;
  return name;
}

function chordRow(item, picked, model) {
  const { align, names, tonic, tonicMidi, scalePcs, noteMidiOf } = model;
  const row = div(classes('chain-row', picked && cls.active));
  const shaped = model.shapeOf(item);
  row.append(rowName(item.numeral, 'circle-numeral', displayName(shaped.name), item.slot));
  const steps = shaped.steps.map((step) => step % NOTES);
  const pcs = stepPitches(item.pc, shaped.steps);
  const rootMidi = noteMidiOf(item.pc);
  const byRoot = align === alignId.root;
  for (let c = 0; c < NOTES; c++) {
    const pc = (tonic + c) % NOTES;
    const notePc = byRoot ? (item.pc + c) % NOTES : pc;
    const on = byRoot ? steps.includes(c) : pcs.includes(pc);
    const notes = byRoot ? (c ? [rootMidi, rootMidi + c] : [rootMidi]) : [tonicMidi + c];
    const cell = plainButton(on ? displayName(names[notePc]) : '', classes(
      'chain-cell',
      on && cls.voiced,
      on && notePc === item.pc && cls.root,
      on && notePc !== item.pc && isOutside(model, notePc) && cls.outside,
      !byRoot && scalePcs.includes(pc) && cls.inKey,
      isBlocked(model, notePc) && cls.blocked,
    ));
    cell.dataset.notes = notesAttr(notes);
    cell.setAttribute('aria-label', byRoot ? `${displayName(item.chord)} ${INTERVALS[c]}, ${displayName(names[notePc])}` : displayName(names[pc]));
    row.append(cell);
  }
  return row;
}

function singleRow({ top, topClass, letter, slot, pc, picked, root }, model) {
  const { align, tonic, tonicMidi } = model;
  const row = div(classes('chain-row', picked && cls.active));
  row.append(rowName(top, topClass, letter, slot));
  const step = (pc - tonic + NOTES) % NOTES;
  for (let c = 0; c < NOTES; c++) {
    const on = c === step;
    const cellPc = (tonic + c) % NOTES;
    const cell = plainButton(on ? (align === alignId.root ? INTERVALS[c] : letter) : '', classes(
      'chain-cell',
      on && cls.voiced,
      on && root && cls.root,
      on && !root && isOutside(model, cellPc) && cls.outside,
      isBlocked(model, cellPc) && cls.blocked,
    ));
    cell.dataset.notes = notesAttr([tonicMidi + c]);
    cell.setAttribute('aria-label', on ? `${letter}, ${top}` : INTERVALS[c]);
    row.append(cell);
  }
  return row;
}

function noteRows(model) {
  return model.items.map((item, i) => singleRow({
    top: String(i + 1),
    topClass: 'circle-degree',
    letter: rootLetter(item.chord),
    slot: item.slot,
    pc: item.pc,
    picked: i === model.chordIndex,
    root: item.pc === model.rootPc,
  }, model));
}

function patternRow({ top, label, title, play, pcs, rootPc, midiOf, stepsAt, picked }, model) {
  const { names, keyTonicPc, keyTonicMidi, scalePcs } = model;
  const row = div(classes('chain-row', picked && cls.active));
  const name = rowName(top, 'circle-degree', label);
  Object.assign(name.dataset, play);
  name.setAttribute('aria-label', title);
  row.append(name);
  for (let c = 0; c < NOTES; c++) {
    const pc = (keyTonicPc + c) % NOTES;
    const on = pcs.includes(pc);
    const cell = plainButton('', classes(
      'chain-cell',
      scalePcs.includes(pc) && cls.inKey,
      on && cls.voiced,
      on && pc === rootPc && cls.root,
      on && pc !== rootPc && isOutside(model, pc) && cls.outside,
      isBlocked(model, pc) && cls.blocked,
    ));
    cell.dataset.notes = notesAttr([on ? midiOf(pc) : keyTonicMidi + c]);
    const steps = on ? stepsAt(pc) : '';
    if (steps) cell.dataset.step = steps;
    cell.setAttribute('aria-label', `${title}, ${displayName(names[pc])}`);
    row.append(cell);
  }
  return row;
}

function midiWithPc(midis, pc) {
  return midis.find((midi) => midi % OCTAVE === pc);
}

function scaleRows(model) {
  return model.scales.map((scale) => {
    const picked = scale.id === model.scale.id;
    return patternRow({
      top: scale.top,
      label: scale.short,
      title: scale.name,
      play: { scale: scale.id },
      pcs: scale.pcs,
      rootPc: scale.root,
      midiOf: (pc) => midiWithPc(scale.run, pc),
      stepsAt: (pc) => (picked ? stepsOf(model.run, pc, []) : ''),
      picked,
    }, model);
  });
}

function sequenceRows(model) {
  return model.steps.map((step, i) => patternRow({
    top: step.top,
    label: step.label,
    title: step.label,
    play: { notes: notesAttr(step.midis) },
    pcs: step.midis.map((midi) => midi % OCTAVE),
    rootPc: step.rootPc,
    midiOf: (pc) => midiWithPc(step.midis, pc),
    stepsAt: () => String(i),
    picked: false,
  }, model));
}

export function renderChain(model) {
  const patterns = PATTERN_ROWS[model.mode];
  const chain = div(classes('chain', patterns && 'chain-patterns'));
  chain.append(chainHead(model.align, model.names, model.keyTonicPc));
  if (model.mode === modeId.note) chain.append(...noteRows(model));
  else if (patterns) chain.append(...patterns(model));
  else model.items.forEach((item, i) => chain.append(chordRow(item, i === model.chordIndex, model)));
  return chain;
}

function pianoKey(midi, pc, index, shade, model) {
  const lit = model.shown.includes(midi);
  const key = plainButton('', classes(
    'key',
    shade,
    lit && cls.voiced,
    lit && pc === model.rootPc && cls.root,
    lit && pc !== model.rootPc && isOutside(model, pc) && cls.outside,
    isBlocked(model, pc) && cls.blocked,
  ));
  key.style.setProperty('--i', index);
  key.dataset.notes = notesAttr([midi]);
  const steps = stepsOf(model.run, midi, model.shown);
  if (steps) key.dataset.step = steps;
  key.setAttribute('aria-label', `${displayName(model.names[pc])}${Math.floor(midi / OCTAVE) - 1}`);
  return key;
}

function keyDot(pc, center, whites, model) {
  const dot = span(classes('key-dot', model.scalePcs.includes(pc) && cls.inKey, model.locked && model.allowed.includes(pc) && cls.allowed));
  dot.style.setProperty('--x', (center * 100) / whites);
  return dot;
}

function keyRange({ shown, tonicMidi, minOctaves }) {
  const low = Math.min(tonicMidi, ...shown);
  const start = low - (low % OCTAVE);
  const octaves = Math.max(minOctaves, Math.ceil((Math.max(...shown) + 1 - start) / OCTAVE));
  return { start, octaves };
}

export function renderKeys(model) {
  const { start, octaves } = keyRange(model);
  const whites = octaves * WHITE_PCS.length;
  const board = div('keys');
  const dots = div('key-dots');
  const blacks = [];
  for (let o = 0; o < octaves; o++) {
    WHITE_PCS.forEach((pc, i) => {
      const index = o * WHITE_PCS.length + i;
      board.append(pianoKey(start + o * OCTAVE + pc, pc, index, 'white', model));
      dots.append(keyDot(pc, index + 0.5, whites, model));
    });
    for (const [pc, i] of Object.entries(BLACK_PCS)) {
      const index = o * WHITE_PCS.length + i;
      blacks.push(pianoKey(start + o * OCTAVE + Number(pc), Number(pc), index, 'black', model));
      dots.append(keyDot(Number(pc), index, whites, model));
    }
  }
  board.append(...blacks);
  const view = div('keys-view');
  view.style.setProperty('--whites', whites);
  view.append(board, dots);
  return view;
}

function fretX(fret) {
  return fret ? FRET_NUT + (fret - 0.5) * FRET_W : FRET_NUT / 2;
}

function stringY(string, count) {
  return FRET_TOP + (count - 1 - string) * STRING_GAP;
}

function fretGrid({ strings, frets }) {
  const bottom = stringY(0, strings.length);
  const top = stringY(strings.length - 1, strings.length);
  const end = FRET_NUT + frets * FRET_W;
  const parts = [svg('line', { class: 'fret-nut', x1: FRET_NUT, y1: top, x2: FRET_NUT, y2: bottom })];
  for (let fret = 1; fret <= frets; fret++) {
    const x = FRET_NUT + fret * FRET_W;
    parts.push(svg('line', { class: 'fret-line', x1: x, y1: top, x2: x, y2: bottom }));
  }
  for (const fret of FRET_INLAYS.filter((f) => f <= frets)) {
    const double = fret % OCTAVE === 0;
    const middle = (top + bottom) / 2;
    for (const y of double ? [middle - STRING_GAP, middle + STRING_GAP] : [middle]) {
      parts.push(svg('circle', { class: 'fret-inlay', cx: fretX(fret), cy: y, r: FRET_INLAY_R }));
    }
    parts.push(svg('text', { class: 'fret-num', x: fretX(fret), y: bottom + FRET_NUM_DY }, String(fret)));
  }
  strings.forEach((_, string) => {
    const y = stringY(string, strings.length);
    parts.push(svg('line', { class: 'fret-string', x1: FRET_NUT, y1: y, x2: end, y2: y, 'stroke-width': FRET_STRING_W + (strings.length - 1 - string) * FRET_STRING_GROW }));
  });
  return parts;
}

function fretHits(model, { strings, frets }) {
  return strings.flatMap((open, string) => Array.from({ length: frets + 1 }, (_, fret) => {
    const midi = open + fret;
    const pc = midi % OCTAVE;
    const name = displayName(model.names[pc]);
    const y = stringY(string, strings.length);
    const hit = svg('g', {
      class: classes('fret-hit', isBlocked(model, pc) && cls.blocked),
      role: 'button',
      tabindex: -1,
      'aria-label': `${name}, string ${strings.length - string} fret ${fret}`,
      'data-notes': notesAttr([midi]),
    });
    hit.append(
      svg('rect', { x: fret ? FRET_NUT + (fret - 1) * FRET_W : 0, y: y - STRING_GAP / 2, width: fret ? FRET_W : FRET_NUT, height: STRING_GAP }),
      svg('circle', { class: 'fret-ghost', cx: fretX(fret), cy: y, r: FRET_DOT_R }),
      svg('text', { class: 'fret-label', x: fretX(fret), y }, name),
    );
    return hit;
  }));
}

function dotLabel(model, pc, labels) {
  if (labels === labelId.name) return displayName(model.names[pc]);
  const ref = model.mode === modeId.note ? model.keyTonicPc : model.rootPc;
  return INTERVALS[(pc - ref + OCTAVE) % OCTAVE];
}

function fretDot(model, dot, count, labels) {
  const pc = dot.midi % OCTAVE;
  const root = pc === model.rootPc;
  const x = fretX(dot.fret);
  const y = stringY(dot.string, count);
  const node = svg('g', {
    class: classes('fret-dot', root && cls.root, !root && isOutside(model, pc) && cls.outside, dot.faint && cls.faint),
    role: 'button',
    tabindex: dot.faint ? -1 : 0,
    'aria-label': `${displayName(model.names[pc])}, string ${count - dot.string} fret ${dot.fret}`,
    'data-notes': notesAttr([dot.midi]),
    'data-step': dot.steps.join(' '),
  });
  node.append(svg('circle', { cx: x, cy: y, r: FRET_DOT_R }));
  if (labels !== labelId.none) node.append(svg('text', { class: 'fret-label', x, y }, dotLabel(model, pc, labels)));
  return node;
}

export function renderFretboard(model, layout, labels = labelId.none) {
  const { instrument, dots, muted } = layout;
  const { strings, frets } = instrument;
  const width = FRET_NUT + frets * FRET_W + FRET_END;
  const height = stringY(0, strings.length) + FRET_BOTTOM;
  const art = svg('svg', { class: 'fret-art', viewBox: `0 0 ${width} ${height}`, role: 'group', 'aria-label': 'Fretboard' });
  art.append(...fretGrid(instrument), ...fretHits(model, instrument));
  for (const string of muted) art.append(svg('text', { class: 'fret-muted', x: fretX(0), y: stringY(string, strings.length) }, '×'));
  const ordered = [...dots.filter((dot) => dot.faint), ...dots.filter((dot) => !dot.faint)];
  art.append(...ordered.map((dot) => fretDot(model, dot, strings.length, labels)));
  return art;
}
