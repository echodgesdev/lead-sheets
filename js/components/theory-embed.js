import { renderClock, renderChain, renderKeys, renderFretboard, alignId } from './theory-views.js';
import { createFifths } from './fifths.js';
import { attachPlayer, notesOf } from './theory-player.js';
import { ringId, keyTonic } from '../sheet/circle.js';
import { sequenceModel, keyAt } from '../sheet/theory-model.js';
import { GUITAR, fretLayout } from '../sheet/fretboard.js';
import { visId, visControlId } from '../sheet/vis-spec.js';
import { startNotes } from '../audio/tone.js';
import { getKeyOctaves } from '../data/prefs.js';
import { div, labeledButton } from '../core/dom.js';
import { evt, keys } from '../core/events.js';
import { iconId } from '../core/icons.js';

const PLAYABLE = '[data-notes], [data-ring]';
const DEFAULT_KEY = { index: 0, minor: false };
const VIEWS = {
  [visId.piano]: renderKeys,
  [visId.clock]: renderClock,
  [visId.intervals]: (model) => renderChain({ ...model, align: alignId.root }),
  [visId.notes]: (model) => renderChain({ ...model, align: alignId.key }),
  [visId.fifths]: fifthsView,
  [visId.fretboard]: (model, key, layout) => renderFretboard(model, layout),
};

function fifthsView(model, key) {
  const fifths = createFifths();
  fifths.render({ ...key, items: model.items, bare: false });
  fifths.tagSteps(model.run);
  fifths.block(model.allowed, model.items);
  return fifths.el;
}

function wedgePc(el, model) {
  const { ring, index } = el.dataset;
  if (ring === ringId.dim) return model.items.find((item) => item.ring === ringId.dim).pc;
  return keyTonic(Number(index), ring === ringId.inner);
}

export function createTheoryEmbed(spec) {
  const key = keyAt(spec.key) ?? DEFAULT_KEY;
  const model = sequenceModel({ ...key, steps: spec.seq, locked: true, minOctaves: getKeyOctaves() });
  const box = div('theory-embed');
  const stage = div('theory-embed-stage');
  const layout = spec.vis === visId.fretboard ? fretLayout(model, GUITAR, { position: spec.position, fingering: spec.fingering }) : null;
  stage.append(VIEWS[spec.vis](model, key, layout));
  box.append(stage);

  const voiceFor = (el) => startNotes(el.dataset.notes ? notesOf(el) : [model.noteMidiOf(wedgePc(el, model))]);
  const player = attachPlayer({ areas: [stage], stage, selector: PLAYABLE, voiceFor });

  if (spec.controls.includes(visControlId.play)) {
    const play = labeledButton(iconId.play, 'Play', 'theory-embed-play');
    const onPlay = () => player.playSteps(layout?.run ?? model.run);
    play.addEventListener(evt.click, onPlay);
    box.append(play);
  }
  if (spec.errors.length) box.append(div('theory-embed-errors', spec.errors.join(' · ')));

  const onOwnTap = (e) => e.stopPropagation();
  const onOwnKey = (e) => {
    if (e.key === keys.enter || e.key === keys.space) e.stopPropagation();
  };
  for (const name of [evt.pointerdown, evt.pointerup]) box.addEventListener(name, onOwnTap);
  box.addEventListener(evt.keydown, onOwnKey);

  const dispose = () => {
    player.end();
    player.stopRun();
  };
  return { el: box, dispose };
}
