// Runs before site.js: remembers the page's own words and order, so the
// editor can always go back to them.
(() => {
  const site = document.getElementById('site');
  const words = {};
  const order = {};
  site.querySelectorAll('[data-e]').forEach((el) => { words[el.dataset.e] = el.innerHTML; });
  const groups = [site, ...site.querySelectorAll('[data-c]')];
  groups.forEach((group) => {
    order[group.dataset.c] = [...group.children].filter((c) => c.dataset.e).map((c) => c.dataset.e);
  });
  window.BASE_WORDS = words;
  window.BASE_ORDER = order;
})();
