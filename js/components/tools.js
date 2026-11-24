import { createTunerControl } from './tuner.js';
import { createMetronomeControl } from './metronome.js';
import { createRecorderControl } from './recorder.js';
import { createCircleControl } from './circle.js';
import { UTILITIES, utilityId } from '../data/prefs.js';
import { div } from '../core/dom.js';

const CREATE_UTILITY = {
  [utilityId.tuner]: ({ song }) => createTunerControl(song?.tuning),
  [utilityId.metronome]: ({ tempo }) => createMetronomeControl(tempo),
  [utilityId.recorder]: ({ song }) => createRecorderControl(song),
};

export function createUtilities(context = {}) {
  const controls = UTILITIES.map((u) => ({ id: u.id, control: CREATE_UTILITY[u.id](context) }));
  return {
    buttons: controls.map(({ control }) => control.button),
    show(ids) {
      const shown = new Set(ids);
      for (const { id, control } of controls) control.button.hidden = !shown.has(id);
    },
    dispose() {
      for (const { control } of controls) control.dispose();
    },
  };
}

export function createToolsPanel() {
  const theory = createCircleControl();
  const body = theory.open();
  const panel = div('tool theory-panel');
  panel.append(body.header, ...body.rows);
  const list = div('list');
  list.append(panel);
  return {
    el: list,
    dispose() {
      body.onClose();
      theory.dispose();
    },
  };
}
