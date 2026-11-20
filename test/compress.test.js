import { test, eq } from './harness.js';
import { compress, decompress, toBase64Url, fromBase64Url } from '../js/core/compress.js';

const TEXT = 'Georgia On My Mind\nKey: C\n\nC   E/B  E7\nGeorgia, Georgia — café ♯\n'.repeat(20);

test('compress round-trips text', async () => {
  for (const format of ['deflate-raw', 'gzip']) {
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
