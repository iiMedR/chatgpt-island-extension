import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChatGPTAccount } from '../src/popup/ChatGPTAccount';
afterEach(() => vi.unstubAllGlobals());
it('opens only the official authorization URL from a deliberate sign-in click', async () => {
  const create = vi.fn().mockResolvedValue({});
  vi.stubGlobal('chrome', { tabs: { create } });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) =>
      Response.json(
        input.endsWith('/auth/start')
          ? { url: 'https://auth.openai.com/api/accounts/authorize?state=test' }
          : { status: 'disconnected', sharing: false },
      ),
    ),
  );
  render(<ChatGPTAccount />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Continue with ChatGPT' }),
  );
  await screen.findByText('Waiting for ChatGPT authorization…');
  expect(create).toHaveBeenCalledExactlyOnceWith({
    url: 'https://auth.openai.com/api/accounts/authorize?state=test',
  });
});
it('rejects an unexpected authorization destination', async () => {
  const create = vi.fn();
  vi.stubGlobal('chrome', { tabs: { create } });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) =>
      Response.json(
        input.endsWith('/auth/start')
          ? { url: 'https://example.com/steal' }
          : { status: 'disconnected', sharing: false },
      ),
    ),
  );
  render(<ChatGPTAccount />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Continue with ChatGPT' }),
  );
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Could not start sign-in',
  );
  expect(create).not.toHaveBeenCalled();
});
it('shows plan usage/model discovery, and disconnects without exposing tokens', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) =>
      Response.json(
        input.endsWith('/auth/models')
          ? {
              models: [{ slug: 'allowed-model', displayName: 'Allowed model' }],
              selectedModel: 'allowed-model',
            }
          : { status: 'connected', sharing: true },
      ),
    ),
  );
  render(<ChatGPTAccount />);
  expect(await screen.findByText('Using ChatGPT plan')).toBeInTheDocument();
  expect(
    await screen.findByRole('option', { name: 'Allowed model' }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
  expect(
    await screen.findByRole('button', { name: 'Continue with ChatGPT' }),
  ).toBeInTheDocument();
});
