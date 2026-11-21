import { attachDialog } from './modal.js';
import { modalRow, choiceToggle } from './rows.js';
import { renderClock, renderChain, renderKeys, hubText, alignId } from './theory-views.js';
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
const PLAYABLE = '[data-slot], [data-notes]';

const soundId = Object.freeze({
  note: 'note',
  chord: 'chord',
});

const viewId = Object.freeze({
  fifths: 'fifths',
  clock: 'clock',
  intervals: 'intervals',
  notes: 'notes',
  keys: 'keys',
});

const SOUNDS = [
  { id: soundId.note, label: 'Note' },
  { id: soundId.chord, label: 'Chord' },
];

const VIEWS = [
  { id: viewId.fifths, icon: iconId.chartPie, label: 'Fifths', title: 'Circle of fifths' },
  { id: viewId.clock, icon: iconId.clock, label: 'Clock', title: 'Clock' },
  { id: viewId.intervals, icon: iconId.rulerHorizontal, label: 'Intervals', title: 'Intervals' },
  { id: viewId.notes, icon: iconId.music, label: 'Notes', title: 'Notes' },
  { id: viewId.keys, icon: iconId.pianoKeys, label: 'Keys', title: 'Keys' },
];

const INVERSIONS = [
  { id: 0, label: 'R', title: 'Root position' },
  { id: 1, label: '1', title: '1st inversion' },
  { id: 2, label: '2', title: '2nd inversion' },
];

const RENDERERS = {
  [viewId.clock]: renderClock,
  [viewId.intervals]: (model) => renderChain({ ...model, align: alignId.root }),
  [viewId.notes]: (model) => renderChain({ ...model, align: alignId.key }),
  [viewId.keys]: renderKeys,
};

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

function wedgeText(index, minor, keyIndex, bare) {
  const ring = minor ? ringId.inner : ringId.outer;
  const [x, y] = polar(LABEL_RADIUS[ring], wedgeAngle(index));
  return labelText(x, y, wedgeNames(index, minor, keyIndex), bare);
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

function chordRoot(chord) {
  return chord.replace(/(m|dim)$/, '');
}

function chordChip(item, degree, bare) {
  const numeral = bare ? String(degree) : item.numeral;
  const name = displayName(bare ? chordRoot(item.chord) : item.chord);
  const chip = plainButton(span(bare ? 'circle-degree' : 'circle-numeral', numeral), 'circle-chord');
  chip.append(span(null, name));
  chip.dataset.slot = item.slot;
  chip.setAttribute('aria-label', bare ? `${name}, degree ${degree}` : `${name}, ${numeral}`);
  return chip;
}

export function createCircleControl() {
  const button = iconButton(iconId.chartPie, 'Keys & chords');
  let sound = soundId.chord;
  let locked = false;
  let view = viewId.fifths;
  let inversion = 0;
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
    let hubName = hubText('', '');
    art.append(hub, hubName);

    const stage = div('modal-row circle-row');
    const chords = div('circle-chords');

    function tonic() {
      return keyTonic(selected.index, selected.minor);
    }

    function noteMode() {
      return sound === soundId.note;
    }

    function model() {
      const t = tonic();
      const chord = items[chordIndex];
      return {
        items,
        chordIndex,
        chord,
        tonic: t,
        tonicMidi: noteMidi(t, t),
        names: pitchNames(selected.index),
        scalePcs: items.map((item) => item.pc),
        voiced: voicing(chord.pc, chord.quality, inversion, t),
        noteMidiOf: (pc) => noteMidi(pc, t),
        noteMode: noteMode(),
        note: { pc: chord.pc, midi: noteMidi(chord.pc, t), degree: chordIndex + 1, name: chordRoot(chord.chord) },
      };
    }

    const header = div('tool-header');
    header.append(choiceToggle(VIEWS, view, (id) => {
      if (id === view) return;
      view = id;
      renderStage();
    }));
    const voicingToggle = choiceToggle(INVERSIONS, inversion, (id) => {
      if (id === inversion) return;
      inversion = id;
      renderStage();
    });

    function renderStage() {
      lockBtn.hidden = view !== viewId.fifths;
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
        w.label = wedgeText(w.index, w.minor, selected.index, noteMode());
        w.el.append(w.label);
      }
      const label = hubText(keyRoot(selected.index, selected.minor), selected.minor ? 'minor' : 'Major');
      hubName.replaceWith(label);
      hubName = label;
      items = keyChords(selected.index, selected.minor).map((item) => ({ ...item, slot: slotOf(item.index, item.ring) }));
      chipItems = new Map(items.map((item) => [item.slot, item]));
      dimEl?.remove();
      dimEl = dimWedge(items.find((item) => item.ring === ringId.dim), noteMode());
      art.insertBefore(dimEl, hub);
      chords.replaceChildren(...items.map((item, i) => chordChip(item, i + 1, noteMode())));
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

    const controls = modalRow(null, choiceToggle(SOUNDS, sound, (id) => {
      if (id === sound) return;
      sound = id;
      syncSound();
      renderKey();
    }), voicingToggle, lockBtn);
    controls.classList.add('circle-controls');

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
      const stop = startNotes(wedgeNotes(tapped.index, tapped.minor, chord, keyTonic(key.index, key.minor), inversion));
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
      return startNotes(chordNotes(item.pc, item.quality, chord, tonic(), inversion));
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

    function syncSound() {
      voicingToggle.hidden = noteMode();
    }

    syncSound();
    renderKey();
    renderLock();
    return { header, rows: [stage, controls, chords], onClose: end };
  }

  const dispose = attachDialog(button, 'Keys & chords', open);
  return { button, open, dispose };
}
