import { MIN_BPM, MAX_BPM, DEFAULT_BPM, clampBpm, parseBpm, createTapper, createMetronome } from '../audio/click.js';
import { attachDialog } from '../modal.js';
import { icon } from '../icons.js';
import { el, button, iconButton, labeledButton, cls } from '../dom.js';
import { evt } from '../events.js';

export function createMetronomeControl(tempo) {
  let bpm = parseBpm(tempo) ?? DEFAULT_BPM;
  let sync = null;
  let disposed = false;

  const headerBtn = button('', 'Metronome', 'btn live-key');

  const tapper = createTapper();
  const metronome = createMetronome(onBeat);

  function onBeat(beat) {
    if (disposed) return;
    headerBtn.classList.remove(cls.beat, cls.down);
    void headerBtn.offsetWidth;
    headerBtn.classList.add(cls.beat);
    headerBtn.classList.toggle(cls.down, beat === 0);
  }

  function renderButton() {
    headerBtn.replaceChildren(el('small', '', 'BPM'), el('span', '', String(bpm)));
    headerBtn.classList.toggle(cls.active, metronome.running);
    if (!metronome.running) headerBtn.classList.remove(cls.beat, cls.down);
  }

  function setBpm(n) {
    bpm = clampBpm(n);
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

  function open() {
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
      startBtn.classList.toggle(cls.active, running);
    };

    downBtn.addEventListener(evt.click, onDown);
    upBtn.addEventListener(evt.click, onUp);
    tapBtn.addEventListener(evt.click, onTap);
    startBtn.addEventListener(evt.click, toggleRunning);

    sync();
    return { rows: [tempoRow, actions], onClose: () => { sync = null; } };
  }

  const closeDialog = attachDialog(headerBtn, 'Metronome', open);
  renderButton();

  function dispose() {
    disposed = true;
    metronome.stop();
    closeDialog();
  }

  return { button: headerBtn, dispose };
}
