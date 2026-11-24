import { chordName, chordSpelling, chordTokens, isChord } from './chords.js';
import { spelledNotes } from './circle.js';
import { fretLayout, chartLayout } from './fretboard.js';
import { modeId } from './theory-model.js';
import { neckShapeId } from './vis-spec.js';
import { mod12 } from '../core/math.js';

const TOKEN_RE = /[^\s|]+/g;

function blockChords(block) {
  if (block.type === 'pair') return block.segments.filter((s) => s.chord !== null).map((s) => s.chord);
  if (block.type === 'chords') return chordTokens(block.line).map((t) => t.chord);
  return [];
}

export function songChords(parsed) {
  return [...new Set(parsed.blocks.flatMap(blockChords).map(chordName))];
}

function lineParts(line, shapeLine) {
  const shapes = [...shapeLine.matchAll(TOKEN_RE)].map((m) => m[0]);
  const parts = [];
  let last = 0;
  [...line.matchAll(TOKEN_RE)].forEach((m, i) => {
    if (!isChord(shapes[i])) return;
    if (m.index > last) parts.push({ text: line.slice(last, m.index), chord: null });
    parts.push({ text: m[0], chord: chordName(shapes[i]) });
    last = m.index + m[0].length;
  });
  if (last < line.length) parts.push({ text: line.slice(last), chord: null });
  return parts;
}

function withShapes(block, shaped) {
  if (block.type === 'pair') {
    return { ...block, segments: block.segments.map((s, i) => ({ ...s, shape: s.chord === null ? null : chordName(shaped.segments[i].chord) })) };
  }
  if (block.type === 'chords') return { ...block, parts: lineParts(block.line, shaped.line) };
  return block;
}

export function chordShapes(shown, shapes) {
  return { ...shown, blocks: shown.blocks.map((block, i) => withShapes(block, shapes.blocks[i])) };
}

export function chordChart(chord, instrument, { shape = neckShapeId.caged, position = 0 } = {}) {
  const spelling = chordSpelling(chord);
  if (!spelling) return null;
  const shown = spelledNotes(spelling, spelling.pc);
  const model = { mode: modeId.chord, shown, shownPcs: [...new Set(shown.map(mod12))], rootPc: spelling.pc, run: [] };
  const layout = fretLayout(model, instrument, { shape, position });
  if (!layout.voicing.length) return null;
  return {
    rootPc: spelling.pc,
    chart: chartLayout(layout),
    voicing: layout.voicing,
    count: layout.count,
    position: layout.position,
    shape: layout.shape,
    shapes: layout.shapes,
  };
}
