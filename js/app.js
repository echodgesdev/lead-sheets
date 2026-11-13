import './theme.js';
import * as store from './store.js';
import * as setlists from './setlists.js';
import { mount as mountList } from './views/list.js';
import { mount as mountLive } from './views/live.js';
import { mount as mountEdit } from './views/edit.js';
import { mount as mountSetlist } from './views/setlist.js';
import { evt } from './events.js';
import { views, parseRoute } from './routes.js';

const MOUNTS = {
  [views.live]: mountLive,
  [views.preview]: mountLive,
  [views.set]: mountLive,
  [views.edit]: mountEdit,
  [views.setlist]: mountSetlist,
};

const app = document.getElementById('app');
let cleanup = null;

function currentRoute() {
  const { view, params } = parseRoute(location.hash);
  return { mount: MOUNTS[view] ?? mountList, params };
}

function swap() {
  cleanup?.();
  cleanup = null;
  app.replaceChildren();
  const { mount, params } = currentRoute();
  cleanup = mount(app, params);
}

function render() {
  if (document.startViewTransition) document.startViewTransition(swap);
  else swap();
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
  window.addEventListener(evt.hashchange, render);
  render();
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch((err) => console.error(err));
}

start();
