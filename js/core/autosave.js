import { evt } from './events.js';

export function createAutosave({ snapshot, persist, delayMs, onError, signal }) {
  let timer = null;
  let dirty = false;
  let queue = Promise.resolve();

  function flush() {
    clearTimeout(timer);
    timer = null;
    if (dirty) {
      dirty = false;
      const data = snapshot();
      queue = queue.then(() => persist(data)).catch(onError);
    }
    return queue;
  }

  function schedule() {
    dirty = true;
    clearTimeout(timer);
    timer = setTimeout(flush, delayMs);
  }

  function cancel() {
    clearTimeout(timer);
    timer = null;
    dirty = false;
    return queue;
  }

  document.addEventListener(evt.visibilitychange, () => {
    if (document.hidden) flush();
  }, { signal });

  return { schedule, flush, cancel };
}
