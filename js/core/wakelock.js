import { evt } from './events.js';

export function holdWakeLock(signal) {
  let lock = null;

  async function request() {
    try {
      const next = await navigator.wakeLock?.request('screen');
      if (!next) return;
      if (signal.aborted) {
        next.release().catch(() => {});
        return;
      }
      lock = next;
    } catch {
      // wake lock is best effort
    }
  }

  document.addEventListener(evt.visibilitychange, () => {
    if (document.visibilityState === 'visible') request();
  }, { signal });

  signal.addEventListener(evt.abort, () => {
    lock?.release().catch(() => {});
    lock = null;
  });

  request();
}
