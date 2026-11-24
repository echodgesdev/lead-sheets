import { cls } from './dom.js';
import { evt } from './events.js';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

export function smoothHeight(box, content) {
  const reduced = window.matchMedia(REDUCED_MOTION);
  let last = null;

  function settle() {
    box.style.height = '';
    box.classList.remove(cls.resizing);
  }

  function resize(from, to) {
    if (!box.style.height) {
      box.style.height = `${from}px`;
      box.getBoundingClientRect();
    }
    box.classList.add(cls.resizing);
    box.style.height = `${to}px`;
  }

  const observer = new ResizeObserver(() => {
    const next = content.getBoundingClientRect().height;
    const previous = last;
    last = next;
    if (previous === null || next === previous) return;
    if (reduced.matches) settle();
    else resize(previous, next);
  });

  const onDone = (e) => {
    if (e.target === box && !box.getAnimations().length) settle();
  };

  box.addEventListener(evt.transitionend, onDone);
  box.addEventListener(evt.transitioncancel, onDone);
  observer.observe(content);
  return () => {
    observer.disconnect();
    box.removeEventListener(evt.transitionend, onDone);
    box.removeEventListener(evt.transitioncancel, onDone);
    settle();
  };
}
