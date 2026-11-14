import { test, eq } from './harness.js';
import { diatonic } from '../js/sheet/chords.js';
import { chordChips, chordText, sectionText } from '../js/edit/insert.js';

test('chordChips lists used chords, then the rest of the key', () => {
  const chips = chordChips('Song\nkey: G\n\n[G]Hello [D]world');
  eq(chips.slice(0, 2), ['G', 'D']);
  eq(chips.slice(2), diatonic('G').filter((c) => c !== 'G' && c !== 'D'));
  eq(chordChips(''), []);
});

test('chordText spaces a chord away from the previous word', () => {
  eq(chordText('', 0, 'G'), 'G');
  eq(chordText('Am ', 3, 'G'), 'G');
  eq(chordText('Am', 2, 'G'), ' G');
  eq(chordText('[', 1, 'G'), 'G');
  eq(chordText('[G', 2, '7'), '7');
  eq(chordText('[G] Hi', 6, 'C'), ' C');
});

test('sectionText starts a new line and numbers verses', () => {
  eq(sectionText('', 0, 'Chorus'), 'Chorus:\n');
  eq(sectionText('la', 2, 'Chorus'), '\nChorus:\n');
  eq(sectionText('x\n', 2, 'Bridge'), 'Bridge:\n');
  eq(sectionText('Verse 1:\nla\n', 12, 'Verse'), 'Verse 2:\n');
  eq(sectionText('[Verse 3]\n## verse 4\n', 21, 'Verse'), 'Verse 5:\n');
});
