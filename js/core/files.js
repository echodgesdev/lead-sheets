import { a } from './dom.js';

const ILLEGAL = /[\\/:*?"<>|\u0000-\u001f\u007f]+/g;
const SPACES = /\s+/g;
const TRAILING = /[.\s]+$/;
const REVOKE_MS = 1000;

export function safeFileName(text) {
  return String(text ?? '').replace(ILLEGAL, ' ').replace(SPACES, ' ').trim().replace(TRAILING, '');
}

function download(file) {
  const url = URL.createObjectURL(file);
  const link = a({ href: url, download: file.name });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_MS);
}

export async function saveFile(file, title) {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }
  download(file);
}
