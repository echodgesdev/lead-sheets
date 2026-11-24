import { svg, polar, annularSector } from '../core/svg.js';
import { div, span, plainButton, classes, cls } from '../core/dom.js';
import { mod12, OCTAVE } from '../core/math.js';
import { qualityId, shapeId, displayName, stepPitches, intervalNames } from '../sheet/circle.js';
import { IONIAN } from '../sheet/chords.js';
import { modeId, chordRoot } from '../sheet/theory-model.js';
import { staffLayout, signatureSteps, STAVES, clefId } from '../sheet/staff.js';
import { chartLayout } from '../sheet/fretboard.js';
import { visId, alignId, neckShapeId } from '../sheet/vis-spec.js';
import { theoryArt, isBlocked, isOutside, noteAttrs, pcName, points, stepsOf } from './theory-art.js';
import { renderTonnetz } from './tonnetz.js';

const STEP = 360 / OCTAVE;
const COLUMNS = Array.from({ length: OCTAVE }, (_, c) => c);
export const CIRCLE_BOX = '-100 -100 200 200';
const CLOCK_RINGS = [42, 63, 84];
const CLOCK_HIT = [16, 100];
const CLOCK_LABEL = 93;
const HUB_MAIN_DY = '-0.25em';
const HUB_SUB_DY = '1.6em';
const DOT = 4.5;
const ROOT_DOT = 6;
const INTERVALS = ['R', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7'];
const WHITE_PCS = IONIAN;
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
const NOTATION_SCALE = 1.6;
const NOTATION_HIT_R = 7;
const NOTATION_MIN_COLS = 6;
const TAB_TOP = 9;
const TAB_GAP = 10;
const TAB_LEFT = 22;
const TAB_COL = 18;
const TAB_END = 8;
const TAB_BAR = 2;
const TAB_LETTERS = ['T', 'A', 'B'];
const CHART_SIDE = 18;
const CHART_STRING_GAP = 14;
const CHART_FRET_GAP = 18;
const CHART_NAME_Y = 9;
const CHART_MARK_Y = 25;
const CHART_TOP = 34;
const CHART_BOTTOM = 6;
const CHART_START_DX = 11;
const CHART_DOT_R = 5.5;
const CHART_OPEN_R = 4;
const STAFF_GAP = 8;
const STAFF_HALF = STAFF_GAP / 2;
const STAFF_SPAN = 8;
const STAFF_CLEF_ROOM = 4;
const STAFF_MARGIN = 6;
const STAFF_EDGE = 2;
const STAFF_CLEF_X = 4;
const STAFF_CLEF_SPACES = 4;
const STAFF_SIG_X = 30;
const STAFF_SIG_W = 7;
const STAFF_LEAD = 10;
const STAFF_COL = 22;
const STAFF_END = 8;
const STAFF_LEDGER = 7;
const STAFF_HEAD_RX = 4.6;
const STAFF_HEAD_RY = 3.4;
const STAFF_HEAD_TILT = -20;
const STAFF_SECOND_SHIFT = 8.5;
const STAFF_ACC_DX = 10;
const STAFF_ACC_STAGGER = 7;
const STAFF_CLEFS = { [clefId.treble]: { glyph: '𝄞', line: 32 }, [clefId.bass]: { glyph: '𝄢', line: 24 } };
const STAFF_ACCIDENTALS = { [-2]: '♭♭', [-1]: '♭', 0: '♮', 1: '♯', 2: '×' };
const CHAIN_ROWS = { [modeId.note]: noteRows, [modeId.chord]: chordRows, [modeId.scale]: scaleRows, [modeId.sequence]: sequenceRows };
const PATTERN_MODES = new Set([modeId.scale, modeId.sequence]);
const CHART_TITLES = { [modeId.chord]: chordTitle, [modeId.scale]: scaleTitle, [modeId.note]: (model) => displayName(model.note.name), [modeId.sequence]: sequenceTitle };

export const labelId = Object.freeze({
  none: 'none',
  name: 'name',
  degree: 'degree',
});

export const THEORY_VIEWS = Object.freeze({
  [visId.fifths]: { render: fifthsArt },
  [visId.clock]: { render: renderClock },
  [visId.intervals]: { render: (model, { align }) => renderChain(model, align) },
  [visId.piano]: { render: renderKeys },
  [visId.fretboard]: { neck: true, show: true, labels: true, render: (model, { layout, labels }) => renderFretboard(model, layout, labels) },
  [visId.tab]: { neck: true, render: (model, { layout }) => renderTab(model, layout) },
  [visId.chart]: { neck: true, labels: true, render: (model, { layout, labels }) => renderChart(model, layout, labels) },
  [visId.clef]: { render: renderStaff },
  [visId.tonnetz]: { render: renderTonnetz },
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

function noteButton(text, { class: className, ...attrs }) {
  const node = plainButton(text, className);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  return node;
}

function pitchName(model, midi) {
  return `${pcName(model, mod12(midi))}${Math.floor(midi / OCTAVE) - 1}`;
}

function angle(pc) {
  return pc * STEP - 90;
}

function ringOf(midi, tonicMidi) {
  return CLOCK_RINGS[Math.min(CLOCK_RINGS.length - 1, Math.max(0, Math.floor((midi - tonicMidi) / OCTAVE)))];
}

function rootLetter(chord) {
  return displayName(chordRoot(chord));
}

function fifthsArt(model, { fifths }) {
  fifths.tagSteps(model.run);
  return fifths.el;
}

function slashBass(chord, bassMidi) {
  const bassPc = mod12(bassMidi);
  return bassPc === chord.pc ? '' : `/${displayName(intervalNames(chord.chord)[bassPc])}`;
}

function centerLabel({ mode, chord, voiced, names, note, scale, tonic, shape, shapeOf, key }) {
  if (mode === modeId.sequence) return hubText(key.root, key.quality, 'clock-center');
  if (mode === modeId.note) return hubText(displayName(note.name), `degree ${note.degree}`, 'clock-center');
  if (mode === modeId.scale) return hubText(displayName(names[tonic]), scale.name, 'clock-center');
  const bass = slashBass(chord, voiced[0]);
  const root = rootLetter(chord.chord);
  const sub = shape === shapeId.triad ? QUALITY_LABELS[chord.quality] : displayName(shapeOf(chord).name).slice(root.length);
  return hubText(`${root}${bass}`, sub, 'clock-center');
}

export function renderClock(model) {
  const { scalePcs, shown, shownPcs, tonicMidi, noteMidiOf, mode } = model;
  const dotted = mode === modeId.scale ? shown.slice(0, -1) : shown;
  const art = theoryArt('clock-art', CIRCLE_BOX, 'Chromatic clock');
  for (const pc of COLUMNS) {
    art.append(svg('path', {
      ...noteAttrs(model, pc, { className: 'clock-hit', midis: [noteMidiOf(pc)], label: pcName(model, pc), on: false }),
      d: annularSector(CLOCK_HIT, angle(pc), STEP),
    }));
  }
  for (const r of CLOCK_RINGS) art.append(svg('circle', { class: 'clock-ring', r }));
  for (const pc of COLUMNS) {
    const [x, y] = polar(CLOCK_RINGS.at(-1), angle(pc));
    const [lx, ly] = polar(CLOCK_LABEL, angle(pc));
    const shownHere = shownPcs.includes(pc);
    const label = classes('clock-label', scalePcs.includes(pc) && cls.inKey, shownHere && cls.voiced, shownHere && isOutside(model, pc) && cls.outside, isBlocked(model, pc) && cls.blocked);
    art.append(svg('line', { class: 'clock-spoke', x1: 0, y1: 0, x2: x, y2: y }), svg('text', { class: label, x: lx, y: ly }, pcName(model, pc)));
  }
  const keyShape = [...scalePcs].sort((a, b) => a - b).map((pc) => polar(CLOCK_RINGS.at(-1), angle(pc)));
  const dots = dotted.map((midi) => polar(ringOf(midi, tonicMidi), angle(mod12(midi))));
  art.append(svg('polygon', { class: 'clock-scale', points: points(keyShape) }));
  if (mode !== modeId.note) art.append(svg('polygon', { class: 'clock-chord', points: points(dots) }));
  dotted.forEach((midi, i) => {
    const [cx, cy] = dots[i];
    const pc = mod12(midi);
    art.append(svg('circle', {
      ...noteAttrs(model, pc, { className: 'note-dot clock-dot', midis: [midi], label: pcName(model, pc), steps: stepsOf(model.run, midi, dotted) }),
      cx,
      cy,
      r: pc === model.rootPc ? ROOT_DOT : DOT,
    }));
  });
  art.append(centerLabel(model));
  return art;
}

function chainHead(align, model) {
  const head = div('chain-row chain-head');
  head.append(span());
  for (const c of COLUMNS) {
    head.append(span(null, align === alignId.root ? INTERVALS[c] : pcName(model, mod12(model.keyTonicPc + c))));
  }
  return head;
}

function rowName(top, topClass, letter, slot) {
  const name = plainButton(span(topClass, top), 'chain-name');
  name.append(span(null, letter));
  if (slot) name.dataset.slot = slot;
  return name;
}

function chainCell(model, { pc, on, text = '', shade = false, ...note }) {
  return noteButton(on ? text : '', noteAttrs(model, pc, {
    ...note,
    on,
    className: classes('chain-cell', shade && model.scalePcs.includes(pc) && cls.inKey, on && cls.voiced),
  }));
}

function chainRow(model, name, picked, cells) {
  const row = div(classes('chain-row', picked && cls.active));
  row.append(name, ...cells.map((cell) => chainCell(model, cell)));
  return row;
}

function chordRows(model, align) {
  const byRoot = align === alignId.root;
  return model.items.map((item, i) => {
    const shaped = model.shapeOf(item);
    const pcs = stepPitches(item.pc, shaped.steps);
    const rootMidi = model.noteMidiOf(item.pc);
    const spelled = intervalNames(item.chord).map(displayName);
    const cells = COLUMNS.map((c) => {
      const pc = mod12((byRoot ? item.pc : model.keyTonicPc) + c);
      const on = pcs.includes(pc);
      const name = byRoot || on ? spelled[pc] : pcName(model, pc);
      return {
        pc,
        on,
        rootPc: item.pc,
        text: name,
        shade: !byRoot,
        midis: byRoot ? (c ? [rootMidi, rootMidi + c] : [rootMidi]) : [model.keyTonicMidi + c],
        label: byRoot ? `${displayName(item.chord)} ${INTERVALS[c]}, ${name}` : name,
      };
    });
    return chainRow(model, rowName(item.numeral, 'circle-numeral', displayName(shaped.name), item.slot), i === model.chordIndex, cells);
  });
}

function noteRows(model, align) {
  return model.items.map((item, i) => {
    const top = String(i + 1);
    const letter = rootLetter(item.chord);
    const cells = COLUMNS.map((c) => {
      const pc = mod12(model.keyTonicPc + c);
      const on = pc === item.pc;
      return {
        pc,
        on,
        text: align === alignId.root ? INTERVALS[c] : letter,
        midis: [model.keyTonicMidi + c],
        label: on ? `${letter}, ${top}` : INTERVALS[c],
      };
    });
    return chainRow(model, rowName(top, 'circle-degree', letter, item.slot), i === model.chordIndex, cells);
  });
}

function patternRow(model, { top, label, title, play, pcs, rootPc, midiOf, stepsAt, picked }) {
  const name = rowName(top, 'circle-degree', label);
  Object.assign(name.dataset, play);
  name.setAttribute('aria-label', title);
  const cells = COLUMNS.map((c) => {
    const pc = mod12(model.keyTonicPc + c);
    const on = pcs.includes(pc);
    return {
      pc,
      on,
      rootPc,
      shade: true,
      midis: [on ? midiOf(pc) : model.keyTonicMidi + c],
      steps: on ? stepsAt(pc) : '',
      label: `${title}, ${pcName(model, pc)}`,
    };
  });
  return chainRow(model, name, picked, cells);
}

function midiWithPc(midis, pc) {
  return midis.find((midi) => mod12(midi) === pc);
}

function scaleRows(model) {
  return model.scales.map((scale) => {
    const picked = scale.id === model.scale.id;
    return patternRow(model, {
      top: scale.top,
      label: scale.short,
      title: scale.name,
      play: { scale: scale.id },
      pcs: scale.pcs,
      rootPc: scale.root,
      midiOf: (pc) => midiWithPc(scale.run, pc),
      stepsAt: (pc) => (picked ? stepsOf(model.run, pc, []) : ''),
      picked,
    });
  });
}

function sequenceRows(model) {
  return model.steps.map((step, i) => patternRow(model, {
    top: step.top,
    label: step.label,
    title: step.label,
    play: { notes: step.midis.join(',') },
    pcs: step.midis.map(mod12),
    rootPc: step.rootPc,
    midiOf: (pc) => midiWithPc(step.midis, pc),
    stepsAt: () => String(i),
    picked: false,
  }));
}

export function renderChain(model, align = alignId.root) {
  const chain = div(classes('chain', PATTERN_MODES.has(model.mode) && 'chain-patterns'));
  chain.append(chainHead(align, model), ...CHAIN_ROWS[model.mode](model, align));
  return chain;
}

function pianoKey(midi, index, shade, model) {
  const lit = model.shown.includes(midi);
  const key = noteButton('', noteAttrs(model, mod12(midi), {
    className: classes('key', shade, lit && cls.voiced),
    on: lit,
    midis: [midi],
    steps: stepsOf(model.run, midi, model.shown),
    label: pitchName(model, midi),
  }));
  key.style.setProperty('--i', index);
  return key;
}

function keyDot(pc, center, whites, model) {
  const dot = span(classes('key-dot', model.scalePcs.includes(pc) && cls.inKey, model.locked && model.allowed.includes(pc) && cls.allowed));
  dot.style.setProperty('--x', (center * 100) / whites);
  return dot;
}

function keyRange({ shown, tonicMidi, minOctaves }) {
  const low = Math.min(tonicMidi, ...shown);
  const start = low - mod12(low);
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
      board.append(pianoKey(start + o * OCTAVE + pc, index, 'white', model));
      dots.append(keyDot(pc, index + 0.5, whites, model));
    });
    for (const [pc, i] of Object.entries(BLACK_PCS)) {
      const index = o * WHITE_PCS.length + i;
      blacks.push(pianoKey(start + o * OCTAVE + Number(pc), index, 'black', model));
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
    const double = mod12(fret) === 0;
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
    const pc = mod12(midi);
    const name = pcName(model, pc);
    const y = stringY(string, strings.length);
    const hit = svg('g', noteAttrs(model, pc, {
      className: 'fret-hit',
      on: false,
      focusable: false,
      midis: [midi],
      label: `${name}, string ${strings.length - string} fret ${fret}`,
    }));
    hit.append(
      svg('rect', { x: fret ? FRET_NUT + (fret - 1) * FRET_W : 0, y: y - STRING_GAP / 2, width: fret ? FRET_W : FRET_NUT, height: STRING_GAP }),
      svg('circle', { class: 'fret-ghost', cx: fretX(fret), cy: y, r: FRET_DOT_R }),
      svg('text', { class: 'fret-label', x: fretX(fret), y }, name),
    );
    return hit;
  }));
}

function dotLabel(model, pc, labels) {
  if (labels === labelId.name) return pcName(model, pc);
  const ref = model.mode === modeId.note ? model.keyTonicPc : model.rootPc;
  return INTERVALS[mod12(pc - ref)];
}

function neckDot(model, dot, { x, y, r, count, labels, className }) {
  const pc = mod12(dot.midi);
  const node = svg('g', noteAttrs(model, pc, {
    className: classes('note-dot', className, dot.faint && cls.faint),
    focusable: !dot.faint,
    midis: [dot.midi],
    steps: dot.steps.join(' '),
    label: `${pcName(model, pc)}, string ${count - dot.string} fret ${dot.fret}`,
  }));
  node.append(svg('circle', { cx: x, cy: y, r }));
  if (labels !== labelId.none) node.append(svg('text', { class: 'fret-label', x, y }, dotLabel(model, pc, labels)));
  return node;
}

function fretDot(model, dot, count, labels) {
  return neckDot(model, dot, { x: fretX(dot.fret), y: stringY(dot.string, count), r: FRET_DOT_R, count, labels, className: 'fret-dot' });
}

export function renderFretboard(model, layout, labels = labelId.none) {
  const { instrument, dots, muted } = layout;
  const { strings, frets } = instrument;
  const width = FRET_NUT + frets * FRET_W + FRET_END;
  const height = stringY(0, strings.length) + FRET_BOTTOM;
  const art = theoryArt('fret-art', `0 0 ${width} ${height}`, 'Fretboard');
  art.append(...fretGrid(instrument), ...fretHits(model, instrument));
  for (const string of muted) art.append(svg('text', { class: 'fret-muted', x: fretX(0), y: stringY(string, strings.length) }, '×'));
  const ordered = [...dots.filter((dot) => dot.faint), ...dots.filter((dot) => !dot.faint)];
  art.append(...ordered.map((dot) => fretDot(model, dot, strings.length, labels)));
  return art;
}

function chordTitle(model, layout) {
  const { chord } = model;
  if (layout.shape === neckShapeId.power) return `${rootLetter(chord.chord)}5`;
  return `${displayName(model.shapeOf(chord).name)}${slashBass(chord, layout.voicing[0] ?? model.voiced[0])}`;
}

function scaleTitle(model) {
  return `${pcName(model, model.tonic)} ${model.scale.name}`;
}

function sequenceTitle({ steps, key }) {
  return steps.length === 1 ? steps[0].label : `${key.root} ${key.quality}`;
}

export function renderChart(model, layout, labels = labelId.none) {
  const count = layout.instrument.strings.length;
  const dot = (each, at) => neckDot(model, each, { ...at, count, labels });
  return chordBox(chartLayout(layout), CHART_TITLES[model.mode](model, layout), { dot });
}

function rootDot(rootPc) {
  return (each, { x, y, r, className }) => {
    const node = svg('g', { class: classes('note-dot', className, mod12(each.midi) === rootPc && cls.root) });
    node.append(svg('circle', { cx: x, cy: y, r }));
    return node;
  };
}

export function chordBox(chart, title, { attrs = {}, rootPc = null, dot = rootDot(rootPc) } = {}) {
  const count = chart.instrument.strings.length;
  const x = (string) => CHART_SIDE + string * CHART_STRING_GAP;
  const lineY = (row) => CHART_TOP + row * CHART_FRET_GAP;
  const fretY = (fret) => lineY(fret - chart.start + 0.5);
  const left = x(0);
  const right = x(count - 1);
  const bottom = lineY(chart.rows);
  const width = right + CHART_SIDE;
  const art = theoryArt('chart-art', `0 0 ${width} ${bottom + CHART_BOTTOM}`, 'Chord chart', attrs);
  art.append(svg('text', { class: 'chart-name', x: width / 2, y: CHART_NAME_Y }, title));
  for (let row = 0; row <= chart.rows; row++) {
    art.append(svg('line', { class: row === 0 && chart.nut ? 'chart-nut' : 'chart-fret', x1: left, y1: lineY(row), x2: right, y2: lineY(row) }));
  }
  for (let string = 0; string < count; string++) art.append(svg('line', { class: 'chart-string', x1: x(string), y1: lineY(0), x2: x(string), y2: bottom }));
  if (!chart.nut) art.append(svg('text', { class: 'chart-start', x: left - CHART_START_DX, y: fretY(chart.start) }, String(chart.start)));
  if (chart.barre) {
    const y = fretY(chart.barre.fret);
    art.append(svg('line', { class: 'chart-barre', x1: x(chart.barre.from), y1: y, x2: x(chart.barre.to), y2: y }));
  }
  for (const string of chart.muted) art.append(svg('text', { class: 'chart-muted', x: x(string), y: CHART_MARK_Y }, '×'));
  art.append(
    ...chart.open.map((each) => dot(each, { x: x(each.string), y: CHART_MARK_Y, r: CHART_OPEN_R, className: 'chart-dot chart-open' })),
    ...chart.dots.map((each) => dot(each, { x: x(each.string), y: fretY(each.fret), r: CHART_DOT_R, className: 'chart-dot' })),
  );
  return art;
}

function notationArt(className, width, height, label) {
  return theoryArt(className, `0 0 ${width} ${height}`, label, { width: width * NOTATION_SCALE });
}

function notationNote(className, model, midi, step, label) {
  return svg('g', noteAttrs(model, mod12(midi), { className: `note-dot ${className}`, midis: [midi], steps: step === null ? '' : String(step), label }));
}

function tabNote(model, { string, fret, midi }, step, x, y, count) {
  const node = notationNote('tab-note', model, midi, step, `${pcName(model, mod12(midi))}, string ${count - string} fret ${fret}`);
  node.append(svg('circle', { class: 'tab-hit', cx: x, cy: y, r: NOTATION_HIT_R }), svg('text', { x, y }, String(fret)));
  return node;
}

export function renderTab(model, layout) {
  const { instrument, columns, muted } = layout;
  const count = instrument.strings.length;
  const lineY = (string) => TAB_TOP + (count - 1 - string) * TAB_GAP;
  const top = lineY(count - 1);
  const bottom = lineY(0);
  const width = TAB_LEFT + Math.max(NOTATION_MIN_COLS, columns.length) * TAB_COL + TAB_END;
  const art = notationArt('tab-art', width, bottom + TAB_TOP, 'Tablature');
  instrument.strings.forEach((_, string) => art.append(svg('line', { class: 'tab-line', x1: TAB_BAR, y1: lineY(string), x2: width - TAB_BAR, y2: lineY(string) })));
  for (const x of [TAB_BAR, width - TAB_BAR]) art.append(svg('line', { class: 'tab-line', x1: x, y1: top, x2: x, y2: bottom }));
  TAB_LETTERS.forEach((letter, i) => art.append(svg('text', { class: 'tab-clef', x: TAB_LEFT / 2, y: top + ((bottom - top) * (i + 1)) / (TAB_LETTERS.length + 1) }, letter)));
  const columnX = (i) => TAB_LEFT + i * TAB_COL + TAB_COL / 2;
  if (columns.length === 1) for (const string of muted) art.append(svg('text', { class: 'tab-muted', x: columnX(0), y: lineY(string) }, '×'));
  columns.forEach((column, i) => {
    for (const position of column.positions) art.append(tabNote(model, position, column.step, columnX(i), lineY(position.string), count));
  });
  return art;
}

function staffBands(layout) {
  let cursor = 0;
  const bands = layout.clefs.map((clef) => {
    const { top } = STAVES[clef];
    const ds = layout.columns.flatMap((column) => column.notes.filter((note) => note.staff === clef).map((note) => note.d));
    const high = Math.max(top + STAFF_CLEF_ROOM, ...ds);
    const low = Math.min(top - STAFF_SPAN - STAFF_CLEF_ROOM, ...ds);
    const lineTop = cursor + STAFF_MARGIN + (high - top) * STAFF_HALF;
    cursor = lineTop + (top - low) * STAFF_HALF + STAFF_MARGIN;
    return { clef, top, y: (d) => lineTop + (top - d) * STAFF_HALF };
  });
  return { bands, height: cursor };
}

function ledgers(art, band, d, x) {
  const bottom = band.top - STAFF_SPAN;
  const lines = [];
  for (let ld = band.top + 2; ld <= d; ld += 2) lines.push(ld);
  for (let ld = bottom - 2; ld >= d; ld -= 2) lines.push(ld);
  for (const ld of lines) art.append(svg('line', { class: 'staff-ledger', x1: x - STAFF_LEDGER, y1: band.y(ld), x2: x + STAFF_LEDGER, y2: band.y(ld) }));
}

function staffNote(model, note, step, x, y) {
  const node = notationNote('staff-note', model, note.midi, step, pitchName(model, note.midi));
  node.append(
    svg('circle', { class: 'staff-hit', cx: x, cy: y, r: NOTATION_HIT_R }),
    svg('ellipse', { cx: x, cy: y, rx: STAFF_HEAD_RX, ry: STAFF_HEAD_RY, transform: `rotate(${STAFF_HEAD_TILT} ${x} ${y})` }),
  );
  return node;
}

export function renderStaff(model) {
  const layout = staffLayout(model);
  const { bands, height } = staffBands(layout);
  const firstX = STAFF_SIG_X + layout.signature.count * STAFF_SIG_W + STAFF_LEAD;
  const width = firstX + Math.max(NOTATION_MIN_COLS, layout.columns.length) * STAFF_COL + STAFF_END;
  const art = notationArt('staff-art', width, height, 'Staff');
  const sigGlyph = STAFF_ACCIDENTALS[layout.signature.acc];
  for (const band of bands) {
    for (let line = 0; line <= STAFF_SPAN; line += 2) {
      const y = band.y(band.top - line);
      art.append(svg('line', { class: 'staff-line', x1: STAFF_EDGE, y1: y, x2: width - STAFF_EDGE, y2: y }));
    }
    const clef = STAFF_CLEFS[band.clef];
    art.append(svg('text', { class: 'staff-clef', x: STAFF_CLEF_X, y: band.y(clef.line), 'font-size': STAFF_GAP * STAFF_CLEF_SPACES }, clef.glyph));
    signatureSteps(layout.signature, band.clef).forEach((d, i) => art.append(svg('text', { class: 'staff-glyph', x: STAFF_SIG_X + i * STAFF_SIG_W, y: band.y(d) }, sigGlyph)));
  }
  if (bands.length > 1) art.append(svg('line', { class: 'staff-line', x1: STAFF_EDGE, y1: bands[0].y(bands[0].top), x2: STAFF_EDGE, y2: bands.at(-1).y(bands.at(-1).top - STAFF_SPAN) }));
  const bandOf = new Map(bands.map((band) => [band.clef, band]));
  layout.columns.forEach((column, i) => {
    const x = firstX + i * STAFF_COL + STAFF_COL / 2;
    let accidentals = 0;
    for (const note of column.notes) {
      const band = bandOf.get(note.staff);
      const y = band.y(note.d);
      const nx = x + (note.offset ? STAFF_SECOND_SHIFT : 0);
      ledgers(art, band, note.d, nx);
      if (note.acc !== null) {
        art.append(svg('text', { class: 'staff-glyph', x: x - STAFF_ACC_DX - (accidentals % 2) * STAFF_ACC_STAGGER, y }, STAFF_ACCIDENTALS[note.acc]));
        accidentals += 1;
      }
      art.append(staffNote(model, note, column.step, nx, y));
    }
  });
  return art;
}
