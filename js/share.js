import { toast } from './toast.js';

export async function shareText(title, text) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
    } catch (err) {
      if (err.name !== 'AbortError') toast('Could not share');
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied');
  } catch {
    toast('Could not share');
  }
}
