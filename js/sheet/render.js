const NO_CHORD = '\u200B';

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderSegment(segment) {
  if (segment.chord === null) return [segment.text];
  const [, anchor, rest] = /^(\S*)([\s\S]*)$/.exec(segment.text);
  const seg = make('span', 'seg');
  seg.append(make('b', '', segment.chord), make('span', '', anchor || NO_CHORD));
  return rest ? [seg, rest] : [seg];
}

function renderBlock(block) {
  switch (block.type) {
    case 'section':
      return make('div', 'sec', block.name);
    case 'pair': {
      const pair = make('div', 'pair');
      pair.append(...block.segments.flatMap(renderSegment));
      return pair;
    }
    case 'chords':
      return make('div', 'chordline', block.line);
    case 'lyric':
      return make('div', 'lyric', block.text);
    case 'note':
      return make('div', 'note', block.text);
    case 'tab':
      return make('pre', 'tab', block.lines.join('\n'));
    case 'blank':
      return make('div', 'gap');
    default:
      return null;
  }
}

export function renderSheet(parsed, el) {
  const nodes = parsed.blocks.map(renderBlock).filter(Boolean);
  el.replaceChildren(...nodes);
}
