import { test, eq } from './harness.js';
import { routes, parseRoute, views, NEW_ID } from '../js/routes.js';

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
  eq(parseRoute('#/live'), { view: null, params: {} });
  eq(parseRoute('#/set/s1'), { view: null, params: {} });
  eq(parseRoute('#/nope/a1'), { view: null, params: {} });
});
