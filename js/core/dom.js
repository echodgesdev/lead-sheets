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

function create(tag, attrs, text) {
  const node = document.createElement(tag);
  if (typeof attrs === 'string') {
    if (attrs) node.className = attrs;
  } else if (attrs) {
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  }
  if (text !== undefined) node.textContent = text;
  return node;
}

function builder(tag) {
  return (attrs, text) => create(tag, attrs, text);
}

export const a = builder('a');
export const b = builder('b');
export const dialog = builder('dialog');
export const div = builder('div');
export const h1 = builder('h1');
export const h2 = builder('h2');
export const header = builder('header');
export const input = builder('input');
export const label = builder('label');
export const option = builder('option');
export const p = builder('p');
export const pre = builder('pre');
export const select = builder('select');
export const small = builder('small');
export const span = builder('span');
export const textarea = builder('textarea');

export function button(text, title, className = 'btn') {
  return create('button', { class: className, type: 'button', title, 'aria-label': title }, text);
}

export function iconButton(name, title, className = 'btn icon') {
  const node = button('', title, className);
  node.append(icon(name));
  return node;
}

export function labeledButton(name, content, className = 'btn') {
  const node = create('button', { class: className, type: 'button' });
  if (name) node.append(icon(name));
  node.append(content);
  return node;
}
