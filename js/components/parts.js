import { icon, iconId } from '../core/icons.js';
import { a, div, label, p } from '../core/dom.js';
import { textField } from './controls.js';
import { routes } from '../routes.js';
import { strings } from '../strings.js';

export function searchBox(trailing = null) {
  const box = label('input-icon search-pill');
  const field = textField(strings.searchSongs, null, {
    type: 'search',
    autocapitalize: 'off',
    autocorrect: 'off',
    spellcheck: 'false',
  });
  box.append(icon(iconId.magnifyingGlass), field);
  if (trailing) box.append(trailing);
  return { box, input: field };
}

export function songTitle(rec) {
  return rec.title || strings.untitled;
}

export function rowMain(rec, sub) {
  const main = div('row-main');
  main.append(div('row-title', songTitle(rec)));
  if (sub) main.append(div('row-sub', sub));
  return main;
}

export function mountNotFound(root, message) {
  const wrap = div('status');
  wrap.append(p(null, message), a({ class: 'btn', href: routes.home }, strings.backToSongs));
  root.replaceChildren(wrap);
  return () => {};
}
