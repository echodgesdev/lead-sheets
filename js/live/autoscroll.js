import { evt } from '../events.js';
import { clamp } from '../math.js';

export const MIN_SPEED = 1;
export const MAX_SPEED = 10;
export const DEFAULT_SPEED = 3;

const MAX_FRAME_MS = 100;
const PAGE_FRACTION = 0.85;
const DRIFT_PX = 1.5;

function pixelsPerSecond(speed) {
  return 8 * Math.pow(speed, 1.35);
}

function scroller() {
  return document.scrollingElement || document.documentElement;
}

function maxScroll() {
  return Math.max(0, scroller().scrollHeight - window.innerHeight);
}

export function createAutoscroll({ speed, onChange, signal }) {
  let current = clamp(speed, MIN_SPEED, MAX_SPEED);
  let playing = false;
  let raf = 0;
  let lastTs = 0;
  let pos = 0;
  let touching = false;

  function syncPos() {
    pos = scroller().scrollTop;
  }

  function frame(ts) {
    raf = 0;
    if (!playing) return;
    const dt = Math.min(MAX_FRAME_MS, ts - lastTs);
    lastTs = ts;
    if (!touching) {
      pos += (pixelsPerSecond(current) * dt) / 1000;
      const limit = maxScroll();
      if (pos >= limit) {
        scroller().scrollTop = limit;
        pause();
        return;
      }
      scroller().scrollTop = pos;
    }
    raf = requestAnimationFrame(frame);
  }

  function play() {
    if (playing) return;
    playing = true;
    syncPos();
    lastTs = performance.now();
    raf = requestAnimationFrame(frame);
    onChange();
  }

  function stop() {
    playing = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function pause() {
    stop();
    onChange();
  }

  function setSpeed(n) {
    current = clamp(n, MIN_SPEED, MAX_SPEED);
    onChange();
  }

  function page(dir) {
    const next = clamp(scroller().scrollTop + dir * PAGE_FRACTION * window.innerHeight, 0, maxScroll());
    scroller().scrollTop = next;
    pos = next;
  }

  function atStart() {
    return scroller().scrollTop <= 0;
  }

  function atEnd() {
    return scroller().scrollTop >= maxScroll() - 1;
  }

  const passive = { passive: true, signal };
  window.addEventListener(evt.touchstart, () => {
    touching = true;
    syncPos();
  }, passive);
  window.addEventListener(evt.touchend, () => {
    touching = false;
    syncPos();
  }, passive);
  window.addEventListener(evt.touchcancel, () => {
    touching = false;
    syncPos();
  }, passive);
  window.addEventListener(evt.wheel, syncPos, passive);
  window.addEventListener(evt.scroll, () => {
    if (Math.abs(scroller().scrollTop - pos) > DRIFT_PX) syncPos();
  }, passive);
  signal.addEventListener(evt.abort, stop);

  return {
    play,
    pause,
    setSpeed,
    page,
    atStart,
    atEnd,
    get playing() {
      return playing;
    },
    get speed() {
      return current;
    },
  };
}
