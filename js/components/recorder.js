import { startRecording } from '../audio/record.js';
import { addRecording } from '../data/recordings.js';
import { attachPopover } from './modal.js';
import { modalRow } from './rows.js';
import { openRecordings } from './recordings.js';
import { toast } from './toast.js';
import { div, p, span, iconButton, labeledButton, cls, setPressed, setTitle } from '../core/dom.js';
import { icon, iconId } from '../core/icons.js';
import { evt } from '../core/events.js';
import { clockTime } from '../core/time.js';
import { strings } from '../strings.js';

const TICK_MS = 250;

export function createRecorderControl(song) {
  const headerBtn = iconButton(iconId.circle, 'Recorder', 'rec-btn');
  let session = null;
  let starting = false;
  let error = '';
  let sync = null;
  let disposed = false;

  function changed() {
    headerBtn.classList.toggle(cls.active, !!session);
    sync?.();
  }

  async function save(started, result) {
    if (session === started) session = null;
    changed();
    if (!result.blob.size) return;
    try {
      await addRecording({ song, createdAt: started.startedAt, ...result });
      toast('Recording saved');
    } catch {
      toast('Could not save the recording');
    }
  }

  async function start() {
    starting = true;
    error = '';
    changed();
    try {
      const started = await startRecording();
      if (disposed) {
        started.stop();
      } else {
        session = started;
        started.done.then((result) => save(started, result));
      }
    } catch {
      error = strings.micUnavailable;
    }
    starting = false;
    changed();
  }

  function toggle() {
    if (starting) return;
    if (session) session.stop();
    else start();
  }

  function showList(forSong, close) {
    close();
    openRecordings(forSong);
  }

  function open(close) {
    const time = span('rec-time');
    const toggleBtn = labeledButton(null, '', 'rec-toggle');
    const main = modalRow(null, toggleBtn);
    const note = p({ class: 'modal-note', hidden: '' });
    const songBtn = labeledButton(null, 'View recordings');
    const allBtn = labeledButton(null, 'View all recordings');
    songBtn.hidden = !song;
    const lists = div('modal-row rec-lists');
    lists.append(songBtn, allBtn);

    const renderTime = () => {
      time.textContent = clockTime(session ? Date.now() - session.startedAt : 0);
    };

    sync = () => {
      const on = !!session;
      toggleBtn.replaceChildren(icon(on ? iconId.stop : iconId.circle), on ? 'Stop' : 'Record', time);
      setTitle(toggleBtn, on ? 'Stop recording' : 'Start recording');
      setPressed(toggleBtn, on);
      toggleBtn.disabled = starting;
      note.textContent = error;
      note.hidden = !error;
      renderTime();
    };

    const onSong = () => showList(song, close);
    const onAll = () => showList(null, close);
    toggleBtn.addEventListener(evt.click, toggle);
    songBtn.addEventListener(evt.click, onSong);
    allBtn.addEventListener(evt.click, onAll);

    const timer = setInterval(renderTime, TICK_MS);
    sync();
    return {
      rows: [main, lists, note],
      onClose: () => {
        clearInterval(timer);
        sync = null;
      },
    };
  }

  const closePopover = attachPopover(headerBtn, open);

  function dispose() {
    disposed = true;
    session?.stop();
    closePopover();
  }

  return { button: headerBtn, dispose };
}
