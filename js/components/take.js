import { decodeTake, peaksOf, createTakePlayer } from '../audio/take.js';
import { encodeWav, WAV_EXT } from '../audio/wav.js';
import { recordingBlob, updateRecording, replaceAudio, deleteRecording, splitName, renamed, clampTrim, isTrimmed } from '../data/recordings.js';
import { confirmDialog } from './modal.js';
import { textField } from './controls.js';
import { toast } from './toast.js';
import { div, span, iconButton, cls, setTitle } from '../core/dom.js';
import { svg } from '../core/svg.js';
import { icon, iconId } from '../core/icons.js';
import { evt, keys } from '../core/events.js';
import { clockTime } from '../core/time.js';
import { saveFile } from '../core/files.js';
import { clamp } from '../core/math.js';
import { strings } from '../strings.js';

const PEAK_COUNT = 160;
const HANDLE_PX = 22;
const MIN_BAR = 0.04;
const KEY_STEP_MS = 1000;
const SECOND_MS = 1000;
const grabId = Object.freeze({ seek: 'seek', start: 'start', end: 'end' });
const modeId = Object.freeze({ view: 'view', edit: 'edit' });

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
  const nameField = textField('File name', 'take-name');
  const extLabel = span('take-ext');
  const nameRow = div({ class: 'take-rename', hidden: '' });
  nameRow.append(nameField, extLabel);
  const time = span('take-time');
  const playBtn = iconButton(iconId.play, 'Play');
  const saveBtn = iconButton(iconId.download, 'Save');
  const editBtn = iconButton(iconId.penToSquare, 'Edit');
  const deleteBtn = iconButton(iconId.trashCan, 'Delete', 'danger');
  const confirmBtn = iconButton(iconId.check, strings.confirm, 'primary');
  const cancelBtn = iconButton(iconId.xmark, strings.cancel);
  const controls = div('take-controls');
  const el = div('take');
  el.append(nameRow, wave, time, controls);

  let current = rec;
  let blob = null;
  let buffer = null;
  let player = null;
  let duration = rec.duration;
  let trim = { start: 0, end: duration };
  let at = 0;
  let mode = modeId.view;
  let saving = false;
  let grab = null;
  let resume = false;
  let frame = 0;
  let disposed = false;

  const percent = (ms) => `${duration ? (ms / duration) * 100 : 0}%`;
  const editing = () => mode === modeId.edit;
  const originalExt = () => splitName(current.name).ext;
  const nextExt = () => (isTrimmed(trim, duration) ? WAV_EXT : originalExt());

  function render() {
    wave.classList.toggle(cls.editing, editing());
    nameRow.hidden = !editing();
    extLabel.textContent = nextExt();
    wave.style.setProperty('--start', percent(trim.start));
    wave.style.setProperty('--end', percent(trim.end));
    wave.style.setProperty('--at', percent(at));
    wave.setAttribute('aria-valuetext', clockTime(at - trim.start));
    time.textContent = `${clockTime(at - trim.start)} / ${clockTime(trim.end - trim.start)}`;
    const playing = !!player?.playing;
    playBtn.replaceChildren(icon(playing ? iconId.pause : iconId.play));
    setTitle(playBtn, playing ? 'Pause' : 'Play');
    playBtn.disabled = !buffer || saving;
    saveBtn.disabled = !blob;
    editBtn.disabled = !buffer;
    nameField.disabled = saving;
    confirmBtn.disabled = saving;
    cancelBtn.disabled = saving;
    controls.replaceChildren(...(editing() ? [playBtn, confirmBtn, cancelBtn] : [playBtn, saveBtn, editBtn, deleteBtn]));
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
    }, () => {});
  }

  function drawPeaks(peaks) {
    bars.setAttribute('d', wavePath(peaks));
  }

  function msAt(e) {
    const box = wave.getBoundingClientRect();
    return clamp((e.clientX - box.left) / box.width, 0, 1) * duration;
  }

  function grabAt(e) {
    if (!editing()) return grabId.seek;
    const box = wave.getBoundingClientRect();
    const x = e.clientX - box.left;
    const fromStart = Math.abs(x - (trim.start / duration) * box.width);
    const fromEnd = Math.abs(x - (trim.end / duration) * box.width);
    if (Math.min(fromStart, fromEnd) > HANDLE_PX) return grabId.seek;
    return fromStart < fromEnd ? grabId.start : grabId.end;
  }

  function moveTo(ms) {
    if (grab === grabId.start) {
      trim = clampTrim({ start: ms, end: trim.end }, duration);
      at = trim.start;
    } else if (grab === grabId.end) {
      trim = clampTrim({ start: trim.start, end: ms }, duration);
      at = clamp(at, trim.start, trim.end);
    } else {
      at = clamp(ms, trim.start, trim.end);
    }
    render();
  }

  const onDown = (e) => {
    if (!buffer || saving || e.button > 0) return;
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
    grab = null;
    if (resume) play();
  };

  const onKey = (e) => {
    if (!buffer || saving) return;
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
    if (!buffer || saving) return;
    if (player.playing) pause();
    else play();
  }

  function startEdit() {
    if (!buffer) return;
    pause();
    mode = modeId.edit;
    nameField.value = splitName(current.name).base;
    render();
    nameField.focus();
  }

  function cancelEdit() {
    if (saving) return;
    pause();
    mode = modeId.view;
    trim = { start: 0, end: duration };
    at = 0;
    render();
  }

  function adopt(nextBuffer, nextBlob, next) {
    buffer = nextBuffer;
    blob = nextBlob;
    player = createTakePlayer(buffer, onEnd);
    duration = next.duration;
    current = next;
  }

  async function confirmEdit() {
    if (!buffer || saving) return;
    pause();
    const trimmed = isTrimmed(trim, duration);
    const name = renamed(current.name, nameField.value, nextExt());
    saving = true;
    render();
    try {
      if (trimmed) {
        const wav = encodeWav(buffer, trim.start / SECOND_MS, trim.end / SECOND_MS);
        const decoded = await decodeTake(wav);
        const peaks = peaksOf(decoded, PEAK_COUNT);
        const next = await replaceAudio(current.id, { name, blob: wav, duration: Math.round(decoded.duration * SECOND_MS), peaks });
        if (!next) throw new Error('missing');
        if (disposed) return;
        adopt(decoded, wav, next);
        drawPeaks(peaks);
        onChange(next);
      } else if (name !== current.name) {
        const next = await updateRecording(current.id, { name });
        if (!next) throw new Error('missing');
        if (disposed) return;
        current = next;
        onChange(next);
      }
      mode = modeId.view;
      trim = { start: 0, end: duration };
      at = 0;
    } catch {
      toast('Could not save the changes');
    }
    saving = false;
    if (!disposed) render();
  }

  async function save() {
    if (!blob) return;
    const file = new File([blob], current.name, { type: current.mimeType });
    try {
      await saveFile(file, file.name);
    } catch {
      toast('Could not save the recording');
    }
  }

  async function remove() {
    const confirmed = await confirmDialog({ title: strings.deleteRecording, message: current.name, confirmLabel: strings.delete, danger: true });
    if (!confirmed || disposed) return;
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
      trim = { start: 0, end: duration };
      at = 0;
      player = createTakePlayer(buffer, onEnd);
      const stored = current.peaks?.length === PEAK_COUNT;
      const peaks = stored ? current.peaks : peaksOf(buffer, PEAK_COUNT);
      drawPeaks(peaks);
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

  const onNameKey = (e) => {
    if (e.key !== keys.enter) return;
    e.preventDefault();
    confirmEdit();
  };

  wave.addEventListener(evt.pointerdown, onDown);
  wave.addEventListener(evt.pointermove, onMove);
  wave.addEventListener(evt.pointerup, onUp);
  wave.addEventListener(evt.pointercancel, onUp);
  wave.addEventListener(evt.keydown, onKey);
  nameField.addEventListener(evt.keydown, onNameKey);
  playBtn.addEventListener(evt.click, togglePlay);
  saveBtn.addEventListener(evt.click, save);
  editBtn.addEventListener(evt.click, startEdit);
  deleteBtn.addEventListener(evt.click, remove);
  confirmBtn.addEventListener(evt.click, confirmEdit);
  cancelBtn.addEventListener(evt.click, cancelEdit);

  render();
  load();
  return { el, pause, dispose };
}
