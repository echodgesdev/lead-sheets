const ROOT = '[A-Ga-g][#b]?';
const PART = '(?:maj|min|dim|aug|add|sus|m|M|ø|°|\\+|[#b+\\-]?\\d{1,2}|\\([#b+\\-\\w]*\\))';
const CHORD_RE = new RegExp(`^${ROOT}${PART}*(?:\\/${ROOT})?\\**$`);
const NC_RE = /^N\.?C\.?$/;
const FILLER_RE = /^(?:\(?x\d+\)?|\d+x|[-/%:.()*~]+)$/i;
const LONE_WORD_RE = /^[a-g][#b]?m?$/;

export const NATURAL = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const MAJOR = { steps: [0, 2, 4, 5, 7, 9, 11], quals: ['', 'm', 'm', '', '', 'm', 'dim'] };
const MINOR = { steps: [0, 2, 3, 5, 7, 8, 10], quals: ['m', 'dim', '', 'm', 'm', '', ''] };

export const CHORD_PARTS_RE = /^([A-Ga-g])([#b]?)(.*?)(?:\/([A-Ga-g])([#b]?))?(\**)$/;
const KEY_RE = /^([A-G])([#b]?)\s*(m(?!aj)|-)?/i;
const KEY_NAME_RE = /^[A-G][#b]?\s*(?:m|min|minor|maj|major|-)?$/i;
const ACCIDENTAL = { '': 0, '#': 1, b: -1 };
export const CHORD_QUALITIES = [
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
  { re: /^b9/, add: 13 },
  { re: /^#9/, add: 15 },
  { re: /^#11/, add: 18 },
  { re: /^b13/, add: 20 },
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

export function isTabLine(line) {
  const s = String(line).trimEnd();
  if (!/^\s*(?:[eBGDAEbgda]\s*[|:]|\|[-0-9])/.test(s)) return false;
  if (!s.includes('-')) return false;
  const rest = s.replace(/\s/g, '').slice(1);
  const tabby = rest.match(/[-0-9|hpbrxs/\\~^()<>.=*:]/g) || [];
  return tabby.length / rest.length >= 0.8;
}

export function diatonic(key) {
  const m = /^([A-G])([#b]?)(m|min|minor)?$/.exec(String(key || '').trim());
  if (!m) return [];
  const [, letter, acc, minor] = m;
  const scale = minor ? MINOR : MAJOR;
  const rootPc = (NATURAL[letter] + (acc === '#' ? 1 : acc === 'b' ? -1 : 0) + 12) % 12;
  const start = LETTERS.indexOf(letter);
  return scale.steps.map((step, i) => {
    const l = LETTERS[(start + i) % 7];
    let d = ((((rootPc + step) % 12) - NATURAL[l]) % 12 + 12) % 12;
    if (d > 6) d -= 12;
    const accidental = d > 0 ? '#'.repeat(d) : 'b'.repeat(-d);
    return l + accidental + scale.quals[i];
  });
}

export function pitchOf(letter, acc) {
  return (NATURAL[letter.toUpperCase()] + ACCIDENTAL[acc ?? ''] + 12) % 12;
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

function suffixSteps(suffix) {
  let rest = suffix.replace(/[()\s]/g, '');
  const quality = takeFirst(CHORD_QUALITIES, rest);
  const chord = { third: 4, fifth: 7, seventh: null, add: [], ...quality?.rule.steps };
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
    const { third, fifth, add } = found.rule;
    if (third !== undefined) chord.third = third;
    if (fifth !== undefined) chord.fifth = fifth;
    if (add !== undefined) chord.add.push(add);
  }
  const steps = [0, chord.third, chord.fifth, chord.seventh, ...chord.add].filter((step) => step !== null);
  return [...new Set(steps)].sort((a, b) => a - b);
}

export function chordSpelling(token) {
  const m = CHORD_PARTS_RE.exec(String(token ?? '').trim());
  if (!m || !isChord(token) || NC_RE.test(token)) return null;
  const [, letter, acc, suffix, bassLetter, bassAcc] = m;
  return {
    pc: pitchOf(letter, acc),
    steps: suffixSteps(suffix),
    bass: bassLetter ? pitchOf(bassLetter, bassAcc) : null,
  };
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
    for (const m of line.matchAll(/\[([^\]]+)\]/g)) {
      const c = m[1].trim();
      if (isChord(c)) add(chordName(c));
    }
  }
  return out;
}
