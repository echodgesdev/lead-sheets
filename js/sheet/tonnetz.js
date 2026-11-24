import { qualityId } from './circle.js';
import { mod12 } from '../core/math.js';

const COLUMNS = 7;
const ROWS = 5;
const FIFTH = 7;
const MAJOR_THIRD = 4;
const ROW_HEIGHT = Math.sqrt(3) / 2;

export const plrId = Object.freeze({
  parallel: 'P',
  leading: 'L',
  relative: 'R',
});

const CORNERS = {
  [qualityId.major]: [[0, 0], [0, 1], [1, 0]],
  [qualityId.minor]: [[0, 1], [1, 0], [1, 1]],
};

const NEIGHBOURS = {
  [qualityId.major]: { quality: qualityId.minor, [plrId.parallel]: [0, -1], [plrId.leading]: [0, 0], [plrId.relative]: [-1, 0] },
  [qualityId.minor]: { quality: qualityId.major, [plrId.parallel]: [0, 1], [plrId.leading]: [0, 0], [plrId.relative]: [1, 0] },
};

function nodeId(q, r) {
  return `${q},${r}`;
}

function triangleId(quality, q, r) {
  return `${quality}:${q},${r}`;
}

function latticeNodes(tonic, columns, rows) {
  const top = Math.floor(rows / 2);
  const left = Math.floor(columns / 2);
  return Array.from({ length: rows }, (_, k) => {
    const r = top - k;
    return Array.from({ length: columns }, (__, c) => {
      const q = c - left - Math.floor(r / 2);
      return { id: nodeId(q, r), q, r, pc: mod12(tonic + FIFTH * q + MAJOR_THIRD * r), x: c + (r % 2 ? 0.5 : 0), y: k * ROW_HEIGHT };
    });
  }).flat();
}

function neighbourIds(quality, q, r) {
  const { quality: other, ...moves } = NEIGHBOURS[quality];
  return Object.fromEntries(Object.entries(moves).map(([id, [dq, dr]]) => [id, triangleId(other, q + dq, r + dr)]));
}

function latticeTriangles(nodes) {
  const at = new Map(nodes.map((node) => [node.id, node]));
  const triangles = nodes.flatMap(({ q, r }) => Object.entries(CORNERS).flatMap(([quality, offsets]) => {
    const corners = offsets.map(([dq, dr]) => at.get(nodeId(q + dq, r + dr)));
    if (corners.some((corner) => !corner)) return [];
    const pcs = corners.map((corner) => corner.pc);
    return [{ id: triangleId(quality, q, r), quality, root: pcs[0], pcs, points: corners.map(({ x, y }) => [x, y]), neighbours: neighbourIds(quality, q, r) }];
  }));
  const ids = new Set(triangles.map((tri) => tri.id));
  for (const tri of triangles) {
    for (const [move, id] of Object.entries(tri.neighbours)) tri.neighbours[move] = ids.has(id) ? id : null;
  }
  return triangles;
}

export function tonnetzLayout(tonic, columns = COLUMNS, rows = ROWS) {
  const nodes = latticeNodes(tonic, columns, rows);
  return {
    nodes,
    triangles: latticeTriangles(nodes),
    width: Math.max(...nodes.map((node) => node.x)),
    height: Math.max(...nodes.map((node) => node.y)),
  };
}

export function trianglesWithin(triangles, pcs) {
  return triangles.filter((tri) => tri.pcs.every((pc) => pcs.includes(pc)));
}

export function trianglesAround(triangles, pc) {
  return triangles.filter((tri) => tri.pcs.includes(pc));
}

export function neighboursOf(triangles, picked) {
  const own = new Set(picked.map((tri) => tri.id));
  const near = new Set(picked.flatMap((tri) => Object.values(tri.neighbours)));
  return triangles.filter((tri) => near.has(tri.id) && !own.has(tri.id));
}
