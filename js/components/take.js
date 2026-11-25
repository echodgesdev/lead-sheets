import { decodeTake, peaksOf, createTakePlayer } from '../audio/take.js';
import { encodeWav, WAV_TYPE } from '../audio/wav.js';
import { recordingBlob, updateRecording, deleteRecording, trimOf, isTrimmed, trimmedName, MIN_TAKE_MS } from '../data/recordings.js';
import { toast } from './toast.js';
import { div, span, iconButton, labeledButton, cls, setTitle } from '../core/dom.js';
import { svg } from '../core/svg.js';
import { icon, iconId } from '../core/icons.js';
import { evt, keys } from '../core/events.js';
import { clockTime } from '../core/time.js';
import { saveFile } from '../core/files.js';
import { clamp } from '../core/math.js';

const PEAK_COUNT = 160;
const HANDLE_PX = 22;
const MIN_BAR = 0.04;
const KEY_STEP_MS = 1000;
const SECOND_MS = 1000;
const grabId = Object.freeze({ seek: 'seek', start: 'start', end: 'end' });

function wavePath(peaks) {
  const top = Math.max(...peaks, MIN_BAR);
  return peaks.map((peak, i) => {
    const h = Math.max(peak / top, MIN_BAR);
    return `M${i + 0.5} ${1 - h}V${1 + h}`;
  }).join('');
}

export function createTake(rec, { onChange = () => {}, onDelete = () => {} } = {}) {
  const bars = svg('path', { class: 'take-bars' });
  const art = svg('svg', { viewBox: `0 0 ${PEAK_COUNT} 2`, preserveAspectRatio: 'none', 'aria-hidden': 'true' });
  art.append(bars);
  const wave = div({ class: `take-wave ${cls.loading}`, role: 'slider', tabindex: '0', 'aria-label': 'Position' });
  wave.append(art, div('take-cut take-cut-start'), div('take-cut take-cut-end'), div('take-handle take-handle-start'), div('take-handle take-handle-end'), div('take-head'));
  const playBtn = iconButton(iconId.play, 'Play');
  const time = span('take-time');
  const resetBtn = labeledButton(null, 'Reset', 'take-reset');
  setTitle(resetBtn, 'Undo the trim');
  const saveBtn = iconButton(iconId.arrowUpFromBracket, 'Save');
  const deleteBtn = iconButton(iconId.trashCan, 'Delete', 'danger');
  const controls = div('take-controls');
  controls.append(playBtn, time, resetBtn, saveBtn, deleteBtn);
  const el = div('take');
  el.append(wave, controls);

  let current = rec;
  let blob = null;
  let buffer = null;
  let player = null;
  let duration = rec.duration;
  let trim = trimOf(rec, duration);
  let at = trim.start;
  let grab = null;
  let resume = false;
  let frame = 0;
  let disposed = false;

  const percent = (ms) => `${duration ? (ms / duration) * 100 : 0}%`;

  function render() {
    wave.style.setProperty('--start', percent(trim.start));
    wave.style.setProperty('--end', percent(trim.end));
    wave.style.setProperty('--at', percent(at));
    wave.setAttribute('aria-valuetext', clockTime(at - trim.start));
    time.textContent = `${clockTime(at - trim.start)} / ${clockTime(trim.end - trim.start)}`;
    const playing = !!player?.playing;
    playBtn.replaceChildren(icon(playing ? iconId.pause : iconId.play));
    setTitle(playBtn, playing ? 'Pause' : 'Play');
    playBtn.disabled = !buffer;
    saveBtn.disabled = !blob;
    resetBtn.hidden = !isTrimmed(trim, duration);
  }

  function tick() {
    if (!player?.playing) {
      frame = 0;
      return;
    }
    at = clamp(player.position() * SECOND_MS, trim.start, trim.end);
    render();
    frame = requestAnimationFrame(tick);
  }

  function play() {
    if (at >= trim.end) at = trim.start;
    player.play(at / SECOND_MS, trim.end / SECOND_MS);
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(tick);
    render();
  }

  function pause() {
    if (player?.playing) {
      player.pause();
      at = clamp(player.position() * SECOND_MS, trim.start, trim.end);
    }
    cancelAnimationFrame(frame);
    render();
  }

  const onEnd = () => {
    at = trim.start;
    render();
  };

  function persist(patch) {
    updateRecording(current.id, patch).then((next) => {
      if (!next || disposed) return;
      current = next;
      onChange(next);
    }, () => toast('Could not save the trim'));
  }

  function saveTrim() {
    persist({ trim: isTrimmed(trim, duration) ? { ...trim } : null });
  }

  function msAt(e) {
    const box = wave.getBoundingClientRect();
    return clamp((e.clientX - box.left) / box.width, 0, 1) * duration;
  }

  function grabAt(e) {
    const box = wave.getBoundingClientRect();
    const x = e.clientX - box.left;
    const fromStart = Math.abs(x - (trim.start / duration) * box.width);
    const fromEnd = Math.abs(x - (trim.end / duration) * box.width);
    if (Math.min(fromStart, fromEnd) > HANDLE_PX) return grabId.seek;
    return fromStart < fromEnd ? grabId.start : grabId.end;
  }

  function moveTo(ms) {
    if (grab === grabId.start) {
      trim.start = clamp(ms, 0, trim.end - MIN_TAKE_MS);
      at = trim.start;
    } else if (grab === grabId.end) {
      trim.end = clamp(ms, trim.start + MIN_TAKE_MS, duration);
      at = clamp(at, trim.start, trim.end);
    } else {
      at = clamp(ms, trim.start, trim.end);
    }
    render();
  }

  const onDown = (e) => {
    if (!buffer || e.button > 0) return;
    resume = player.playing;
    pause();
    grab = grabAt(e);
    wave.setPointerCapture(e.pointerId);
    moveTo(msAt(e));
  };

  const onMove = (e) => {
    if (grab) moveTo(msAt(e));
  };

  const onUp = () => {
    if (!grab) return;
    const released = grab;
    grab = null;
    if (released !== grabId.seek) saveTrim();
    if (resume) play();
  };

  const onKey = (e) => {
    if (!buffer) return;
    const by = { [keys.arrowLeft]: -KEY_STEP_MS, [keys.arrowRight]: KEY_STEP_MS }[e.key];
    if (by) {
      e.preventDefault();
      const playing = player.playing;
      pause();
      at = clamp(at + by, trim.start, trim.end);
      if (playing) play();
      else render();
    } else if (e.key === keys.space || e.key === keys.enter) {
      e.preventDefault();
      togglePlay();
    }
  };

  function togglePlay() {
    if (!buffer) return;
    if (player.playing) pause();
    else play();
  }

  function resetTrim() {
    pause();
    trim = { start: 0, end: duration };
    at = 0;
    saveTrim();
    render();
  }

  async function save() {
    if (!blob) return;
    const trimmed = buffer && isTrimmed(trim, duration);
    const file = trimmed
      ? new File([encodeWav(buffer, trim.start / SECOND_MS, trim.end / SECOND_MS)], trimmedName(current.name), { type: WAV_TYPE })
      : new File([blob], current.name, { type: current.mimeType });
    try {
      await saveFile(file, file.name);
    } catch {
      toast('Could not save the recording');
    }
  }

  async function remove() {
    if (!confirm('Delete this recording?')) return;
    dispose();
    try {
      await deleteRecording(current.id);
      onDelete(current);
    } catch {
      toast('Could not delete the recording');
    }
  }

  async function load() {
    try {
      blob = await recordingBlob(rec.id);
      if (!blob || disposed) return;
      render();
      const decoded = await decodeTake(blob);
      if (disposed) return;
      buffer = decoded;
      duration = Math.round(buffer.duration * SECOND_MS);
      trim = trimOf(current, duration);
      at = trim.start;
      player = createTakePlayer(buffer, onEnd);
      const stored = current.peaks?.length === PEAK_COUNT;
      const peaks = stored ? current.peaks : peaksOf(buffer, PEAK_COUNT);
      bars.setAttribute('d', wavePath(peaks));
      wave.classList.remove(cls.loading);
      if (!stored || current.duration !== duration) persist({ peaks, duration });
    } catch {
      toast('Could not open the recording');
    }
    render();
  }

  function dispose() {
    disposed = true;
    pause();
  }

  wave.addEventListener(evt.pointerdown, onDown);
  wave.addEventListener(evt.pointermove, onMove);
  wave.addEventListener(evt.pointerup, onUp);
  wave.addEventListener(evt.pointercancel, onUp);
  wave.addEventListener(evt.keydown, onKey);
  playBtn.addEventListener(evt.click, togglePlay);
  resetBtn.addEventListener(evt.click, resetTrim);
  saveBtn.addEventListener(evt.click, save);
  deleteBtn.addEventListener(evt.click, remove);

  render();
  load();
  return { el, pause, dispose };
}
