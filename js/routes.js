export const NEW_ID = 'new';

export const views = Object.freeze({
  live: 'live',
  preview: 'preview',
  set: 'set',
  edit: 'edit',
  setlist: 'setlist',
});

export const routes = Object.freeze({
  home: '#/',
  live: (id) => `#/${views.live}/${id}`,
  preview: (id) => `#/${views.preview}/${id}`,
  set: (setId, songId) => `#/${views.set}/${setId}/${songId}`,
  edit: (id, back) => (back ? `#/${views.edit}/${id}/${back.slice(2)}` : `#/${views.edit}/${id}`),
  setlist: (id) => `#/${views.setlist}/${id}`,
});

export function parseRoute(hash) {
  const parts = hash.slice(1).split('/');
  const [, view = '', id = '', songId = ''] = parts;
  if (!id) return { view: null, params: {} };
  if (view === views.live) return { view, params: { id } };
  if (view === views.preview) return { view, params: { id, preview: true } };
  if (view === views.set && songId) return { view, params: { id: songId, setId: id } };
  if (view === views.edit) return { view, params: { id, back: songId ? `#/${parts.slice(3).join('/')}` : null } };
  if (view === views.setlist) return { view, params: { id } };
  return { view: null, params: {} };
}
