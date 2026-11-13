let ctx = null;

export function audioContext() {
  ctx ??= new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  return ctx;
}
