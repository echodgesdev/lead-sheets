const ROOT = '[A-Ga-g][#b]?';
const PART = '(?:maj|min|dim|aug|add|sus|m|M|ø|°|\\+|[#b]?\\d{1,2}|\\([#b+\\-\\w]*\\))';
const CHORD_RE = new RegExp(`^${ROOT}${PART}*(?:\\/${ROOT})?\\**$`);
const NC_RE = /^N\.?C\.?$/;
const FILLER_RE = /^(?:\(?x\d+\)?|\d+x|[-/%:.()*~]+)$/i;
const LONE_WORD_RE = /^[a-g][#b]?m?$/;

export const NATURAL = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const MAJOR = { steps: [0, 2, 4, 5, 7, 9, 11], quals: ['', 'm', 'm', '', '', 'm', 'dim'] };
const MINOR = { steps: [0, 2, 3, 5, 7, 8, 10], quals: ['m', 'dim', '', 'm', 'm', '', ''] };

function tokensOf(line) {
  return [...String(line).matchAll(/[^\s|]+/g)].map((m) => ({ text: m[0], col: m.index }));
}

export function isChord(token) {
  if (typeof token !== 'string') return false;
  return NC_RE.test(token) || CHORD_RE.test(token);
}

export function chordName(token) {
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
