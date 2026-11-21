import { attachDialog } from './modal.js';
import { choiceRow } from './rows.js';
import { WEDGES, ringId, keyOf, keyTonic, wedgeNames, keyWedges, keyChords, chordNotes, wedgeNotes } from '../sheet/circle.js';
import { startNotes } from '../audio/tone.js';
import { svg } from '../core/svg.js';
import { div, span, iconButton, plainButton, cls } from '../core/dom.js';
import { evt, keys } from '../core/events.js';
import { icon, iconId } from '../core/icons.js';

const STEP = 360 / WEDGES;
const RINGS = { [ringId.outer]: [66, 97], [ringId.inner]: [44, 66], [ringId.dim]: [29, 44] };
const LABEL_RADIUS = { [ringId.outer]: 81.5, [ringId.inner]: 55, [ringId.dim]: 36.5 };
const HUB_RADIUS = 29;
const GRADIENT_ID = 'circle-accent';
const MAIN_DY = '-0.4em';
const ALT_DY = '1.15em';
const HUB_KEY_DY = '-0.25em';
const HUB_QUALITY_DY = '1.6em';

const soundId = Object.freeze({
  note: 'note',
  chord: 'chord',
});

const SOUNDS = [
  { id: soundId.note, label: 'Note' },
  { id: soundId.chord, label: 'Chord' },
];

function pretty(name) {
  return name.replace(/#/g, '♯').replace(/([A-G])b/g, '$1♭');
}

function nameParts(name) {
  const [, root, quality] = /^([A-G][#b]?)(m|dim)?$/.exec(name);
  if (!quality) return [pretty(root), ''];
  return [pretty(root).toLowerCase(), quality === 'dim' ? '°' : 'm'];
}

function appendName(node, name) {
  const [root, suffix] = nameParts(name);
  node.append(root);
  if (suffix) node.append(svg('tspan', { class: 'suffix' }, suffix));
}

function labelText(x, y, names) {
  const text = svg('text', { x, y });
  if (names.length === 1) {
    appendName(text, names[0]);
    return text;
  }
  const [main, alt] = names.map((name, i) => {
    const line = svg('tspan', { x, dy: i ? ALT_DY : MAIN_DY, class: i ? 'alt' : '' });
    appendName(line, name);
    return line;
  });
  text.append(main, alt);
  return text;
}

function keyRoot(index, minor) {
  const key = keyOf(index, minor);
  return pretty(minor ? key.slice(0, -1) : key);
}

function keyTitle(index, minor) {
  return `${keyRoot(index, minor)} ${minor ? 'minor' : 'major'}`;
}

function point(r, deg) {
  const a = (deg * Math.PI) / 180;
  return [r * Math.cos(a), r * Math.sin(a)].map((n) => n.toFixed(2));
}

function sectorPath([r0, r1], index) {
  const a0 = index * STEP - 90 - STEP / 2;
  const a1 = a0 + STEP;
  const [x0, y0] = point(r1, a0);
  const [x1, y1] = point(r1, a1);
  const [x2, y2] = point(r0, a1);
  const [x3, y3] = point(r0, a0);
  return `M${x0} ${y0}A${r1} ${r1} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 0 0 ${x3} ${y3}Z`;
}

function wedgeText(index, minor, keyIndex) {
  const ring = minor ? ringId.inner : ringId.outer;
  const [x, y] = point(LABEL_RADIUS[ring], index * STEP - 90);
  return labelText(x, y, wedgeNames(index, minor, keyIndex));
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
  g.append(svg('path', { d: sectorPath(RINGS[ring], index) }));
  return g;
}

function gradient() {
  const defs = svg('defs');
  const grad = svg('linearGradient', { id: GRADIENT_ID, x1: 0, y1: 0, x2: 1, y2: 1 });
  grad.append(svg('stop', { offset: 0, class: 'accent-from' }), svg('stop', { offset: 1, class: 'accent-to' }));
  defs.append(grad);
  return defs;
}

function slotOf(index, ring) {
  return `${ring}${index}`;
}

function dimWedge(item) {
  const g = svg('g', {
    class: `wedge ${ringId.dim}`,
    role: 'button',
    tabindex: 0,
    'aria-label': `${pretty(item.chord.replace(/dim$/, ''))} diminished`,
    'data-index': item.index,
    'data-ring': ringId.dim,
    'data-slot': slotOf(item.index, ringId.dim),
  });
  const [x, y] = point(LABEL_RADIUS[ringId.dim], item.index * STEP - 90);
  g.append(svg('path', { d: sectorPath(RINGS[ringId.dim], item.index) }), labelText(x, y, [item.chord]));
  return g;
}

function chordChip(item) {
  const chip = plainButton(span('circle-numeral', item.numeral), 'circle-chord');
  chip.append(span(null, pretty(item.chord)));
  chip.dataset.slot = slotOf(item.index, item.ring);
  chip.setAttribute('aria-label', `${pretty(item.chord)}, ${item.numeral}`);
  return chip;
}

export function createCircleControl() {
  const button = iconButton(iconId.chartPie, 'Circle of fifths');
  let sound = soundId.note;
  let locked = false;
  let selected = { index: 0, minor: false };

  function open() {
    const wedges = [];
    const wedgeEls = new Map();
    let chipItems = new Map();
    const art = svg('svg', { class: 'circle-art', viewBox: '-100 -100 200 200', role: 'group', 'aria-label': 'Circle of fifths' });
    art.append(gradient());
    for (const minor of [false, true]) {
      for (let index = 0; index < WEDGES; index++) {
        const el = wedge(index, minor);
        wedges.push({ el, index, minor, label: null });
        wedgeEls.set(slotOf(index, minor ? ringId.inner : ringId.outer), el);
        art.append(el);
      }
    }
    const hub = svg('circle', { class: 'hub', r: HUB_RADIUS });
    const hubName = svg('text', { class: 'hub-name', x: 0, y: 0 });
    let dimEl = null;
    art.append(hub, hubName);

    const artRow = div('modal-row circle-row');
    artRow.append(art);
    const chords = div('circle-chords');

    function render() {
      const { outer, inner } = keyWedges(selected.index);
      for (const w of wedges) {
        w.el.classList.toggle(cls.inKey, (w.minor ? inner : outer).includes(w.index));
        w.el.classList.toggle(cls.active, w.index === selected.index && w.minor === selected.minor);
        w.label?.remove();
        w.label = wedgeText(w.index, w.minor, selected.index);
        w.el.append(w.label);
      }
      hubName.replaceChildren(
        svg('tspan', { x: 0, dy: HUB_KEY_DY }, keyRoot(selected.index, selected.minor)),
        svg('tspan', { x: 0, dy: HUB_QUALITY_DY, class: 'hub-quality' }, selected.minor ? 'minor' : 'Major'),
      );
      const items = keyChords(selected.index, selected.minor);
      chipItems = new Map(items.map((item) => [slotOf(item.index, item.ring), item]));
      if (dimEl) wedgeEls.delete(dimEl.dataset.slot);
      dimEl?.remove();
      dimEl = dimWedge(items.find((item) => item.ring === ringId.dim));
      wedgeEls.set(dimEl.dataset.slot, dimEl);
      art.insertBefore(dimEl, hub);
      chords.replaceChildren(...items.map(chordChip));
    }

    const lockBtn = iconButton(iconId.lockOpen, 'Lock key');

    function renderLock() {
      lockBtn.replaceChildren(icon(locked ? iconId.lock : iconId.lockOpen));
      lockBtn.classList.toggle(cls.active, locked);
      lockBtn.setAttribute('aria-pressed', String(locked));
      lockBtn.title = locked ? 'Unlock key' : 'Lock key';
      lockBtn.setAttribute('aria-label', lockBtn.title);
    }

    lockBtn.addEventListener(evt.click, () => {
      locked = !locked;
      renderLock();
    });

    const playRow = choiceRow('Play', SOUNDS, sound, (id) => { sound = id; });
    playRow.append(lockBtn);

    let voice = null;
    let pressed = [];

    function press(slot) {
      for (const el of pressed) el.classList.remove(cls.pressed);
      pressed = slot ? [wedgeEls.get(slot), chords.querySelector(`[data-slot="${slot}"]`)].filter(Boolean) : [];
      for (const el of pressed) el.classList.add(cls.pressed);
    }

    function tonic() {
      return keyTonic(selected.index, selected.minor);
    }

    function wedgeVoice(el, chord) {
      const tapped = { index: Number(el.dataset.index), minor: el.dataset.ring === ringId.inner };
      const key = locked ? selected : tapped;
      const stop = startNotes(wedgeNotes(tapped.index, tapped.minor, chord, keyTonic(key.index, key.minor)));
      if (!locked && (tapped.index !== selected.index || tapped.minor !== selected.minor)) {
        selected = tapped;
        render();
      }
      return stop;
    }

    function chipVoice(slot, chord) {
      const item = chipItems.get(slot);
      return startNotes(chordNotes(item.pc, item.quality, chord, tonic()));
    }

    function begin(target) {
      const slot = target.closest('[data-slot]')?.dataset.slot;
      if (!slot) return;
      end();
      const wedgeEl = target.closest('.wedge');
      const chord = sound === soundId.chord;
      voice = wedgeEl && wedgeEl.dataset.ring !== ringId.dim ? wedgeVoice(wedgeEl, chord) : chipVoice(slot, chord);
      press(slot);
    }

    function end() {
      voice?.();
      voice = null;
      press(null);
    }

    for (const area of [art, chords]) {
      area.addEventListener(evt.pointerdown, (e) => {
        if (e.button === 0) begin(e.target);
      });
      for (const name of [evt.pointerup, evt.pointercancel, evt.pointerleave, evt.keyup]) {
        area.addEventListener(name, end);
      }
      area.addEventListener(evt.contextmenu, (e) => e.preventDefault());
      area.addEventListener(evt.keydown, (e) => {
        if ((e.key !== keys.enter && e.key !== keys.space) || !e.target.closest('[data-slot]')) return;
        e.preventDefault();
        if (!e.repeat) begin(e.target);
      });
    }

    render();
    renderLock();
    return { rows: [playRow, artRow, chords], onClose: end };
  }

  const dispose = attachDialog(button, 'Circle of fifths', open);
  return { button, open, dispose };
}
