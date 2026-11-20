import { toast } from './toast.js';

export async function shareLink(title, url) {
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
