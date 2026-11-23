import { test, eq } from './harness.js';
import { dateStamp, dateTimeStamp, clockTime } from '../js/core/time.js';

const DATE = new Date(2026, 0, 5, 9, 4, 7);

test('date stamp is local YYYY-MM-DD', () => {
  eq(dateStamp(DATE), '2026-01-05');
});

test('date-time stamp uses dashes so it is safe in file names', () => {
  eq(dateTimeStamp(DATE), '2026-01-05 09-04-07');
});

test('clock time shows m:ss, then h:mm:ss past an hour', () => {
  eq(clockTime(0), '0:00');
  eq(clockTime(65999), '1:05');
  eq(clockTime(3723000), '1:02:03');
  eq(clockTime(-500), '0:00');
});
