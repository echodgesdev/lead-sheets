const CHUNK = 0x8000;

function pipe(data, transform) {
  return new Response(new Blob([data]).stream().pipeThrough(transform));
}

export async function compress(text, format) {
  return new Uint8Array(await pipe(text, new CompressionStream(format)).arrayBuffer());
}

export function decompress(data, format) {
  return pipe(data, new DecompressionStream(format)).text();
}

export function toBase64Url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(code) {
  return Uint8Array.from(atob(code.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
}
