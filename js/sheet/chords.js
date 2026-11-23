import { OCTAVE, mod12 } from '../core/math.js';

const ROOT = '[A-Ga-g][#b]?';
const PART = '(?:maj|min|dim|aug|add|sus|m|M|ø|°|\\+|6\\/9|[#b+\\-]?\\d{1,2}|\\([#b+\\-\\w]*\\))';
const CHORD_RE = new RegExp(`^${ROOT}${PART}*(?:\\/${ROOT})?\\**$`);
const NC_RE = /^N\.?C\.?$/;
const FILLER_RE = /^(?:\(?x\d+\)?|\d+x|[-/%:.()*~]+)$/i;
const LONE_WORD_RE = /^[a-g][#b]?m?$/;
const INLINE_RE = /\[([^\]]+)\]/g;
const NOTE_RE = /^([A-Ga-g])([#b]?)/;

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const ACCIDENTAL = { '': 0, '#': 1, b: -1 };
export const IONIAN = [0, 2, 4, 5, 7, 9, 11];
export const AEOLIAN = [0, 2, 3, 5, 7, 8, 10];
export const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const MAJOR_KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
export const FIFTHS = MAJOR_KEYS.map((name) => pitchOf(name[0], name.slice(1)));
export const RELATIVE_MINOR = 9;
const SHARP_SIDE = 6;
const CHROMATIC_LETTERS = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];
const INTERVAL_LETTERS = [0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6];
const MAJOR = { steps: IONIAN, quals: ['', 'm', 'm', '', '', 'm', 'dim'] };
const MINOR = { steps: AEOLIAN, quals: ['m', 'dim', '', 'm', 'm', '', ''] };

const CHORD_PARTS_RE = /^([A-Ga-g])([#b]?)(.*?)(?:\/([A-Ga-g])([#b]?))?(\**)$/;
const KEY_RE = /^([A-G])([#b]?)\s*(m(?!aj)|-)?/i;
const KEY_NAME_RE = /^[A-G][#b]?\s*(?:m|min|minor|maj|major|-)?$/i;
const CHORD_QUALITIES = [
  { re: /^(?:m7[b-]5|ø7?)/, lower: true, mark: 'ø', seventh: true, steps: { third: 3, fifth: 6, seventh: 10 } },
  { re: /^(?:dim7|°7)/, lower: true, mark: '°', seventh: true, steps: { third: 3, fifth: 6, seventh: 9 } },
  { re: /^(?:dim|°)/, lower: true, mark: '°', steps: { third: 3, fifth: 6 } },
  { re: /^(?:aug|\+)/, lower: false, mark: '+', steps: { third: 4, fifth: 8 } },
  { re: /^(?:min|m(?!aj)|-(?!5))/, lower: true, mark: '', steps: { third: 3, fifth: 7 } },
];
const MAJOR_SEVENTH_RE = /^(?:maj|M|Δ)/;
const EXTENSIONS = [
  { re: /^6\/?9/, add: [9, 14] },
  { re: /^13/, seventh: true, add: [14, 21] },
  { re: /^11/, seventh: true, add: [14, 17] },
  { re: /^9/, seventh: true, add: [14] },
  { re: /^7/, seventh: true, add: [] },
  { re: /^6/, add: [9] },
  { re: /^5/, power: true, add: [] },
];
const MODIFIERS = [
  { re: /^sus2/, third: 2 },
  { re: /^sus4?/, third: 5 },
  { re: /^add2/, add: 2 },
  { re: /^add9/, add: 14 },
  { re: /^add4/, add: 5 },
  { re: /^add11/, add: 17 },
  { re: /^add(?:6|13)/, add: 9 },
  { re: /^[b-]5/, fifth: 6 },
  { re: /^[#+]5/, fifth: 8 },
  { re: /^b9/, add: 13, replaces: 14 },
  { re: /^#9/, add: 15, replaces: 14 },
  { re: /^#11/, add: 18, replaces: 17 },
  { re: /^b13/, add: 20, replaces: 21 },
  { re: /^13/, add: 21 },
  { re: /^11/, add: 17 },
  { re: /^9/, add: 14 },
  { re: /^2/, third: 2 },
  { re: /^4/, third: 5 },
];

function tokensOf(line) {
  return [...String(line).matchAll(/[^\s|]+/g)].map((m) => ({ text: m[0], col: m.index }));
}

export function isChord(token) {
  if (typeof token !== 'string') return false;
  return NC_RE.test(token) || CHORD_RE.test(token);
}

function chordName(token) {
  return token.replace(/\*+$/, '');
}

export function isChordLine(line) {
  const tokens = tokensOf(line);
  if (!tokens.length) return false;
  let real = 0;
  for (const t of tokens) {
    if (isChord(t.text)) real++;
    else if (!FILLER_RE.test(t.text)) return false;
  }
  if (!real) return false;
  if (tokens.length === 1 && LONE_WORD_RE.test(tokens[0].text)) return false;
  return true;
}

export function chordTokens(line) {
  return tokensOf(line)
    .filter((t) => isChord(t.text))
    .map((t) => ({ chord: t.text, col: t.col }));
}

export function inlineChords(line) {
  return [...String(line).matchAll(INLINE_RE)]
    .map((m) => ({ chord: m[1].trim(), index: m.index, end: m.index + m[0].length }))
    .filter(({ chord }) => isChord(chord));
}

export function isTabLine(line) {
  const s = String(line).trimEnd();
  if (!/^\s*(?:[eBGDAEbgda]\s*[|:]|\|[-0-9])/.test(s)) return false;
  if (!s.includes('-')) return false;
  const rest = s.replace(/\s/g, '').slice(1);
  const tabby = rest.match(/[-0-9|hpbrxs/\\~^()<>.=*:]/g) || [];
  return tabby.length / rest.length >= 0.8;
}

function letterOf(name) {
  return LETTERS.indexOf(name[0].toUpperCase());
}

export function pitchOf(letter, acc) {
  return mod12(IONIAN[letterOf(letter)] + ACCIDENTAL[acc ?? '']);
}

function spell(pc, letter) {
  const acc = mod12(pc - IONIAN[letter]);
  return { letter, acc: acc > OCTAVE / 2 ? acc - OCTAVE : acc };
}

function plainSpelling(pc, sharp) {
  const natural = IONIAN.indexOf(pc);
  return natural >= 0 ? { letter: natural, acc: 0 } : spell(pc, IONIAN.indexOf(mod12(pc + (sharp ? -1 : 1))));
}

function spellFrom(tonic, letter, letters) {
  return Array.from({ length: OCTAVE }, (_, pc) => spell(pc, (letter + letters[mod12(pc - tonic)]) % LETTERS.length));
}

export function noteName({ letter, acc }) {
  return LETTERS[letter] + (acc > 0 ? '#'.repeat(acc) : 'b'.repeat(-acc));
}

export function keySpelling(pc, minor, letter = letterOf(keyName(pc, minor))) {
  const scale = (minor ? AEOLIAN : IONIAN).map((step) => mod12(pc + step));
  return spellFrom(pc, letter, CHROMATIC_LETTERS).map((spelled, note) => {
    const inKey = scale.includes(note);
    return { ...(inKey || Math.abs(spelled.acc) < 2 ? spelled : plainSpelling(note, spelled.acc > 0)), inKey };
  });
}

export function intervalSpelling(root) {
  const m = NOTE_RE.exec(String(root ?? '').trim());
  return m ? spellFrom(pitchOf(m[1], m[2]), letterOf(m[1]), INTERVAL_LETTERS) : [];
}

export function keyOf(index, minor) {
  const major = MAJOR_KEYS[index];
  if (!minor) return major;
  const pc = FIFTHS[index];
  return `${noteName(keySpelling(pc, false, letterOf(major))[mod12(pc + RELATIVE_MINOR)])}m`;
}

export function fifthsIndex(pc, minor = false) {
  return FIFTHS.indexOf(minor ? mod12(pc - RELATIVE_MINOR) : pc);
}

export function flatSide(index) {
  return index > SHARP_SIDE;
}

export function keyName(pc, minor) {
  return keyOf(fifthsIndex(pc, minor), minor);
}

export function keyNameToward(pc, minor, shift) {
  return fifthsIndex(pc, minor) === SHARP_SIDE && shift < 0 ? `${FLATS[pc]}${minor ? 'm' : ''}` : keyName(pc, minor);
}

export function chordRootNames(key) {
  const parsed = parseKey(key);
  return parsed && keySpelling(parsed.pc, parsed.minor, letterOf(key)).map((spelled, pc) => noteName(IONIAN.includes(pc) ? plainSpelling(pc) : spelled));
}

export function diatonic(key) {
  const m = /^([A-G])([#b]?)(m|min|minor)?$/.exec(String(key || '').trim());
  if (!m) return [];
  const [, letter, acc, minor] = m;
  const pc = pitchOf(letter, acc);
  const scale = minor ? MINOR : MAJOR;
  const spelling = keySpelling(pc, Boolean(minor), letterOf(letter));
  return scale.steps.map((step, i) => noteName(spelling[mod12(pc + step)]) + scale.quals[i]);
}

export function isKeyName(text) {
  return KEY_NAME_RE.test(String(text ?? '').trim());
}

export function parseKey(key) {
  const m = KEY_RE.exec(String(key ?? '').trim());
  return m ? { pc: pitchOf(m[1], m[2]), minor: Boolean(m[3]) } : null;
}

function takeFirst(rules, text) {
  for (const rule of rules) {
    const m = rule.re.exec(text);
    if (m) return { rule, rest: text.slice(m[0].length) };
  }
  return null;
}

export function chordQuality(suffix) {
  const found = takeFirst(CHORD_QUALITIES, suffix);
  return found && { ...found.rule, rest: found.rest };
}

export function chordParts(chord) {
  const m = CHORD_PARTS_RE.exec(chord);
  if (!m) return null;
  const [, letter, acc, suffix, bassLetter, bassAcc, marks] = m;
  return { root: pitchOf(letter, acc), suffix, bass: bassLetter ? pitchOf(bassLetter, bassAcc) : null, marks };
}

export function mapChord(chord, noteFn, suffixFn = (suffix) => suffix) {
  const parts = chordParts(chord);
  if (!parts) return chord;
  const { root, suffix, bass, marks } = parts;
  return noteFn(root) + suffixFn(suffix) + (bass === null ? '' : `/${noteFn(bass)}`) + marks;
}

function suffixSteps(suffix) {
  let rest = suffix.replace(/[()\s]/g, '');
  const quality = chordQuality(rest);
  const chord = { third: 4, fifth: 7, seventh: null, add: [], ...quality?.steps };
  if (quality) rest = quality.rest;
  const major = MAJOR_SEVENTH_RE.exec(rest);
  if (major) rest = rest.slice(major[0].length);
  const extension = takeFirst(EXTENSIONS, rest);
  if (extension) {
    rest = extension.rest;
    const { seventh, add, power } = extension.rule;
    if (power && !quality) chord.third = null;
    if (seventh && chord.seventh === null) chord.seventh = major ? 11 : 10;
    chord.add = [...add];
  } else if (major && quality) {
    chord.seventh = 11;
  }
  for (let found = takeFirst(MODIFIERS, rest); found; found = takeFirst(MODIFIERS, rest)) {
    rest = found.rest;
    const { third, fifth, add, replaces } = found.rule;
    if (third !== undefined) chord.third = third;
    if (fifth !== undefined) chord.fifth = fifth;
    if (add !== undefined) chord.add = [...chord.add.filter((step) => step !== replaces), add];
  }
  const steps = [0, chord.third, chord.fifth, chord.seventh, ...chord.add].filter((step) => step !== null);
  return [...new Set(steps)].sort((a, b) => a - b);
}

export function chordSpelling(token) {
  if (!isChord(token) || NC_RE.test(token)) return null;
  const { root, suffix, bass } = chordParts(token.trim());
  return { pc: root, steps: suffixSteps(suffix), bass };
}

export function chordsIn(text) {
  const seen = new Set();
  const out = [];
  const add = (c) => {
    if (!seen.has(c)) {
      seen.add(c);
      out.push(c);
    }
  };
  for (const line of String(text).split(/\r?\n/)) {
    if (isTabLine(line)) continue;
    if (isChordLine(line)) chordTokens(line).forEach((t) => add(chordName(t.chord)));
    for (const { chord } of inlineChords(line)) add(chordName(chord));
  }
  return out;
}
