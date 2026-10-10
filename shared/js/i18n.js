// Tiny translation helper.
//
// In the HTML:
//   <h2 data-i18n="masses.title">Vieringen</h2>            → replaces the text
//   <button data-i18n-attr="aria-label:theme.toDark">       → replaces an attribute
// The Dutch text stays in the HTML, so the page still reads well without JavaScript.

export const LANGUAGES = ['nl', 'fr'];
const STORAGE_KEY = 'lang';

let dictionary = {};
export let lang = 'nl';

/** Language from ?lang=fr, then the visitor's earlier choice, then the browser setting. */
export function detectLanguage() {
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (LANGUAGES.includes(fromUrl)) return fromUrl;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (LANGUAGES.includes(stored)) return stored;
  } catch { /* storage can be blocked, that's fine */ }
  return navigator.languages?.some((l) => l.startsWith('fr')) ? 'fr' : 'nl';
}

export async function loadLanguage(code) {
  const response = await fetch(new URL(`../i18n/${code}.json`, import.meta.url));
  dictionary = await response.json();
  lang = code;
  document.documentElement.lang = code;
  try { localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
}

/** t('masses.every', { weekday: 'zondag' }) → "Elke zondag" */
export function t(key, vars = {}) {
  const text = dictionary[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
}

/** Pick the right language from a data value: either a plain string or { nl: …, fr: … }. */
export function pick(value) {
  return typeof value === 'object' && value !== null ? value[lang] ?? value.nl : value;
}

/** Locale for Intl formatting: Belgian Dutch or Belgian French. */
export const locale = () => `${lang}-BE`;

export function applyTranslations(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-attr]')) {
    for (const pair of el.dataset.i18nAttr.split(',')) {
      const [attr, key] = pair.split(':');
      el.setAttribute(attr.trim(), t(key.trim()));
    }
  }
  document.title = t('meta.title');
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.description'));
  for (const button of document.querySelectorAll('[data-set-lang]')) {
    button.setAttribute('aria-pressed', String(button.dataset.setLang === lang));
  }
}
