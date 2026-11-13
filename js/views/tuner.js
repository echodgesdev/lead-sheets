import { listen } from '../audio/listen.js';
import { openModal } from '../modal.js';
import { signed } from '../sheet/transpose.js';
import { el, iconButton } from '../dom.js';

const IN_TUNE_CENTS = 5;
const MAX_CENTS = 50;
const MIC_ERROR = 'Microphone unavailable. Check permission in your browser settings.';

export function createTunerControl() {
  const button = iconButton('guitar', 'Tuner');

  let dialog = null;
  let stopListening = null;

  function buildDisplay() {
    const root = el('div', 'modal-row tuner idle');
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
      root.classList.toggle('idle', !note);
      root.classList.toggle('in-tune', !!note && Math.abs(note.cents) <= IN_TUNE_CENTS);
      noteName.textContent = note ? note.name : '–';
      octave.textContent = note ? String(note.octave) : '';
      const offset = note ? Math.min(MAX_CENTS, Math.max(-MAX_CENTS, note.cents)) : 0;
      needle.style.left = `${50 + offset}%`;
      cents.textContent = note ? `${signed(note.cents)} cents` : '';
      hz.textContent = note ? `${note.freq.toFixed(1)} Hz` : '';
    }

    return { root, render };
  }

  function stop() {
    const fn = stopListening;
    stopListening = null;
    if (fn) fn();
  }

  function onClose() {
    dialog.removeEventListener('close', onClose);
    dialog = null;
    stop();
  }

  const onOpen = () => {
    if (dialog) return;
    const display = buildDisplay();
    const status = el('p', 'modal-note', 'Play a single string');
    const current = openModal('Tuner', display.root, status);
    dialog = current;
    current.addEventListener('close', onClose);
    listen(display.render).then(
      (stopFn) => {
        if (dialog === current) stopListening = stopFn;
        else stopFn();
      },
      () => {
        if (dialog === current) status.textContent = MIC_ERROR;
      },
    );
  };

  button.addEventListener('click', onOpen);

  function dispose() {
    const current = dialog;
    if (current) {
      current.removeEventListener('close', onClose);
      dialog = null;
      current.close();
    }
    stop();
  }

  return { button, dispose };
}
