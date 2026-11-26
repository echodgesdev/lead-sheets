import { icon, iconId } from '../core/icons.js';
import { div, input, optgroup, option, select, small, span, classes, iconButton } from '../core/dom.js';
import { evt } from '../core/events.js';

function optionNode(o) {
  if (!o.options) return option({ value: o.id }, o.label);
  const group = optgroup({ label: o.label });
  group.append(...o.options.map(optionNode));
  return group;
}

export function selectPill(name, title, options, value) {
  const pill = span('pill select-pill');
  const text = span('select-pill-text');
  const field = select({ 'aria-label': title, title });
  field.append(...options.map(optionNode));
  const onChange = () => {
    text.textContent = field.selectedOptions[0]?.textContent ?? '';
  };
  const set = (id) => {
    field.value = id;
    onChange();
  };
  field.addEventListener(evt.change, onChange);
  set(value);
  pill.append(...(name ? [icon(name)] : []), text, field);
  return { pill, select: field, set };
}

export function segToggle(...nodes) {
  const toggle = div('seg-toggle');
  toggle.append(...nodes);
  return toggle;
}

export function stepper({ center, downTitle, upTitle, min = -Infinity, max = Infinity, onStep, pill = false }) {
  const down = iconButton(pill ? iconId.chevronLeft : iconId.minus, downTitle);
  const up = iconButton(pill ? iconId.chevronRight : iconId.plus, upTitle);
  down.addEventListener(evt.click, () => onStep(-1));
  up.addEventListener(evt.click, () => onStep(1));
  const el = pill ? span('pill step-pill') : segToggle();
  el.append(down, center, up);
  return {
    el,
    set(value) {
      down.disabled = value <= min;
      up.disabled = value >= max;
    },
  };
}

export function keyFace(label, value) {
  return [small(null, label), span(null, String(value))];
}

export function textField(placeholder, extra, attrs = {}) {
  return input({ class: classes('field', extra), type: 'text', placeholder, 'aria-label': placeholder, ...attrs });
}
