// tdarius.dev – colour theme toggle, shared by index.html and 404.html.
// Follows the OS preference until the visitor picks a theme; the choice is
// remembered in this browser only. Loaded without "defer" so a stored choice is
// applied before the first paint; only the button is wired up after parsing.
(() => {
  'use strict';

  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  const stored = (() => { try { return localStorage.getItem('theme'); } catch { return null; } })();
  if (stored === 'light' || stored === 'dark') root.dataset.theme = stored;

  const isDark = () => root.dataset.theme === 'dark' || (!root.dataset.theme && prefersDark.matches);

  function setupThemeToggle() {
    const button = document.querySelector('.theme-toggle');
    if (!button) return;
    const render = () => {
      const dark = isDark();
      button.textContent = dark ? '\u2600' : '\u263E'; // sun to switch to light, moon to switch to dark
      button.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      button.title = button.getAttribute('aria-label');
    };
    button.addEventListener('click', () => {
      const next = isDark() ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch { /* private mode etc. */ }
      render();
    });
    // old Safari has no addEventListener on MediaQueryList
    if (typeof prefersDark.addEventListener === 'function') prefersDark.addEventListener('change', render);
    render();
  }

  document.addEventListener('DOMContentLoaded', setupThemeToggle);
})();
