import { createTunerControl } from './tuner.js';
import { createMetronomeControl } from './metronome.js';
import { createCircleControl } from './circle.js';
import { attachAccordion } from './rows.js';
import { rowMain } from './parts.js';
import { toolId, getOpenTools, setOpenTools } from '../data/prefs.js';
import { details, div, summary } from '../core/dom.js';
import { evt } from '../core/events.js';
import { icon, iconId } from '../core/icons.js';

const TOOLS = [
  { id: toolId.tuner, title: 'Tuner', icon: iconId.guitar, create: createTunerControl },
  { id: toolId.metronome, title: 'Metronome', icon: iconId.metronome, create: createMetronomeControl },
  { id: toolId.circle, title: 'Theory', icon: iconId.chartPie, create: createCircleControl },
];

function toolNode(tool, open) {
  const mark = icon(tool.icon);
  const head = summary('row tool-row');
  head.append(mark, rowMain(tool), icon(iconId.chevronDown));
  const node = details('tool');
  node.open = open;
  node.append(head);
  return { node, mark };
}

export function createToolsPanel() {
  const openIds = new Set(getOpenTools());
  const list = div('list');
  const parts = TOOLS.map((tool) => {
    const control = tool.create();
    const { node, mark } = toolNode(tool, openIds.has(tool.id));
    control.attachIndicator?.(mark);
    const close = attachAccordion(node, control.open);
    node.addEventListener(evt.toggle, () => {
      if (node.open) openIds.add(tool.id);
      else openIds.delete(tool.id);
      setOpenTools([...openIds]);
    });
    list.append(node);
    return { control, close };
  });
  return {
    el: list,
    dispose() {
      for (const { control, close } of parts) {
        close();
        control.dispose();
      }
    },
  };
}
