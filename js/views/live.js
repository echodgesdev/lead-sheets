import * as store from '../data/store.js';
import * as setlists from '../data/setlists.js';
import { parse } from '../sheet/parse.js';
import { renderSheet } from '../components/sheet.js';
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
  numberStyleId,
  tagId,
  controlId,
  pedalId,
  getShownTags,
  getShownControls,
  getNumbers,
  setNumbers,
  getNumberStyle,
  getPedalMode,
  getTextSize,
  getSongOrder,
  tagValue,
} from '../data/prefs.js';
import { openSongMenu } from '../components/menu.js';
import { openSongDetails } from '../components/details.js';
import { createTunerControl } from '../components/tuner.js';
import { createMetronomeControl } from '../components/metronome.js';
import { icon, iconId } from '../core/icons.js';
import { div, h1, header, p, span, button, iconButton, cls } from '../core/dom.js';
import { stepper, keyFace } from '../components/controls.js';
import { evt, keys } from '../core/events.js';
import { routes } from '../routes.js';
import { clamp } from '../core/math.js';
import { strings } from '../strings.js';
import { mountNotFound, songTitle } from '../components/parts.js';
import { createAutoscroll, MIN_SPEED, MAX_SPEED, DEFAULT_SPEED } from '../core/autoscroll.js';
import { holdWakeLock } from '../core/wakelock.js';

const TAP_SLOP = 10;
const FORWARD_KEYS = new Set([keys.pageDown, keys.arrowDown, keys.arrowRight]);
const BACK_KEYS = new Set([keys.pageUp, keys.arrowUp, keys.arrowLeft]);

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
    if (t.id === tagId.notes) nodes.push(p('live-notes', value));
    else nodes.push(span('badge', t.prefix ? `${t.label} ${value}` : value));
  }
  strip.replaceChildren(...nodes);
}

export function mount(root, { id, preview = false, setId = null }) {
  const song = store.get(id);
  if (!song) return mountNotFound(root, strings.songNotFound);
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
  let disposed = false;
  let tap = null;
  const listening = new AbortController();

  const headerEl = header('hdr live-hdr');
  const homeBtn = iconButton(iconId.chevronLeft, 'Back to songs');
  const editBtn = iconButton(iconId.penToSquare, 'Edit song');
  editBtn.hidden = !preview;
  const capoBtn = button('', 'Reset capo', 'live-key');
  const { toggle: capoToggle, down: capoDownBtn, up: capoUpBtn } = stepper(capoBtn, 'Capo down', 'Capo up');
  const shiftBtn = button('', 'Reset transpose', 'live-key');
  const { toggle: transpose, down: downBtn, up: upBtn } = stepper(shiftBtn, 'Transpose down', 'Transpose up');
  const numbersBtn = button('', '');
  numbersBtn.disabled = !keyed;
  const detailsBtn = iconButton(iconId.circleInfo, 'Song details');
  const menuBtn = iconButton(iconId.ellipsisVertical, 'More options');
  const tuner = createTunerControl();
  const metronome = createMetronomeControl(rec.tempo);
  const lead = div('live-lead');
  lead.append(homeBtn, transpose);
  headerEl.append(lead, capoToggle, numbersBtn, tuner.button, metronome.button, detailsBtn, menuBtn, editBtn);
  const tags = div('live-tags');
  const title = h1('live-title', songTitle(rec));

  const sheet = div('sheet');
  const setSize = (px) => sheet.style.setProperty('--sheet-size', `${px}px`);
  setSize(getTextSize());

  const bar = div('bar');
  const prevBtn = iconButton(iconId.backwardStep, 'Previous song');
  const slowBtn = iconButton(iconId.minus, 'Slower');
  const playBtn = button('', 'Play or pause');
  const fastBtn = iconButton(iconId.plus, 'Faster');
  const nextBtn = iconButton(iconId.forwardStep, 'Next song');
  const speedLabel = span('live-bar-speed');
  bar.append(prevBtn, slowBtn, playBtn, fastBtn, nextBtn);

  root.replaceChildren(headerEl, tags, title, sheet, bar);

  const scroll = createAutoscroll({
    speed: Math.round(Number(rec.scrollSpeed) || DEFAULT_SPEED),
    onChange: renderControls,
    signal: listening.signal,
  });

  function shownRec() {
    return { ...rec, key: transposeKey(rec.key, fret - capo + shift), capo: fret !== capo ? String(fret) : rec.capo };
  }

  function renderContent() {
    const view = { key: rec.key, capo, capoShift: fret - capo, shift, numbers: numbers ? style.id : null };
    renderSheet(viewChords(parsed, view), sheet);
    sheet.classList.toggle(cls.roman, view.numbers === numberStyleId.roman);
    fillTags(tags, shownRec());
    capoBtn.replaceChildren(...keyFace('Capo', fret));
    capoBtn.classList.toggle(cls.active, fret !== base.capo);
    capoDownBtn.disabled = fret <= 0;
    capoUpBtn.disabled = fret >= maxFret;
    shiftBtn.replaceChildren(...keyFace('Transpose', signed(shift)));
    shiftBtn.classList.toggle(cls.active, shift !== base.shift);
    downBtn.disabled = shift <= -MAX_SHIFT;
    upBtn.disabled = shift >= MAX_SHIFT;
    numbersBtn.classList.toggle(cls.active, numbers);
    numbersBtn.setAttribute('aria-pressed', String(numbers));
  }

  function renderControls() {
    playBtn.replaceChildren(icon(scroll.playing ? iconId.pause : iconId.play), speedLabel);
    speedLabel.textContent = String(scroll.speed);
    playBtn.classList.toggle(cls.active, scroll.playing);
    bar.classList.toggle(cls.away, scroll.playing);
    bar.inert = scroll.playing;
    slowBtn.disabled = scroll.speed <= MIN_SPEED;
    fastBtn.disabled = scroll.speed >= MAX_SPEED;
  }

  function setFret(n) {
    fret = clamp(n, 0, maxFret);
    renderContent();
  }

  function setShift(n) {
    shift = clamp(n, -MAX_SHIFT, MAX_SHIFT);
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

  function toggle() {
    if (!autoscroll) return;
    if (scroll.playing) scroll.pause();
    else scroll.play();
  }

  function applyPrefs() {
    const controls = new Set(getShownControls());
    autoscroll = controls.has(controlId.autoscroll);
    style = NUMBER_STYLES.find((s) => s.id === getNumberStyle());
    pedal = getPedalMode();
    numbers = controls.has(controlId.numbers) && keyed && getNumbers();
    capoToggle.hidden = !controls.has(controlId.capo);
    transpose.hidden = !controls.has(controlId.transpose);
    numbersBtn.hidden = !controls.has(controlId.numbers);
    detailsBtn.hidden = !controls.has(controlId.details);
    tuner.button.hidden = !controls.has(controlId.tuner);
    metronome.button.hidden = !controls.has(controlId.metronome);
    numbersBtn.textContent = style.short;
    numbersBtn.title = keyed ? style.title : 'Add a Key to see numbers';
    numbersBtn.setAttribute('aria-label', numbersBtn.title);
    for (const b of [slowBtn, playBtn, fastBtn]) b.hidden = !autoscroll;
    const songNav = controls.has(controlId.songNav);
    prevBtn.hidden = !songNav;
    nextBtn.hidden = !songNav;
    bar.hidden = !autoscroll && !songNav;
    if (!autoscroll) scroll.pause();
    renderContent();
  }

  function setSpeed(n) {
    scroll.setSpeed(n);
    store.setScrollSpeed(id, scroll.speed).catch(() => {});
  }

  function go(target) {
    if (target) location.hash = set ? routes.set(set.id, target) : routes.live(target);
  }

  function turn(dir) {
    if (pedal === pedalId.song) go(dir > 0 ? nextId : prevId);
    else if (dir > 0 && scroll.atEnd()) go(nextId);
    else if (dir < 0 && scroll.atStart()) go(prevId);
    else scroll.page(dir);
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
    if (e.key === keys.space || e.key === keys.k) toggle();
    else if (e.key === keys.escape) onHome();
    else if (FORWARD_KEYS.has(e.key)) turn(1);
    else if (BACK_KEYS.has(e.key)) turn(-1);
    else return;
    e.preventDefault();
  }

  const onHome = () => { location.hash = routes.home; };
  const onEdit = () => { location.hash = routes.edit(id, location.hash); };
  const onDetails = () => {
    scroll.pause();
    openSongDetails(shownRec());
  };
  const onMenu = () => {
    scroll.pause();
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
  const onSlow = () => setSpeed(scroll.speed - 1);
  const onFast = () => setSpeed(scroll.speed + 1);

  const onCapoDown = () => setFret(fret - 1);
  const onCapoUp = () => setFret(fret + 1);
  const onCapoReset = () => setFret(base.capo);
  const onDown = () => setShift(shift - 1);
  const onUp = () => setShift(shift + 1);
  const onReset = () => setShift(base.shift);

  editBtn.addEventListener(evt.click, onEdit);
  capoDownBtn.addEventListener(evt.click, onCapoDown);
  capoUpBtn.addEventListener(evt.click, onCapoUp);
  capoBtn.addEventListener(evt.click, onCapoReset);
  downBtn.addEventListener(evt.click, onDown);
  upBtn.addEventListener(evt.click, onUp);
  shiftBtn.addEventListener(evt.click, onReset);
  numbersBtn.addEventListener(evt.click, toggleNumbers);
  detailsBtn.addEventListener(evt.click, onDetails);
  menuBtn.addEventListener(evt.click, onMenu);
  homeBtn.addEventListener(evt.click, onHome);
  prevBtn.addEventListener(evt.click, onPrev);
  nextBtn.addEventListener(evt.click, onNext);
  slowBtn.addEventListener(evt.click, onSlow);
  fastBtn.addEventListener(evt.click, onFast);
  playBtn.addEventListener(evt.click, toggle);
  sheet.addEventListener(evt.pointerdown, onPointerDown);
  sheet.addEventListener(evt.pointerup, onPointerUp);
  sheet.addEventListener(evt.pointercancel, onPointerCancel);
  window.addEventListener(evt.keydown, onKey, { signal: listening.signal });

  applyPrefs();
  window.scrollTo(0, 0);
  renderControls();
  holdWakeLock(listening.signal);

  return () => {
    disposed = true;
    tuner.dispose();
    metronome.dispose();
    listening.abort();
    root.classList.remove('with-bar', 'live-view');
  };
}
