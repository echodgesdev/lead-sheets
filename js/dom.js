import { icon } from './icons.js';

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
