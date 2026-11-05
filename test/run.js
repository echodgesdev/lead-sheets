import { report, test, skipped } from './harness.js';

const files = ['./parse.test.js', './infer.test.js', './group.test.js'];

for (const file of files) {
  try {
    await import(file);
  } catch (err) {
    if (file === './infer.test.js') skipped(file, err);
    else test(`load ${file}`, () => { throw err; });
  }
}

report(document.getElementById('out'));
