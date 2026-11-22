import { test, eq, skipped } from './harness.js';
import { compress, decompress, toBase64Url, fromBase64Url } from '../js/core/compress.js';

const TEXT = 'Georgia On My Mind\nKey: C\n\nC   E/B  E7\nGeorgia, Georgia — café ♯\n'.repeat(20);

function supports(format) {
  try {
    new CompressionStream(format);
    return true;
  } catch {
    return false;
  }
}

test('compress round-trips text', async () => {
  for (const format of ['deflate-raw', 'gzip']) {
    if (!supports(format)) {
      skipped(`compress ${format}`, 'not supported by this runtime');
      continue;
    }
    const bytes = await compress(TEXT, format);
    eq(bytes.length < TEXT.length, true, `${format} shrinks`);
    eq(await decompress(bytes, format), TEXT, format);
  }
});

test('base64url round-trips bytes', () => {
  const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
  const code = toBase64Url(bytes);
  eq(/^[\w-]+$/.test(code), true, 'url-safe alphabet');
  eq([...fromBase64Url(code)], [...bytes]);
});
