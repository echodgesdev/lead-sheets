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
const BASS_DOT = 6;
const INTERVALS = ['R', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7'];
const KEY_OCTAVES = 3;
const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_PCS = { 1: 1, 3: 2, 6: 4, 8: 5, 10: 6 };

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

function chordLabel(chord, voiced, names) {
  const root = displayName(chord.chord.replace(/(m|dim)$/, ''));
  const bass = voiced[0] % OCTAVE === chord.pc ? '' : `/${displayName(names[voiced[0] % OCTAVE])}`;
  return hubText(`${root}${bass}`, QUALITY_LABELS[chord.quality], 'clock-center');
}

export function renderClock({ names, scalePcs, chord, voiced, tonicMidi, noteMidiOf, noteMode, note }) {
  const shown = noteMode ? [note.midi] : voiced;
  const chordPcs = noteMode ? [note.pc] : chordPitches(chord.pc, chord.quality);
  const art = svg('svg', { class: 'clock-art', viewBox: '-100 -100 200 200', role: 'group', 'aria-label': 'Chromatic clock' });
  for (let pc = 0; pc < NOTES; pc++) {
    art.append(svg('path', {
      class: 'clock-hit',
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
    const label = classes('clock-label', scalePcs.includes(pc) && cls.inKey, chordPcs.includes(pc) && cls.voiced);
    art.append(svg('line', { class: 'clock-spoke', x1: 0, y1: 0, x2: x, y2: y }), svg('text', { class: label, x: lx, y: ly }, displayName(names[pc])));
  }
  const scale = [...scalePcs].sort((a, b) => a - b).map((pc) => polar(CLOCK_RINGS.at(-1), angle(pc)));
  const dots = shown.map((midi) => polar(ringOf(midi, tonicMidi), angle(midi % OCTAVE)));
  art.append(svg('polygon', { class: 'clock-scale', points: points(scale) }));
  if (!noteMode) art.append(svg('polygon', { class: 'clock-chord', points: points(dots) }));
  shown.forEach((midi, i) => {
    const [cx, cy] = dots[i];
    art.append(svg('circle', {
      class: classes('clock-dot', i === 0 && 'bass'),
      cx,
      cy,
      r: i === 0 ? BASS_DOT : DOT,
      role: 'button',
      tabindex: 0,
      'aria-label': displayName(names[midi % OCTAVE]),
      'data-notes': notesAttr([midi]),
    }));
  });
  art.append(noteMode ? hubText(displayName(note.name), `degree ${note.degree}`, 'clock-center') : chordLabel(chord, voiced, names));
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

function chainRow(item, picked, { align, names, tonic, tonicMidi, scalePcs, noteMidiOf }) {
  const row = div(classes('chain-row', picked && cls.active));
  const name = plainButton(span('circle-numeral', item.numeral), 'chain-name');
  name.append(span(null, displayName(item.chord)));
  name.dataset.slot = item.slot;
  row.append(name);
  const steps = chordSteps(item.quality);
  const pcs = chordPitches(item.pc, item.quality);
  const rootMidi = noteMidiOf(item.pc);
  const byRoot = align === alignId.root;
  for (let c = 0; c < NOTES; c++) {
    const pc = (tonic + c) % NOTES;
    const notePc = byRoot ? (item.pc + c) % NOTES : pc;
    const on = byRoot ? steps.includes(c) : pcs.includes(pc);
    const notes = byRoot ? (c ? [rootMidi, rootMidi + c] : [rootMidi]) : [tonicMidi + c];
    const cell = plainButton(on ? displayName(names[notePc]) : '', classes('chain-cell', on && cls.voiced, !byRoot && scalePcs.includes(pc) && cls.inKey));
    cell.dataset.notes = notesAttr(notes);
    cell.setAttribute('aria-label', byRoot ? `${displayName(item.chord)} ${INTERVALS[c]}, ${displayName(names[notePc])}` : displayName(names[pc]));
    row.append(cell);
  }
  return row;
}

function noteRow(item, degree, picked, { align, tonic, tonicMidi }) {
  const letter = displayName(item.chord.replace(/(m|dim)$/, ''));
  const row = div(classes('chain-row', picked && cls.active));
  const name = plainButton(span('circle-degree', String(degree)), 'chain-name');
  name.append(span(null, letter));
  name.dataset.slot = item.slot;
  row.append(name);
  const step = (item.pc - tonic + NOTES) % NOTES;
  for (let c = 0; c < NOTES; c++) {
    const on = c === step;
    const cell = plainButton(on ? (align === alignId.root ? INTERVALS[c] : letter) : '', classes('chain-cell', on && cls.voiced));
    cell.dataset.notes = notesAttr([tonicMidi + c]);
    cell.setAttribute('aria-label', on ? `${letter}, degree ${degree}` : INTERVALS[c]);
    row.append(cell);
  }
  return row;
}

export function renderChain(model) {
  const chain = div('chain');
  chain.append(chainHead(model.align, model.names, model.tonic));
  model.items.forEach((item, i) => {
    const picked = i === model.chordIndex;
    chain.append(model.noteMode ? noteRow(item, i + 1, picked, model) : chainRow(item, picked, model));
  });
  return chain;
}

function pianoKey(midi, pc, index, shade, { names, scalePcs, voiced, noteMode, note }) {
  const lit = noteMode ? midi === note.midi : voiced.includes(midi);
  const key = plainButton('', classes('key', shade, scalePcs.includes(pc) && cls.inKey, lit && cls.voiced));
  key.style.setProperty('--i', index);
  key.dataset.notes = notesAttr([midi]);
  key.setAttribute('aria-label', `${displayName(names[pc])}${Math.floor(midi / OCTAVE) - 1}`);
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
