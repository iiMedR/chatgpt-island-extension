export function hostTheme(
  document: Document,
  window: Window,
): 'light' | 'dark' {
  for (const element of [document.documentElement, document.body]) {
    if (!element) continue;
    const explicit =
      element.getAttribute('data-theme') ??
      element.getAttribute('data-color-scheme');
    if (explicit === 'dark' || explicit === 'light') return explicit;
    if (element.classList.contains('dark')) return 'dark';
    if (element.classList.contains('light')) return 'light';
    const scheme = window.getComputedStyle(element).colorScheme;
    if (scheme === 'dark' || scheme === 'light') return scheme;
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}
export function observeTheme(
  host: HTMLElement,
  document: Document,
  window: Window,
): () => void {
  const update = () => {
    host.dataset.theme = hostTheme(document, window);
    host.style.setProperty('color-scheme', host.dataset.theme, 'important');
  };
  update();
  const observer = new MutationObserver(update);
  for (const element of [document.documentElement, document.body])
    if (element)
      observer.observe(element, {
        attributes: true,
        attributeFilter: ['class', 'data-theme', 'data-color-scheme', 'style'],
      });
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  media?.addEventListener('change', update);
  return () => {
    observer.disconnect();
    media?.removeEventListener('change', update);
  };
}
