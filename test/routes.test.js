import { test, eq } from './harness.js';
import { routes, parseRoute, views, listMode, NEW_ID } from '../js/routes.js';

test('route builders', () => {
  eq(routes.home, '#/');
  eq(routes.live('a1'), '#/live/a1');
  eq(routes.preview('a1'), '#/preview/a1');
  eq(routes.set('s1', 'a1'), '#/set/s1/a1');
  eq(routes.edit('a1'), '#/edit/a1');
  eq(routes.edit(NEW_ID), '#/edit/new');
  eq(routes.edit('a1', '#/set/s1/a1'), '#/edit/a1/set/s1/a1');
  eq(routes.setlist(NEW_ID), '#/setlist/new');
  eq(routes.shared('x-_1'), '#/shared/x-_1');
});

test('parseRoute round-trips the builders', () => {
  eq(parseRoute(routes.live('a1')), { view: views.live, params: { id: 'a1' } });
  eq(parseRoute(routes.preview('a1')), { view: views.preview, params: { id: 'a1', preview: true } });
  eq(parseRoute(routes.set('s1', 'a1')), { view: views.set, params: { id: 'a1', setId: 's1' } });
  eq(parseRoute(routes.edit('a1')), { view: views.edit, params: { id: 'a1', back: null } });
  eq(parseRoute(routes.edit('a1', routes.set('s1', 'a1'))), { view: views.edit, params: { id: 'a1', back: '#/set/s1/a1' } });
  eq(parseRoute(routes.setlist('s1')), { view: views.setlist, params: { id: 's1' } });
  eq(parseRoute(routes.shared('x-_1')), { view: views.shared, params: { code: 'x-_1' } });
});

test('parseRoute falls back to the list', () => {
  eq(parseRoute(''), { view: null, params: {} });
  eq(parseRoute(routes.home), { view: null, params: {} });
  eq(parseRoute('#/set/s1'), { view: null, params: {} });
  eq(parseRoute('#/nope'), { view: null, params: {} });
  eq(parseRoute('#/nope/a1'), { view: null, params: {} });
});

test('list modes have their own routes', () => {
  eq(routes.list(listMode.live), '#/');
  eq(routes.list(listMode.edit), '#/edit');
  eq(routes.list(listMode.tools), '#/tools');
  eq(parseRoute(routes.list(listMode.edit)), { view: null, params: { mode: listMode.edit } });
  eq(parseRoute(routes.list(listMode.tools)), { view: null, params: { mode: listMode.tools } });
  eq(parseRoute('#/live'), { view: null, params: { mode: listMode.live } });
});

test('the Tools route carries its state as a query', () => {
  const state = { view: 'tonnetz', key: 'C#m', play: 'scale' };
  eq(routes.list(listMode.tools, state), '#/tools?view=tonnetz&key=C%23m&play=scale');
  eq(routes.list(listMode.tools, {}), '#/tools');
  eq(routes.list(listMode.live, null), '#/');
  eq(parseRoute(routes.list(listMode.tools, state)), { view: null, params: { mode: listMode.tools, query: state } });
});
