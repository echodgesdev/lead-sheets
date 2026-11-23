import { isChord, isKeyName, chordSpelling } from './chords.js';

export const visId = Object.freeze({ piano: 'piano', clock: 'clock', intervals: 'intervals', fifths: 'fifths', fretboard: 'fretboard', tab: 'tab', clef: 'clef' });
export const alignId = Object.freeze({ root: 'root', key: 'key' });
export const visControlId = Object.freeze({ play: 'play' });
export const stepKind = Object.freeze({ degree: 'degree', chord: 'chord' });
export const fingeringId = Object.freeze({ caged: 'caged', threePerString: '3nps', oneString: 'string' });

const MAX_DEGREE = 15;
const POSITION_RE = /^\d+$/;
const DIRECTIVE_RE = /^\{(.*)\}$/;
const FIELD_RE = /^([^:]*):(.*)$/;
const DEGREE_RE = /^([b#♭♯]?)(\d+)$/;
const TOKEN_RE = /\[[^\]]*\]?|[^\s[]+/g;
const SHIFTS = { '': 0, b: -1, '♭': -1, '#': 1, '♯': 1 };
const FIELD = Object.freeze({ vis: 'vis', key: 'key', seq: 'seq', controls: 'controls', position: 'position', fingering: 'fingering' });
const VIS_NAMES = new Map([
  ...Object.values(visId).map((vis) => [vis, { vis }]),
  ['keys', { vis: visId.piano }],
  ['guitar', { vis: visId.fretboard }],
  ['staff', { vis: visId.clef }],
  ['notes', { vis: visId.intervals, align: alignId.key }],
]);
const CONTROLS = new Set(Object.values(visControlId));
const FINGERINGS = new Set(Object.values(fingeringId));
const READERS = new Map([
  [FIELD.vis, readVis],
  [FIELD.key, readKey],
  [FIELD.seq, readSeq],
  [FIELD.controls, readControls],
  [FIELD.position, readPosition],
  [FIELD.fingering, readFingering],
]);

function fieldsOf(inner) {
  return inner
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean)
    .map((text) => {
      const m = FIELD_RE.exec(text);
      return m ? { name: m[1].trim().toLowerCase(), value: m[2].trim() } : { name: null, text };
    });
}

function stepOf(token) {
  const d = DEGREE_RE.exec(token);
  if (d) {
    const degree = Number(d[2]);
    return degree >= 1 && degree <= MAX_DEGREE ? { kind: stepKind.degree, degree, shift: SHIFTS[d[1]] } : null;
  }
  return isChord(token) && chordSpelling(token) ? { kind: stepKind.chord, chord: token } : null;
}

function readVis(value, spec) {
  const found = VIS_NAMES.get(value.toLowerCase());
  spec.vis = found?.vis ?? visId.piano;
  spec.align = found?.align ?? alignId.root;
  if (!found) spec.errors.push(`Unknown vis "${value}", showing ${visId.piano}`);
}

function readKey(value, spec) {
  const valid = isKeyName(value);
  spec.key = valid ? value : null;
  if (value && !valid) spec.errors.push(`Unknown key "${value}", using the song key`);
}

function readSeq(value, spec) {
  spec.seq = [];
  for (const token of value.match(TOKEN_RE) ?? []) {
    const step = stepOf(token);
    if (step) spec.seq.push(step);
    else spec.errors.push(`Skipped step "${token}"`);
  }
}

function readControls(value, spec) {
  spec.controls = [];
  for (const token of value.split(/\s+/).filter(Boolean)) {
    const control = token.toLowerCase();
    if (CONTROLS.has(control)) spec.controls.push(control);
    else spec.errors.push(`Unknown control "${token}"`);
  }
}

function readPosition(value, spec) {
  const position = POSITION_RE.test(value) ? Number(value) : 0;
  spec.position = position > 0 ? position - 1 : null;
  if (!position) spec.errors.push(`Unknown position "${value}"`);
}

function readFingering(value, spec) {
  const fingering = value.toLowerCase();
  spec.fingering = FINGERINGS.has(fingering) ? fingering : fingeringId.caged;
  if (!FINGERINGS.has(fingering)) spec.errors.push(`Unknown fingering "${value}", using ${fingeringId.caged}`);
}

export function parseVisSpec(line) {
  const m = DIRECTIVE_RE.exec(String(line ?? '').trim());
  if (!m) return null;
  const fields = fieldsOf(m[1]);
  if (fields[0]?.name !== FIELD.vis) return null;
  const spec = { vis: visId.piano, align: alignId.root, key: null, seq: [], controls: [], position: null, fingering: fingeringId.caged, errors: [] };
  for (const f of fields) {
    const read = READERS.get(f.name);
    if (read) read(f.value, spec);
    else if (f.name === null) spec.errors.push(`Expected "name: value", got "${f.text}"`);
    else spec.errors.push(`Unknown field "${f.name}"`);
  }
  return spec;
}
