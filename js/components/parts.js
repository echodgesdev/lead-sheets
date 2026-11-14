import { icon, iconId } from '../core/icons.js';
import { a, div, label, p } from '../core/dom.js';
import { textField } from './controls.js';
import { routes } from '../routes.js';
import { strings } from '../strings.js';

export function searchBox() {
  const box = label('input-icon');
  const field = textField(strings.searchSongs, null, {
    type: 'search',
    autocapitalize: 'off',
    autocorrect: 'off',
    spellcheck: 'false',
  });
  box.append(icon(iconId.magnifyingGlass), field);
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
