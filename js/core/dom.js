import { icon } from './icons.js';

export const cls = Object.freeze({
  active: 'active',
  away: 'away',
  beat: 'beat',
  diminished: 'diminished',
  down: 'down',
  dragging: 'dragging',
  idle: 'idle',
  inKey: 'in-key',
  inTune: 'in-tune',
  intro: 'intro',
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
export const details = builder('details');
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
export const summary = builder('summary');
export const textarea = builder('textarea');

export function classes(...names) {
  return names.filter(Boolean).join(' ');
}

export function plainButton(content, className) {
  const node = create('button', { class: className, type: 'button' });
  node.append(content);
  return node;
}

export function button(text, title, extra) {
  return create('button', { class: classes('btn', extra), type: 'button', title, 'aria-label': title }, text);
}

export function iconButton(name, title, extra) {
  const node = button('', title, classes('icon', extra));
  node.append(icon(name));
  return node;
}

export function labeledButton(name, content, extra) {
  const node = plainButton(content, classes('btn', extra));
  if (name) node.prepend(icon(name));
  return node;
}

export function iconLink(name, title, href, extra) {
  const node = a({ class: classes('btn icon', extra), href, title, 'aria-label': title });
  node.append(icon(name));
  return node;
}
