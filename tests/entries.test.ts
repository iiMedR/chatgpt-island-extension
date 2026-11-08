import { afterEach, expect, it, vi } from 'vitest';
afterEach(() => {
  window.dispatchEvent(new Event('pagehide'));
  vi.unstubAllGlobals();
  vi.resetModules();
});
it('registers the installation listener at worker startup', async () => {
  const addListener = vi.fn();
  vi.stubGlobal('chrome', { runtime: { onInstalled: { addListener } } });
  await import('../src/background/index');
  expect(addListener).toHaveBeenCalledOnce();
});
it('responds to the running probe without changing page content', async () => {
  const addListener = vi.fn();
  vi.stubGlobal('location', {
    origin: 'https://chatgpt.com',
    href: 'https://chatgpt.com/c/test',
  });
  vi.stubGlobal('chrome', { runtime: { onMessage: { addListener } } });
  const original = document.documentElement.outerHTML;
  await import('../src/content/index');
  const listener = addListener.mock.calls[0][0] as (
    message: unknown,
    sender: object,
    respond: (value: unknown) => void,
  ) => void;
  const respond = vi.fn();
  listener({ type: 'FOUNDATION_PING' }, {}, respond);
  expect(respond).toHaveBeenCalledWith({ running: true });
  respond.mockClear();
  listener(null, {}, respond);
  listener({ type: 'OTHER' }, {}, respond);
  expect(respond).not.toHaveBeenCalled();
  expect(document.documentElement.outerHTML).toBe(original);
});
it('does not initialize outside ChatGPT', async () => {
  const addListener = vi.fn();
  vi.stubGlobal('location', { origin: 'https://example.com' });
  vi.stubGlobal('chrome', { runtime: { onMessage: { addListener } } });
  await import('../src/content/index');
  expect(addListener).not.toHaveBeenCalled();
});
