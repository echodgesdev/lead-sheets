import { chordBox } from './theory-views.js';
import { tapAttrs } from './theory-art.js';
import { attachPlayer } from './theory-player.js';
import { openPopover } from './modal.js';
import { selectPill, stepper } from './controls.js';
import { chordChart, songChords } from '../sheet/charts.js';
import { displayName } from '../sheet/circle.js';
import { neckShapeId, NECK_SHAPES } from '../sheet/vis-spec.js';
import { div, p, span } from '../core/dom.js';
import { evt, keys } from '../core/events.js';
import { strings } from '../strings.js';

const PLAYABLE = '[data-notes]';
const ALL_SHAPES = Object.values(neckShapeId);

const songShapes = new Map();

function chartArt(chart, chord) {
  const name = displayName(chord);
  return chordBox(chart.chart, name, {
    rootPc: chart.rootPc,
    attrs: { ...tapAttrs(`Play ${name}`), 'data-notes': chart.voicing.join(',') },
  });
}

export function shapePill(value, enabled, onPick) {
  const { pill, select } = selectPill(null, 'Shape', NECK_SHAPES, value);
  for (const option of select.options) option.disabled = !enabled.includes(option.value);
  select.addEventListener(evt.change, () => onPick(select.value));
  return pill;
}

function playerFor(area) {
  const onOwnKey = (e) => {
    if (e.key === keys.enter || e.key === keys.space) e.stopPropagation();
  };
  area.addEventListener(evt.keydown, onOwnKey);
  return attachPlayer({ areas: [area], stage: area, selector: PLAYABLE });
}

export function createChordCharts({ songId, instrument }) {
  const strip = div('chord-strip');
  const stripPlayer = playerFor(strip);
  let chords = [];
  let popover = null;

  const shapeOf = () => songShapes.get(songId) ?? neckShapeId.caged;

  function renderStrip() {
    const shape = shapeOf();
    const boxes = chords
      .map((chord) => [chord, chordChart(chord, instrument, { shape })])
      .filter(([, chart]) => chart)
      .map(([chord, chart]) => chartArt(chart, chord));
    strip.replaceChildren(...(boxes.length ? [shapePill(shape, ALL_SHAPES, setShape), ...boxes] : []));
  }

  function setShape(shape) {
    songShapes.set(songId, shape);
    if (!strip.hidden) renderStrip();
  }

  function render(parsed, shown) {
    chords = songChords(parsed);
    strip.hidden = !shown;
    if (shown) renderStrip();
  }

  function open(anchor, chord) {
    const options = { shape: shapeOf(), position: 0 };
    const stage = div('modal-row chord-pop');
    const count = span('step-pill-text');
    const holder = span();
    const steps = stepper({
      pill: true,
      center: count,
      downTitle: strings.previousPosition,
      upTitle: strings.nextPosition,
      onStep: (by) => {
        options.position += by;
        renderPop();
      },
    });
    const controls = div('modal-row chord-pop-controls');
    controls.append(steps.el, holder);
    const player = playerFor(stage);

    const onPick = (shape) => {
      options.shape = shape;
      options.position = 0;
      setShape(shape);
      renderPop();
    };

    function renderPop() {
      const chart = chordChart(chord, instrument, options);
      controls.hidden = !chart;
      if (!chart) {
        stage.replaceChildren(p('chord-pop-none', `${displayName(chord)}: No chart`));
        return;
      }
      options.position = chart.position;
      count.textContent = `${chart.position + 1} / ${chart.count}`;
      stage.replaceChildren(chartArt(chart, chord));
      holder.replaceChildren(shapePill(chart.shape ?? options.shape, chart.shapes, onPick));
    }

    renderPop();
    popover?.close();
    const current = openPopover(anchor, stage, controls);
    popover = current;
    current.addEventListener(evt.close, () => {
      player.dispose();
      if (popover === current) popover = null;
    });
  }

  function dispose() {
    stripPlayer.dispose();
    popover?.close();
  }

  return { strip, render, open, dispose };
}
