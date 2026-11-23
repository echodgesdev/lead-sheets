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
import { attachDialog, promptNumber } from './modal.js';
import { stepper } from './controls.js';
import { labeledField } from './rows.js';
import { icon, iconId } from '../core/icons.js';
import { div, button, iconButton, labeledButton, plainButton, cls, setPressed, setTitle } from '../core/dom.js';
import { evt } from '../core/events.js';

function valueStepper(downTitle, upTitle, min, max, onStep) {
  const value = plainButton('', 'metro-value');
  const step = stepper({ center: value, downTitle, upTitle, min, max, onStep });
  return {
    el: step.el,
    value,
    set(n) {
      value.textContent = String(n);
      step.set(n);
    },
  };
}

export function createMetronomeControl(tempo) {
  let bpm = parseBpm(tempo) ?? DEFAULT_BPM;
  let pattern = getMetronomePattern();
  let sync = null;
  let showBeat = null;
  let disposed = false;

  const headerBtn = iconButton(iconId.metronome, 'Metronome', 'metro-btn');

  const tapper = createTapper();
  const metronome = createMetronome(onBeat);
  metronome.setPattern(pattern);

  function onBeat(beat, level) {
    if (disposed) return;
    headerBtn.classList.remove(cls.beat, cls.down);
    void headerBtn.getBoundingClientRect();
    headerBtn.classList.add(cls.beat);
    headerBtn.classList.toggle(cls.down, level === levelId.primary);
    showBeat?.(beat);
  }

  function syncButton() {
    headerBtn.classList.toggle(cls.active, metronome.running);
    if (metronome.running) return;
    headerBtn.classList.remove(cls.beat, cls.down);
  }

  function setBpm(n) {
    bpm = clampBpm(n);
    if (metronome.running) metronome.setBpm(bpm);
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
    syncButton();
    sync?.();
  }

  function open() {
    const tempoStep = valueStepper('Slower', 'Faster', MIN_BPM, MAX_BPM, (by) => setBpm(bpm + by));
    const beatsStep = valueStepper('Fewer beats', 'More beats', MIN_BEATS, MAX_BEATS, (by) => setPattern(resizePattern(pattern, pattern.length + by)));
    const settings = div('modal-row metro-settings');
    settings.append(labeledField('Tempo', tempoStep.el), labeledField('Beats', beatsStep.el));
    const pads = div('modal-row metro-pads');

    const tapBtn = labeledButton(null, 'Tap');
    tapBtn.title = 'Tap tempo';
    const startBtn = button('', 'Start');
    const actions = div('modal-row metro-actions');
    actions.append(tapBtn, startBtn);

    const pad = (level, i) => {
      const b = button('', `Beat ${i + 1}: ${level}`, 'metro-pad');
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
      tempoStep.set(bpm);
      beatsStep.set(pattern.length);
      pads.replaceChildren(...pattern.map(pad));
      startBtn.replaceChildren(icon(running ? iconId.pause : iconId.play), running ? 'Stop' : 'Start');
      setTitle(startBtn, running ? 'Stop' : 'Start');
      setPressed(startBtn, running);
    };

    tempoStep.value.addEventListener(evt.click, () => promptNumber('Tempo (BPM)', bpm, { min: MIN_BPM, max: MAX_BPM }, setBpm));
    beatsStep.value.addEventListener(evt.click, () => promptNumber('Beats', pattern.length, { min: MIN_BEATS, max: MAX_BEATS }, (n) => setPattern(resizePattern(pattern, n))));
    tapBtn.addEventListener(evt.click, onTap);
    startBtn.addEventListener(evt.click, toggleRunning);

    sync();
    return {
      rows: [settings, pads, actions],
      onClose: () => {
        sync = null;
        showBeat = null;
      },
    };
  }

  const closeDialog = attachDialog(headerBtn, 'Metronome', open);
  syncButton();

  function dispose() {
    disposed = true;
    metronome.stop();
    closeDialog();
  }

  return { button: headerBtn, dispose };
}
