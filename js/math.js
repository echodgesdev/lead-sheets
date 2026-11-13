export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function mod12(n) {
  return ((n % 12) + 12) % 12;
}
