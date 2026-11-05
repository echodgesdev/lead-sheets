import * as store from '../store.js';
import { parse } from '../sheet/parse.js';
import { renderSheet } from '../sheet/render.js';
import { TAGS, getShownTags, tagValue } from '../tags.js';
import { openInfo } from './info.js';
import { icon } from '../icons.js';

const MIN_SPEED = 1;
const MAX_SPEED = 10;
const TAP_SLOP = 10;
const MAX_FRAME_MS = 100;
const PAGE_FRACTION = 0.85;

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

function pixelsPerSecond(speed) {
  return 8 * Math.pow(speed, 1.35);
}

function songOrder() {
  try {
    const ids = JSON.parse(sessionStorage.getItem('tabs.order'));
    if (Array.isArray(ids) && ids.length) return ids;
  } catch {
    // fall through to store order
  }
  return store.all().map((r) => r.id);
}

function tagStrip(rec) {
  const strip = el('div', 'live-tags');
  const shown = new Set(getShownTags());
  for (const t of TAGS) {
    const value = shown.has(t.id) ? tagValue(rec, t.id) : '';
    if (!value) continue;
    if (t.id === 'notes') strip.append(el('p', 'live-notes', value));
    else strip.append(el('span', 'badge', t.prefix ? `${t.label} ${value}` : value));
  }
  return strip;
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

export function mount(root, { id, preview = false }) {
  const rec = store.get(id);
  if (!rec) return mountMissing(root);

  root.classList.add('with-bar');

  const header = el('header', 'hdr live-hdr');
  const editBtn = button('', 'Edit song');
  editBtn.append(icon('pen-to-square'), 'Edit');
  editBtn.hidden = !preview;
  const infoBtn = iconButton('circle-info', 'Song info');
  const homeBtn = iconButton('chevron-left', 'Back to songs');
  header.append(homeBtn, el('h1', 'hdr-title', rec.title || 'Untitled'), editBtn, infoBtn);
  const tags = tagStrip(rec);

  const sheet = el('div', 'sheet');
  renderSheet(parse(rec.text), sheet);

  const bar = el('div', 'bar');
  const prevBtn = iconButton('backward-step', 'Previous song');
  const slowBtn = iconButton('minus', 'Slower');
  const playBtn = button('', 'Play or pause');
  const fastBtn = iconButton('plus', 'Faster');
  const nextBtn = iconButton('forward-step', 'Next song');
  const speedLabel = el('span', 'live-bar-speed');
  bar.append(prevBtn, slowBtn, playBtn, fastBtn, nextBtn);

  root.replaceChildren(header, tags, sheet, bar);

  const order = songOrder();
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
    if (playing) pause();
    else play();
  }

  function setSpeed(n) {
    speed = Math.min(MAX_SPEED, Math.max(MIN_SPEED, n));
    renderControls();
    store.setScrollSpeed(id, speed).catch(() => {});
  }

  function go(target) {
    if (target) location.hash = `#/live/${target}`;
  }

  function pageScroll(dir) {
    const next = Math.min(maxScroll(), Math.max(0, scroller().scrollTop + dir * PAGE_FRACTION * window.innerHeight));
    scroller().scrollTop = next;
    pos = next;
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
    switch (e.key) {
      case ' ':
      case 'k':
        toggle();
        break;
      case 'ArrowRight':
        go(nextId);
        break;
      case 'ArrowLeft':
        go(prevId);
        break;
      case 'PageDown':
        pageScroll(1);
        break;
      case 'PageUp':
        pageScroll(-1);
        break;
      case 'Escape':
        onHome();
        break;
      default:
        return;
    }
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

  editBtn.addEventListener('click', onEdit);
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

  window.scrollTo(0, 0);
  renderControls();
  requestWakeLock();

  return () => {
    disposed = true;
    pause();
    editBtn.removeEventListener('click', onEdit);
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
    root.classList.remove('with-bar');
    wakeLock?.release().catch(() => {});
    wakeLock = null;
  };
}
