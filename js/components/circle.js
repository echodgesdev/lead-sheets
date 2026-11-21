import { attachDialog } from './modal.js';
import { choiceRow } from './rows.js';
import { renderClock, renderChain, renderKeys, alignId } from './theory-views.js';
import {
  WEDGES,
  ringId,
  keyOf,
  keyTonic,
  wedgeNames,
  keyWedges,
  keyChords,
  chordNotes,
  wedgeNotes,
  displayName,
  pitchNames,
  noteMidi,
  voicing,
} from '../sheet/circle.js';
import { startNotes } from '../audio/tone.js';
import { svg, polar, annularSector } from '../core/svg.js';
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
const PLAYABLE = '[data-slot], [data-notes]';

const soundId = Object.freeze({
  note: 'note',
  chord: 'chord',
});

const viewId = Object.freeze({
  fifths: 'fifths',
  clock: 'clock',
  chain: 'chain',
  keys: 'keys',
});

const SOUNDS = [
  { id: soundId.note, label: 'Note' },
  { id: soundId.chord, label: 'Chord' },
];

const VIEWS = [
  { id: viewId.fifths, label: 'Fifths' },
  { id: viewId.clock, label: 'Clock' },
  { id: viewId.chain, label: 'Chain' },
  { id: viewId.keys, label: 'Keys' },
];

const INVERSIONS = [
  { id: 0, label: 'Root' },
  { id: 1, label: '1st' },
  { id: 2, label: '2nd' },
];

const ALIGNS = [
  { id: alignId.root, label: 'Root' },
  { id: alignId.key, label: 'Key' },
];

const RENDERERS = {
  [viewId.clock]: renderClock,
  [viewId.chain]: renderChain,
  [viewId.keys]: renderKeys,
};

function nameParts(name) {
  const [, root, quality] = /^([A-G][#b]?)(m|dim)?$/.exec(name);
  if (!quality) return [displayName(root), ''];
  return [displayName(root).toLowerCase(), quality === 'dim' ? '°' : 'm'];
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
  return displayName(minor ? key.slice(0, -1) : key);
}

function keyTitle(index, minor) {
  return `${keyRoot(index, minor)} ${minor ? 'minor' : 'major'}`;
}

function wedgeAngle(index) {
  return index * STEP - 90;
}

function wedgeText(index, minor, keyIndex) {
  const ring = minor ? ringId.inner : ringId.outer;
  const [x, y] = polar(LABEL_RADIUS[ring], wedgeAngle(index));
  return labelText(x, y, wedgeNames(index, minor, keyIndex));
}

function slotOf(index, ring) {
  return `${ring}${index}`;
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

function dimWedge(item) {
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
  g.append(svg('path', { d: annularSector(RINGS[ringId.dim], wedgeAngle(item.index), STEP) }), labelText(x, y, [item.chord]));
  return g;
}

function gradient() {
  const defs = svg('defs');
  const grad = svg('linearGradient', { id: GRADIENT_ID, x1: 0, y1: 0, x2: 1, y2: 1 });
  grad.append(svg('stop', { offset: 0, class: 'accent-from' }), svg('stop', { offset: 1, class: 'accent-to' }));
  defs.append(grad);
  return defs;
}

function chordChip(item) {
  const chip = plainButton(span('circle-numeral', item.numeral), 'circle-chord');
  chip.append(span(null, displayName(item.chord)));
  chip.dataset.slot = item.slot;
  chip.setAttribute('aria-label', `${displayName(item.chord)}, ${item.numeral}`);
  return chip;
}

export function createCircleControl() {
  const button = iconButton(iconId.chartPie, 'Circle of fifths');
  let sound = soundId.note;
  let locked = false;
  let view = viewId.fifths;
  let inversion = 0;
  let align = alignId.root;
  let selected = { index: 0, minor: false };
  let chordIndex = 0;

  function open() {
    const wedges = [];
    let items = [];
    let chipItems = new Map();
    let dimEl = null;
    let stageDirty = false;

    const art = svg('svg', { class: 'circle-art', viewBox: '-100 -100 200 200', role: 'group', 'aria-label': 'Circle of fifths' });
    art.append(gradient());
    for (const minor of [false, true]) {
      for (let index = 0; index < WEDGES; index++) {
        const el = wedge(index, minor);
        wedges.push({ el, index, minor, label: null });
        art.append(el);
      }
    }
    const hub = svg('circle', { class: 'hub', r: HUB_RADIUS });
    const hubName = svg('text', { class: 'hub-name', x: 0, y: 0 });
    art.append(hub, hubName);

    const stage = div('modal-row circle-row');
    const chords = div('circle-chords');

    function tonic() {
      return keyTonic(selected.index, selected.minor);
    }

    function model() {
      const t = tonic();
      const chord = items[chordIndex];
      return {
        items,
        chordIndex,
        align,
        chord,
        tonic: t,
        tonicMidi: noteMidi(t, t),
        names: pitchNames(selected.index),
        scalePcs: items.map((item) => item.pc),
        voiced: voicing(chord.pc, chord.quality, inversion, t),
        noteMidiOf: (pc) => noteMidi(pc, t),
      };
    }

    const viewRow = choiceRow(null, VIEWS, view, (id) => {
      if (id === view) return;
      view = id;
      renderStage();
    });
    const voicingRow = choiceRow('Voicing', INVERSIONS, inversion, (id) => {
      if (id === inversion) return;
      inversion = id;
      renderStage();
    });
    const alignRow = choiceRow('Align', ALIGNS, align, (id) => {
      if (id === align) return;
      align = id;
      renderStage();
    });

    function renderStage() {
      voicingRow.hidden = view !== viewId.clock && view !== viewId.keys;
      alignRow.hidden = view !== viewId.chain;
      stage.replaceChildren(view === viewId.fifths ? art : RENDERERS[view](model()));
    }

    function syncChips() {
      [...chords.children].forEach((chip, i) => chip.classList.toggle(cls.active, i === chordIndex));
    }

    function renderKey() {
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
      items = keyChords(selected.index, selected.minor).map((item) => ({ ...item, slot: slotOf(item.index, item.ring) }));
      chipItems = new Map(items.map((item) => [item.slot, item]));
      dimEl?.remove();
      dimEl = dimWedge(items.find((item) => item.ring === ringId.dim));
      art.insertBefore(dimEl, hub);
      chords.replaceChildren(...items.map(chordChip));
      syncChips();
      renderStage();
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

    function press(el) {
      for (const p of pressed) p.classList.remove(cls.pressed);
      const slot = el?.dataset.slot;
      if (!el) pressed = [];
      else if (slot) pressed = [stage, chords].flatMap((root) => [...root.querySelectorAll(`[data-slot="${slot}"]`)]);
      else pressed = [el];
      for (const p of pressed) p.classList.add(cls.pressed);
    }

    function wedgeVoice(el, chord) {
      const tapped = { index: Number(el.dataset.index), minor: el.dataset.ring === ringId.inner };
      const key = locked ? selected : tapped;
      const stop = startNotes(wedgeNotes(tapped.index, tapped.minor, chord, keyTonic(key.index, key.minor)));
      if (!locked && (tapped.index !== selected.index || tapped.minor !== selected.minor)) {
        selected = tapped;
        chordIndex = 0;
        renderKey();
      }
      return stop;
    }

    function chipVoice(slot, chord) {
      const item = chipItems.get(slot);
      const index = items.indexOf(item);
      if (index !== chordIndex) {
        chordIndex = index;
        syncChips();
        stageDirty = view !== viewId.fifths;
      }
      return startNotes(chordNotes(item.pc, item.quality, chord, tonic()));
    }

    function begin(target) {
      const el = target.closest(PLAYABLE);
      if (!el) return;
      end();
      const chord = sound === soundId.chord;
      const { ring, slot, notes } = el.dataset;
      if (ring && ring !== ringId.dim) voice = wedgeVoice(el, chord);
      else if (slot) voice = chipVoice(slot, chord);
      else voice = startNotes(notes.split(',').map(Number));
      press(el.isConnected ? el : null);
    }

    function end() {
      voice?.();
      voice = null;
      press(null);
      if (!stageDirty) return;
      stageDirty = false;
      renderStage();
    }

    for (const area of [stage, chords]) {
      area.addEventListener(evt.pointerdown, (e) => {
        if (e.button === 0) begin(e.target);
      });
      for (const name of [evt.pointerup, evt.pointercancel, evt.pointerleave, evt.keyup]) {
        area.addEventListener(name, end);
      }
      area.addEventListener(evt.contextmenu, (e) => e.preventDefault());
      area.addEventListener(evt.keydown, (e) => {
        if ((e.key !== keys.enter && e.key !== keys.space) || !e.target.closest(PLAYABLE)) return;
        e.preventDefault();
        if (!e.repeat) begin(e.target);
      });
    }

    renderKey();
    renderLock();
    return { rows: [playRow, viewRow, stage, voicingRow, alignRow, chords], onClose: end };
  }

  const dispose = attachDialog(button, 'Circle of fifths', open);
  return { button, open, dispose };
}
