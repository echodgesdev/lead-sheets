import {
  MIN_BPM,
  MAX_BPM,
  DEFAULT_BPM,
  MIN_BEATS,
  MAX_BEATS,
  levelId,
  clampBpm,
  parseBpm,
  resizePattern,
  cycleLevel,
  createTapper,
  createMetronome,
} from '../audio/click.js';
import { getMetronomePattern, setMetronomePattern } from '../data/prefs.js';
import { attachDialog } from './modal.js';
import { icon } from '../core/icons.js';
import { div, small, span, button, iconButton, labeledButton, cls } from '../core/dom.js';
import { evt } from '../core/events.js';

function stepper(labelText, downTitle, upTitle) {
  const down = iconButton('minus', downTitle);
  const value = span('metro-value');
  const up = iconButton('plus', upTitle);
  const toggle = div('seg-toggle');
  toggle.append(down, value, up);
  const row = div('modal-row');
  row.append(span('modal-label', labelText), toggle);
  return { row, down, value, up };
}

export function createMetronomeControl(tempo) {
  let bpm = parseBpm(tempo) ?? DEFAULT_BPM;
  let pattern = getMetronomePattern();
  let sync = null;
  let showBeat = null;
  let disposed = false;

  const headerBtn = button('', 'Metronome', 'btn live-key');

  const tapper = createTapper();
  const metronome = createMetronome(onBeat);
  metronome.setPattern(pattern);

  function onBeat(beat, level) {
    if (disposed) return;
    headerBtn.classList.remove(cls.beat, cls.down);
    void headerBtn.offsetWidth;
    headerBtn.classList.add(cls.beat);
    headerBtn.classList.toggle(cls.down, level === levelId.accent);
    showBeat?.(beat);
  }

  function renderButton() {
    headerBtn.replaceChildren(small(null, 'BPM'), span(null, String(bpm)));
    headerBtn.classList.toggle(cls.active, metronome.running);
    if (!metronome.running) headerBtn.classList.remove(cls.beat, cls.down);
  }

  function setBpm(n) {
    bpm = clampBpm(n);
    if (metronome.running) metronome.setBpm(bpm);
    renderButton();
    sync?.();
  }

  function setPattern(next) {
    pattern = next;
    setMetronomePattern(pattern);
    metronome.setPattern(pattern);
    sync?.();
  }

  function toggleRunning() {
    if (metronome.running) metronome.stop();
    else metronome.start(bpm);
    renderButton();
    sync?.();
  }

  function open() {
    const tempoRow = stepper('Tempo', 'Slower', 'Faster');
    const beatsRow = stepper('Beats', 'Fewer beats', 'More beats');
    const pads = div('modal-row metro-pads');

    const tapBtn = labeledButton(null, 'Tap');
    tapBtn.title = 'Tap tempo';
    const startBtn = button('', 'Start');
    const actions = div('modal-row metro-actions');
    actions.append(tapBtn, startBtn);

    const pad = (level, i) => {
      const b = button('', `Beat ${i + 1}: ${level}`, 'btn metro-pad');
      b.dataset.level = level;
      b.addEventListener(evt.click, () => setPattern(pattern.map((l, j) => (j === i ? cycleLevel(l) : l))));
      return b;
    };

    const onTap = () => {
      const tapped = tapper(performance.now());
      if (tapped) setBpm(tapped);
    };

    showBeat = (beat) => {
      [...pads.children].forEach((b, i) => b.classList.toggle(cls.beat, i === beat));
    };

    sync = () => {
      const running = metronome.running;
      tempoRow.value.textContent = String(bpm);
      tempoRow.down.disabled = bpm <= MIN_BPM;
      tempoRow.up.disabled = bpm >= MAX_BPM;
      beatsRow.value.textContent = String(pattern.length);
      beatsRow.down.disabled = pattern.length <= MIN_BEATS;
      beatsRow.up.disabled = pattern.length >= MAX_BEATS;
      pads.replaceChildren(...pattern.map(pad));
      startBtn.replaceChildren(icon(running ? 'pause' : 'play'), running ? 'Stop' : 'Start');
      startBtn.title = running ? 'Stop' : 'Start';
      startBtn.setAttribute('aria-label', startBtn.title);
      startBtn.setAttribute('aria-pressed', String(running));
      startBtn.classList.toggle(cls.active, running);
    };

    tempoRow.down.addEventListener(evt.click, () => setBpm(bpm - 1));
    tempoRow.up.addEventListener(evt.click, () => setBpm(bpm + 1));
    beatsRow.down.addEventListener(evt.click, () => setPattern(resizePattern(pattern, pattern.length - 1)));
    beatsRow.up.addEventListener(evt.click, () => setPattern(resizePattern(pattern, pattern.length + 1)));
    tapBtn.addEventListener(evt.click, onTap);
    startBtn.addEventListener(evt.click, toggleRunning);

    sync();
    return {
      rows: [tempoRow.row, beatsRow.row, pads, actions],
      onClose: () => {
        sync = null;
        showBeat = null;
      },
    };
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
