import { attachDialog, openModal } from './modal.js';
import { modalRow, choiceToggle, labeledField } from './rows.js';
import { selectPill, stepper } from './controls.js';
import { shapePill } from './chord-charts.js';
import { strings } from '../strings.js';
import { THEORY_VIEWS, labelId } from './theory-views.js';
import { createFifths } from './fifths.js';
import { attachPlayer, notesOf } from './theory-player.js';
import { ringId, keyTonic, keyScale, chordNotes, wedgeNotes, displayName, shapeId, shapeChoices, voiceNotes, scaleId } from '../sheet/circle.js';
import { modeId, keyItems, itemShape, theoryModel, chordRoot } from '../sheet/theory-model.js';
import { GUITAR, fretLayout, showId, matchId } from '../sheet/fretboard.js';
import { visId, alignId, fingeringId, neckShapeId } from '../sheet/vis-spec.js';
import { startNotes } from '../audio/tone.js';
import { getKeyOctaves } from '../data/prefs.js';
import { div, span, iconButton, plainButton, labeledButton, setPressed, setTitle, classes, cls } from '../core/dom.js';
import { evt } from '../core/events.js';
import { icon, iconId } from '../core/icons.js';

const PLAYABLE = '[data-slot], [data-notes], [data-scale]';
const VOICED = `.note-dot:not(.${cls.faint})`;

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

const ALIGNS = [
  { id: alignId.root, label: 'Root', title: 'Rows lined up on each chord’s root' },
  { id: alignId.key, label: 'Key', title: 'Rows lined up on the key' },
];

const INVERSIONS = ['Root', '1st', '2nd', '3rd'];

const VIEWS = [
  { id: visId.fifths, icon: iconId.chartPie, label: 'Fifths', title: 'Circle of fifths' },
  { id: visId.clock, icon: iconId.clock, label: 'Clock', title: 'Clock' },
  { id: visId.intervals, icon: iconId.rulerHorizontal, label: 'Intervals', title: 'Intervals' },
  { id: visId.piano, icon: iconId.pianoKeys, label: 'Keys', title: 'Keys' },
  { id: visId.fretboard, icon: iconId.guitar, label: 'Guitar', title: 'Fretboard' },
  { id: visId.tab, icon: iconId.tab, label: 'Tab', title: 'Tablature' },
  { id: visId.chart, icon: iconId.chordChart, label: 'Chart', title: 'Chord chart' },
  { id: visId.clef, icon: iconId.staff, label: 'Clef', title: 'Staff notation' },
  { id: visId.tonnetz, icon: iconId.triangles, label: 'Tonnetz', title: 'Tonnetz' },
];

function scaleChip(scale) {
  const chip = plainButton(span('circle-degree', scale.top), 'circle-chord');
  chip.append(span(null, scale.short));
  chip.dataset.scale = scale.id;
  setTitle(chip, scale.name);
  return chip;
}

function inversionOptions(count) {
  return INVERSIONS.slice(0, count).map((label, i) => ({ id: i, label, title: i ? `${label} inversion` : 'Root position' }));
}

function chordChip(item, degree, bare, shaped) {
  const numeral = bare ? String(degree) : item.numeral;
  const name = displayName(bare ? chordRoot(item.chord) : shaped.name);
  const chip = plainButton(span(bare ? 'circle-degree' : 'circle-numeral', numeral), classes('circle-chord', item.borrowed && cls.outside));
  chip.append(span(null, name));
  chip.dataset.slot = item.slot;
  chip.setAttribute('aria-label', bare ? `${name}, degree ${degree}` : `${name}, ${numeral}`);
  return chip;
}

export function createCircleControl() {
  const button = iconButton(iconId.bookOpen, 'Theory');
  let mode = modeId.chord;
  let locked = false;
  let view = visId.fifths;
  let align = alignId.root;
  let inversion = 0;
  let scaleChoice = scaleId.ionian;
  const chordShapes = [];
  let rooting = rootingId.inKey;
  let selected = { index: 0, minor: false };
  let chordIndex = 0;
  const neckOptions = { show: showId.position, position: 0, shape: neckShapeId.caged, fingering: fingeringId.caged, match: matchId.unison };
  let labels = labelId.none;
  let borrowedOpen = false;

  function open() {
    let items = [];
    let chipItems = new Map();
    let stageDirty = false;
    const fifths = createFifths();
    const stage = div('modal-row circle-row');
    const chords = div('circle-chords');
    const borrowedChips = div('circle-chords');
    const borrowedToggle = labeledButton(iconId.chevronDown, 'Borrowed', 'borrowed-toggle');
    const borrowedRow = div('circle-borrowed');
    borrowedRow.append(borrowedToggle, borrowedChips);
    const chipAreas = [chords, borrowedChips];

    function tonic() {
      return keyTonic(selected.index, selected.minor);
    }

    function noteMode() {
      return mode === modeId.note;
    }

    function bareLabels() {
      return mode !== modeId.chord;
    }

    function borrowedShown() {
      return borrowedOpen && mode === modeId.chord;
    }

    function shownItems() {
      return items.filter((item) => borrowedShown() || !item.borrowed);
    }

    function shapeIdOf(index) {
      return chordShapes[index] ?? shapeId.triad;
    }

    function shapeOf(item) {
      return itemShape(item, chordShapes);
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
        borrowed: borrowedShown(),
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
      const count = Math.min(shapeOf(items[chordIndex]).steps.length, INVERSIONS.length);
      if (count === voicingCount) return;
      voicingCount = count;
      inversion = Math.min(inversion, count - 1);
      voicingField.lastChild.replaceWith(voicingToggle(count));
    }

    function openShapes(index) {
      const item = items[index];
      const choices = shapeChoices(item, keyScale(selected.index, selected.minor));
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
        setPressed(b, choice.id === shapeIdOf(index));
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

    function chordCell(item) {
      const cell = div('chord-cell');
      const more = iconButton(iconId.ellipsis, `Swap ${displayName(item.chord)}`, 'chord-more');
      more.addEventListener(evt.click, () => openShapes(item.degree));
      cell.append(chordChip(item, item.degree + 1, false, shapeOf(item)), more);
      return cell;
    }

    let neck = null;

    function renderStage() {
      const entry = THEORY_VIEWS[view];
      syncOptions(entry);
      const current = model();
      neck = entry.neck ? fretLayout(current, GUITAR, neckOptions) : null;
      if (neck) {
        neckOptions.position = neck.position;
        neckCount.textContent = neck.count ? `${neck.position + 1} / ${neck.count}` : '–';
        syncShape();
      }
      const art = entry.render(current, { fifths, layout: neck, labels, align });
      if (art.parentNode !== stage) stage.replaceChildren(art);
    }

    function syncChips() {
      chords.dataset.mode = mode;
      for (const chip of chipAreas.flatMap((area) => [...area.querySelectorAll('.circle-chord')])) {
        chip.classList.toggle(cls.active, mode === modeId.scale ? chip.dataset.scale === scaleChoice : chipItems.get(chip.dataset.slot)?.degree === chordIndex);
      }
    }

    function syncBorrowed() {
      borrowedRow.hidden = mode !== modeId.chord;
      borrowedChips.hidden = !borrowedOpen;
      setPressed(borrowedToggle, borrowedOpen);
      setTitle(borrowedToggle, borrowedOpen ? 'Hide borrowed chords' : 'Show borrowed chords');
    }

    function renderChips() {
      const diatonic = items.filter((item) => !item.borrowed);
      if (mode === modeId.scale) chords.replaceChildren(...model().scales.map(scaleChip));
      else if (noteMode()) chords.replaceChildren(...diatonic.map((item) => chordChip(item, item.degree + 1, true, shapeOf(item))));
      else chords.replaceChildren(...diatonic.map(chordCell));
      borrowedChips.replaceChildren(...(mode === modeId.chord ? items.filter((item) => item.borrowed).map(chordCell) : []));
      syncBorrowed();
      syncChips();
    }

    function renderKey() {
      items = keyItems(selected.index, selected.minor);
      chipItems = new Map(items.map((item) => [item.slot, item]));
      if (items[chordIndex]?.borrowed && !borrowedShown()) chordIndex = 0;
      fifths.render({ index: selected.index, minor: selected.minor, items: shownItems(), bare: bareLabels() });
      renderChips();
      syncVoicing();
      renderStage();
    }

    borrowedToggle.addEventListener(evt.click, () => {
      borrowedOpen = !borrowedOpen;
      renderKey();
    });

    const lockBtn = iconButton(iconId.lockOpen, 'Lock');

    function renderLock() {
      lockBtn.replaceChildren(icon(locked ? iconId.lock : iconId.lockOpen));
      setPressed(lockBtn, locked);
      setTitle(lockBtn, locked ? 'Unlock' : 'Lock to the key or selection');
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
      return labeledField(title, pill);
    }

    function stepPosition(by) {
      neckOptions.position += by;
      player.stopRun();
      renderStage();
    }

    const neckCount = span('step-pill-text');
    const positionStepper = stepper({ pill: true, center: neckCount, downTitle: strings.previousPosition, upTitle: strings.nextPosition, onStep: stepPosition });
    const fingeringField = neckPill('Fingering', FINGERINGS, 'fingering');
    const matchField = neckPill('Match', MATCHES, 'match');
    const { pill: labelPill, select: labelSelect } = selectPill(null, 'Labels', LABELS, labels);
    labelSelect.addEventListener(evt.change, () => {
      labels = labelSelect.value;
      renderStage();
    });
    const labelField = labeledField('Labels', labelPill);
    const showField = neckPill('Show', SHOWS, 'show');
    const positionField = labeledField('Position', positionStepper.el);

    function pickShape(shape) {
      neckOptions.shape = shape;
      neckOptions.position = 0;
      player.stopRun();
      renderStage();
    }

    const shapeField = labeledField('Shape', shapePill(neckOptions.shape, Object.values(neckShapeId), pickShape));
    let shapeState = '';

    function syncShape() {
      const value = neck.shape ?? neckOptions.shape;
      const state = `${value}:${neck.shapes}`;
      if (state === shapeState) return;
      shapeState = state;
      shapeField.lastChild.replaceWith(shapePill(value, neck.shapes, pickShape));
    }

    const alignField = labeledField('Align', choiceToggle(ALIGNS, align, (id) => {
      if (id === align) return;
      align = id;
      renderStage();
    }));
    const viewFields = [positionField, shapeField, showField, fingeringField, matchField, labelField, alignField];
    const viewRow = modalRow(null, ...viewFields);
    viewRow.classList.add('view-controls');

    function syncOptions({ neck: neckView, show, labels: labelled }) {
      positionField.hidden = !neckView;
      shapeField.hidden = !neckView || mode !== modeId.chord;
      showField.hidden = !show;
      labelField.hidden = !labelled;
      fingeringField.hidden = !neckView || mode !== modeId.scale;
      matchField.hidden = !neckView || mode !== modeId.note;
      alignField.hidden = view !== visId.intervals;
      viewRow.hidden = viewFields.every((field) => field.hidden);
    }

    function notePcOf(el) {
      return el.dataset.ring ? fifths.pcOf(el) : (chipItems.get(el.dataset.slot)?.pc ?? null);
    }

    function pressedFor(el) {
      const { slot } = el.dataset;
      const notePc = noteMode() && view === visId.fifths ? notePcOf(el) : null;
      if (notePc !== null) return [...fifths.wedgesFor(notePc), ...chipAreas.flatMap((area) => [...area.querySelectorAll(`[data-slot="${slot}"]`)])];
      if (slot) return [...[stage, ...chipAreas].flatMap((root) => [...root.querySelectorAll(`[data-slot="${slot}"]`)]), ...voicedDots()];
      return [el];
    }

    function voicedDots() {
      return neck?.voicing.length ? [...stage.querySelectorAll(VOICED)] : [];
    }

    function chordVoice(item) {
      return neck?.voicing.length ? neck.voicing : voiceNotes(item.pc, shapeOf(item).steps, tonic(), inversion);
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
      if (item.degree !== chordIndex) {
        chordIndex = item.degree;
        syncChips();
        syncVoicing();
        if (neck) renderStage();
        else stageDirty = view !== visId.fifths;
      }
      return startNotes(mode === modeId.chord ? chordVoice(item) : chordNotes(item.pc, item.quality, false, tonic()));
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

    const player = attachPlayer({ areas: [stage, ...chipAreas], stage, selector: PLAYABLE, voiceFor, pressedFor, onRelease });

    function syncMode() {
      voicingField.hidden = mode !== modeId.chord;
      rootingField.hidden = mode !== modeId.scale;
    }

    syncMode();
    renderKey();
    renderLock();
    return {
      header,
      rows: [stage, viewRow, controls, chords, borrowedRow],
      onClose: player.dispose,
    };
  }

  const dispose = attachDialog(button, 'Theory', open);
  return { button, open, dispose };
}
