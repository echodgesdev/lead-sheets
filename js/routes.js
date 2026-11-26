export const NEW_ID = 'new';

export const views = Object.freeze({
  live: 'live',
  preview: 'preview',
  set: 'set',
  edit: 'edit',
  setlist: 'setlist',
  shared: 'shared',
});

export const listMode = Object.freeze({
  live: 'live',
  edit: 'edit',
  tools: 'tools',
});

const LIST_MODES = new Set(Object.values(listMode));

function queryString(query) {
  const text = new URLSearchParams(Object.entries(query ?? {}).filter(([, value]) => value)).toString();
  return text ? `?${text}` : '';
}

export const routes = Object.freeze({
  home: '#/',
  list: (mode, query) => `${mode === listMode.live ? '#/' : `#/${mode}`}${queryString(query)}`,
  live: (id) => `#/${views.live}/${id}`,
  preview: (id) => `#/${views.preview}/${id}`,
  set: (setId, songId) => `#/${views.set}/${setId}/${songId}`,
  edit: (id, back) => (back ? `#/${views.edit}/${id}/${back.slice(2)}` : `#/${views.edit}/${id}`),
  setlist: (id) => `#/${views.setlist}/${id}`,
  shared: (code) => `#/${views.shared}/${code}`,
});

export function parseRoute(hash) {
  const [path, search] = hash.split('?');
  const parts = path.slice(1).split('/');
  const [, view = '', id = '', songId = ''] = parts;
  if (!id) return { view: null, params: LIST_MODES.has(view) ? { mode: view, ...(search && { query: Object.fromEntries(new URLSearchParams(search)) }) } : {} };
  if (view === views.live) return { view, params: { id } };
  if (view === views.preview) return { view, params: { id, preview: true } };
  if (view === views.set && songId) return { view, params: { id: songId, setId: id } };
  if (view === views.edit) return { view, params: { id, back: songId ? `#/${parts.slice(3).join('/')}` : null } };
  if (view === views.setlist) return { view, params: { id } };
  if (view === views.shared) return { view, params: { code: id } };
  return { view: null, params: {} };
}
