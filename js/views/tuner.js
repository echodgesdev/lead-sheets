import { listen } from '../audio/listen.js';
import { attachDialog } from '../modal.js';
import { signed } from '../sheet/transpose.js';
import { el, iconButton, cls } from '../dom.js';
import { clamp } from '../math.js';

const IN_TUNE_CENTS = 5;
const MAX_CENTS = 50;
const MIC_ERROR = 'Microphone unavailable. Check permission in your browser settings.';

export function createTunerControl() {
  const button = iconButton('guitar', 'Tuner');

  function buildDisplay() {
    const root = el('div', 'modal-row tuner');
    root.classList.add(cls.idle);
    const name = el('div', 'tuner-note');
    const noteName = el('span', '', '–');
    const octave = el('small', 'tuner-oct');
    name.append(noteName, octave);
    const meter = el('div', 'tuner-meter');
    const needle = el('div', 'tuner-needle');
    needle.style.left = '50%';
    meter.append(needle);
    const cents = el('div', 'tuner-cents');
    const hz = el('div', 'tuner-hz');
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
    const status = el('p', 'modal-note', 'Play a single string');
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
      rows: [display.root, status],
      onClose: () => {
        closed = true;
        stopListening?.();
      },
    };
  }

  const dispose = attachDialog(button, 'Tuner', open);

  return { button, dispose };
}
