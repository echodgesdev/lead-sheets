import { createTunerControl } from './tuner.js';
import { createMetronomeControl } from './metronome.js';
import { createCircleControl } from './circle.js';
import { rowMain } from './parts.js';
import { div, span } from '../core/dom.js';
import { evt } from '../core/events.js';

function toolRow(title, sub, control) {
  const row = div('row tool-row');
  row.append(rowMain({ title }, sub), control.button);
  row.addEventListener(evt.click, (e) => {
    if (!control.button.contains(e.target)) control.button.click();
  });
  return row;
}

export function createLearnPanel() {
  const tuner = createTunerControl();
  const metronome = createMetronomeControl();
  const circle = createCircleControl();
  const label = div('section-label');
  label.append(span('group-name', 'Tools'));
  const list = div('list');
  list.append(
    toolRow('Tuner', 'Tune with the microphone', tuner),
    toolRow('Metronome', 'Tempo, beats and accents', metronome),
    toolRow('Circle of fifths', 'Hear each key, its notes and chords', circle),
  );
  const el = div();
  el.append(label, list);
  return {
    el,
    dispose() {
      tuner.dispose();
      metronome.dispose();
      circle.dispose();
    },
  };
}
