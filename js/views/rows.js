import { TEXT_SIZE, getTextSize, setTextSize } from '../prefs.js';
import { create, labeledButton, cls } from '../dom.js';
import { evt } from '../events.js';

export function choiceRow(label, options, value, save) {
  const row = create('div', { class: 'modal-row' });
  const toggle = create('div', { class: 'seg-toggle' });
  const buttons = options.map((o) => [o.id, labeledButton(o.icon, o.label)]);

  function apply(id) {
    save(id);
    for (const [bid, b] of buttons) b.classList.toggle(cls.active, bid === id);
  }

  for (const [id, b] of buttons) b.addEventListener(evt.click, () => apply(id));
  toggle.append(...buttons.map(([, b]) => b));
  row.append(create('span', { class: 'modal-label' }, label), toggle);
  apply(value);
  return row;
}

export function chipsRow(label, items, shownIds, save) {
  const row = create('div', { class: 'modal-row' });
  const chips = create('div', { class: 'chips' });
  const shown = new Set(shownIds);

  for (const t of items) {
    const b = labeledButton(null, t.label, 'btn chip');
    const sync = () => {
      b.classList.toggle(cls.active, shown.has(t.id));
      b.setAttribute('aria-pressed', String(shown.has(t.id)));
    };
    b.addEventListener(evt.click, () => {
      if (shown.has(t.id)) shown.delete(t.id);
      else shown.add(t.id);
      save(items.filter((x) => shown.has(x.id)).map((x) => x.id));
      sync();
    });
    sync();
    chips.append(b);
  }

  row.append(create('span', { class: 'modal-label' }, label), chips);
  return row;
}

export function textSizeRow(onSize) {
  const r = create('div', { class: 'modal-row' });
  const slider = create('input', {
    class: 'slider',
    type: 'range',
    min: TEXT_SIZE.min,
    max: TEXT_SIZE.max,
    step: 1,
    'aria-label': 'Text size',
  });
  slider.value = getTextSize();
  const out = create('span', { class: 'slider-value' }, slider.value);
  slider.addEventListener(evt.input, () => {
    const size = Number(slider.value);
    out.textContent = slider.value;
    setTextSize(size);
    onSize?.(size);
  });
  r.append(create('span', { class: 'modal-label' }, 'Text size'), out, slider);
  return r;
}
