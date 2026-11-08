import { render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import App from '../src/popup/App';
import { isSupportedUrl } from '../src/utils/isSupportedUrl';
afterEach(() => vi.unstubAllGlobals());
it.each([
  undefined,
  '',
  'bad',
  'http://chatgpt.com/',
  'https://chatgpt.com.evil.com/',
  'https://example.com/',
])('rejects unsupported URL %s', (url) =>
  expect(isSupportedUrl(url)).toBe(false),
);
it('accepts exact HTTPS origin', () =>
  expect(isSupportedUrl('https://chatgpt.com/c/123')).toBe(true));
it.each([
  ['https://chatgpt.com/c/123', 'Ready'],
  ['https://example.com/', 'Open ChatGPT to get started'],
  [undefined, 'Open ChatGPT to get started'],
])('renders status for %s', async (url, label) => {
  const query = vi.fn().mockResolvedValue([{ url }]);
  vi.stubGlobal('chrome', { tabs: { query } });
  render(<App />);
  expect(
    screen.getByRole('heading', { name: 'ChatGPT Island' }),
  ).toBeInTheDocument();
  expect(await screen.findByText(label!)).toBeInTheDocument();
  expect(query).toHaveBeenCalledWith({ active: true, currentWindow: true });
});
it('handles Chrome API failures', async () => {
  vi.stubGlobal('chrome', {
    tabs: { query: vi.fn().mockRejectedValue(new Error('Unavailable')) },
  });
  render(<App />);
  expect(await screen.findByText(/Unable to check/)).toBeInTheDocument();
});
