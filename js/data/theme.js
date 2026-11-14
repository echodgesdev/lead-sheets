import { evt } from '../core/events.js';

const KEY = 'tabs.theme';

export const themeId = Object.freeze({
  system: 'system',
  dark: 'dark',
  light: 'light',
});

const BAR_COLOR = { [themeId.dark]: '#0a1219', [themeId.light]: '#0f1923' };
const CHOICES = Object.values(themeId);
const prefersLight = window.matchMedia('(prefers-color-scheme: light)');

export function getTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    return CHOICES.includes(saved) ? saved : themeId.system;
  } catch {
    return themeId.system;
  }
}

function resolve(choice) {
  if (choice !== themeId.system) return choice;
  return prefersLight.matches ? themeId.light : themeId.dark;
}

function apply(choice) {
  const theme = resolve(choice);
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR_COLOR[theme]);
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', theme);
}

export function setTheme(choice) {
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    // not persisted in private mode
  }
  apply(choice);
}

prefersLight.addEventListener(evt.change, () => apply(getTheme()));
apply(getTheme());
