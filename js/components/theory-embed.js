import { THEORY_VIEWS } from './theory-views.js';
import { createFifths } from './fifths.js';
import { attachPlayer, notesOf } from './theory-player.js';
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

function keyFifths(model, key) {
  const fifths = createFifths();
  fifths.render({ ...key, items: model.items, bare: false });
  fifths.block(model.allowed);
  return fifths;
}

export function createTheoryEmbed(spec) {
  const key = keyAt(spec.key) ?? DEFAULT_KEY;
  const model = sequenceModel({ ...key, steps: spec.seq, locked: true, minOctaves: getKeyOctaves() });
  const view = THEORY_VIEWS[spec.vis];
  const box = div('theory-embed');
  const stage = div('theory-embed-stage');
  const fifths = spec.vis === visId.fifths ? keyFifths(model, key) : null;
  const layout = view.neck ? fretLayout(model, GUITAR, { position: spec.position, fingering: spec.fingering, shape: spec.shape }) : null;
  stage.append(view.render(model, { fifths, layout, align: spec.align }));
  box.append(stage);

  const voiceFor = (el) => startNotes(el.dataset.notes ? notesOf(el) : [model.noteMidiOf(fifths.pcOf(el))]);
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

  return { el: box, dispose: player.dispose };
}
