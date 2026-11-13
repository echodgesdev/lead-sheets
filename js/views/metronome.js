import { MIN_BPM, MAX_BPM, DEFAULT_BPM, parseBpm, createTapper, createMetronome } from '../audio/click.js';
import { openModal } from '../modal.js';
import { labeledButton } from './rows.js';
import { icon } from '../icons.js';
import { el, button, iconButton } from '../dom.js';

export function createMetronomeControl(tempo) {
  let bpm = parseBpm(tempo) ?? DEFAULT_BPM;
  let dialog = null;
  let sync = null;
  let disposed = false;

  const headerBtn = button('', 'Metronome', 'btn live-key');

  const tapper = createTapper();
  const metronome = createMetronome(onBeat);

  function onBeat(beat) {
    if (disposed) return;
    headerBtn.classList.remove('beat', 'down');
    void headerBtn.offsetWidth;
    headerBtn.classList.add('beat');
    headerBtn.classList.toggle('down', beat === 0);
  }

  function renderButton() {
    headerBtn.replaceChildren(el('small', '', 'BPM'), el('span', '', String(bpm)));
    headerBtn.classList.toggle('active', metronome.running);
    if (!metronome.running) headerBtn.classList.remove('beat', 'down');
  }

  function setBpm(n) {
    bpm = Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(n)));
    if (metronome.running) metronome.setBpm(bpm);
    renderButton();
    sync?.();
  }

  function toggleRunning() {
    if (metronome.running) metronome.stop();
    else metronome.start(bpm);
    renderButton();
    sync?.();
  }

  function onClose() {
    dialog.removeEventListener('close', onClose);
    dialog = null;
    sync = null;
  }

  const onOpen = () => {
    if (dialog) return;
    const downBtn = iconButton('minus', 'Slower');
    const value = el('span', 'metro-bpm');
    const upBtn = iconButton('plus', 'Faster');
    const toggle = el('div', 'seg-toggle');
    toggle.append(downBtn, value, upBtn);
    const tempoRow = el('div', 'modal-row');
    tempoRow.append(el('span', 'modal-label', 'Tempo'), toggle);

    const tapBtn = labeledButton(null, 'Tap');
    tapBtn.title = 'Tap tempo';
    const startBtn = button('', 'Start');
    const actions = el('div', 'modal-row metro-actions');
    actions.append(tapBtn, startBtn);

    const onDown = () => setBpm(bpm - 1);
    const onUp = () => setBpm(bpm + 1);
    const onTap = () => {
      const tapped = tapper(performance.now());
      if (tapped) setBpm(tapped);
    };

    sync = () => {
      const running = metronome.running;
      value.textContent = String(bpm);
      downBtn.disabled = bpm <= MIN_BPM;
      upBtn.disabled = bpm >= MAX_BPM;
      startBtn.replaceChildren(icon(running ? 'pause' : 'play'), running ? 'Stop' : 'Start');
      startBtn.title = running ? 'Stop' : 'Start';
      startBtn.setAttribute('aria-label', startBtn.title);
      startBtn.setAttribute('aria-pressed', String(running));
      startBtn.classList.toggle('active', running);
    };

    downBtn.addEventListener('click', onDown);
    upBtn.addEventListener('click', onUp);
    tapBtn.addEventListener('click', onTap);
    startBtn.addEventListener('click', toggleRunning);

    dialog = openModal('Metronome', tempoRow, actions);
    dialog.addEventListener('close', onClose);
    sync();
  };

  headerBtn.addEventListener('click', onOpen);
  renderButton();

  function dispose() {
    disposed = true;
    metronome.stop();
    const current = dialog;
    if (current) {
      current.removeEventListener('close', onClose);
      dialog = null;
      sync = null;
      current.close();
    }
  }

  return { button: headerBtn, dispose };
}
