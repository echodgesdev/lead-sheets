import { theoryArt, tapAttrs, noteAttrs, isBlocked, isOutside, pcName, points, stepsOf } from './theory-art.js';
import { tonnetzLayout, trianglesWithin, trianglesAround, neighboursOf } from '../sheet/tonnetz.js';
import { chordNotes, qualityId } from '../sheet/circle.js';
import { modeId } from '../sheet/theory-model.js';
import { svg } from '../core/svg.js';
import { classes, cls } from '../core/dom.js';
import { mod12 } from '../core/math.js';

const SIDE = 36;
const MARGIN = 13;
const NODE_R = 10.5;
const QUALITY_NAMES = { [qualityId.major]: 'major', [qualityId.minor]: 'minor' };

function at(n) {
  return MARGIN + n * SIDE;
}

function stepGroups(model) {
  if (model.mode === modeId.note) return [];
  if (model.mode === modeId.sequence) return model.run.map((midis) => midis.map(mod12));
  return [model.shownPcs];
}

function faintTriangles(model, triangles, filled) {
  if (model.mode === modeId.note) return model.shownPcs.flatMap((pc) => trianglesAround(triangles, pc));
  if (model.mode === modeId.chord) return neighboursOf(triangles, filled);
  return [];
}

function triangleTone(model, tri) {
  if (tri.pcs.some((pc) => isOutside(model, pc))) return cls.outside;
  return tri.root === model.rootPc ? cls.root : null;
}

function triangleNode(model, tri, { filled, faint, steps }) {
  return svg('polygon', {
    class: classes('tonnetz-tri', filled && cls.voiced, faint && cls.faint, filled && triangleTone(model, tri), tri.pcs.some((pc) => isBlocked(model, pc)) && cls.blocked),
    ...tapAttrs(`${pcName(model, tri.root)} ${QUALITY_NAMES[tri.quality]}`, filled),
    'data-notes': chordNotes(tri.root, tri.quality, true, model.tonic).join(','),
    ...(steps ? { 'data-step': steps } : {}),
    points: points(tri.points.map(([x, y]) => [at(x), at(y)])),
  });
}

function latticeNode(model, node, lit) {
  const name = pcName(model, node.pc);
  const midi = model.noteMidiOf(node.pc);
  const g = svg('g', noteAttrs(model, node.pc, {
    className: classes('note-dot tonnetz-node', lit && cls.voiced, model.scalePcs.includes(node.pc) && cls.inKey),
    on: lit,
    midis: [midi],
    label: name,
    steps: model.mode === modeId.sequence ? stepsOf(model.run, midi, []) : '',
  }));
  g.append(svg('circle', { cx: at(node.x), cy: at(node.y), r: NODE_R }), svg('text', { x: at(node.x), y: at(node.y) }, name));
  return g;
}

export function renderTonnetz(model) {
  const { nodes, triangles, width, height } = tonnetzLayout(model.keyTonicPc);
  const groups = stepGroups(model).map((pcs) => new Set(trianglesWithin(triangles, pcs).map((tri) => tri.id)));
  const filled = triangles.filter((tri) => groups.some((ids) => ids.has(tri.id)));
  const filledIds = new Set(filled.map((tri) => tri.id));
  const faintIds = new Set(faintTriangles(model, triangles, filled).map((tri) => tri.id));
  const stepsAt = (tri) => (model.mode === modeId.sequence ? groups.flatMap((ids, i) => (ids.has(tri.id) ? [i] : [])).join(' ') : '');
  const rank = (tri) => (filledIds.has(tri.id) ? 2 : faintIds.has(tri.id) ? 1 : 0);
  const art = theoryArt('tonnetz-art', `0 0 ${at(width) + MARGIN} ${at(height) + MARGIN}`, 'Tonnetz');
  art.append(
    ...[...triangles]
      .sort((a, b) => rank(a) - rank(b))
      .map((tri) => triangleNode(model, tri, { filled: filledIds.has(tri.id), faint: faintIds.has(tri.id), steps: stepsAt(tri) })),
    ...nodes.map((node) => latticeNode(model, node, model.shownPcs.includes(node.pc))),
  );
  return art;
}
