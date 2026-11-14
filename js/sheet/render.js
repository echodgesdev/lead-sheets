import { b, div, pre, span } from '../dom.js';

const NO_CHORD = '\u200B';

function withMarks(node, text) {
  for (const part of text.split(/(\*+)/)) {
    if (part) node.append(part[0] === '*' ? span('mark', part) : part);
  }
  return node;
}

function renderSegment(segment) {
  if (segment.chord === null) return [segment.text];
  const [, anchor, rest] = /^(\S*)([\s\S]*)$/.exec(segment.text);
  const seg = span('seg');
  seg.append(withMarks(b(), segment.chord), span(null, anchor || NO_CHORD));
  return rest ? [seg, rest] : [seg];
}

function renderBlock(block) {
  switch (block.type) {
    case 'section':
      return div('sec', block.name);
    case 'pair': {
      const pair = div('pair');
      pair.append(...block.segments.flatMap(renderSegment));
      return pair;
    }
    case 'chords':
      return withMarks(div('chordline'), block.line);
    case 'lyric':
      return div('lyric', block.text);
    case 'note':
      return div('note', block.text);
    case 'key':
      return div('keychange', `Key change: ${block.key}`);
    case 'tab':
      return pre('tab', block.lines.join('\n'));
    case 'blank':
      return div('gap');
    default:
      return null;
  }
}

export function renderSheet(parsed, el) {
  const nodes = parsed.blocks.map(renderBlock).filter(Boolean);
  el.replaceChildren(...nodes);
}
