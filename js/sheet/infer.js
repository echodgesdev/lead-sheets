import { isChord, isChordLine, chordTokens, isTabLine } from './chords.js';
import { META_FIELDS, LIST_FIELDS, sectionName, normalizeLines, fieldName, splitTags } from './parse.js';

const WINDOW = 15;
const MAX_PASSES = 4;
const KNOWN_KEYS = new Set([...META_FIELDS, 'bpm', 'tags']);
const HEADER_RE = /^([A-Za-z][\w -]{0,20}):\s*(.*)$/;
const DIRECTIVE_RE = /^\{\s*([A-Za-z_]+)(?:\s*:\s*|\s+)?(.*?)\s*\}$/;
const JUNK_RE = /^(?:chords?|tabs?|ukulele chords|ultimate[- ]guitar(?:\.com)?)$|^(?:difficulty|author|tabbed by)\s*:/i;
const META_LINE_RE = /^(artist|album|genre|key|tuning|capo|tempo|bpm|meta|tags)\s*:\s*(\S.*)$/i;
const LOOSE_META_RE = /^(capo|tempo|bpm)\s+(\S.*)$/i;
const CAPO_VALUE_RE = /^(\d+)\s*(?:st|nd|rd|th)?(?:\s*fret)?$/i;
const TEMPO_VALUE_RE = /^(\d+)\s*(?:bpm)?$/i;

const SECTION_DIRECTIVES = {
  soc: 'Chorus',
  start_of_chorus: 'Chorus',
  sov: 'Verse',
  start_of_verse: 'Verse',
  sob: 'Bridge',
  start_of_bridge: 'Bridge',
};
const COMMENT_DIRECTIVES = new Set(['c', 'comment', 'ci', 'comment_italic', 'cb', 'comment_box']);
const FIELD_DIRECTIVES = {
  artist: 'artist',
  album: 'album',
  genre: 'genre',
  key: 'key',
  capo: 'capo',
  tempo: 'tempo',
  bpm: 'tempo',
  tuning: 'tuning',
};

function stripBracketMarkup(lines) {
  const out = [];
  for (const line of lines) {
    if (/^\s*\[\/?tab\]\s*$/i.test(line)) continue;
    out.push(line.replace(/\[ch\](.*?)\[\/ch\]/gi, '$1').replace(/\[\/?tab\]/gi, '').trimEnd());
  }
  return out;
}

function readChordPro(lines) {
  const out = [];
  const cp = { title: '', subtitle: '', fields: [] };
  for (const line of lines) {
    const m = DIRECTIVE_RE.exec(line.trim());
    if (!m) {
      out.push(line);
      continue;
    }
    const name = m[1].toLowerCase();
    const value = m[2].trim();
    if (name === 'title' || name === 't') cp.title = cp.title || value;
    else if (name === 'subtitle' || name === 'st') cp.subtitle = cp.subtitle || value;
    else if (FIELD_DIRECTIVES[name]) cp.fields.push([FIELD_DIRECTIVES[name], value]);
    else if (SECTION_DIRECTIVES[name]) out.push(`${value || SECTION_DIRECTIVES[name]}:`);
    else if (COMMENT_DIRECTIVES.has(name) && value) out.push(`(${value})`);
  }
  return { lines: out, cp };
}

function normalizeValue(key, value) {
  if (key === 'capo') {
    const m = CAPO_VALUE_RE.exec(value);
    return m ? m[1] : value;
  }
  if (key === 'tempo') {
    const m = /^(\d+)\s*bpm$/i.exec(value);
    return m ? m[1] : value;
  }
  if (LIST_FIELDS.includes(key)) return splitTags(value).join(', ');
  return value;
}

function readHeaderRun(lines, start) {
  const fields = [];
  let i = start;
  while (i < lines.length && lines[i].trim()) {
    const m = HEADER_RE.exec(lines[i].trim());
    if (!m) break;
    const key = m[1].trim().toLowerCase();
    if (!KNOWN_KEYS.has(key) && !m[2].trim() && sectionName(lines[i])) break;
    fields.push([key, m[2]]);
    i++;
  }
  return { fields, next: i };
}

function metaLine(s) {
  const m = META_LINE_RE.exec(s);
  if (m) return [m[1], m[2]];
  const loose = LOOSE_META_RE.exec(s);
  if (!loose) return null;
  const pattern = loose[1].toLowerCase() === 'capo' ? CAPO_VALUE_RE : TEMPO_VALUE_RE;
  return pattern.test(loose[2].trim()) ? [loose[1], loose[2]] : null;
}

function extractMeta(entries) {
  const fields = [];
  const kept = [];
  for (const e of entries) {
    const f = e.near ? metaLine(e.t.trim()) : null;
    if (f) fields.push(f);
    else kept.push(e.t);
  }
  return { fields, kept };
}

function collectMeta(fields) {
  const meta = {};
  const extras = new Map();
  for (const [rawKey, rawValue] of fields) {
    const key = fieldName(rawKey);
    const value = normalizeValue(key, rawValue.trim());
    if (META_FIELDS.includes(key)) {
      if (!meta[key]) meta[key] = value;
    } else if (value && !extras.has(key)) {
      extras.set(key, value);
    }
  }
  return { meta, extras };
}

// Heuristic: 'Title by Artist' and 'Title - Artist' are tried; 'Artist - Title' is ambiguous so never chosen.
function splitTitle(title) {
  const m = /^(.+?)\s+by\s+(.+)$/.exec(title) || /^(.+?)\s+[-–—]\s+(.+)$/.exec(title);
  return m ? [m[1].trim(), m[2].trim()] : null;
}

function capitalize(name) {
  return name.replace(/(^|[\s-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
}

function fieldLine(name, value) {
  return `${capitalize(name)}:${value ? ' ' + value : ''}`;
}

function headingName(line) {
  const s = line.trim();
  const paren = /^\(\s*([^()]+?)\s*\)$/.exec(s);
  return sectionName(paren ? paren[1] : s);
}

function fixRoot(chord) {
  return chord.replace(/^[a-g]/, (c) => c.toUpperCase()).replace(/\/([a-g])/, (m, c) => '/' + c.toUpperCase());
}

function fixChordLine(line) {
  let out = line;
  for (const { chord, col } of chordTokens(line)) {
    const fixed = fixRoot(chord);
    if (fixed !== chord) out = out.slice(0, col) + fixed + out.slice(col + chord.length);
  }
  return out;
}

function inlineToPair(line) {
  const matches = [...line.matchAll(/\[([^\]]+)\]/g)].filter((m) => isChord(m[1].trim()));
  if (!matches.length) return null;
  let lyric = '';
  let chords = '';
  let last = 0;
  for (const m of matches) {
    lyric += line.slice(last, m.index);
    last = m.index + m[0].length;
    if (chords && lyric.length < chords.length + 1) lyric = lyric.padEnd(chords.length + 1);
    chords = chords.padEnd(lyric.length) + fixRoot(m[1].trim());
  }
  lyric += line.slice(last);
  return { chords, lyric: lyric.trimEnd() };
}

function convertBody(lines) {
  const items = [];
  for (const line of lines) {
    if (isTabLine(line)) {
      items.push({ t: line });
      continue;
    }
    const name = headingName(line);
    if (name) {
      items.push({ t: `${name}:`, section: true });
      continue;
    }
    const pair = inlineToPair(line);
    if (pair) {
      items.push({ t: pair.chords });
      if (pair.lyric) items.push({ t: pair.lyric });
      continue;
    }
    items.push({ t: isChordLine(line) ? fixChordLine(line) : line });
  }
  return items;
}

function layout(items) {
  const out = [];
  for (const { t, section } of items) {
    const last = out[out.length - 1];
    if (!t.trim()) {
      if (out.length && last !== '') out.push('');
      continue;
    }
    if (section && out.length && last !== '') out.push('');
    out.push(t);
  }
  while (out.length && out[out.length - 1] === '') out.pop();
  return out;
}

function pass(text) {
  const { lines: all, cp } = readChordPro(stripBracketMarkup(normalizeLines(text)));
  const lines = all
    .map((t, i) => ({ t, near: i < WINDOW }))
    .filter((e) => !(e.near && JUNK_RE.test(e.t.trim())));

  let title = cp.title;
  let fields = [...cp.fields];
  let rest = lines;
  if (!title) {
    const ti = lines.findIndex((e) => e.t.trim());
    if (ti < 0) return '';
    title = lines[ti].t.trim().replace(/^#+\s*/, '');
    const header = readHeaderRun(lines.map((e) => e.t), ti + 1);
    fields = fields.concat(header.fields);
    rest = lines.slice(header.next);
  }

  const scan = extractMeta(rest);
  const { meta, extras } = collectMeta(fields.concat(scan.fields));
  if (!meta.artist && cp.subtitle) meta.artist = cp.subtitle;
  if (meta.artist === undefined) {
    const split = splitTitle(title);
    if (split) [title, meta.artist] = split;
  }

  const head = [title];
  for (const f of META_FIELDS) if (meta[f] !== undefined) head.push(fieldLine(f, meta[f]));
  for (const [k, v] of extras) head.push(fieldLine(k, v));
  const body = layout(convertBody(scan.kept));
  return (body.length ? [...head, '', ...body] : head).join('\n');
}

export function infer(text) {
  let out = pass(text);
  for (let n = 0; n < MAX_PASSES; n++) {
    const next = pass(out);
    if (next === out) break;
    out = next;
  }
  return out;
}
