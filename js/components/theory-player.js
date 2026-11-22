import { startNotes, playRun } from '../audio/tone.js';
import { cls } from '../core/dom.js';
import { evt, keys } from '../core/events.js';

export function notesOf(el) {
  return el.dataset.notes.split(',').map(Number);
}

export function attachPlayer({ areas, stage, selector, voiceFor = (el) => startNotes(notesOf(el)), pressedFor = (el) => [el], onRelease }) {
  let voice = null;
  let pressed = [];
  let run = null;
  let lit = [];

  function press(el) {
    for (const p of pressed) p.classList.remove(cls.pressed);
    pressed = el ? pressedFor(el) : [];
    for (const p of pressed) p.classList.add(cls.pressed);
  }

  function end() {
    voice?.();
    voice = null;
    press(null);
    onRelease?.();
  }

  function begin(target) {
    const el = target.closest(selector);
    if (!el || el.classList.contains(cls.blocked)) return;
    end();
    voice = voiceFor(el) ?? null;
    press(el.isConnected ? el : null);
  }

  function light(step) {
    for (const el of lit) el.classList.remove(cls.pressed);
    lit = step === null ? [] : [...stage.querySelectorAll(`[data-step~="${step}"]`)];
    for (const el of lit) el.classList.add(cls.pressed);
  }

  function stopRun() {
    run?.();
    run = null;
  }

  function playSteps(steps) {
    stopRun();
    run = playRun(steps, light);
  }

  for (const area of areas) {
    area.addEventListener(evt.pointerdown, (e) => {
      if (e.button === 0) begin(e.target);
    });
    for (const name of [evt.pointerup, evt.pointercancel, evt.pointerleave, evt.keyup]) {
      area.addEventListener(name, end);
    }
    area.addEventListener(evt.contextmenu, (e) => e.preventDefault());
    area.addEventListener(evt.keydown, (e) => {
      if ((e.key !== keys.enter && e.key !== keys.space) || !e.target.closest(selector)) return;
      e.preventDefault();
      if (!e.repeat) begin(e.target);
    });
  }

  return { playSteps, stopRun, end };
}
