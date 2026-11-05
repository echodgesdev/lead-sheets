import * as store from '../store.js';
import * as setlists from '../setlists.js';
import { parse } from '../sheet/parse.js';
import { renderSheet } from '../sheet/render.js';
import { viewChords, transposeKey, hasKey, capoFret, placeCapo } from '../sheet/transpose.js';
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
  tagValue,
} from '../prefs.js';
import { openInfo } from './info.js';
import { icon } from '../icons.js';

const MIN_SPEED = 1;
const MAX_SPEED = 10;
const TAP_SLOP = 10;
const MAX_FRAME_MS = 100;
const PAGE_FRACTION = 0.85;
const MAX_SHIFT = 11;
const FORWARD_KEYS = new Set(['PageDown', 'ArrowDown', 'ArrowRight']);
const BACK_KEYS = new Set(['PageUp', 'ArrowUp', 'ArrowLeft']);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label, title) {
  const b = el('button', 'btn', label);
  b.type = 'button';
  b.title = title;
  b.setAttribute('aria-label', title);
  return b;
}

function iconButton(name, title) {
  const b = button('', title);
  b.append(icon(name));
  return b;
}

function signed(n) {
  return n > 0 ? `+${n}` : String(n);
}

function pixelsPerSecond(speed) {
  return 8 * Math.pow(speed, 1.35);
}

function songOrder(set) {
  if (set) return set.entries.map((e) => e.songId).filter((songId) => store.get(songId));
  try {
    const ids = JSON.parse(sessionStorage.getItem('tabs.order'));
    if (Array.isArray(ids) && ids.length) return ids;
  } catch {
    // fall through to store order
  }
  return store.all().map((r) => r.id);
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
  const onHome = () => { location.hash = '#/'; };
  home.addEventListener('click', onHome);
  const wrap = el('div', 'status');
  wrap.append(msg, home);
  root.replaceChildren(wrap);
  return () => home.removeEventListener('click', onHome);
}

export function mount(root, { id, preview = false, setId = null }) {
  const song = store.get(id);
  if (!song) return mountMissing(root);
  const set = setId ? setlists.get(setId) : null;
  const entry = set?.entries.find((e) => e.songId === id);
  const rec = entry?.tempo ? { ...song, tempo: entry.tempo } : song;
  const baseShift = entry?.shift ?? 0;

  root.classList.add('with-bar', 'live-view');

  const controls = new Set(getShownControls());
  const autoscroll = controls.has('autoscroll');
  const keyed = hasKey(rec.key);
  const capo = capoFret(rec.capo);
  const pedal = getPedalMode();
  const parsed = parse(rec.text);
  let shift = baseShift;
  let numbers = controls.has('numbers') && keyed && getNumbers();

  const header = el('header', 'hdr live-hdr');
  const homeBtn = iconButton('chevron-left', 'Back to songs');
  const editBtn = iconButton('pen-to-square', 'Edit song');
  editBtn.hidden = !preview;
  const transpose = el('div', 'seg-toggle');
  const downBtn = iconButton('minus', 'Transpose down');
  const keyBtn = button('', 'Reset capo');
  keyBtn.classList.add('live-key');
  const upBtn = iconButton('plus', 'Transpose up');
  transpose.append(downBtn, keyBtn, upBtn);
  transpose.hidden = !controls.has('transpose');
  const style = NUMBER_STYLES.find((s) => s.id === getNumberStyle());
  const numbersBtn = button(style.short, keyed ? style.title : 'Add a Key to see numbers');
  numbersBtn.hidden = !controls.has('numbers');
  numbersBtn.disabled = !keyed;
  const infoBtn = iconButton('circle-info', 'Song info');
  header.append(homeBtn, el('h1', 'hdr-title', rec.title || 'Untitled'), transpose, numbersBtn, infoBtn, editBtn);
  const tags = el('div', 'live-tags');

  const sheet = el('div', 'sheet');
  sheet.style.setProperty('--sheet-size', `${getTextSize()}px`);

  const bar = el('div', 'bar');
  const prevBtn = iconButton('backward-step', 'Previous song');
  const slowBtn = iconButton('minus', 'Slower');
  const playBtn = button('', 'Play or pause');
  const fastBtn = iconButton('plus', 'Faster');
  const nextBtn = iconButton('forward-step', 'Next song');
  const speedLabel = el('span', 'live-bar-speed');
  for (const b of [slowBtn, playBtn, fastBtn]) b.hidden = !autoscroll;
  bar.append(prevBtn, slowBtn, playBtn, fastBtn, nextBtn);

  root.replaceChildren(header, tags, sheet, bar);

  function renderContent() {
    const placed = placeCapo(capo, shift);
    renderSheet(viewChords(parsed, { key: rec.key, capo, shift, numbers: numbers ? style.id : null }), sheet);
    fillTags(tags, { ...rec, key: transposeKey(rec.key, shift), capo: shift ? String(placed.capo) : rec.capo });
    const fret = placed.shift ? `${placed.capo} ${signed(placed.shift)}` : String(placed.capo);
    keyBtn.replaceChildren(el('small', '', 'Capo'), el('span', '', fret));
    keyBtn.classList.toggle('active', shift !== baseShift);
    downBtn.disabled = shift <= -MAX_SHIFT;
    upBtn.disabled = shift >= MAX_SHIFT;
    numbersBtn.classList.toggle('active', numbers);
    numbersBtn.setAttribute('aria-pressed', String(numbers));
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
  const onEdit = () => { location.hash = `#/edit/${id}`; };
  const onInfo = () => {
    pause();
    openInfo(rec);
  };
  const onPrev = () => go(prevId);
  const onNext = () => go(nextId);
  const onSlow = () => setSpeed(speed - 1);
  const onFast = () => setSpeed(speed + 1);

  const onDown = () => setShift(shift - 1);
  const onUp = () => setShift(shift + 1);
  const onReset = () => setShift(baseShift);

  editBtn.addEventListener('click', onEdit);
  downBtn.addEventListener('click', onDown);
  upBtn.addEventListener('click', onUp);
  keyBtn.addEventListener('click', onReset);
  numbersBtn.addEventListener('click', toggleNumbers);
  infoBtn.addEventListener('click', onInfo);
  homeBtn.addEventListener('click', onHome);
  prevBtn.addEventListener('click', onPrev);
  nextBtn.addEventListener('click', onNext);
  slowBtn.addEventListener('click', onSlow);
  fastBtn.addEventListener('click', onFast);
  playBtn.addEventListener('click', toggle);
  sheet.addEventListener('pointerdown', onPointerDown);
  sheet.addEventListener('pointerup', onPointerUp);
  sheet.addEventListener('pointercancel', onPointerCancel);
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchend', onTouchEnd, { passive: true });
  window.addEventListener('touchcancel', onTouchEnd, { passive: true });
  window.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVisibility);

  renderContent();
  window.scrollTo(0, 0);
  renderControls();
  requestWakeLock();

  return () => {
    disposed = true;
    pause();
    editBtn.removeEventListener('click', onEdit);
    downBtn.removeEventListener('click', onDown);
    upBtn.removeEventListener('click', onUp);
    keyBtn.removeEventListener('click', onReset);
    numbersBtn.removeEventListener('click', toggleNumbers);
    infoBtn.removeEventListener('click', onInfo);
    homeBtn.removeEventListener('click', onHome);
    prevBtn.removeEventListener('click', onPrev);
    nextBtn.removeEventListener('click', onNext);
    slowBtn.removeEventListener('click', onSlow);
    fastBtn.removeEventListener('click', onFast);
    playBtn.removeEventListener('click', toggle);
    sheet.removeEventListener('pointerdown', onPointerDown);
    sheet.removeEventListener('pointerup', onPointerUp);
    sheet.removeEventListener('pointercancel', onPointerCancel);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('touchcancel', onTouchEnd);
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVisibility);
    root.classList.remove('with-bar', 'live-view');
    wakeLock?.release().catch(() => {});
    wakeLock = null;
  };
}
