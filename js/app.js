import './theme.js';
import * as store from './store.js';
import * as setlists from './setlists.js';
import { mount as mountList } from './views/list.js';
import { mount as mountLive } from './views/live.js';
import { mount as mountEdit } from './views/edit.js';
import { mount as mountSetlist } from './views/setlist.js';

const app = document.getElementById('app');
let cleanup = null;

function currentRoute() {
  const [, view = '', id = '', songId = ''] = location.hash.slice(1).split('/');
  if (view === 'live' && id) return { mount: mountLive, params: { id } };
  if (view === 'preview' && id) return { mount: mountLive, params: { id, preview: true } };
  if (view === 'set' && id && songId) return { mount: mountLive, params: { id: songId, setId: id } };
  if (view === 'edit' && id) return { mount: mountEdit, params: { id } };
  if (view === 'setlist' && id) return { mount: mountSetlist, params: { id } };
  return { mount: mountList, params: {} };
}

function render() {
  cleanup?.();
  cleanup = null;
  app.replaceChildren();
  const { mount, params } = currentRoute();
  cleanup = mount(app, params);
}

function showStatus(text) {
  const p = document.createElement('p');
  p.className = 'status';
  p.textContent = text;
  app.replaceChildren(p);
}

async function start() {
  showStatus('Loading...');
  try {
    await Promise.all([store.load(), setlists.load()]);
  } catch (err) {
    showStatus(`Could not open the song library: ${err.message}`);
    return;
  }
  window.addEventListener('hashchange', render);
  render();
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch((err) => console.error(err));
}

start();
