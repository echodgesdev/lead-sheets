import { startRecording } from '../audio/record.js';
import { addRecording, songRecordings } from '../data/recordings.js';
import { getCountIn, setCountIn } from '../data/prefs.js';
import { attachPopover } from './modal.js';
import { modalRow } from './rows.js';
import { openRecordings } from './recordings.js';
import { createTake } from './take.js';
import { toast } from './toast.js';
import { div, p, span, iconButton, labeledButton, cls, setPressed, setTitle } from '../core/dom.js';
import { icon, iconId } from '../core/icons.js';
import { evt } from '../core/events.js';
import { clockTime } from '../core/time.js';
import { strings } from '../strings.js';

const TICK_MS = 250;

export function createRecorderControl(song, countIn) {
  const headerBtn = iconButton(iconId.circle, 'Recorder', 'rec-btn');
  let session = null;
  let arming = null;
  let count = null;
  let error = '';
  let sync = null;
  let refresh = null;
  let disposed = false;

  function changed() {
    headerBtn.classList.toggle(cls.active, !!session || !!arming);
    sync?.();
  }

  async function save(started, result) {
    if (session === started) session = null;
    changed();
    if (!result.blob.size) return;
    try {
      await addRecording({ song, createdAt: started.startedAt, ...result });
      if (refresh) refresh();
      else if (disposed) toast('Recording saved');
      else toast('Recording saved', { label: 'Open', run: () => headerBtn.click() });
    } catch {
      toast('Could not save the recording');
    }
  }

  async function start() {
    const abort = new AbortController();
    arming = abort;
    count = null;
    error = '';
    changed();
    const onCount = (n) => {
      count = n;
      changed();
    };
    const ready = countIn && getCountIn() ? () => countIn(onCount, abort.signal) : null;
    try {
      const started = await startRecording(ready);
      if (started && (abort.signal.aborted || disposed)) {
        started.stop();
      } else if (started) {
        session = started;
        started.done.then((result) => save(started, result));
      }
    } catch {
      error = strings.micUnavailable;
    }
    if (arming === abort) arming = null;
    count = null;
    changed();
  }

  function toggle() {
    if (arming) {
      arming.abort();
      arming = null;
      changed();
    } else if (session) {
      session.stop();
    } else {
      start();
    }
  }

  function showList(forSong, close) {
    close();
    openRecordings(forSong);
  }

  function open(close) {
    const time = span('rec-time');
    const toggleBtn = labeledButton(null, '', 'rec-toggle');
    const countBtn = labeledButton(iconId.metronome, 'Count-in', 'rec-count');
    setTitle(countBtn, 'Count in one bar of the metronome before recording');
    const main = modalRow(null, toggleBtn, countBtn);
    const note = p({ class: 'modal-note', hidden: '' });
    const takeRow = div({ class: 'rec-take', hidden: '' });
    const songBtn = labeledButton(null, 'View recordings');
    const allBtn = labeledButton(null, 'View all recordings');
    songBtn.hidden = !song;
    const lists = div('modal-row rec-lists');
    lists.append(songBtn, allBtn);
    let take = null;
    let takeId = null;
    let closed = false;

    const renderTime = () => {
      time.textContent = clockTime(session ? Date.now() - session.startedAt : 0);
    };

    function toggleLabel() {
      if (session) return ['Stop', time];
      if (arming) return [count ? String(count) : 'Get ready'];
      return ['Record', time];
    }

    sync = () => {
      const busy = !!session || !!arming;
      toggleBtn.replaceChildren(icon(busy ? iconId.stop : iconId.circle), ...toggleLabel());
      setTitle(toggleBtn, session ? 'Stop recording' : arming ? 'Cancel' : 'Start recording');
      setPressed(toggleBtn, busy);
      setPressed(countBtn, getCountIn());
      countBtn.disabled = busy;
      if (busy) take?.pause();
      takeRow.hidden = busy || !take;
      note.textContent = error;
      note.hidden = !error;
      renderTime();
    };

    refresh = async () => {
      let recs;
      try {
        recs = await songRecordings(song?.id ?? null);
      } catch {
        return;
      }
      if (closed) return;
      songBtn.textContent = `View recordings (${recs.length})`;
      const latest = recs[0] ?? null;
      if (latest?.id !== takeId) {
        take?.dispose();
        takeId = latest?.id ?? null;
        take = latest ? createTake(latest, { onDelete: () => refresh() }) : null;
        takeRow.replaceChildren(...(take ? [span('modal-label', 'Last take'), take.el] : []));
      }
      sync();
    };

    const onCountIn = () => {
      setCountIn(!getCountIn());
      sync();
    };
    const onSong = () => showList(song, close);
    const onAll = () => showList(null, close);
    toggleBtn.addEventListener(evt.click, toggle);
    countBtn.addEventListener(evt.click, onCountIn);
    songBtn.addEventListener(evt.click, onSong);
    allBtn.addEventListener(evt.click, onAll);

    const timer = setInterval(renderTime, TICK_MS);
    sync();
    refresh();
    return {
      popoverClass: 'rec-popover',
      rows: [main, note, takeRow, lists],
      onClose: () => {
        closed = true;
        clearInterval(timer);
        take?.dispose();
        sync = null;
        refresh = null;
      },
    };
  }

  const closePopover = attachPopover(headerBtn, open);

  function dispose() {
    disposed = true;
    arming?.abort();
    session?.stop();
    closePopover();
  }

  return { button: headerBtn, dispose };
}
