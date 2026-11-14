import {
  TEXT_SIZE,
  CONTROLS,
  NUMBER_STYLES,
  PEDAL_MODES,
  barId,
  controlId,
  getTextSize,
  setTextSize,
  getShownControls,
  setShownControls,
  getNumberStyle,
  setNumberStyle,
  getPedalMode,
  setPedalMode,
} from '../data/prefs.js';
import { div, input, span, labeledButton, cls } from '../core/dom.js';
import { evt } from '../core/events.js';
import { segToggle } from './controls.js';

export function modalRow(label, ...controls) {
  const row = div('modal-row');
  if (label) row.append(span('modal-label', label));
  row.append(...controls);
  return row;
}

export function choiceRow(label, options, value, save) {
  const buttons = options.map((o) => [o.id, labeledButton(o.icon, o.label)]);

  function apply(id) {
    save(id);
    for (const [bid, b] of buttons) b.classList.toggle(cls.active, bid === id);
  }

  for (const [id, b] of buttons) b.addEventListener(evt.click, () => apply(id));
  apply(value);
  return modalRow(label, segToggle(...buttons.map(([, b]) => b)));
}

export function chipsRow(label, items, shownIds, save) {
  const chips = div('chips');
  const shown = new Set(shownIds);

  for (const t of items) {
    const b = labeledButton(null, t.label, 'chip');
    const sync = () => {
      b.classList.toggle(cls.active, shown.has(t.id));
      b.setAttribute('aria-pressed', String(shown.has(t.id)));
    };
    b.addEventListener(evt.click, () => {
      if (shown.has(t.id)) shown.delete(t.id);
      else shown.add(t.id);
      save(items.filter((x) => shown.has(x.id)).map((x) => x.id));
      sync();
    });
    sync();
    chips.append(b);
  }

  return modalRow(label, chips);
}

export function textSizeRow(onSize) {
  const slider = input({
    class: 'slider',
    type: 'range',
    min: TEXT_SIZE.min,
    max: TEXT_SIZE.max,
    step: 1,
    'aria-label': 'Text size',
  });
  slider.value = getTextSize();
  const out = span('slider-value', slider.value);
  slider.addEventListener(evt.input, () => {
    const size = Number(slider.value);
    out.textContent = slider.value;
    setTextSize(size);
    onSize?.(size);
  });
  return modalRow('Text size', out, slider);
}

export function liveControlRows() {
  const shown = new Set(getShownControls());
  const numbersRow = choiceRow('Numbers', NUMBER_STYLES, getNumberStyle(), setNumberStyle);

  function syncNumbers() {
    numbersRow.hidden = !shown.has(controlId.numbers);
  }

  function barRow(label, bar) {
    const items = CONTROLS.filter((c) => c.bar === bar);
    return chipsRow(label, items, [...shown], (ids) => {
      for (const c of items) shown.delete(c.id);
      for (const id of ids) shown.add(id);
      setShownControls(CONTROLS.map((c) => c.id).filter((id) => shown.has(id)));
      syncNumbers();
    });
  }

  syncNumbers();
  return [
    barRow('Top bar', barId.top),
    numbersRow,
    barRow('Bottom bar', barId.bottom),
    choiceRow('Page turner', PEDAL_MODES, getPedalMode(), setPedalMode),
  ];
}
