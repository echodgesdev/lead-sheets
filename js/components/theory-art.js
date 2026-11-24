import { svg } from '../core/svg.js';
import { classes, cls } from '../core/dom.js';
import { mod12 } from '../core/math.js';
import { displayName } from '../sheet/circle.js';

export function theoryArt(className, viewBox, label, attrs = {}) {
  return svg('svg', { class: `theory-art ${className}`, viewBox, role: 'group', 'aria-label': label, ...attrs });
}

export function tapAttrs(label, focusable = true) {
  return { role: 'button', tabindex: focusable ? 0 : -1, 'aria-label': label };
}

export function isBlocked({ locked, allowed }, pc) {
  return locked && !allowed.includes(pc);
}

export function isOutside({ scalePcs }, pc) {
  return !scalePcs.includes(pc);
}

export function toneClass(model, pc, rootPc) {
  if (pc === rootPc) return cls.root;
  return isOutside(model, pc) ? cls.outside : null;
}

export function noteAttrs(model, pc, { className, midis, label, steps = '', on = true, rootPc = model.rootPc, focusable = true }) {
  return {
    class: classes(className, on && toneClass(model, pc, rootPc), isBlocked(model, pc) && cls.blocked),
    ...tapAttrs(label, focusable),
    'data-notes': midis.join(','),
    ...(steps ? { 'data-step': steps } : {}),
  };
}

export function pcName(model, pc) {
  return displayName(model.names[pc]);
}

export function points(list) {
  return list.map(([x, y]) => `${x},${y}`).join(' ');
}

export function stepsOf(run, midi, drawn) {
  return run
    .flatMap((step, i) => (step.some((m) => m === midi || (!drawn.includes(m) && mod12(m) === mod12(midi))) ? [i] : []))
    .join(' ');
}
