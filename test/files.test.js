import { test, eq } from './harness.js';
import { safeFileName } from '../js/core/files.js';

test('safe file name replaces characters illegal in file names', () => {
  eq(safeFileName('AC/DC: Back <In> "Black"?'), 'AC DC Back In Black');
  eq(safeFileName('a\\b|c*d\u0007e'), 'a b c d e');
});

test('safe file name trims spaces and trailing dots', () => {
  eq(safeFileName('  Song...  '), 'Song');
  eq(safeFileName('Café  ♯ Blues'), 'Café ♯ Blues');
});

test('safe file name of nothing is empty', () => {
  eq(safeFileName(''), '');
  eq(safeFileName(undefined), '');
  eq(safeFileName('???'), '');
});
