import { attachDialog, openModal } from './modal.js';
import { modalRow, choiceToggle, labeledField } from './rows.js';
import { renderClock, renderChain, renderKeys, hubText, alignId, modeId } from './theory-views.js';
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
  shapeId,
  chordShape,
  shapeChoices,
  stepPitches,
  voiceNotes,
  scaleId,
  SCALES,
  scalePitches,
  scaleRun,
  scaleRoot,
  wedgeOf,
} from '../sheet/circle.js';
import { startNotes, playRun } from '../audio/tone.js';
import { getKeyOctaves } from '../data/prefs.js';
import { svg, polar, annularSector } from '../core/svg.js';
import { div, span, iconButton, plainButton, labeledButton, cls } from '../core/dom.js';
import { evt, keys } from '../core/events.js';
import { icon, iconId } from '../core/icons.js';

const STEP = 360 / WEDGES;
const RINGS = { [ringId.outer]: [66, 97], [ringId.inner]: [44, 66], [ringId.dim]: [29, 44] };
const LABEL_RADIUS = { [ringId.outer]: 81.5, [ringId.inner]: 55, [ringId.dim]: 36.5 };
const HUB_RADIUS = 29;
const GRADIENT_ID = 'circle-accent';
const MAIN_DY = '-0.4em';
const ALT_DY = '1.15em';
const PLAYABLE = '[data-slot], [data-notes], [data-scale]';

const viewId = Object.freeze({
  fifths: 'fifths',
  clock: 'clock',
  intervals: 'intervals',
  notes: 'notes',
  keys: 'keys',
});

const MODES = [
  { id: modeId.note, icon: iconId.musicNote, label: 'Note', title: 'Single notes' },
  { id: modeId.chord, icon: iconId.musicNotes, label: 'Chord', title: 'Chords' },
  { id: modeId.scale, icon: iconId.stairs, label: 'Scale', title: 'Scales' },
];

const rootingId = Object.freeze({
  inKey: 'inKey',
  onTonic: 'onTonic',
});

const ROOTINGS = [
  { id: rootingId.inKey, label: 'In key', title: 'Modes built from the notes of the key, like D Dorian in C' },
  { id: rootingId.onTonic, label: 'On tonic', title: 'Every mode starting on the tonic, like C Dorian' },
];

const INVERSION_TITLES = ['Root position', '1st inversion', '2nd inversion', '3rd inversion', '4th inversion', '5th inversion'];

const VIEWS = [
  { id: viewId.fifths, icon: iconId.chartPie, label: 'Fifths', title: 'Circle of fifths' },
  { id: viewId.clock, icon: iconId.clock, label: 'Clock', title: 'Clock' },
  { id: viewId.intervals, icon: iconId.rulerHorizontal, label: 'Intervals', title: 'Intervals' },
  { id: viewId.notes, icon: iconId.music, label: 'Notes', title: 'Notes' },
  { id: viewId.keys, icon: iconId.pianoKeys, label: 'Keys', title: 'Keys' },
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

function scaleChip(scale, top) {
  const chip = plainButton(span('circle-degree', top), 'circle-chord');
  chip.append(span(null, scale.short));
  chip.dataset.scale = scale.id;
  chip.title = scale.name;
  chip.setAttribute('aria-label', scale.name);
  return chip;
}

function inversionOptions(count) {
  return Array.from({ length: count }).map((_, i) => ({ id: i, label: i ? String(i) : 'R', title: INVERSION_TITLES[i] }));
}

function chordChip(item, degree, bare, shaped) {
  const numeral = bare ? String(degree) : item.numeral;
  const name = displayName(bare ? chordRoot(item.chord) : shaped.name);
  const chip = plainButton(span(bare ? 'circle-degree' : 'circle-numeral', numeral), 'circle-chord');
  chip.append(span(null, name));
  chip.dataset.slot = item.slot;
  chip.setAttribute('aria-label', bare ? `${name}, degree ${degree}` : `${name}, ${numeral}`);
  return chip;
}

export function createCircleControl() {
  const button = iconButton(iconId.bookOpen, 'Theory');
  let mode = modeId.chord;
  let locked = false;
  let view = viewId.fifths;
  let inversion = 0;
  let scaleChoice = scaleId.ionian;
  const chordShapes = [];
  let rooting = rootingId.inKey;
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
      return mode === modeId.note;
    }

    function bareLabels() {
      return mode !== modeId.chord;
    }

    function currentScaleRoot(id = scaleChoice) {
      return scaleRoot(selected.index, selected.minor, id, rooting === rootingId.inKey);
    }

    function keyPcs() {
      return items.map((each) => each.pc);
    }

    function shapeIdOf(index) {
      return chordShapes[index] ?? shapeId.triad;
    }

    function shapeOf(item) {
      return chordShape(item, keyPcs(), shapeIdOf(items.indexOf(item)));
    }

    function scaleList(names) {
      return SCALES.map((scale) => {
        const root = currentScaleRoot(scale.id);
        const top = rooting === rootingId.inKey ? displayName(names[root]) : scale.tag;
        return { ...scale, root, top, pcs: scalePitches(root, scale.id), run: scaleRun(root, scale.id) };
      });
    }

    function model() {
      const t = tonic();
      const chord = items[chordIndex];
      const keyPcs = items.map((item) => item.pc);
      const names = pitchNames(selected.index, keyPcs);
      const shaped = shapeOf(chord);
      const voiced = voiceNotes(chord.pc, shaped.steps, t, inversion);
      const note = { pc: chord.pc, midi: noteMidi(chord.pc, t), degree: chordIndex + 1, name: chordRoot(chord.chord) };
      const scales = scaleList(names);
      const scale = scales.find((each) => each.id === scaleChoice);
      const display = mode === modeId.scale ? scale.root : t;
      const chordPcs = stepPitches(chord.pc, shaped.steps);
      const byMode = {
        [modeId.chord]: { shown: voiced, shownPcs: chordPcs, rootPc: chord.pc, allowed: chordPcs },
        [modeId.note]: { shown: [note.midi], shownPcs: [note.pc], rootPc: note.pc, allowed: keyPcs },
        [modeId.scale]: { shown: scale.run, shownPcs: scale.pcs, rootPc: scale.root, allowed: scale.pcs },
      };
      return {
        ...byMode[mode],
        mode,
        items,
        chordIndex,
        chord,
        voiced,
        note,
        scale,
        scales,
        shape: shapeIdOf(chordIndex),
        shapeOf,
        locked,
        tonic: display,
        tonicMidi: noteMidi(display, display),
        keyTonicPc: t,
        keyTonicMidi: noteMidi(t, t),
        names,
        scalePcs: keyPcs,
        noteMidiOf: (pc) => noteMidi(pc, display),
        minOctaves: getKeyOctaves(),
      };
    }

    const header = div('tool-header');
    header.append(choiceToggle(VIEWS, view, (id) => {
      if (id === view) return;
      view = id;
      renderStage();
    }));
    let voicingCount = 0;

    function voicingToggle(count) {
      return choiceToggle(inversionOptions(count), inversion, (id) => {
        if (id === inversion) return;
        inversion = id;
        renderStage();
      });
    }

    const voicingField = labeledField('Voicing', voicingToggle(3));

    function syncVoicing() {
      const count = shapeOf(items[chordIndex]).steps.length;
      if (count === voicingCount) return;
      voicingCount = count;
      inversion = Math.min(inversion, count - 1);
      voicingField.lastChild.replaceWith(voicingToggle(count));
    }

    function openShapes(index) {
      const item = items[index];
      const choices = shapeChoices(item, keyPcs());
      const pick = (id) => {
        if (id === shapeIdOf(index)) return;
        chordShapes[index] = id;
        sheet.close();
        renderChips();
        syncVoicing();
        renderStage();
      };
      const chip = (choice) => {
        const b = labeledButton(null, displayName(choice.name), 'chip');
        const on = choice.id === shapeIdOf(index);
        b.classList.toggle(cls.active, on);
        b.setAttribute('aria-pressed', String(on));
        b.addEventListener(evt.click, () => pick(choice.id));
        return b;
      };
      const group = (label, list) => {
        if (!list.length) return [];
        const chips = div('chips');
        chips.append(...list.map(chip));
        return [modalRow(label, chips)];
      };
      const sheet = openModal(
        `Swap ${displayName(item.chord.replace(/dim$/, '°'))}`,
        ...group('In key', choices.filter((c) => c.inKey)),
        ...group('Outside the key', choices.filter((c) => !c.inKey)),
      );
    }

    function chordCell(item, index) {
      const cell = div('chord-cell');
      const more = iconButton(iconId.ellipsis, `Swap ${displayName(item.chord)}`, 'chord-more');
      more.addEventListener(evt.click, () => openShapes(index));
      cell.append(chordChip(item, index + 1, false, shapeOf(item)), more);
      return cell;
    }

    function renderStage() {
      if (view !== viewId.fifths) stage.replaceChildren(RENDERERS[view](model()));
      else if (art.parentNode !== stage) stage.replaceChildren(art);
    }

    function syncChips() {
      chords.dataset.mode = mode;
      [...chords.querySelectorAll('.circle-chord')].forEach((chip, i) => {
        chip.classList.toggle(cls.active, mode === modeId.scale ? chip.dataset.scale === scaleChoice : i === chordIndex);
      });
    }

    function renderChips() {
      const names = pitchNames(selected.index, items.map((item) => item.pc));
      if (mode === modeId.scale) chords.replaceChildren(...scaleList(names).map((scale) => scaleChip(scale, scale.top)));
      else if (noteMode()) chords.replaceChildren(...items.map((item, i) => chordChip(item, i + 1, true, shapeOf(item))));
      else chords.replaceChildren(...items.map(chordCell));
      syncChips();
    }

    function renderKey() {
      const { outer, inner } = keyWedges(selected.index);
      for (const w of wedges) {
        w.el.classList.toggle(cls.inKey, (w.minor ? inner : outer).includes(w.index));
        w.el.classList.toggle(cls.active, w.index === selected.index && w.minor === selected.minor);
        w.label?.remove();
        w.label = wedgeText(w.index, w.minor, selected.index, bareLabels());
        w.el.append(w.label);
      }
      const label = hubText(keyRoot(selected.index, selected.minor), selected.minor ? 'minor' : 'Major');
      hubName.replaceWith(label);
      hubName = label;
      items = keyChords(selected.index, selected.minor).map((item) => ({ ...item, slot: slotOf(item.index, item.ring) }));
      chipItems = new Map(items.map((item) => [item.slot, item]));
      dimEl?.remove();
      dimEl = dimWedge(items.find((item) => item.ring === ringId.dim), bareLabels());
      art.insertBefore(dimEl, hub);
      renderChips();
      syncVoicing();
      renderStage();
    }

    const lockBtn = iconButton(iconId.lockOpen, 'Lock');

    function renderLock() {
      lockBtn.replaceChildren(icon(locked ? iconId.lock : iconId.lockOpen));
      lockBtn.classList.toggle(cls.active, locked);
      lockBtn.setAttribute('aria-pressed', String(locked));
      lockBtn.title = locked ? 'Unlock' : 'Lock to the key or selection';
      lockBtn.setAttribute('aria-label', lockBtn.title);
    }

    lockBtn.addEventListener(evt.click, () => {
      locked = !locked;
      renderLock();
      renderStage();
    });

    const modeToggle = choiceToggle(MODES, mode, (id) => {
      if (id === mode) return;
      mode = id;
      stopRun();
      syncMode();
      renderKey();
    });
    const rootingField = labeledField('Modes', choiceToggle(ROOTINGS, rooting, (id) => {
      if (id === rooting) return;
      rooting = id;
      stopRun();
      renderChips();
      renderStage();
    }));
    modeToggle.classList.add('compact-toggle');
    header.append(lockBtn);
    const controls = modalRow(null, labeledField('Play', modeToggle), voicingField, rootingField);
    controls.classList.add('circle-controls');

    let voice = null;
    let pressed = [];

    function noteWedges(pc) {
      return [slotOf(wedgeOf(pc), ringId.outer), slotOf(wedgeOf(pc, true), ringId.inner)]
        .map((slot) => stage.querySelector(`[data-slot="${slot}"]`))
        .filter(Boolean);
    }

    function notePcOf(el) {
      const { ring, index, slot } = el.dataset;
      if (ring && ring !== ringId.dim) return keyTonic(Number(index), ring === ringId.inner);
      return chipItems.get(slot)?.pc ?? null;
    }

    function press(el) {
      for (const p of pressed) p.classList.remove(cls.pressed);
      const slot = el?.dataset.slot;
      const notePc = el && noteMode() && view === viewId.fifths ? notePcOf(el) : null;
      if (!el) pressed = [];
      else if (notePc !== null) pressed = [...noteWedges(notePc), ...chords.querySelectorAll(`[data-slot="${slot}"]`)];
      else if (slot) pressed = [stage, chords].flatMap((root) => [...root.querySelectorAll(`[data-slot="${slot}"]`)]);
      else pressed = [el];
      for (const p of pressed) p.classList.add(cls.pressed);
    }

    function wedgeVoice(el) {
      const tapped = { index: Number(el.dataset.index), minor: el.dataset.ring === ringId.inner };
      const key = locked ? selected : tapped;
      const stop = startNotes(wedgeNotes(tapped.index, tapped.minor, mode === modeId.chord, keyTonic(key.index, key.minor), inversion));
      if (!locked && (tapped.index !== selected.index || tapped.minor !== selected.minor)) {
        selected = tapped;
        chordIndex = 0;
        renderKey();
      }
      return stop;
    }

    function chipVoice(slot) {
      const item = chipItems.get(slot);
      const index = items.indexOf(item);
      if (index !== chordIndex) {
        chordIndex = index;
        syncChips();
        syncVoicing();
        stageDirty = view !== viewId.fifths;
      }
      return startNotes(mode === modeId.chord ? voiceNotes(item.pc, shapeOf(item).steps, tonic(), inversion) : chordNotes(item.pc, item.quality, false, tonic()));
    }

    let run = null;
    let lit = [];

    function light(midi) {
      for (const el of lit) el.classList.remove(cls.pressed);
      lit = [];
      if (midi === null) return;
      lit = view === viewId.fifths ? noteWedges(midi % WEDGES) : [...stage.querySelectorAll(`[data-run~="${midi}"]`)];
      for (const el of lit) el.classList.add(cls.pressed);
    }

    function stopRun() {
      run?.();
      run = null;
    }

    function pickScale(id) {
      stopRun();
      scaleChoice = id;
      syncChips();
      renderStage();
      run = playRun(scaleRun(currentScaleRoot(id), id), light);
    }

    function begin(target) {
      const el = target.closest(PLAYABLE);
      if (!el || el.classList.contains(cls.blocked)) return;
      end();
      const { ring, slot, notes, scale } = el.dataset;
      if (scale) pickScale(scale);
      else if (ring && ring !== ringId.dim) voice = wedgeVoice(el);
      else if (slot) voice = chipVoice(slot);
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

    function syncMode() {
      voicingField.hidden = mode !== modeId.chord;
      rootingField.hidden = mode !== modeId.scale;
    }

    syncMode();
    renderKey();
    renderLock();
    return {
      header,
      rows: [stage, controls, chords],
      onClose: () => {
        end();
        stopRun();
      },
    };
  }

  const dispose = attachDialog(button, 'Theory', open);
  return { button, open, dispose };
}
