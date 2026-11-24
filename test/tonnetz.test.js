import { test, eq } from './harness.js';
import { tonnetzLayout, trianglesWithin, trianglesAround, neighboursOf, plrId } from '../js/sheet/tonnetz.js';
import { keyScale } from '../js/sheet/circle.js';

const C_MAJOR = [0, 2, 4, 5, 7, 9, 11];
const TONICS = Array.from({ length: 12 }, (_, pc) => pc);
const triad = (tri) => `${tri.root}${tri.quality}`;
const find = (triangles, root, quality) => triangles.find((tri) => tri.root === root && tri.quality === quality);

test('tonnetz window is centred on the tonic', () => {
  const { nodes, width, height } = tonnetzLayout(2);
  const centre = nodes.find((node) => node.q === 0 && node.r === 0);
  eq(centre.pc, 2);
  eq([centre.x, centre.y], [width / 2 - 0.25, height / 2]);
  eq(nodes.length, 35);
});

test('tonnetz axes are fifths and major and minor thirds', () => {
  const { nodes } = tonnetzLayout(0);
  const at = (q, r) => nodes.find((node) => node.q === q && node.r === r).pc;
  eq([at(1, 0), at(0, 1), at(1, -1)], [7, 4, 3]);
  const row = nodes.filter((node) => node.r === 0).sort((a, b) => a.x - b.x);
  eq(row.slice(1).map((node, i) => node.x - row[i].x), [1, 1, 1, 1, 1, 1]);
});

test('tonnetz window shows every pitch class for every tonic', () => {
  for (const tonic of TONICS) {
    const pcs = new Set(tonnetzLayout(tonic).nodes.map((node) => node.pc));
    eq(pcs.size, 12, String(tonic));
  }
});

test('tonnetz triangles are major triads pointing up and minor triads pointing down', () => {
  const { triangles } = tonnetzLayout(0);
  const major = find(triangles, 0, 'major');
  const minor = find(triangles, 9, 'minor');
  eq(major.pcs, [0, 4, 7]);
  eq(minor.pcs, [9, 0, 4]);
  const apex = (tri) => tri.points.map(([, y]) => y);
  eq(apex(major).filter((y) => y === Math.max(...apex(major))).length, 2);
  eq(apex(minor).filter((y) => y === Math.min(...apex(minor))).length, 2);
});

test('tonnetz neighbours are the P, L and R transforms', () => {
  const { triangles } = tonnetzLayout(0);
  const byId = new Map(triangles.map((tri) => [tri.id, tri]));
  const moves = (tri) => Object.fromEntries(Object.entries(tri.neighbours).map(([move, id]) => [move, triad(byId.get(id))]));
  eq(moves(find(triangles, 0, 'major')), { [plrId.parallel]: '0minor', [plrId.leading]: '4minor', [plrId.relative]: '9minor' });
  const aMinor = triangles.find((tri) => tri.root === 9 && tri.quality === 'minor' && Object.values(tri.neighbours).every(Boolean));
  eq(moves(aMinor), { [plrId.parallel]: '9major', [plrId.leading]: '5major', [plrId.relative]: '0major' });
});

test('tonnetz neighbours outside the window are null', () => {
  const { triangles } = tonnetzLayout(0);
  eq(triangles.some((tri) => Object.values(tri.neighbours).includes(null)), true);
  const ids = new Set(triangles.map((tri) => tri.id));
  eq(triangles.every((tri) => Object.values(tri.neighbours).every((id) => id === null || ids.has(id))), true);
});

test('tonnetz key region is whole for every major and minor key', () => {
  const diatonic = (pcs) => new Set(trianglesWithin(tonnetzLayout(pcs[0]).triangles, pcs).map(triad));
  for (const index of TONICS) {
    for (const minor of [false, true]) {
      const pcs = keyScale(index, minor);
      const found = diatonic(pcs);
      eq(found.size, 6, `${index} ${minor}`);
    }
  }
  eq([...diatonic(C_MAJOR)].sort(), ['0major', '2minor', '4minor', '5major', '7major', '9minor']);
});

test('tonnetz triangles around a note and inside a chord', () => {
  const { triangles } = tonnetzLayout(0);
  const around = trianglesAround(triangles, 0);
  eq(around.every((tri) => tri.pcs.includes(0)), true);
  eq([...new Set(around.map(triad))].sort(), ['0major', '0minor', '5major', '5minor', '8major', '9minor']);
  eq([...new Set(trianglesWithin(triangles, [0, 4, 7, 11]).map(triad))].sort(), ['0major', '4minor']);
  eq(trianglesWithin(triangles, [11, 2, 5]).length, 0);
});

test('tonnetz neighbours of picked triangles leave the picked ones out', () => {
  const { triangles } = tonnetzLayout(0);
  const picked = trianglesWithin(triangles, [0, 4, 7]);
  const near = neighboursOf(triangles, picked);
  eq(near.some((tri) => picked.includes(tri)), false);
  eq([...new Set(near.map(triad))].sort(), ['0minor', '4minor', '9minor']);
});
