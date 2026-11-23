import { icon, iconId } from '../core/icons.js';
import { div, input, option, select, small, span, classes, iconButton } from '../core/dom.js';
import { evt } from '../core/events.js';

export function selectPill(name, title, options, value) {
  const pill = span('pill select-pill');
  const text = span('select-pill-text');
  const field = select({ 'aria-label': title, title });
  for (const o of options) field.append(option({ value: o.id }, o.label));
  field.value = value;
  const onChange = () => {
    text.textContent = field.selectedOptions[0]?.textContent ?? '';
  };
  field.addEventListener(evt.change, onChange);
  onChange();
  pill.append(...(name ? [icon(name)] : []), text, field);
  return { pill, select: field };
}

export function stepPill(downTitle, upTitle) {
  const pill = span('pill step-pill');
  const text = span('step-pill-text');
  const down = iconButton(iconId.chevronLeft, downTitle);
  const up = iconButton(iconId.chevronRight, upTitle);
  pill.append(down, text, up);
  return { pill, text, down, up };
}

export function segToggle(...nodes) {
  const toggle = div('seg-toggle');
  toggle.append(...nodes);
  return toggle;
}

export function stepper(center, downTitle, upTitle) {
  const down = iconButton(iconId.minus, downTitle);
  const up = iconButton(iconId.plus, upTitle);
  return { toggle: segToggle(down, center, up), down, up };
}

export function keyFace(label, value) {
  return [small(null, label), span(null, String(value))];
}

export function textField(placeholder, extra, attrs = {}) {
  return input({ class: classes('field', extra), type: 'text', placeholder, 'aria-label': placeholder, ...attrs });
}
