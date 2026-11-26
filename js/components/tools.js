import { createTunerControl } from './tuner.js';
import { createMetronomeControl } from './metronome.js';
import { createRecorderControl } from './recorder.js';
import { createCircleControl } from './circle.js';
import { UTILITIES, utilityId } from '../data/prefs.js';
import { div } from '../core/dom.js';

export function createUtilities({ tempo, song } = {}) {
  const metronome = createMetronomeControl(tempo);
  const made = {
    [utilityId.tuner]: createTunerControl(song?.tuning),
    [utilityId.metronome]: metronome,
    [utilityId.recorder]: createRecorderControl(song, metronome.countIn),
  };
  const controls = UTILITIES.map((u) => ({ id: u.id, control: made[u.id] }));
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

export function createToolsPanel(theoryOptions) {
  const theory = createCircleControl(theoryOptions);
  const body = theory.open();
  const panel = div('theory-panel');
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
