import { isChord, isChordLine, chordTokens, inlineChords, isTabLine } from './chords.js';
import { parseVisSpec } from './vis-spec.js';

export const META_FIELDS = ['artist', 'album', 'genre', 'key', 'capo', 'tempo', 'tuning', 'meta', 'notes'];
export const LIST_FIELDS = ['meta'];

const ALIASES = { bpm: 'tempo', tags: 'meta', note: 'notes' };
const FIELDS = new Set([...META_FIELDS, ...Object.keys(ALIASES)]);
const HEADER_RE = /^([A-Za-z][\w -]{0,20}):\s*(.*)$/;
const KNOWN = '(?:intro|verse|pre-?chorus|pre chorus|chorus|bridge|solo|outro|interlude|instrumental|riff|tag|coda|refrain|break|hook)';
const BARE_RE = new RegExp(`^${KNOWN}(?:\\s*\\d+)?(?:\\s*x\\d+)?$`, 'i');
const NOTE_RE = /^\(.*\)$/;
const NOTES_RE = /^notes?\s*:\s*(.*)$/i;
const KEY_CHANGE_RE = /^key\s*change\s*:\s*(\S.*)$/i;

export const lineKind = Object.freeze({
  blank: 'blank',
  title: 'title',
  header: 'header',
  vis: 'vis',
  tab: 'tab',
  notes: 'notes',
  key: 'key',
  section: 'section',
  chords: 'chords',
  note: 'note',
  inline: 'inline',
  lyric: 'lyric',
});

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

function spliceInlineChords(line, fn) {
  let out = '';
  let last = 0;
  for (const { chord, index, end } of inlineChords(line)) {
    out += line.slice(last, index) + fn(chord);
    last = end;
  }
  return out + line.slice(last);
}

function hasInlineChords(line) {
  return inlineChords(line).length > 0;
}

function isInlineChordOnly(line) {
  return hasInlineChords(line) && !spliceInlineChords(line, () => '').trim();
}

function asChordLine(line) {
  if (isInlineChordOnly(line)) return spliceInlineChords(line, (chord) => chord);
  return isChordLine(line) ? line : null;
}

function kindOf(line) {
  const s = line.trim();
  if (!s) return lineKind.blank;
  if (parseVisSpec(line)) return lineKind.vis;
  if (isTabLine(line)) return lineKind.tab;
  if (NOTES_RE.test(s)) return lineKind.notes;
  if (KEY_CHANGE_RE.test(s)) return lineKind.key;
  if (sectionName(line)) return lineKind.section;
  if (asChordLine(line) !== null) return lineKind.chords;
  if (NOTE_RE.test(s)) return lineKind.note;
  if (hasInlineChords(line)) return lineKind.inline;
  return lineKind.lyric;
}

function isLyricLine(line) {
  return kindOf(line) === lineKind.lyric;
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
  const found = inlineChords(line);
  if (!found.length) return null;
  const segments = [];
  let cur = { chord: null, text: '' };
  let last = 0;
  for (const { chord, index, end } of found) {
    cur.text += line.slice(last, index);
    if (cur.chord !== null || cur.text) segments.push(cur);
    cur = { chord, text: '' };
    last = end;
  }
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

function lineBlock(kind, line) {
  const s = line.trim();
  if (kind === lineKind.blank) return { type: 'blank' };
  if (kind === lineKind.vis) return { type: 'vis', spec: parseVisSpec(line) };
  if (kind === lineKind.key) return { type: 'key', key: KEY_CHANGE_RE.exec(s)[1] };
  if (kind === lineKind.section) return { type: 'section', name: sectionName(line) };
  if (kind === lineKind.note) return { type: 'note', text: s };
  if (kind === lineKind.inline) return { type: 'pair', segments: inlineSegments(line) };
  if (kind !== lineKind.notes) return { type: 'lyric', text: s };
  const text = NOTES_RE.exec(s)[1];
  return text ? { type: 'note', text } : { type: 'section', name: 'Notes' };
}

function parseBody(lines) {
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i++];
    const kind = kindOf(line);
    if (kind === lineKind.tab) {
      const tab = [line];
      while (i < lines.length && isTabLine(lines[i])) tab.push(lines[i++]);
      blocks.push({ type: 'tab', lines: tab });
    } else if (kind === lineKind.chords) {
      const chordLine = asChordLine(line);
      if (i < lines.length && isLyricLine(lines[i])) blocks.push(pairFromChordLine(chordLine, lines[i++]));
      else blocks.push({ type: 'chords', line: chordLine });
    } else {
      blocks.push(lineBlock(kind, line));
    }
  }
  return tidy(blocks);
}

function titleIndex(lines) {
  let i = 0;
  while (i < lines.length && !lines[i].trim()) i++;
  return i;
}

function bodyLine(line) {
  const kind = kindOf(line);
  if (kind === lineKind.vis) return { kind, spec: parseVisSpec(line) };
  if (kind === lineKind.key) return { kind, value: KEY_CHANGE_RE.exec(line.trim())[1] };
  return { kind };
}

export function lineKinds(text) {
  const lines = normalizeLines(text);
  const title = titleIndex(lines);
  const header = title < lines.length ? readHeader(lines, title + 1) : { fields: [], next: lines.length };
  return lines.map((line, i) => {
    if (i < title) return { kind: lineKind.blank };
    if (i === title) return { kind: lineKind.title };
    if (i >= header.next) return bodyLine(line);
    const [key, value] = header.fields[i - title - 1];
    return { kind: lineKind.header, field: fieldName(key), value };
  });
}

export function parse(text) {
  const lines = normalizeLines(text);
  const i = titleIndex(lines);
  if (i >= lines.length) return { meta: buildMeta('', []), blocks: [] };
  const title = lines[i].trim().replace(/^#+\s*/, '');
  const header = readHeader(lines, i + 1);
  return {
    meta: buildMeta(title, header.fields),
    blocks: parseBody(lines.slice(header.next)),
  };
}
