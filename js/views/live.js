import * as store from '../store.js';
import * as setlists from '../setlists.js';
import { parse } from '../sheet/parse.js';
import { renderSheet } from '../sheet/render.js';
import {
  viewChords,
  transposeKey,
  hasKey,
  capoFret,
  placeCapo,
  signed,
  MAX_CAPO,
  MAX_SHIFT,
} from '../sheet/transpose.js';
import {
  TAGS,
  NUMBER_STYLES,
  getShownTags,
  getShownControls,
  getNumbers,
  setNumbers,
  getNumberStyle,
  getPedalMode,
  getTextSize,
  getSongOrder,
  tagValue,
} from '../prefs.js';
import { openSongMenu } from './menu.js';
import { openSongDetails } from './details.js';
import { createTunerControl } from './tuner.js';
import { createMetronomeControl } from './metronome.js';
import { icon } from '../icons.js';
import { el, button, iconButton } from '../dom.js';

const MIN_SPEED = 1;
const MAX_SPEED = 10;
const TAP_SLOP = 10;
const MAX_FRAME_MS = 100;
const PAGE_FRACTION = 0.85;
const FORWARD_KEYS = new Set(['PageDown', 'ArrowDown', 'ArrowRight']);
const BACK_KEYS = new Set(['PageUp', 'ArrowUp', 'ArrowLeft']);

function pixelsPerSecond(speed) {
  return 8 * Math.pow(speed, 1.35);
}

function songOrder(set) {
  if (set) return set.entries.map((e) => e.songId).filter((songId) => store.get(songId));
  const ids = getSongOrder();
  return ids.length ? ids : store.all().map((r) => r.id);
}

function fillTags(strip, rec) {
  const shown = new Set(getShownTags());
  const nodes = [];
  for (const t of TAGS) {
    const value = shown.has(t.id) ? tagValue(rec, t.id) : '';
    if (!value) continue;
    if (t.id === 'notes') nodes.push(el('p', 'live-notes', value));
    else nodes.push(el('span', 'badge', t.prefix ? `${t.label} ${value}` : value));
  }
  strip.replaceChildren(...nodes);
}

function mountMissing(root) {
  const msg = el('p', 'status', 'Song not found.');
  const home = iconButton('house', 'Home');
  home.addEventListener('click', () => { location.hash = '#/'; });
  const wrap = el('div', 'status');
  wrap.append(msg, home);
  root.replaceChildren(wrap);
  return () => {};
}

export function mount(root, { id, preview = false, setId = null }) {
  const song = store.get(id);
  if (!song) return mountMissing(root);
  const set = setId ? setlists.get(setId) : null;
  const entry = set?.entries.find((e) => e.songId === id);
  const rec = entry?.tempo ? { ...song, tempo: entry.tempo } : song;

  root.classList.add('with-bar', 'live-view');

  const keyed = hasKey(rec.key);
  const capo = capoFret(rec.capo);
  const maxFret = Math.max(MAX_CAPO, capo);
  const base = placeCapo(capo, entry?.shift ?? 0);
  const parsed = parse(rec.text);
  let autoscroll;
  let style;
  let pedal;
  let numbers;
  let fret = base.capo;
  let shift = base.shift;

  const header = el('header', 'hdr live-hdr');
  const homeBtn = iconButton('chevron-left', 'Back to songs');
  const editBtn = iconButton('pen-to-square', 'Edit song');
  editBtn.hidden = !preview;
  const capoToggle = el('div', 'seg-toggle');
  const capoDownBtn = iconButton('minus', 'Capo down');
  const capoBtn = button('', 'Reset capo');
  capoBtn.classList.add('live-key');
  const capoUpBtn = iconButton('plus', 'Capo up');
  capoToggle.append(capoDownBtn, capoBtn, capoUpBtn);
  const transpose = el('div', 'seg-toggle');
  const downBtn = iconButton('minus', 'Transpose down');
  const shiftBtn = button('', 'Reset transpose');
  shiftBtn.classList.add('live-key');
  const upBtn = iconButton('plus', 'Transpose up');
  transpose.append(downBtn, shiftBtn, upBtn);
  const numbersBtn = button('', '');
  numbersBtn.disabled = !keyed;
  const detailsBtn = iconButton('circle-info', 'Song details');
  const menuBtn = iconButton('ellipsis-vertical', 'More options');
  const tuner = createTunerControl();
  const metronome = createMetronomeControl(rec.tempo);
  header.append(homeBtn, capoToggle, transpose, numbersBtn, tuner.button, metronome.button, detailsBtn, menuBtn, editBtn);
  const tags = el('div', 'live-tags');
  const title = el('h1', 'live-title', rec.title || 'Untitled');

  const sheet = el('div', 'sheet');
  const setSize = (px) => sheet.style.setProperty('--sheet-size', `${px}px`);
  setSize(getTextSize());

  const bar = el('div', 'bar');
  const prevBtn = iconButton('backward-step', 'Previous song');
  const slowBtn = iconButton('minus', 'Slower');
  const playBtn = button('', 'Play or pause');
  const fastBtn = iconButton('plus', 'Faster');
  const nextBtn = iconButton('forward-step', 'Next song');
  const speedLabel = el('span', 'live-bar-speed');
  bar.append(prevBtn, slowBtn, playBtn, fastBtn, nextBtn);

  root.replaceChildren(header, tags, title, sheet, bar);

  function shownRec() {
    return { ...rec, key: transposeKey(rec.key, fret - capo + shift), capo: fret !== capo ? String(fret) : rec.capo };
  }

  function renderContent() {
    const view = { key: rec.key, capo, capoShift: fret - capo, shift, numbers: numbers ? style.id : null };
    renderSheet(viewChords(parsed, view), sheet);
    fillTags(tags, shownRec());
    capoBtn.replaceChildren(el('small', '', 'Capo'), el('span', '', String(fret)));
    capoBtn.classList.toggle('active', fret !== base.capo);
    capoDownBtn.disabled = fret <= 0;
    capoUpBtn.disabled = fret >= maxFret;
    shiftBtn.replaceChildren(el('small', '', 'Shift'), el('span', '', signed(shift)));
    shiftBtn.classList.toggle('active', shift !== base.shift);
    downBtn.disabled = shift <= -MAX_SHIFT;
    upBtn.disabled = shift >= MAX_SHIFT;
    numbersBtn.classList.toggle('active', numbers);
    numbersBtn.setAttribute('aria-pressed', String(numbers));
  }

  function setFret(n) {
    fret = Math.min(maxFret, Math.max(0, n));
    renderContent();
  }

  function setShift(n) {
    shift = Math.min(MAX_SHIFT, Math.max(-MAX_SHIFT, n));
    renderContent();
  }

  function toggleNumbers() {
    numbers = !numbers;
    setNumbers(numbers);
    renderContent();
  }

  const order = songOrder(set);
  const at = order.indexOf(id);
  const prevId = at > 0 ? order[at - 1] : null;
  const nextId = at >= 0 && at < order.length - 1 ? order[at + 1] : null;
  prevBtn.disabled = prevId === null;
  nextBtn.disabled = nextId === null;

  let speed = Math.min(MAX_SPEED, Math.max(MIN_SPEED, Math.round(Number(rec.scrollSpeed) || 3)));
  let playing = false;
  let raf = 0;
  let lastTs = 0;
  let pos = 0;
  let touching = false;
  let disposed = false;
  let wakeLock = null;
  let tap = null;

  const scroller = () => document.scrollingElement || document.documentElement;
  const maxScroll = () => Math.max(0, scroller().scrollHeight - window.innerHeight);

  function syncPos() {
    pos = scroller().scrollTop;
  }

  function renderControls() {
    playBtn.replaceChildren(icon(playing ? 'pause' : 'play'), speedLabel);
    speedLabel.textContent = String(speed);
    playBtn.classList.toggle('active', playing);
    bar.classList.toggle('away', playing);
    bar.inert = playing;
    slowBtn.disabled = speed <= MIN_SPEED;
    fastBtn.disabled = speed >= MAX_SPEED;
  }

  function frame(ts) {
    raf = 0;
    if (!playing) return;
    const dt = Math.min(MAX_FRAME_MS, ts - lastTs);
    lastTs = ts;
    if (!touching) {
      pos += (pixelsPerSecond(speed) * dt) / 1000;
      const limit = maxScroll();
      if (pos >= limit) {
        scroller().scrollTop = limit;
        pause();
        return;
      }
      scroller().scrollTop = pos;
    }
    raf = requestAnimationFrame(frame);
  }

  function play() {
    if (playing) return;
    playing = true;
    syncPos();
    lastTs = performance.now();
    raf = requestAnimationFrame(frame);
    renderControls();
  }

  function pause() {
    playing = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    renderControls();
  }

  function toggle() {
    if (!autoscroll) return;
    if (playing) pause();
    else play();
  }

  function applyPrefs() {
    const controls = new Set(getShownControls());
    autoscroll = controls.has('autoscroll');
    style = NUMBER_STYLES.find((s) => s.id === getNumberStyle());
    pedal = getPedalMode();
    numbers = controls.has('numbers') && keyed && getNumbers();
    capoToggle.hidden = !controls.has('capo');
    transpose.hidden = !controls.has('transpose');
    numbersBtn.hidden = !controls.has('numbers');
    detailsBtn.hidden = !controls.has('details');
    tuner.button.hidden = !controls.has('tuner');
    metronome.button.hidden = !controls.has('metronome');
    numbersBtn.textContent = style.short;
    numbersBtn.title = keyed ? style.title : 'Add a Key to see numbers';
    numbersBtn.setAttribute('aria-label', numbersBtn.title);
    for (const b of [slowBtn, playBtn, fastBtn]) b.hidden = !autoscroll;
    if (!autoscroll) pause();
    renderContent();
  }

  function setSpeed(n) {
    speed = Math.min(MAX_SPEED, Math.max(MIN_SPEED, n));
    renderControls();
    store.setScrollSpeed(id, speed).catch(() => {});
  }

  function go(target) {
    if (target) location.hash = set ? `#/set/${set.id}/${target}` : `#/live/${target}`;
  }

  function pageScroll(dir) {
    const next = Math.min(maxScroll(), Math.max(0, scroller().scrollTop + dir * PAGE_FRACTION * window.innerHeight));
    scroller().scrollTop = next;
    pos = next;
  }

  function turn(dir) {
    const top = scroller().scrollTop;
    if (pedal === 'song') go(dir > 0 ? nextId : prevId);
    else if (dir > 0 && top >= maxScroll() - 1) go(nextId);
    else if (dir < 0 && top <= 0) go(prevId);
    else pageScroll(dir);
  }

  async function requestWakeLock() {
    try {
      const lock = await navigator.wakeLock?.request('screen');
      if (!lock) return;
      if (disposed) {
        lock.release().catch(() => {});
        return;
      }
      wakeLock = lock;
    } catch {
      // wake lock is best effort
    }
  }

  function onVisibility() {
    if (document.visibilityState === 'visible') requestWakeLock();
  }

  function onScroll() {
    if (Math.abs(scroller().scrollTop - pos) > 1.5) syncPos();
  }

  function onTouchStart() {
    touching = true;
    syncPos();
  }

  function onTouchEnd() {
    touching = false;
    syncPos();
  }

  function onWheel() {
    syncPos();
  }

  function onPointerDown(e) {
    tap = { x: e.clientX, y: e.clientY, id: e.pointerId };
  }

  function onPointerUp(e) {
    if (!tap || tap.id !== e.pointerId) return;
    const moved = Math.hypot(e.clientX - tap.x, e.clientY - tap.y);
    tap = null;
    if (moved < TAP_SLOP) toggle();
  }

  function onPointerCancel() {
    tap = null;
  }

  function onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]')) return;
    if (e.key === ' ' || e.key === 'k') toggle();
    else if (e.key === 'Escape') onHome();
    else if (FORWARD_KEYS.has(e.key)) turn(1);
    else if (BACK_KEYS.has(e.key)) turn(-1);
    else return;
    e.preventDefault();
  }

  const onHome = () => { location.hash = '#/'; };
  const onEdit = () => { location.hash = `#/edit/${id}/${location.hash.slice(2)}`; };
  const onDetails = () => {
    pause();
    openSongDetails(shownRec());
  };
  const onMenu = () => {
    pause();
    openSongMenu(rec, {
      onSize: setSize,
      onClose: () => {
        if (!disposed) applyPrefs();
      },
      onEdit,
    });
  };
  const onPrev = () => go(prevId);
  const onNext = () => go(nextId);
  const onSlow = () => setSpeed(speed - 1);
  const onFast = () => setSpeed(speed + 1);

  const onCapoDown = () => setFret(fret - 1);
  const onCapoUp = () => setFret(fret + 1);
  const onCapoReset = () => setFret(base.capo);
  const onDown = () => setShift(shift - 1);
  const onUp = () => setShift(shift + 1);
  const onReset = () => setShift(base.shift);

  editBtn.addEventListener('click', onEdit);
  capoDownBtn.addEventListener('click', onCapoDown);
  capoUpBtn.addEventListener('click', onCapoUp);
  capoBtn.addEventListener('click', onCapoReset);
  downBtn.addEventListener('click', onDown);
  upBtn.addEventListener('click', onUp);
  shiftBtn.addEventListener('click', onReset);
  numbersBtn.addEventListener('click', toggleNumbers);
  detailsBtn.addEventListener('click', onDetails);
  menuBtn.addEventListener('click', onMenu);
  homeBtn.addEventListener('click', onHome);
  prevBtn.addEventListener('click', onPrev);
  nextBtn.addEventListener('click', onNext);
  slowBtn.addEventListener('click', onSlow);
  fastBtn.addEventListener('click', onFast);
  playBtn.addEventListener('click', toggle);
  sheet.addEventListener('pointerdown', onPointerDown);
  sheet.addEventListener('pointerup', onPointerUp);
  sheet.addEventListener('pointercancel', onPointerCancel);
  const listening = new AbortController();
  const passive = { passive: true, signal: listening.signal };
  window.addEventListener('touchstart', onTouchStart, passive);
  window.addEventListener('touchend', onTouchEnd, passive);
  window.addEventListener('touchcancel', onTouchEnd, passive);
  window.addEventListener('wheel', onWheel, passive);
  window.addEventListener('scroll', onScroll, passive);
  window.addEventListener('keydown', onKey, { signal: listening.signal });
  document.addEventListener('visibilitychange', onVisibility, { signal: listening.signal });

  applyPrefs();
  window.scrollTo(0, 0);
  renderControls();
  requestWakeLock();

  return () => {
    disposed = true;
    pause();
    tuner.dispose();
    metronome.dispose();
    listening.abort();
    root.classList.remove('with-bar', 'live-view');
    wakeLock?.release().catch(() => {});
    wakeLock = null;
  };
}
