import { icon } from './icons.js';

export const cls = Object.freeze({
  active: 'active',
  away: 'away',
  beat: 'beat',
  down: 'down',
  dragging: 'dragging',
  idle: 'idle',
  inTune: 'in-tune',
});

export function create(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function button(label, title, className = 'btn') {
  return create('button', { class: className, type: 'button', title, 'aria-label': title }, label);
}

export function iconButton(name, title, className = 'btn icon') {
  const b = button('', title, className);
  b.append(icon(name));
  return b;
}

export function labeledButton(name, text, className = 'btn') {
  const b = create('button', { class: className, type: 'button' });
  if (name) b.append(icon(name));
  b.append(text);
  return b;
}
