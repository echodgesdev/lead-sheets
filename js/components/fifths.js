import { hubText, stepsOf, tapAttrs, theoryArt, CIRCLE_BOX } from './theory-views.js';
import { WEDGES, ringId, keyTonic, wedgeNames, keyWedges, displayName, wedgeOf } from '../sheet/circle.js';
import { slotOf, keyLabel } from '../sheet/theory-model.js';
import { svg, polar, annularSector } from '../core/svg.js';
import { cls } from '../core/dom.js';

const STEP = 360 / WEDGES;
const RINGS = { [ringId.outer]: [66, 97], [ringId.inner]: [44, 66], [ringId.dim]: [29, 44] };
const LABEL_RADIUS = { [ringId.outer]: 81.5, [ringId.inner]: 55, [ringId.dim]: 36.5 };
const HUB_RADIUS = 29;
const GRADIENT_ID = 'circle-accent';
const MAIN_DY = '-0.4em';
const ALT_DY = '1.15em';

function nameParts(name) {
  const [, root, quality] = /^([A-G][#b]?)(m|dim)?$/.exec(name);
  if (!quality) return [displayName(root), ''];
  return [displayName(root).toLowerCase(), quality === 'dim' ? '°' : 'm'];
}

function appendName(node, name, bare) {
  const [root, suffix] = nameParts(name);
  node.append(root);
  if (suffix && !bare) node.append(svg('tspan', { class: 'suffix' }, suffix));
}

function labelText(x, y, names, bare) {
  const text = svg('text', { x, y });
  if (names.length === 1) {
    appendName(text, names[0], bare);
    return text;
  }
  const [main, alt] = names.map((name, i) => {
    const line = svg('tspan', { x, dy: i ? ALT_DY : MAIN_DY, class: i ? 'alt' : '' });
    appendName(line, name, bare);
    return line;
  });
  text.append(main, alt);
  return text;
}

function keyTitle(index, minor) {
  const { root } = keyLabel(index, minor);
  return `${root} ${minor ? 'minor' : 'major'}`;
}

function wedgeAngle(index) {
  return index * STEP - 90;
}

function wedgeText(index, minor, keyIndex, bare) {
  const ring = minor ? ringId.inner : ringId.outer;
  const [x, y] = polar(LABEL_RADIUS[ring], wedgeAngle(index));
  return labelText(x, y, wedgeNames(index, minor, keyIndex), bare);
}

function wedgeNode(ring, index, slot, label) {
  const g = svg('g', { class: `wedge ${ring}`, ...tapAttrs(label), 'data-index': index, 'data-ring': ring, 'data-slot': slot });
  g.append(svg('path', { d: annularSector(RINGS[ring], wedgeAngle(index), STEP) }));
  return g;
}

function wedge(index, minor) {
  const ring = minor ? ringId.inner : ringId.outer;
  return wedgeNode(ring, index, slotOf(index, ring), keyTitle(index, minor));
}

function dimWedge(item, bare) {
  const g = wedgeNode(ringId.dim, item.index, item.slot, `${displayName(item.chord.replace(/dim$/, ''))} diminished`);
  const [x, y] = polar(LABEL_RADIUS[ringId.dim], wedgeAngle(item.index));
  g.append(labelText(x, y, [item.chord], bare));
  return g;
}

function gradient() {
  const defs = svg('defs');
  const grad = svg('linearGradient', { id: GRADIENT_ID, x1: 0, y1: 0, x2: 1, y2: 1 });
  grad.append(svg('stop', { offset: 0, class: 'accent-from' }), svg('stop', { offset: 1, class: 'accent-to' }));
  defs.append(grad);
  return defs;
}

export function createFifths() {
  const wedges = [];
  const el = theoryArt('circle-art', CIRCLE_BOX, 'Circle of fifths');
  el.append(gradient());
  for (const minor of [false, true]) {
    for (let index = 0; index < WEDGES; index++) {
      const node = wedge(index, minor);
      wedges.push({ node, index, minor, label: null });
      el.append(node);
    }
  }
  const hub = svg('circle', { class: 'hub', r: HUB_RADIUS });
  let hubName = hubText('', '');
  let dimEl = null;
  let dimItem = null;
  el.append(hub, hubName);

  function render({ index, minor, items, bare }) {
    const { outer, inner } = keyWedges(index);
    for (const w of wedges) {
      w.node.classList.toggle(cls.inKey, (w.minor ? inner : outer).includes(w.index));
      w.node.classList.toggle(cls.active, w.index === index && w.minor === minor);
      w.label?.remove();
      w.label = wedgeText(w.index, w.minor, index, bare);
      w.node.append(w.label);
    }
    const { root, quality } = keyLabel(index, minor);
    const label = hubText(root, quality);
    hubName.replaceWith(label);
    hubName = label;
    dimEl?.remove();
    dimItem = items.find((item) => item.ring === ringId.dim);
    dimEl = dimWedge(dimItem, bare);
    el.insertBefore(dimEl, hub);
  }

  function pcOf(node) {
    const { ring, index } = node.dataset;
    return ring === ringId.dim ? dimItem.pc : keyTonic(Number(index), ring === ringId.inner);
  }

  function tagSteps(run) {
    for (const w of wedges) {
      const steps = stepsOf(run, keyTonic(w.index, w.minor), []);
      if (steps) w.node.dataset.step = steps;
      else delete w.node.dataset.step;
    }
  }

  function block(allowed) {
    for (const node of [...wedges.map((w) => w.node), dimEl]) node.classList.toggle(cls.blocked, !allowed.includes(pcOf(node)));
  }

  function wedgesFor(pc) {
    const at = [wedgeOf(pc), wedgeOf(pc, true)];
    return wedges.filter((w) => w.index === at[Number(w.minor)]).map((w) => w.node);
  }

  return { el, render, tagSteps, block, wedgesFor, pcOf };
}
