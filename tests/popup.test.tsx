import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import App from '../src/popup/App';
import { isSupportedUrl } from '../src/utils/isSupportedUrl';
afterEach(() => vi.unstubAllGlobals());
function chromeMock(
  url = 'https://chatgpt.com/c/123',
  response: unknown = { running: true },
  shortcut = 'Alt+Shift+E',
) {
  const query = vi.fn().mockResolvedValue([{ id: 7, active: true, url }]);
  const sendMessage = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('chrome', {
    tabs: { query, sendMessage },
    commands: {
      getAll: vi.fn().mockResolvedValue([{ name: 'open-island', shortcut }]),
    },
  });
  return { query, sendMessage };
}
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
it('requires a responding top-frame content script before enabling open', async () => {
  const { sendMessage } = chromeMock();
  render(<App />);
  expect(await screen.findByText('ChatGPT page connected')).toBeInTheDocument();
  expect(sendMessage).toHaveBeenCalledWith(
    7,
    { type: 'FOUNDATION_PING' },
    { frameId: 0 },
  );
  expect(screen.getByRole('button', { name: 'Open island' })).toBeEnabled();
  expect(await screen.findByText('Shortcut: Alt+Shift+E')).toBeInTheDocument();
});
it('reports a stale/missing content script instead of Ready', async () => {
  const { sendMessage } = chromeMock();
  sendMessage.mockRejectedValue(Error('No receiver'));
  render(<App />);
  expect(
    await screen.findByText(/Refresh this ChatGPT tab/),
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Open island' })).toBeDisabled();
});
it('reports an unassigned shortcut', async () => {
  chromeMock(undefined, undefined, '');
  render(<App />);
  expect(await screen.findByText(/Shortcut not assigned/)).toBeInTheDocument();
});
it('opens the validated last capture through the same command pathway', async () => {
  const { sendMessage } = chromeMock();
  render(<App />);
  await screen.findByText('ChatGPT page connected');
  sendMessage.mockResolvedValue({ status: 'triggered' });
  fireEvent.click(screen.getByRole('button', { name: 'Open island' }));
  expect(await screen.findByText(/Island opened/)).toBeInTheDocument();
  expect(sendMessage).toHaveBeenLastCalledWith(
    7,
    { type: 'ISLAND_OPEN_REQUEST' },
    { frameId: 0 },
  );
});
it('reports why the selection did not open an island', async () => {
  const { sendMessage } = chromeMock();
  render(<App />);
  await screen.findByText('ChatGPT page connected');
  sendMessage.mockResolvedValue({ status: 'no-selection' });
  fireEvent.click(screen.getByRole('button', { name: 'Open island' }));
  expect(
    await screen.findByText(/Highlight text in a ChatGPT assistant response/),
  ).toBeInTheDocument();
});
it('does not probe unsupported websites', async () => {
  const { sendMessage } = chromeMock('https://example.com/');
  render(<App />);
  expect(
    await screen.findByText('Open ChatGPT to get started'),
  ).toBeInTheDocument();
  expect(sendMessage).not.toHaveBeenCalled();
});
it('shows structural diagnostics after selection rejection', async () => {
  const { sendMessage } = chromeMock();
  render(<App />);
  await screen.findByText('ChatGPT page connected');
  sendMessage
    .mockResolvedValueOnce({ status: 'no-selection' })
    .mockResolvedValueOnce({
      diagnostics: 'Last capture: outside-assistant; start: p > main',
    });
  fireEvent.click(screen.getByRole('button', { name: 'Open island' }));
  expect(
    await screen.findByText('Last capture: outside-assistant; start: p > main'),
  ).toBeInTheDocument();
  expect(sendMessage).toHaveBeenLastCalledWith(
    7,
    { type: 'SELECTION_DIAGNOSTICS' },
    { frameId: 0 },
  );
});
it('handles Chrome API failures', async () => {
  chromeMock();
  vi.mocked(chrome.tabs.query).mockRejectedValue(Error('Unavailable'));
  render(<App />);
  expect(await screen.findByText(/Unable to check/)).toBeInTheDocument();
});
