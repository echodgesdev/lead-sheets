import { listen } from '../audio/listen.js';
import { attachDialog } from './modal.js';
import { signed } from '../sheet/transpose.js';
import { div, small, span, iconButton, cls } from '../core/dom.js';
import { clamp } from '../core/math.js';
import { iconId } from '../core/icons.js';

const IN_TUNE_CENTS = 5;
const CLOSE_CENTS = 10;
const MAX_CENTS = 50;
const MIC_ERROR = 'Microphone unavailable. Check permission in your browser settings.';

export function createTunerControl() {
  const button = iconButton(iconId.tuningFork, 'Tuner');

  function buildDisplay() {
    const root = div('modal-row tuner');
    root.classList.add(cls.idle);
    const name = div('tuner-note');
    const noteName = span(null, '–');
    const octave = small('tuner-oct');
    name.append(noteName, octave);
    const meter = div('tuner-meter');
    meter.style.setProperty('--in-tune', `${(IN_TUNE_CENTS / MAX_CENTS) * 50}%`);
    meter.style.setProperty('--close', `${(CLOSE_CENTS / MAX_CENTS) * 50}%`);
    const needle = div('tuner-needle');
    needle.style.left = '50%';
    meter.append(needle);
    const cents = div('tuner-cents');
    const hz = div('tuner-hz');
    root.append(name, meter, cents, hz);

    function render(note) {
      root.classList.toggle(cls.idle, !note);
      root.classList.toggle(cls.inTune, !!note && Math.abs(note.cents) <= IN_TUNE_CENTS);
      noteName.textContent = note ? note.name : '–';
      octave.textContent = note ? String(note.octave) : '';
      const offset = note ? clamp(note.cents, -MAX_CENTS, MAX_CENTS) : 0;
      needle.style.left = `${50 + offset}%`;
      cents.textContent = note ? `${signed(note.cents)} cents` : '';
      hz.textContent = note ? `${note.freq.toFixed(1)} Hz` : '';
    }

    return { root, render };
  }

  function open() {
    const display = buildDisplay();
    const status = span('tuner-status', 'Play a single note');
    const header = div('tool-header tuner-header');
    header.append(status);
    let closed = false;
    let stopListening = null;
    listen(display.render).then(
      (stop) => {
        if (closed) stop();
        else stopListening = stop;
      },
      () => {
        if (!closed) status.textContent = MIC_ERROR;
      },
    );
    return {
      header,
      rows: [display.root],
      onClose: () => {
        closed = true;
        stopListening?.();
      },
    };
  }

  const dispose = attachDialog(button, 'Tuner', open);

  return { button, open, dispose };
}
