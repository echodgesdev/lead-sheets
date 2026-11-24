import { createTheoryEmbed } from './theory-embed.js';
import { b, div, pre, span } from '../core/dom.js';

const NO_CHORD = '\u200B';

function withMarks(node, text) {
  for (const part of text.split(/(\*+)/)) {
    if (part) node.append(part[0] === '*' ? span('mark', part) : part);
  }
  return node;
}

function chordAttrs(shape) {
  return shape ? { 'data-chord': shape } : null;
}

function renderSegment(segment) {
  if (segment.chord === null) return [segment.text];
  const [, anchor, rest] = /^(\S*)([\s\S]*)$/.exec(segment.text);
  const seg = span('seg');
  seg.append(withMarks(b(chordAttrs(segment.shape)), segment.chord), span(null, anchor || NO_CHORD));
  return rest ? [seg, rest] : [seg];
}

function renderChordLine(block) {
  const line = div('chordline');
  if (!block.parts) return withMarks(line, block.line);
  for (const part of block.parts) {
    if (part.chord) line.append(withMarks(span(chordAttrs(part.chord)), part.text));
    else withMarks(line, part.text);
  }
  return line;
}

function renderBlock(block, disposers, instrument) {
  switch (block.type) {
    case 'section':
      return div('sec', block.name);
    case 'pair': {
      const pair = div('pair');
      pair.append(...block.segments.flatMap(renderSegment));
      return pair;
    }
    case 'chords':
      return renderChordLine(block);
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
    case 'vis': {
      const embed = createTheoryEmbed(block.spec, instrument);
      disposers.push(embed.dispose);
      return embed.el;
    }
    default:
      return null;
  }
}

export function renderSheet(parsed, el, { instrument } = {}) {
  const disposers = [];
  const nodes = parsed.blocks.map((block) => renderBlock(block, disposers, instrument)).filter(Boolean);
  el.replaceChildren(...nodes);
  return () => disposers.forEach((dispose) => dispose());
}
