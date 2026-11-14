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
import { stepper, keyFace } from './controls.js';
import { icon, iconId } from '../core/icons.js';
import { div, span, button, labeledButton, cls } from '../core/dom.js';
import { evt } from '../core/events.js';

function valueStepper(downTitle, upTitle) {
  const value = span('metro-value');
  return { value, ...stepper(value, downTitle, upTitle) };
}

function labeled(text, control) {
  const field = div('metro-field');
  field.append(span('modal-label', text), control);
  return field;
}

export function createMetronomeControl(tempo) {
  let bpm = parseBpm(tempo) ?? DEFAULT_BPM;
  let pattern = getMetronomePattern();
  let sync = null;
  let showBeat = null;
  let disposed = false;

  const headerBtn = button('', 'Metronome', 'live-key');

  const tapper = createTapper();
  const metronome = createMetronome(onBeat);
  metronome.setPattern(pattern);

  function onBeat(beat, level) {
    if (disposed) return;
    headerBtn.classList.remove(cls.beat, cls.down);
    void headerBtn.offsetWidth;
    headerBtn.classList.add(cls.beat);
    headerBtn.classList.toggle(cls.down, level === levelId.primary);
    showBeat?.(beat);
  }

  function renderButton() {
    headerBtn.replaceChildren(...keyFace('BPM', bpm));
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
    const tempoStep = valueStepper('Slower', 'Faster');
    const beatsStep = valueStepper('Fewer beats', 'More beats');
    const settings = div('modal-row metro-settings');
    settings.append(labeled('Tempo', tempoStep.toggle), labeled('Beats', beatsStep.toggle));
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
      tempoStep.value.textContent = String(bpm);
      tempoStep.down.disabled = bpm <= MIN_BPM;
      tempoStep.up.disabled = bpm >= MAX_BPM;
      beatsStep.value.textContent = String(pattern.length);
      beatsStep.down.disabled = pattern.length <= MIN_BEATS;
      beatsStep.up.disabled = pattern.length >= MAX_BEATS;
      pads.replaceChildren(...pattern.map(pad));
      startBtn.replaceChildren(icon(running ? iconId.pause : iconId.play), running ? 'Stop' : 'Start');
      startBtn.title = running ? 'Stop' : 'Start';
      startBtn.setAttribute('aria-label', startBtn.title);
      startBtn.setAttribute('aria-pressed', String(running));
      startBtn.classList.toggle(cls.active, running);
    };

    tempoStep.down.addEventListener(evt.click, () => setBpm(bpm - 1));
    tempoStep.up.addEventListener(evt.click, () => setBpm(bpm + 1));
    beatsStep.down.addEventListener(evt.click, () => setPattern(resizePattern(pattern, pattern.length - 1)));
    beatsStep.up.addEventListener(evt.click, () => setPattern(resizePattern(pattern, pattern.length + 1)));
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
  renderButton();

  function dispose() {
    disposed = true;
    metronome.stop();
    closeDialog();
  }

  return { button: headerBtn, dispose };
}
