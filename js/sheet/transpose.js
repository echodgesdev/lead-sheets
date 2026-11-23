import { SHARPS, FLATS, chordTokens, chordParts, chordQuality, mapChord, parseKey, keyNameToward, chordRootNames } from './chords.js';
import { stepKind } from './vis-spec.js';
import { clamp, mod12 } from '../core/math.js';

const DEGREES = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];
const ROMAN = ['I', '♭II', 'II', '♭III', 'III', 'IV', '♭V', 'V', '♭VI', 'VI', '♭VII', 'VII'];
const SUPERSCRIPT = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
const INVERSIONS = {
  triad: { 3: '⁶', 4: '⁶', 6: '⁶₄', 7: '⁶₄', 8: '⁶₄' },
  seventh: { 3: '⁶₅', 4: '⁶₅', 6: '⁴₃', 7: '⁴₃', 8: '⁴₃', 9: '⁴₂', 10: '⁴₂', 11: '⁴₂' },
};
export const MAX_CAPO = 7;
export const MAX_SHIFT = 11;

export function signed(n) {
  return n > 0 ? `+${n}` : String(n);
}

export function transposeChord(chord, shift, flats) {
  const names = flats ? FLATS : SHARPS;
  return mapChord(chord, (pc) => names[mod12(pc + shift)]);
}

export function nashville(chord, key) {
  return mapChord(chord, (pc) => DEGREES[mod12(pc - key.pc)], superscript);
}

function superscript(text) {
  return text.replace(/\d/g, (d) => SUPERSCRIPT[d]);
}

export function roman(chord, key) {
  const parts = chordParts(chord);
  if (!parts) return chord;
  const { root, suffix, bass, marks } = parts;
  const q = chordQuality(suffix) ?? { lower: false, mark: '', rest: suffix };
  const numeral = ROMAN[mod12(root - key.pc)];
  const seventh = q.seventh || /7|9|11|13/.test(q.rest);
  let figure = '';
  let over = '';
  if (bass !== null) {
    figure = INVERSIONS[seventh ? 'seventh' : 'triad'][mod12(bass - root)] ?? '';
    if (!figure) over = `/${DEGREES[mod12(bass - key.pc)]}`;
  }
  const extension = figure ? q.rest.replace('7', '') : q.rest;
  const mark = q.seventh && !figure ? `${q.mark}⁷` : q.mark;
  return (q.lower ? numeral.toLowerCase() : numeral) + mark + superscript(extension) + figure + over + marks;
}

const NUMERALS = { nashville, roman };

export function transposeKey(key, shift) {
  const base = parseKey(key);
  if (!shift || !base) return key;
  return keyNameToward(mod12(base.pc + shift), base.minor, shift);
}

export function hasKey(key) {
  return parseKey(key) !== null;
}

export function capoFret(capo) {
  const m = /\d+/.exec(String(capo ?? ''));
  return m ? Number(m[0]) : 0;
}

export function placeCapo(capo, shift) {
  const fret = clamp(capo + shift, 0, Math.max(MAX_CAPO, capo));
  return { capo: fret, shift: capo + shift - fret };
}

function fit(gap, over) {
  if (over < 0) return ' '.repeat(-over) + gap;
  const lead = gap.length - gap.trimStart().length;
  return gap.slice(clamp(lead - 1, 0, over));
}

function mapLine(line, fn) {
  let out = '';
  let last = 0;
  for (const { chord, col } of chordTokens(line)) {
    out += fit(line.slice(last, col), out.length - last) + fn(chord);
    last = col + chord.length;
  }
  return out + line.slice(last);
}

function mapBlock(b, fn) {
  if (!fn) return b;
  if (b.type === 'chords') return { ...b, line: mapLine(b.line, fn) };
  if (b.type !== 'pair') return b;
  return { ...b, segments: b.segments.map((s) => (s.chord === null ? s : { ...s, chord: fn(s.chord) })) };
}

function visKey(spec, key, capo, shift) {
  if (spec.key) return transposeKey(spec.key, shift);
  const shapes = shapesOf(key, capo);
  return shapes ? keyNameToward(mod12(shapes.pc + shift), shapes.minor, shift) : null;
}

function mapVis(b, fn, key, capo, shift) {
  const seq = fn ? b.spec.seq.map((s) => (s.kind === stepKind.chord ? { ...s, chord: fn(s.chord) } : s)) : b.spec.seq;
  return { ...b, spec: { ...b.spec, key: visKey(b.spec, key, capo, shift), seq } };
}

function shapesOf(key, capo) {
  const sounding = parseKey(key);
  return sounding && { ...sounding, pc: mod12(sounding.pc - capo) };
}

function pitchView(key, capo, shift) {
  if (!shift) return null;
  const shapes = shapesOf(key, capo);
  if (!shapes) return (c) => transposeChord(c, shift, shift < 0);
  const names = chordRootNames(keyNameToward(mod12(shapes.pc + shift), shapes.minor, shift));
  return (c) => mapChord(c, (pc) => names[mod12(pc + shift)]);
}

function chordView(key, capo, shift, numbers) {
  const shapes = shapesOf(key, capo);
  if (NUMERALS[numbers] && shapes) return (c) => NUMERALS[numbers](c, shapes);
  return pitchView(key, capo, shift);
}

export function viewChords(parsed, { key, capo = 0, capoShift = 0, shift = 0, numbers = null }) {
  let fn = chordView(key, capo, shift, numbers);
  let pitchFn = pitchView(key, capo, shift);
  let current = key;
  const blocks = parsed.blocks.map((b) => {
    if (b.type === 'vis') return mapVis(b, pitchFn, current, capo, shift);
    if (b.type !== 'key') return mapBlock(b, fn);
    current = b.key;
    fn = chordView(b.key, capo, shift, numbers);
    pitchFn = pitchView(b.key, capo, shift);
    return { ...b, key: transposeKey(b.key, capoShift + shift) };
  });
  return { ...parsed, blocks };
}
