import { attachDialog, openModal } from './modal.js';
import { modalRow, choiceToggle, labeledField } from './rows.js';
import { selectPill } from './controls.js';
import { renderClock, renderChain, renderKeys, renderFretboard, renderTab, renderStaff, alignId, labelId } from './theory-views.js';
import { createFifths } from './fifths.js';
import { attachPlayer, notesOf } from './theory-player.js';
import { ringId, keyTonic, chordNotes, wedgeNotes, displayName, shapeId, shapeChoices, voiceNotes, scaleId } from '../sheet/circle.js';
import { modeId, keyItems, itemShape, theoryModel, chordRoot } from '../sheet/theory-model.js';
import { GUITAR, fretLayout, showId, matchId } from '../sheet/fretboard.js';
import { fingeringId } from '../sheet/vis-spec.js';
import { startNotes } from '../audio/tone.js';
import { getKeyOctaves } from '../data/prefs.js';
import { div, span, iconButton, plainButton, labeledButton, cls } from '../core/dom.js';
import { evt } from '../core/events.js';
import { icon, iconId } from '../core/icons.js';

const PLAYABLE = '[data-slot], [data-notes], [data-scale]';

const viewId = Object.freeze({
  fifths: 'fifths',
  clock: 'clock',
  intervals: 'intervals',
  notes: 'notes',
  keys: 'keys',
  fretboard: 'fretboard',
  tab: 'tab',
  clef: 'clef',
});

const NECK_VIEWS = new Set([viewId.fretboard, viewId.tab]);

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

const SHOWS = [
  { id: showId.position, label: 'Position', title: 'One position at a time' },
  { id: showId.neck, label: 'Neck', title: 'Every position, with this one highlighted' },
];

const FINGERINGS = [
  { id: fingeringId.caged, label: 'CAGED', title: 'Five box shapes' },
  { id: fingeringId.threePerString, label: '3 / string', title: 'Three notes per string (two for pentatonics)' },
  { id: fingeringId.oneString, label: 'String', title: 'Along one string' },
];

const MATCHES = [
  { id: matchId.unison, label: 'Unison', title: 'Only this exact pitch' },
  { id: matchId.octaves, label: 'Octaves', title: 'This note in every octave' },
];

const LABELS = [
  { id: labelId.none, label: 'No labels', title: 'No labels' },
  { id: labelId.name, label: 'Names', title: 'Note names' },
  { id: labelId.degree, label: 'Degrees', title: 'Degrees from the root' },
];

const INVERSION_TITLES = ['Root position', '1st inversion', '2nd inversion', '3rd inversion', '4th inversion', '5th inversion'];

const VIEWS = [
  { id: viewId.fifths, icon: iconId.chartPie, label: 'Fifths', title: 'Circle of fifths' },
  { id: viewId.clock, icon: iconId.clock, label: 'Clock', title: 'Clock' },
  { id: viewId.intervals, icon: iconId.rulerHorizontal, label: 'Intervals', title: 'Intervals' },
  { id: viewId.notes, icon: iconId.music, label: 'Notes', title: 'Notes' },
  { id: viewId.keys, icon: iconId.pianoKeys, label: 'Keys', title: 'Keys' },
  { id: viewId.fretboard, icon: iconId.guitar, label: 'Guitar', title: 'Fretboard' },
  { id: viewId.tab, icon: iconId.tab, label: 'Tab', title: 'Tablature' },
  { id: viewId.clef, icon: iconId.staff, label: 'Clef', title: 'Staff notation' },
];

const RENDERERS = {
  [viewId.clock]: renderClock,
  [viewId.intervals]: (model) => renderChain({ ...model, align: alignId.root }),
  [viewId.notes]: (model) => renderChain({ ...model, align: alignId.key }),
  [viewId.keys]: renderKeys,
  [viewId.fretboard]: (model, { layout, labels }) => renderFretboard(model, layout, labels),
  [viewId.tab]: (model, { layout }) => renderTab(model, layout),
  [viewId.clef]: renderStaff,
};

function scaleChip(scale) {
  const chip = plainButton(span('circle-degree', scale.top), 'circle-chord');
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
  const neckOptions = { show: showId.position, position: 0, fingering: fingeringId.caged, match: matchId.unison };
  let labels = labelId.none;

  function open() {
    let items = [];
    let chipItems = new Map();
    let stageDirty = false;
    const fifths = createFifths();
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

    function keyPcs() {
      return items.map((each) => each.pc);
    }

    function shapeIdOf(index) {
      return chordShapes[index] ?? shapeId.triad;
    }

    function shapeOf(item) {
      return itemShape(item, items, chordShapes);
    }

    function model() {
      return theoryModel({
        index: selected.index,
        minor: selected.minor,
        mode,
        chordIndex,
        inversion,
        shapes: chordShapes,
        scaleChoice,
        inKey: rooting === rootingId.inKey,
        locked,
        minOctaves: getKeyOctaves(),
      });
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

    let neck = null;

    function renderStage() {
      neckRow.hidden = !NECK_VIEWS.has(view);
      showPill.hidden = view !== viewId.fretboard;
      labelPill.hidden = view !== viewId.fretboard;
      neck = NECK_VIEWS.has(view) ? fretLayout(model(), GUITAR, neckOptions) : null;
      if (neck) {
        neckOptions.position = neck.position;
        neckCount.textContent = neck.count ? `${neck.position + 1} / ${neck.count}` : '–';
      }
      if (view !== viewId.fifths) {
        stage.replaceChildren(RENDERERS[view](model(), { layout: neck, labels }));
        return;
      }
      fifths.tagSteps(model().run);
      if (fifths.el.parentNode !== stage) stage.replaceChildren(fifths.el);
    }

    function syncChips() {
      chords.dataset.mode = mode;
      [...chords.querySelectorAll('.circle-chord')].forEach((chip, i) => {
        chip.classList.toggle(cls.active, mode === modeId.scale ? chip.dataset.scale === scaleChoice : i === chordIndex);
      });
    }

    function renderChips() {
      if (mode === modeId.scale) chords.replaceChildren(...model().scales.map(scaleChip));
      else if (noteMode()) chords.replaceChildren(...items.map((item, i) => chordChip(item, i + 1, true, shapeOf(item))));
      else chords.replaceChildren(...items.map(chordCell));
      syncChips();
    }

    function renderKey() {
      items = keyItems(selected.index, selected.minor);
      chipItems = new Map(items.map((item) => [item.slot, item]));
      fifths.render({ index: selected.index, minor: selected.minor, items, bare: bareLabels() });
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
      player.stopRun();
      syncMode();
      renderKey();
    });
    const rootingField = labeledField('Modes', choiceToggle(ROOTINGS, rooting, (id) => {
      if (id === rooting) return;
      rooting = id;
      player.stopRun();
      renderChips();
      renderStage();
    }));
    modeToggle.classList.add('compact-toggle');
    header.append(lockBtn);
    const controls = modalRow(null, labeledField('Play', modeToggle), voicingField, rootingField);
    controls.classList.add('circle-controls');

    function neckPill(title, options, key) {
      const { pill, select } = selectPill(null, title, options, neckOptions[key]);
      select.addEventListener(evt.change, () => {
        neckOptions[key] = select.value;
        player.stopRun();
        renderStage();
      });
      return pill;
    }

    function stepPosition(by) {
      neckOptions.position += by;
      player.stopRun();
      renderStage();
    }

    const neckCount = span('fret-count');
    const prevPosition = iconButton(iconId.chevronLeft, 'Previous position');
    const nextPosition = iconButton(iconId.chevronRight, 'Next position');
    prevPosition.addEventListener(evt.click, () => stepPosition(-1));
    nextPosition.addEventListener(evt.click, () => stepPosition(1));
    const stepper = div('fret-stepper');
    stepper.append(prevPosition, neckCount, nextPosition);
    const fingeringField = neckPill('Fingering', FINGERINGS, 'fingering');
    const matchField = neckPill('Match', MATCHES, 'match');
    const { pill: labelPill, select: labelSelect } = selectPill(null, 'Labels', LABELS, labels);
    labelSelect.addEventListener(evt.change, () => {
      labels = labelSelect.value;
      renderStage();
    });
    const showPill = neckPill('Show', SHOWS, 'show');
    const neckRow = modalRow(null, stepper, showPill, fingeringField, matchField, labelPill);
    neckRow.classList.add('fret-controls');

    function notePcOf(el) {
      const { ring, index, slot } = el.dataset;
      if (ring && ring !== ringId.dim) return keyTonic(Number(index), ring === ringId.inner);
      return chipItems.get(slot)?.pc ?? null;
    }

    function pressedFor(el) {
      const { slot } = el.dataset;
      const notePc = noteMode() && view === viewId.fifths ? notePcOf(el) : null;
      if (notePc !== null) return [...fifths.wedgesFor(notePc), ...chords.querySelectorAll(`[data-slot="${slot}"]`)];
      if (slot) return [stage, chords].flatMap((root) => [...root.querySelectorAll(`[data-slot="${slot}"]`)]);
      return [el];
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

    function pickScale(id) {
      scaleChoice = id;
      syncChips();
      renderStage();
      player.playSteps(neck?.run ?? model().run);
    }

    function voiceFor(el) {
      const { ring, slot, scale } = el.dataset;
      if (scale) return pickScale(scale);
      if (ring && ring !== ringId.dim) return wedgeVoice(el);
      if (slot) return chipVoice(slot);
      return startNotes(notesOf(el));
    }

    const onRelease = () => {
      if (!stageDirty) return;
      stageDirty = false;
      renderStage();
    };

    const player = attachPlayer({ areas: [stage, chords], stage, selector: PLAYABLE, voiceFor, pressedFor, onRelease });

    function syncMode() {
      voicingField.hidden = mode !== modeId.chord;
      rootingField.hidden = mode !== modeId.scale;
      fingeringField.hidden = mode !== modeId.scale;
      matchField.hidden = mode !== modeId.note;
    }

    syncMode();
    renderKey();
    renderLock();
    return {
      header,
      rows: [stage, neckRow, controls, chords],
      onClose: () => {
        player.end();
        player.stopRun();
      },
    };
  }

  const dispose = attachDialog(button, 'Theory', open);
  return { button, open, dispose };
}
