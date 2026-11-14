import { iconId } from '../core/icons.js';
import { div, input, small, span, classes, iconButton } from '../core/dom.js';

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
