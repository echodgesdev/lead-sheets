export const OCTAVE = 12;

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function mod12(n) {
  return ((n % OCTAVE) + OCTAVE) % OCTAVE;
}
