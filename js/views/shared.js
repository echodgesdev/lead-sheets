import { receiveSong } from '../data/links.js';
import { mountNotFound } from '../components/parts.js';
import { p } from '../core/dom.js';
import { routes } from '../routes.js';

export function mount(root, { code }) {
  let disposed = false;
  root.replaceChildren(p('status', 'Opening shared song...'));
  receiveSong(code)
    .then((rec) => {
      if (!disposed) location.replace(routes.live(rec.id));
    })
    .catch(() => {
      if (!disposed) mountNotFound(root, 'This shared song link is broken.');
    });
  return () => {
    disposed = true;
  };
}
