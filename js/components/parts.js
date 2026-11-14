import { icon } from '../core/icons.js';
import { a, div, input, label, p } from '../core/dom.js';
import { routes } from '../routes.js';
import { strings } from '../strings.js';

export function searchBox() {
  const box = label('input-icon');
  const field = input({
    class: 'field',
    type: 'search',
    placeholder: strings.searchSongs,
    autocapitalize: 'off',
    autocorrect: 'off',
    spellcheck: 'false',
  });
  box.append(icon('magnifying-glass'), field);
  return { box, input: field };
}

export function rowMain(rec, sub) {
  const main = div('row-main');
  main.append(div('row-title', rec.title || strings.untitled));
  if (sub) main.append(div('row-sub', sub));
  return main;
}

export function mountNotFound(root, message) {
  const wrap = div('status');
  wrap.append(p(null, message), a({ class: 'btn', href: routes.home }, strings.backToSongs));
  root.replaceChildren(wrap);
  return () => {};
}
