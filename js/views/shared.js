import { receiveSong } from '../data/backup.js';
import { mountNotFound } from '../components/parts.js';
import { toast } from '../components/toast.js';
import { a, div, p, labeledButton } from '../core/dom.js';
import { evt } from '../core/events.js';
import { iconId } from '../core/icons.js';
import { routes } from '../routes.js';
import { strings } from '../strings.js';

const APP_HINT = 'Using Lead Sheets from your home screen? Copy this link, open the app, and tap Paste in Edit mode.';

function isInstalledApp() {
  return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

function mountAdded(root, rec, link) {
  const copyBtn = labeledButton(iconId.paste, 'Copy link');
  const open = a({ class: 'btn primary', href: routes.live(rec.id) }, 'Open song');
  const wrap = div('status');
  wrap.append(p(null, `Added “${rec.title || strings.untitled}”.`), p('modal-note', APP_HINT), open, copyBtn);
  copyBtn.addEventListener(evt.click, async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast('Link copied');
    } catch {
      toast('Could not copy');
    }
  });
  root.replaceChildren(wrap);
}

export function mount(root, { code }) {
  let disposed = false;
  const link = location.href;
  root.replaceChildren(p('status', 'Opening shared song...'));
  receiveSong(code)
    .then((rec) => {
      if (disposed) return;
      if (isInstalledApp()) location.replace(routes.live(rec.id));
      else mountAdded(root, rec, link);
    })
    .catch(() => {
      if (!disposed) mountNotFound(root, 'This shared song link is broken.');
    });
  return () => {
    disposed = true;
  };
}
