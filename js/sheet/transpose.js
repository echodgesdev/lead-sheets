import { NATURAL, chordTokens } from './chords.js';

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const MAJOR_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MINOR_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm']);
const DEGREES = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];
const ROMAN = ['I', '♭II', 'II', '♭III', 'III', 'IV', '♭V', 'V', '♭VI', 'VI', '♭VII', 'VII'];
const SUPERSCRIPT = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
const QUALITIES = [
  { re: /^(?:m7b5|ø7?)/, lower: true, mark: 'ø', seventh: true },
  { re: /^(?:dim|°)/, lower: true, mark: '°' },
  { re: /^(?:aug|\+)/, lower: false, mark: '+' },
  { re: /^(?:min|m(?!aj))/, lower: true, mark: '' },
];
const INVERSIONS = {
  triad: { 3: '⁶', 4: '⁶', 6: '⁶₄', 7: '⁶₄', 8: '⁶₄' },
  seventh: { 3: '⁶₅', 4: '⁶₅', 6: '⁴₃', 7: '⁴₃', 8: '⁴₃', 9: '⁴₂', 10: '⁴₂', 11: '⁴₂' },
};
const CHORD_RE = /^([A-Ga-g])([#b]?)(.*?)(?:\/([A-Ga-g])([#b]?))?(\**)$/;
const KEY_RE = /^([A-G])([#b]?)\s*(m(?!aj)|-)?/i;

function mod12(n) {
  return ((n % 12) + 12) % 12;
}

function pitch(letter, acc) {
  return mod12(NATURAL[letter.toUpperCase()] + (acc === '#' ? 1 : acc === 'b' ? -1 : 0));
}

function parseKey(key) {
  const m = KEY_RE.exec(String(key ?? '').trim());
  return m ? { pc: pitch(m[1], m[2]), minor: Boolean(m[3]) } : null;
}

function keyName({ pc, minor }) {
  return minor ? `${MINOR_KEYS[pc]}m` : MAJOR_KEYS[pc];
}

export function transposeChord(chord, shift, flats) {
  const m = CHORD_RE.exec(chord);
  if (!m) return chord;
  const [, root, acc, rest, bass, bassAcc, marks] = m;
  const names = flats ? FLATS : SHARPS;
  const name = (l, a) => names[mod12(pitch(l, a) + shift)];
  return name(root, acc) + rest + (bass ? `/${name(bass, bassAcc)}` : '') + marks;
}

export function nashville(chord, key) {
  const m = CHORD_RE.exec(chord);
  if (!m) return chord;
  const [, root, acc, rest, bass, bassAcc, marks] = m;
  const degree = (l, a) => DEGREES[mod12(pitch(l, a) - key.pc)];
  return degree(root, acc) + superscript(rest) + (bass ? `/${degree(bass, bassAcc)}` : '') + marks;
}

function superscript(text) {
  return text.replace(/\d/g, (d) => SUPERSCRIPT[d]);
}

function quality(rest) {
  for (const q of QUALITIES) {
    const m = q.re.exec(rest);
    if (m) return { ...q, rest: rest.slice(m[0].length) };
  }
  return { lower: false, mark: '', rest };
}

export function roman(chord, key) {
  const m = CHORD_RE.exec(chord);
  if (!m) return chord;
  const [, root, acc, rest, bass, bassAcc, marks] = m;
  const rootPc = pitch(root, acc);
  const q = quality(rest);
  const numeral = ROMAN[mod12(rootPc - key.pc)];
  const seventh = q.seventh || /7|9|11|13/.test(q.rest);
  let figure = '';
  let over = '';
  if (bass) {
    const bassPc = pitch(bass, bassAcc);
    figure = INVERSIONS[seventh ? 'seventh' : 'triad'][mod12(bassPc - rootPc)] ?? '';
    if (!figure) over = `/${DEGREES[mod12(bassPc - key.pc)]}`;
  }
  const extension = figure ? q.rest.replace('7', '') : q.rest;
  const mark = q.seventh && !figure ? `${q.mark}⁷` : q.mark;
  return (q.lower ? numeral.toLowerCase() : numeral) + mark + superscript(extension) + figure + over + marks;
}

const NUMERALS = { nashville, roman };

export function transposeKey(key, shift) {
  const base = parseKey(key);
  if (!shift || !base) return key;
  return keyName({ ...base, pc: mod12(base.pc + shift) });
}

export function hasKey(key) {
  return parseKey(key) !== null;
}

function fit(gap, over) {
  if (over < 0) return ' '.repeat(-over) + gap;
  const lead = gap.length - gap.trimStart().length;
  return gap.slice(Math.min(over, Math.max(0, lead - 1)));
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

function mapChords(parsed, fn) {
  const blocks = parsed.blocks.map((b) => {
    if (b.type === 'chords') return { ...b, line: mapLine(b.line, fn) };
    if (b.type !== 'pair') return b;
    return { ...b, segments: b.segments.map((s) => (s.chord === null ? s : { ...s, chord: fn(s.chord) })) };
  });
  return { ...parsed, blocks };
}

export function viewChords(parsed, { key, shift = 0, numbers = null }) {
  const base = parseKey(key);
  if (NUMERALS[numbers] && base) return mapChords(parsed, (c) => NUMERALS[numbers](c, base));
  if (!shift) return parsed;
  const flats = base ? FLAT_KEYS.has(transposeKey(key, shift)) : shift < 0;
  return mapChords(parsed, (c) => transposeChord(c, shift, flats));
}
