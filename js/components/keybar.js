import { chordChips, chordText, sectionText } from '../edit/insert.js';
import { div, labeledButton } from '../dom.js';
import { evt } from '../events.js';

const SYMBOLS = [':', '#', 'b', '/', '|', 'x2'];
const SECTIONS = ['Verse', 'Chorus', 'Bridge', 'Intro', 'Outro'];
const TAP_SLOP = 8;
const DEBOUNCE_MS = 300;

export function attachKeybar(textarea) {
  const actions = new WeakMap();
  const chords = div('kb-group kb-chords');
  const sections = div('kb-group');
  const symbols = div('kb-group');
  const bar = div({ class: 'keybar', role: 'toolbar', 'aria-label': 'Insert', hidden: '' });
  bar.append(chords, sections, symbols);
  const root = document.documentElement;
  const vv = window.visualViewport;
  const taps = new Map();
  let chipKey = '';
  let timer = 0;
  let visible = false;
  let inset = 0;

  function insert(str) {
    textarea.setRangeText(str, textarea.selectionStart, textarea.selectionEnd, 'end');
    textarea.dispatchEvent(new Event(evt.input, { bubbles: true }));
  }

  function key(text, className, run) {
    const b = labeledButton(null, text, `kb-btn ${className}`);
    b.tabIndex = -1;
    actions.set(b, run);
    return b;
  }

  sections.append(...SECTIONS.map((s) => key(s, 'kb-section', () => insert(sectionText(textarea.value, textarea.selectionStart, s)))));
  symbols.append(...SYMBOLS.map((s) => key(s, 'kb-symbol', () => insert(s))));
  document.body.append(bar);

  function renderChords() {
    const list = chordChips(textarea.value);
    const next = list.join('\n');
    if (next === chipKey) return;
    chipKey = next;
    chords.replaceChildren(...list.map((c) => key(c, 'kb-chord', () => insert(chordText(textarea.value, textarea.selectionStart, c)))));
  }

  function revealCaret() {
    const style = getComputedStyle(textarea);
    const line = parseFloat(style.lineHeight);
    const row = textarea.value.slice(0, textarea.selectionEnd).split('\n').length - 1;
    const top = parseFloat(style.paddingTop) + row * line;
    const bottom = top + line * 2 - textarea.clientHeight;
    if (textarea.scrollTop < bottom) textarea.scrollTop = bottom;
    else if (textarea.scrollTop > top) textarea.scrollTop = top;
  }

  function setInset(px) {
    inset = px;
    if (px) root.style.setProperty('--keybar-inset', `${px}px`);
    else root.style.removeProperty('--keybar-inset');
  }

  function position() {
    if (!visible) return;
    const h = bar.offsetHeight;
    let covered = h;
    if (vv) {
      const bottom = vv.offsetTop + vv.height;
      bar.style.top = '0';
      bar.style.bottom = 'auto';
      bar.style.transform = `translateY(${bottom - h}px)`;
      covered = Math.max(h, Math.round(window.innerHeight - bottom + h));
    } else {
      bar.style.top = 'auto';
      bar.style.bottom = '0';
      bar.style.transform = '';
    }
    if (covered === inset) return;
    setInset(covered);
    revealCaret();
  }

  const onFocus = () => {
    visible = true;
    bar.hidden = false;
    renderChords();
    position();
  };

  const onBlur = () => {
    visible = false;
    bar.hidden = true;
    setInset(0);
  };

  const onInput = () => {
    clearTimeout(timer);
    timer = setTimeout(renderChords, DEBOUNCE_MS);
  };

  const onDown = (e) => {
    const btn = e.target.closest('button');
    if (!actions.has(btn)) return;
    e.preventDefault();
    taps.set(e.pointerId, { btn, x: e.clientX, y: e.clientY });
  };

  const onUp = (e) => {
    const tap = taps.get(e.pointerId);
    if (!tap) return;
    taps.delete(e.pointerId);
    if (Math.hypot(e.clientX - tap.x, e.clientY - tap.y) >= TAP_SLOP) return;
    e.preventDefault();
    actions.get(tap.btn)();
  };

  const onCancel = (e) => {
    taps.delete(e.pointerId);
  };

  const onMouseDown = (e) => {
    if (actions.has(e.target.closest('button'))) e.preventDefault();
  };

  const listening = new AbortController();
  const { signal } = listening;
  textarea.addEventListener(evt.focus, onFocus, { signal });
  textarea.addEventListener(evt.blur, onBlur, { signal });
  textarea.addEventListener(evt.input, onInput, { signal });
  bar.addEventListener(evt.pointerdown, onDown);
  bar.addEventListener(evt.pointerup, onUp);
  bar.addEventListener(evt.pointercancel, onCancel);
  bar.addEventListener(evt.mousedown, onMouseDown);
  vv?.addEventListener(evt.resize, position, { signal });
  vv?.addEventListener(evt.scroll, position, { signal });
  window.addEventListener(evt.resize, position, { signal });

  if (document.activeElement === textarea) onFocus();

  return function detach() {
    clearTimeout(timer);
    listening.abort();
    bar.remove();
    setInset(0);
  };
}
