import { icon } from '../icons.js';
import { create } from '../dom.js';
import { routes } from '../routes.js';
import { strings } from '../strings.js';

export function searchBox() {
  const box = create('label', { class: 'input-icon' });
  const input = create('input', {
    class: 'field',
    type: 'search',
    placeholder: strings.searchSongs,
    autocapitalize: 'off',
    autocorrect: 'off',
    spellcheck: 'false',
  });
  box.append(icon('magnifying-glass'), input);
  return { box, input };
}

export function rowMain(rec, sub) {
  const main = create('div', { class: 'row-main' });
  main.append(create('div', { class: 'row-title' }, rec.title || strings.untitled));
  if (sub) main.append(create('div', { class: 'row-sub' }, sub));
  return main;
}

export function mountNotFound(root, message) {
  const wrap = create('div', { class: 'status' });
  wrap.append(create('p', {}, message), create('a', { class: 'btn', href: routes.home }, strings.backToSongs));
  root.replaceChildren(wrap);
  return () => {};
}
