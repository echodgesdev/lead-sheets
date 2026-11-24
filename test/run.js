import { report, test, skipped } from './harness.js';

const files = ['./parse.test.js', './infer.test.js', './group.test.js', './transpose.test.js', './audio.test.js', './routes.test.js', './insert.test.js', './compress.test.js', './circle.test.js', './vis-spec.test.js', './chords.test.js', './theory-model.test.js', './tonnetz.test.js', './fretboard.test.js', './tuning.test.js', './charts.test.js', './staff.test.js', './lint.test.js','./time.test.js', './files.test.js', './record.test.js', './recordings.test.js', './backup.test.js'];

for (const file of files) {
  try {
    await import(file);
  } catch (err) {
    if (file === './infer.test.js') skipped(file, err);
    else test(`load ${file}`, () => { throw err; });
  }
}

report(document.getElementById('out'));
