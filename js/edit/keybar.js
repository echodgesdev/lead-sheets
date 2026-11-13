import { chordsIn, diatonic } from '../sheet/chords.js';
import { parse } from '../sheet/parse.js';

const SYMBOLS = [':', '#', 'b', '/', '|', 'x2'];
const SECTIONS = ['Verse', 'Chorus', 'Bridge', 'Intro', 'Outro'];
const TAP_SLOP = 8;
const DEBOUNCE_MS = 300;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function makeButton(kind, label, value) {
  const b = el('button', 'kb-btn kb-' + kind, label);
  b.type = 'button';
  b.tabIndex = -1;
  b.dataset.kind = kind;
  b.dataset.value = value;
  return b;
}

function headerKey(text) {
  const head = text.replace(/^\s+/, '').split(/\n[ \t]*\r?\n/)[0];
  return parse(head).meta.key || '';
}

function chipList(text) {
  const used = chordsIn(text);
  const shown = new Set(used);
  const extra = diatonic(headerKey(text)).filter((c) => !shown.has(c));
  return used.concat(extra);
}

function inBrackets(before) {
  const lineStart = before.lastIndexOf('\n') + 1;
  const line = before.slice(lineStart);
  return line.lastIndexOf('[') > line.lastIndexOf(']');
}

function nextVerseNumber(text) {
  let max = 0;
  const re = /^[ \t]*(?:\[|#+\s*)?verse\s+(\d+)/gim;
  let m = re.exec(text);
  while (m) {
    max = Math.max(max, Number(m[1]));
    m = re.exec(text);
  }
  return max + 1;
}

function insert(textarea, str) {
  textarea.setRangeText(str, textarea.selectionStart, textarea.selectionEnd, 'end');
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

function insertChord(textarea, chord) {
  const start = textarea.selectionStart;
  const before = textarea.value.slice(0, start);
  const prev = before.slice(-1);
  const bare = !prev || /\s/.test(prev) || prev === '[' || inBrackets(before);
  insert(textarea, bare ? chord : ' ' + chord);
}

function insertSection(textarea, word) {
  const start = textarea.selectionStart;
  const prev = textarea.value.charAt(start - 1);
  const name = word === 'Verse' ? 'Verse ' + nextVerseNumber(textarea.value) : word;
  const lead = !prev || prev === '\n' ? '' : '\n';
  insert(textarea, lead + name + ':\n');
}

function act(textarea, kind, value) {
  if (kind === 'chord') insertChord(textarea, value);
  else if (kind === 'section') insertSection(textarea, value);
  else insert(textarea, value);
}

export function attachKeybar(textarea) {
  const bar = el('div', 'keybar');
  bar.hidden = true;
  let chipKey = '';
  let chipNodes = [];
  let timer = 0;
  let visible = false;
  let inset = 0;
  const root = document.documentElement;
  const vv = window.visualViewport;

  SYMBOLS.forEach((s) => bar.appendChild(makeButton('symbol', s, s)));
  SECTIONS.forEach((s) => bar.appendChild(makeButton('section', s, s)));
  document.body.appendChild(bar);

  function rebuildChips(force) {
    const list = chipList(textarea.value);
    const key = list.join('\n');
    if (!force && key === chipKey) return;
    chipKey = key;
    chipNodes.forEach((n) => n.remove());
    chipNodes = list.map((c) => makeButton('chord', c, c));
    chipNodes.forEach((n) => bar.appendChild(n));
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
    if (px) root.style.setProperty('--keybar-inset', px + 'px');
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
      bar.style.transform = 'translateY(' + (bottom - h) + 'px)';
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

  function show() {
    visible = true;
    bar.hidden = false;
    rebuildChips(false);
    position();
  }

  function hide() {
    visible = false;
    bar.hidden = true;
    setInset(0);
  }

  function onInput() {
    clearTimeout(timer);
    timer = setTimeout(() => rebuildChips(false), DEBOUNCE_MS);
  }

  const taps = new Map();

  function onDown(e) {
    const btn = e.target.closest('.kb-btn');
    if (!btn) return;
    e.preventDefault();
    taps.set(e.pointerId, { btn, x: e.clientX, y: e.clientY });
  }

  function onUp(e) {
    const tap = taps.get(e.pointerId);
    if (!tap) return;
    taps.delete(e.pointerId);
    const moved = Math.hypot(e.clientX - tap.x, e.clientY - tap.y);
    if (moved >= TAP_SLOP) return;
    e.preventDefault();
    act(textarea, tap.btn.dataset.kind, tap.btn.dataset.value);
  }

  function onCancel(e) {
    taps.delete(e.pointerId);
  }

  function noFocus(e) {
    if (e.target.closest('.kb-btn')) e.preventDefault();
  }

  textarea.addEventListener('focus', show);
  textarea.addEventListener('blur', hide);
  textarea.addEventListener('input', onInput);
  bar.addEventListener('pointerdown', onDown);
  bar.addEventListener('pointerup', onUp);
  bar.addEventListener('pointercancel', onCancel);
  bar.addEventListener('mousedown', noFocus);
  if (vv) {
    vv.addEventListener('resize', position);
    vv.addEventListener('scroll', position);
  }
  window.addEventListener('resize', position);

  if (document.activeElement === textarea) show();

  return function detach() {
    clearTimeout(timer);
    textarea.removeEventListener('focus', show);
    textarea.removeEventListener('blur', hide);
    textarea.removeEventListener('input', onInput);
    if (vv) {
      vv.removeEventListener('resize', position);
      vv.removeEventListener('scroll', position);
    }
    window.removeEventListener('resize', position);
    bar.remove();
    setInset(0);
  };
}
