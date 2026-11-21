import { attachDialog } from './modal.js';
import { choiceRow } from './rows.js';
import { WEDGES, keyOf, wedgeLabel, signature, keyWedges, keyChords, wedgeNotes } from '../sheet/circle.js';
import { playNotes } from '../audio/tone.js';
import { svg } from '../core/svg.js';
import { div, span, iconButton, cls } from '../core/dom.js';
import { evt, keys } from '../core/events.js';
import { icon, iconId } from '../core/icons.js';

const STEP = 360 / WEDGES;
const RINGS = { outer: [64, 97], inner: [38, 64] };
const LABEL_RADIUS = { outer: 80.5, inner: 51 };
const HUB_RADIUS = 36;
const GRADIENT_ID = 'circle-accent';

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

function keyTitle(index, minor) {
  const key = keyOf(index, minor);
  return minor ? `${pretty(key.slice(0, -1))} minor` : `${pretty(key)} major`;
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

function wedge(index, minor) {
  const ring = minor ? 'inner' : 'outer';
  const label = wedgeLabel(index, minor);
  const g = svg('g', {
    class: `wedge ${ring}`,
    role: 'button',
    tabindex: 0,
    'aria-label': keyTitle(index, minor),
    'data-index': index,
    'data-ring': ring,
  });
  const [x, y] = point(LABEL_RADIUS[ring], index * STEP - 90);
  g.append(
    svg('path', { d: sectorPath(RINGS[ring], index) }),
    svg('text', { x, y, class: label.includes('/') ? 'enh' : '' }, pretty(label)),
  );
  return g;
}

function gradient() {
  const defs = svg('defs');
  const grad = svg('linearGradient', { id: GRADIENT_ID, x1: 0, y1: 0, x2: 1, y2: 1 });
  grad.append(svg('stop', { offset: 0, class: 'accent-from' }), svg('stop', { offset: 1, class: 'accent-to' }));
  defs.append(grad);
  return defs;
}

function chordChip({ chord, numeral }) {
  const chip = div('circle-chord');
  chip.append(span('circle-numeral', numeral), span(null, pretty(chord)));
  return chip;
}

export function createCircleControl() {
  const button = iconButton(iconId.chartPie, 'Circle of fifths');
  let sound = soundId.note;
  let locked = false;
  let selected = { index: 0, minor: false };

  function open() {
    const wedges = [];
    const art = svg('svg', { class: 'circle-art', viewBox: '-100 -100 200 200', role: 'group', 'aria-label': 'Circle of fifths' });
    art.append(gradient());
    for (const minor of [false, true]) {
      for (let index = 0; index < WEDGES; index++) {
        const el = wedge(index, minor);
        wedges.push({ el, index, minor });
        art.append(el);
      }
    }
    const hubName = svg('text', { class: 'hub-name', x: 0, y: -5 });
    const hubSig = svg('text', { class: 'hub-sig', x: 0, y: 10 });
    art.append(svg('circle', { class: 'hub', r: HUB_RADIUS }), hubName, hubSig);

    const artRow = div('modal-row circle-row');
    artRow.append(art);
    const chords = div('circle-chords');

    function render() {
      const { outer, inner, diminished } = keyWedges(selected.index);
      for (const w of wedges) {
        w.el.classList.toggle(cls.inKey, (w.minor ? inner : outer).includes(w.index));
        w.el.classList.toggle(cls.active, w.index === selected.index && w.minor === selected.minor);
        w.el.classList.toggle(cls.diminished, w.minor && w.index === diminished);
      }
      hubName.textContent = keyTitle(selected.index, selected.minor);
      hubSig.textContent = signature(selected.index) || 'No ♯ or ♭';
      chords.replaceChildren(...keyChords(selected.index, selected.minor).map(chordChip));
    }

    function activate(target) {
      const el = target.closest('.wedge');
      if (!el) return false;
      const tapped = { index: Number(el.dataset.index), minor: el.dataset.ring === 'inner' };
      playNotes(wedgeNotes(tapped.index, tapped.minor, sound === soundId.chord));
      if (!locked) {
        selected = tapped;
        render();
      }
      return true;
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

    let pressed = null;

    function press(target) {
      pressed?.classList.remove(cls.pressed);
      pressed = target?.closest('.wedge') ?? null;
      pressed?.classList.add(cls.pressed);
    }

    art.addEventListener(evt.click, (e) => activate(e.target));
    art.addEventListener(evt.pointerdown, (e) => press(e.target));
    for (const name of [evt.pointerup, evt.pointercancel, evt.pointerleave, evt.keyup]) {
      art.addEventListener(name, () => press(null));
    }
    art.addEventListener(evt.keydown, (e) => {
      if ((e.key !== keys.enter && e.key !== keys.space) || !e.target.closest('.wedge')) return;
      e.preventDefault();
      if (e.repeat) return;
      press(e.target);
      activate(e.target);
    });

    render();
    renderLock();
    return { rows: [playRow, artRow, chords] };
  }

  const dispose = attachDialog(button, 'Circle of fifths', open);
  return { button, open, dispose };
}
