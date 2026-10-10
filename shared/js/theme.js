// Light/dark mode. By default we follow the operating system setting;
// the toggle button stores an explicit choice.
// A tiny inline script in each page's <head> applies the stored choice
// before the page paints, so there is no white flash in dark mode.

import { t } from './i18n.js';

const STORAGE_KEY = 'theme';
const prefersDark = matchMedia('(prefers-color-scheme: dark)');

const current = () =>
  document.documentElement.dataset.theme ?? (prefersDark.matches ? 'dark' : 'light');

function updateButtons() {
  const isDark = current() === 'dark';
  for (const button of document.querySelectorAll('[data-action="toggle-theme"]')) {
    button.setAttribute('aria-pressed', String(isDark));
    button.setAttribute('aria-label', t(isDark ? 'theme.toLight' : 'theme.toDark'));
    button.title = button.getAttribute('aria-label');
  }
}

export function initTheme() {
  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-action="toggle-theme"]')) return;
    const next = current() === 'dark' ? 'light' : 'dark';
    const apply = () => {
      document.documentElement.dataset.theme = next;
      updateButtons();
    };
    // Smooth cross-fade where the browser supports View Transitions.
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.startViewTransition(apply);
    } else {
      apply();
    }
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  });
  prefersDark.addEventListener('change', updateButtons);
  updateButtons();
}

export { updateButtons as refreshThemeButtons };
