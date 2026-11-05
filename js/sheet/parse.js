import { isChord, isChordLine, chordTokens, isTabLine } from './chords.js';

export const META_FIELDS = ['artist', 'album', 'genre', 'key', 'capo', 'tempo', 'tuning', 'meta', 'setlist', 'notes'];
export const LIST_FIELDS = ['meta', 'setlist'];

const ALIASES = { bpm: 'tempo', tags: 'meta', setlists: 'setlist', note: 'notes' };
const FIELDS = new Set([...META_FIELDS, ...Object.keys(ALIASES)]);
const HEADER_RE = /^([A-Za-z][\w -]{0,20}):\s*(.*)$/;
const KNOWN = '(?:intro|verse|pre-?chorus|pre chorus|chorus|bridge|solo|outro|interlude|instrumental|riff|tag|coda|refrain|break|hook)';
const BARE_RE = new RegExp(`^${KNOWN}(?:\\s*\\d+)?(?:\\s*x\\d+)?$`, 'i');
const NOTE_RE = /^\(.*\)$/;
const NOTES_RE = /^notes?\s*:\s*(.*)$/i;

function titleCase(s) {
  if (s !== s.toLowerCase() && s !== s.toUpperCase()) return s;
  return s
    .toLowerCase()
    .replace(/(^|[\s-])([a-z])/g, (m, a, b) => a + b.toUpperCase())
    .replace(/ X(\d)/g, ' x$1');
}

function cleanName(name) {
  return titleCase(name.replace(/:$/, '').trim());
}

export function sectionName(line) {
  const s = String(line).trim();
  if (!s) return null;
  let m = /^\[([^\]]+)\]$/.exec(s);
  if (m) {
    const inner = m[1].trim();
    if (isChord(inner) || /^\/?(?:ch|tab)$/i.test(inner)) return null;
    return cleanName(inner);
  }
  m = /^#{1,6}\s*(.+?)\s*:?$/.exec(s);
  if (m) return cleanName(m[1]);
  if (BARE_RE.test(s)) return cleanName(s);
  m = /^(.*\S)\s*:$/.exec(s);
  if (m && s.length <= 30) {
    const name = m[1];
    if (FIELDS.has(name.toLowerCase()) || name.includes('[') || isChordLine(name)) return null;
    return cleanName(name);
  }
  return null;
}

export function normalizeLines(text) {
  return String(text ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/\t/g, '    ')
    .split('\n')
    .map((l) => l.trimEnd());
}

function readHeader(lines, start) {
  const fields = [];
  let i = start;
  while (i < lines.length && lines[i].trim()) {
    const m = HEADER_RE.exec(lines[i].trim());
    if (!m) break;
    const key = m[1].trim().toLowerCase();
    const value = m[2].trim();
    if (!FIELDS.has(key) && !value && sectionName(lines[i])) break;
    fields.push([key, value]);
    i++;
  }
  return { fields, next: i };
}

export function fieldName(key) {
  const k = key.trim().toLowerCase();
  return ALIASES[k] ?? k;
}

export function splitTags(value) {
  return String(value ?? '').split(',').map((t) => t.trim()).filter(Boolean);
}

function buildMeta(title, fields) {
  const meta = { title, extra: {} };
  for (const [key, value] of fields) {
    const name = fieldName(key);
    if (!value) continue;
    if (META_FIELDS.includes(name)) meta[name] = value;
    else meta.extra[name] = value;
  }
  return meta;
}

function isInlineChordOnly(line) {
  const s = line.trim();
  if (!/^(?:\[[^\]]+\]\s*)+$/.test(s)) return false;
  return [...s.matchAll(/\[([^\]]+)\]/g)].every((m) => isChord(m[1].trim()));
}

function asChordLine(line) {
  if (isInlineChordOnly(line)) return line.replace(/\[([^\]]+)\]/g, '$1');
  return isChordLine(line) ? line : null;
}

function hasInlineChords(line) {
  return [...line.matchAll(/\[([^\]]+)\]/g)].some((m) => isChord(m[1].trim()));
}

function isLyricLine(line) {
  const s = line.trim();
  return (
    s !== '' &&
    !isTabLine(line) &&
    !sectionName(line) &&
    asChordLine(line) === null &&
    !NOTE_RE.test(s) &&
    !NOTES_RE.test(s) &&
    !hasInlineChords(line)
  );
}

function pairFromChordLine(chordLine, lyric) {
  const tokens = chordTokens(chordLine);
  const last = tokens[tokens.length - 1];
  const text = last.col >= lyric.length ? lyric.padEnd(last.col + last.chord.length) : lyric;
  const segments = [];
  if (tokens[0].col > 0) segments.push({ chord: null, text: text.slice(0, tokens[0].col) });
  tokens.forEach((t, k) => {
    const end = k + 1 < tokens.length ? tokens[k + 1].col : text.length;
    segments.push({ chord: t.chord, text: text.slice(t.col, end) });
  });
  return { type: 'pair', segments };
}

function inlineSegments(line) {
  const segments = [];
  let cur = { chord: null, text: '' };
  let last = 0;
  let found = false;
  for (const m of line.matchAll(/\[([^\]]+)\]/g)) {
    const chord = m[1].trim();
    if (!isChord(chord)) continue;
    found = true;
    cur.text += line.slice(last, m.index);
    if (cur.chord !== null || cur.text) segments.push(cur);
    cur = { chord, text: '' };
    last = m.index + m[0].length;
  }
  if (!found) return null;
  cur.text += line.slice(last);
  segments.push(cur);
  return segments;
}

function tidy(blocks) {
  const out = [];
  for (const b of blocks) {
    if (b.type === 'blank' && (!out.length || out[out.length - 1].type === 'blank')) continue;
    out.push(b);
  }
  while (out.length && out[out.length - 1].type === 'blank') out.pop();
  return out;
}

function parseBody(lines) {
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      blocks.push({ type: 'blank' });
      i++;
      continue;
    }
    if (isTabLine(line)) {
      const tab = [];
      while (i < lines.length && isTabLine(lines[i])) tab.push(lines[i++]);
      blocks.push({ type: 'tab', lines: tab });
      continue;
    }
    const notes = NOTES_RE.exec(line.trim());
    if (notes) {
      blocks.push(notes[1] ? { type: 'note', text: notes[1] } : { type: 'section', name: 'Notes' });
      i++;
      continue;
    }
    const name = sectionName(line);
    if (name) {
      blocks.push({ type: 'section', name });
      i++;
      continue;
    }
    const chordLine = asChordLine(line);
    if (chordLine !== null) {
      const next = lines[i + 1];
      if (next !== undefined && isLyricLine(next)) {
        blocks.push(pairFromChordLine(chordLine, next));
        i += 2;
      } else {
        blocks.push({ type: 'chords', line: chordLine });
        i++;
      }
      continue;
    }
    const s = line.trim();
    const inline = NOTE_RE.test(s) ? null : inlineSegments(line);
    if (NOTE_RE.test(s)) blocks.push({ type: 'note', text: s });
    else if (inline) blocks.push({ type: 'pair', segments: inline });
    else blocks.push({ type: 'lyric', text: s });
    i++;
  }
  return tidy(blocks);
}

export function parse(text) {
  const lines = normalizeLines(text);
  let i = 0;
  while (i < lines.length && !lines[i].trim()) i++;
  if (i >= lines.length) return { meta: buildMeta('', []), blocks: [] };
  const title = lines[i].trim().replace(/^#+\s*/, '');
  const header = readHeader(lines, i + 1);
  return {
    meta: buildMeta(title, header.fields),
    blocks: parseBody(lines.slice(header.next)),
  };
}
