import { expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createChatGPT } from '../server/node_modules/@siwc/local/lib/index.js';

it('runs the SDK loopback flow with fresh PKCE/state/nonce, stable host ID, and rejects a mismatched callback', async () => {
  const storageDir = await mkdtemp(join(tmpdir(), 'island-oauth-test-'));
  const loopbackFetch = globalThis.fetch;
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith('http://127.0.0.1:')) return loopbackFetch(input, init);
    if (url === 'https://auth.openai.com/.well-known/openid-configuration')
      return Response.json({
        issuer: 'https://auth.openai.com',
        authorization_endpoint:
          'https://auth.openai.com/api/accounts/authorize',
        token_endpoint: 'https://auth.openai.com/api/accounts/oauth/token',
        jwks_uri: 'https://auth.openai.com/jwks',
        revocation_endpoint: 'https://auth.openai.com/revoke',
      });
    throw Error('Unexpected external request');
  });
  vi.stubGlobal('fetch', fetch);
  let receive!: (url: string) => void;
  const client = createChatGPT({
    appName: 'ChatGPT Island',
    appId: 'island-test',
    redirectPort: 0,
    sendHostId: true,
    storageDir,
    // Test-only provider; production uses Windows DPAPI.
    credentialEncryption: {
      id: 'test-only',
      isAvailable: () => true,
      encrypt: (text) => Buffer.from(text),
      decrypt: (bytes) => Buffer.from(bytes).toString(),
    },
    openBrowser: (url) => receive(url),
  });
  try {
    const firstUrl = new Promise<string>((resolve) => {
      receive = resolve;
    });
    const first = client.signIn();
    const firstSettled = first.catch(() => undefined);
    const auth = new URL(await firstUrl);
    expect(auth.origin).toBe('https://auth.openai.com');
    expect(auth.searchParams.get('client_id')).toBe('dynamic_agent_client');
    expect(auth.searchParams.get('code_challenge_method')).toBe('S256');
    expect(auth.searchParams.get('code_challenge')).toHaveLength(43);
    expect(auth.searchParams.get('scope')).toContain(
      'chatgpt.tokens.use.direct',
    );
    expect(auth.searchParams.has('code_verifier')).toBe(false);
    expect(auth.searchParams.has('id_token_hint')).toBe(false);
    const callback = new URL(auth.searchParams.get('redirect_uri')!);
    expect(callback.hostname).toBe('127.0.0.1');
    callback.search = new URLSearchParams({
      state: 'wrong-state',
      code: 'fake-code',
      client_id: 'fake-client',
    }).toString();
    expect((await loopbackFetch(callback)).status).toBe(400);
    client.cancelSignIn();
    await firstSettled;
    const secondUrl = new Promise<string>((resolve) => {
      receive = resolve;
    });
    const second = client.signIn();
    const secondSettled = second.catch(() => undefined);
    const next = new URL(await secondUrl);
    for (const field of ['state', 'nonce', 'code_challenge'])
      expect(next.searchParams.get(field)).not.toBe(
        auth.searchParams.get(field),
      );
    expect(next.searchParams.get('ext_agent_host_id')).toBe(
      auth.searchParams.get('ext_agent_host_id'),
    );
    client.cancelSignIn();
    await secondSettled;
    expect(
      fetch.mock.calls.some(([url]) => String(url).endsWith('/oauth/token')),
    ).toBe(false);
  } finally {
    client.cancelSignIn();
    vi.unstubAllGlobals();
    await rm(storageDir, { recursive: true, force: true });
  }
});
