import { hubText, stepsOf } from './theory-views.js';
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

function wedge(index, minor) {
  const ring = minor ? ringId.inner : ringId.outer;
  const g = svg('g', {
    class: `wedge ${ring}`,
    role: 'button',
    tabindex: 0,
    'aria-label': keyTitle(index, minor),
    'data-index': index,
    'data-ring': ring,
    'data-slot': slotOf(index, ring),
  });
  g.append(svg('path', { d: annularSector(RINGS[ring], wedgeAngle(index), STEP) }));
  return g;
}

function dimWedge(item, bare) {
  const g = svg('g', {
    class: `wedge ${ringId.dim}`,
    role: 'button',
    tabindex: 0,
    'aria-label': `${displayName(item.chord.replace(/dim$/, ''))} diminished`,
    'data-index': item.index,
    'data-ring': ringId.dim,
    'data-slot': item.slot,
  });
  const [x, y] = polar(LABEL_RADIUS[ringId.dim], wedgeAngle(item.index));
  g.append(svg('path', { d: annularSector(RINGS[ringId.dim], wedgeAngle(item.index), STEP) }), labelText(x, y, [item.chord], bare));
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
  const el = svg('svg', { class: 'circle-art', viewBox: '-100 -100 200 200', role: 'group', 'aria-label': 'Circle of fifths' });
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
    dimEl = dimWedge(items.find((item) => item.ring === ringId.dim), bare);
    el.insertBefore(dimEl, hub);
  }

  function tagSteps(run) {
    for (const w of wedges) {
      const steps = stepsOf(run, keyTonic(w.index, w.minor), []);
      if (steps) w.node.dataset.step = steps;
      else delete w.node.dataset.step;
    }
  }

  function block(allowed, items) {
    for (const w of wedges) w.node.classList.toggle(cls.blocked, !allowed.includes(keyTonic(w.index, w.minor)));
    dimEl?.classList.toggle(cls.blocked, !allowed.includes(items.find((item) => item.ring === ringId.dim).pc));
  }

  function wedgesFor(pc) {
    const at = [wedgeOf(pc), wedgeOf(pc, true)];
    return wedges.filter((w) => w.index === at[Number(w.minor)]).map((w) => w.node);
  }

  return { el, render, tagSteps, block, wedgesFor };
}
