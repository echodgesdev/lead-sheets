const tests = [];
const skips = [];

export function test(name, fn) {
  tests.push({ name, fn });
}

export function eq(actual, expected, msg = '') {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${msg ? msg + ': ' : ''}expected ${b} but got ${a}`);
}

export async function fixture(name) {
  const res = await fetch(`./fixtures/${name}.txt`);
  if (!res.ok) throw new Error(`fixture ${name} not found (serve the folder over http)`);
  return res.text();
}

export function skipped(name, err) {
  skips.push(`${name}: ${err && err.message ? err.message : err}`);
}

export async function report(el) {
  let pass = 0;
  const failures = [];
  for (const t of tests) {
    try {
      await t.fn();
      pass++;
    } catch (err) {
      failures.push(`FAIL ${t.name}\n  ${err && err.message ? err.message : err}`);
    }
  }
  const lines = [`${pass} passed, ${failures.length} failed`, ...failures];
  skips.forEach((s) => lines.push(`SKIPPED ${s}`));
  el.textContent = lines.join('\n');
  el.dataset.failed = String(failures.length);
  document.title = `${failures.length ? 'FAIL' : 'PASS'} ${pass}/${pass + failures.length}`;
  return { pass, failed: failures.length };
}
