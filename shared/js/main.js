// Entry point, loaded by every theme with:
//   <script type="module" src="../shared/js/main.js"></script>
//
// Which church to show comes from <body data-church="herfelingen">.

import { detectLanguage, loadLanguage, applyTranslations } from './i18n.js';
import { initTheme, refreshThemeButtons } from './theme.js';
import { renderPage } from './render.js';

const data = await (await fetch(new URL('../data/churches.json', import.meta.url))).json();
const church = data.churches.find((c) => c.id === (document.body.dataset.church ?? 'herfelingen'));

async function setLanguage(code) {
  await loadLanguage(code);
  applyTranslations();
  renderPage(data, church);
  refreshThemeButtons();
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-set-lang]');
  if (button) setLanguage(button.dataset.setLang);
});

await setLanguage(detectLanguage());
initTheme();
document.documentElement.classList.add('is-ready');
