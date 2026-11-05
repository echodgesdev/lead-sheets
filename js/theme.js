const KEY = 'tabs.theme';
const BAR_COLOR = { dark: '#0a1219', light: '#0f1923' };
const CHOICES = ['system', 'dark', 'light'];
const prefersLight = window.matchMedia('(prefers-color-scheme: light)');

export function getTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    return CHOICES.includes(saved) ? saved : 'system';
  } catch {
    return 'system';
  }
}

function resolve(choice) {
  if (choice !== 'system') return choice;
  return prefersLight.matches ? 'light' : 'dark';
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

prefersLight.addEventListener('change', () => apply(getTheme()));
apply(getTheme());
