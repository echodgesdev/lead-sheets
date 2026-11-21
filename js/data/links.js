import * as store from './store.js';
import { compress, decompress, toBase64Url, fromBase64Url } from '../core/compress.js';
import { routes } from '../routes.js';

const DEFLATE = 'deflate-raw';

export async function songLink(text) {
  const code = toBase64Url(await compress(text, DEFLATE));
  return new URL(routes.shared(code), location.href).href;
}

export async function receiveSong(code) {
  const text = await decompress(fromBase64Url(code), DEFLATE);
  return store.all().find((rec) => rec.text === text) ?? store.save(null, text);
}
