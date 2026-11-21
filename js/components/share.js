import { toast } from './toast.js';
import { songLink } from '../data/links.js';

export async function shareSong(title, text) {
  return shareLink(title, await songLink(text));
}

async function shareLink(title, url) {
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
    } catch (err) {
      if (err.name !== 'AbortError') toast('Could not share');
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toast('Link copied');
  } catch {
    toast('Could not share');
  }
}
