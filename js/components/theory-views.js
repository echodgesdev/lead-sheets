import { svg, polar, annularSector } from '../core/svg.js';
import { div, span, plainButton, classes, cls } from '../core/dom.js';
import { qualityId, displayName, chordSteps, chordPitches } from '../sheet/circle.js';

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
const KEY_OCTAVES = 3;
const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_PCS = { 1: 1, 3: 2, 6: 4, 8: 5, 10: 6 };

export const modeId = Object.freeze({
  note: 'note',
  chord: 'chord',
  scale: 'scale',
});

export const alignId = Object.freeze({
  root: 'root',
  key: 'key',
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
  return displayName(chord.replace(/(m|dim)$/, ''));
}

function isBlocked({ locked, allowed }, pc) {
  return locked && !allowed.includes(pc);
}

function centerLabel({ mode, chord, voiced, names, note, scale, tonic }) {
  if (mode === modeId.note) return hubText(displayName(note.name), `degree ${note.degree}`, 'clock-center');
  if (mode === modeId.scale) return hubText(displayName(names[tonic]), scale.name, 'clock-center');
  const bass = voiced[0] % OCTAVE === chord.pc ? '' : `/${displayName(names[voiced[0] % OCTAVE])}`;
  return hubText(`${rootLetter(chord.chord)}${bass}`, QUALITY_LABELS[chord.quality], 'clock-center');
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
    const label = classes('clock-label', scalePcs.includes(pc) && cls.inKey, shownPcs.includes(pc) && cls.voiced, isBlocked(model, pc) && cls.blocked);
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
      class: classes('clock-dot', root && cls.root),
      cx,
      cy,
      r: root ? ROOT_DOT : DOT,
      role: 'button',
      tabindex: 0,
      'aria-label': displayName(names[midi % OCTAVE]),
      'data-notes': notesAttr([midi]),
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
  row.append(rowName(item.numeral, 'circle-numeral', displayName(item.chord), item.slot));
  const steps = chordSteps(item.quality);
  const pcs = chordPitches(item.pc, item.quality);
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

function scaleRows(model) {
  return model.scale.pcs.map((pc, i) => singleRow({
    top: String(i + 1),
    topClass: 'circle-degree',
    letter: displayName(model.names[pc]),
    pc,
    picked: false,
    root: i === 0,
  }, model));
}

export function renderChain(model) {
  const chain = div('chain');
  chain.append(chainHead(model.align, model.names, model.tonic));
  if (model.mode === modeId.note) chain.append(...noteRows(model));
  else if (model.mode === modeId.scale) chain.append(...scaleRows(model));
  else model.items.forEach((item, i) => chain.append(chordRow(item, i === model.chordIndex, model)));
  return chain;
}

function pianoKey(midi, pc, index, shade, model) {
  const lit = model.shown.includes(midi);
  const key = plainButton('', classes(
    'key',
    shade,
    model.scalePcs.includes(pc) && cls.inKey,
    lit && cls.voiced,
    lit && pc === model.rootPc && cls.root,
    isBlocked(model, pc) && cls.blocked,
  ));
  key.style.setProperty('--i', index);
  key.dataset.notes = notesAttr([midi]);
  key.setAttribute('aria-label', `${displayName(model.names[pc])}${Math.floor(midi / OCTAVE) - 1}`);
  return key;
}

export function renderKeys(model) {
  const start = model.tonicMidi - (model.tonicMidi % OCTAVE);
  const board = div('keys');
  const blacks = [];
  for (let o = 0; o < KEY_OCTAVES; o++) {
    WHITE_PCS.forEach((pc, i) => board.append(pianoKey(start + o * OCTAVE + pc, pc, o * WHITE_PCS.length + i, 'white', model)));
    for (const [pc, i] of Object.entries(BLACK_PCS)) {
      blacks.push(pianoKey(start + o * OCTAVE + Number(pc), Number(pc), o * WHITE_PCS.length + i, 'black', model));
    }
  }
  board.append(...blacks);
  return board;
}
