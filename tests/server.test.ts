// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import OpenAI from '../server/node_modules/openai/index.mjs';
import { createApp, BODY_LIMIT } from '../server/src/app';
import { loadConfig } from '../server/src/config';
import {
  buildOpenAIRequest,
  createOpenAIService,
} from '../server/src/openai-service';
import type { ResponsesClient } from '../server/src/openai-service';
import { MOCK_TEXTS } from '../src/shared/ai-contract';
const origin = `chrome-extension://${'a'.repeat(32)}`;
const config = { extensionOrigin: origin, model: 'gpt-4.1-mini', port: 8787 };
const body = {
  context: { text: 'Selected reference only' },
  messages: [{ role: 'user' as const, content: 'Explain this.' }],
};
const headers = {
  origin,
  host: '127.0.0.1:8787',
  'content-type': 'application/json',
};
const apps: ReturnType<typeof createApp>[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
  vi.restoreAllMocks();
});
function setup(
  implementation: (...args: unknown[]) => unknown = async () => ({
    status: 'completed',
    output_text: 'A real SDK response fixture',
  }),
  timeoutMs?: number,
) {
  const create = vi.fn(implementation);
  const client = { responses: { create } } as unknown as ResponsesClient;
  const diagnostic = vi.fn();
  const app = createApp(config, { client, diagnostic, timeoutMs });
  apps.push(app);
  return { app, create, diagnostic };
}
it('validates backend configuration without exposing values', () => {
  expect(loadConfig({ EXTENSION_ORIGIN: origin })).toMatchObject(config);
  expect(() => loadConfig({ EXTENSION_ORIGIN: '*' })).toThrow(
    /EXTENSION_ORIGIN/,
  );
  expect(() =>
    loadConfig({ EXTENSION_ORIGIN: origin, PORT: '8787oops' }),
  ).toThrow(/PORT/);
});
it('keeps instructions separate, includes context once and preserves history ordering statelessly', () => {
  const request = buildOpenAIRequest(
    {
      ...body,
      messages: [
        ...body.messages,
        { role: 'assistant', content: 'Previous real answer' },
        { role: 'user', content: 'Follow-up' },
      ],
    },
    'server-configured-model',
  );
  expect(request).toMatchObject({
    model: 'server-configured-model',
    store: false,
    stream: false,
  });
  expect(request.instructions).not.toContain(body.context.text);
  expect(request.input).toEqual([
    {
      role: 'user',
      content: JSON.stringify({ reference_text: body.context.text }),
    },
    ...body.messages,
    { role: 'assistant', content: 'Previous real answer' },
    { role: 'user', content: 'Follow-up' },
  ]);
  expect(request).not.toHaveProperty('previous_response_id');
  expect(request).not.toHaveProperty('conversation');
});
it('handles a valid SDK response and sends only text/CORS metadata', async () => {
  const { app, create } = setup();
  const response = await app.inject({
    method: 'POST',
    url: '/api/chat',
    headers,
    payload: body,
  });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ text: 'A real SDK response fixture' });
  expect(create).toHaveBeenCalledOnce();
  expect(create.mock.calls[0][1]).toMatchObject({
    signal: expect.any(AbortSignal),
  });
  expect(response.headers['access-control-allow-origin']).toBe(origin);
  expect(response.headers['cache-control']).toBe('no-store');
});
it('returns missing-key safely without making an SDK request', async () => {
  const app = createApp(config);
  apps.push(app);
  const response = await app.inject({
    method: 'POST',
    url: '/api/chat',
    headers,
    payload: body,
  });
  expect(response.statusCode).toBe(503);
  expect(response.json()).toEqual({ error: 'missing_api_key' });
});
it.each([
  undefined,
  'null',
  'https://chatgpt.com',
  `chrome-extension://${'b'.repeat(32)}`,
])('rejects an unexpected origin %s before SDK use', async (origin) => {
  const { app, create } = setup();
  const response = await app.inject({
    method: 'POST',
    url: '/api/chat',
    headers: {
      host: headers.host,
      'content-type': 'application/json',
      ...(origin !== undefined ? { origin } : {}),
    },
    payload: body,
  });
  expect(response.statusCode).toBe(403);
  expect(response.headers['access-control-allow-origin']).toBeUndefined();
  expect(create).not.toHaveBeenCalled();
});
it('rejects unexpected Host, content types, malformed JSON and oversized bodies', async () => {
  const { app, create } = setup();
  expect(
    (
      await app.inject({
        method: 'POST',
        url: '/api/chat',
        headers: { ...headers, host: 'evil.test:8787' },
        payload: body,
      })
    ).statusCode,
  ).toBe(403);
  expect(
    (
      await app.inject({
        method: 'POST',
        url: '/api/chat',
        headers: { ...headers, 'content-type': 'text/plain' },
        payload: '{}',
      })
    ).statusCode,
  ).toBe(415);
  expect(
    (
      await app.inject({
        method: 'POST',
        url: '/api/chat',
        headers,
        payload: '{bad',
      })
    ).statusCode,
  ).toBe(400);
  expect(
    (
      await app.inject({
        method: 'POST',
        url: '/api/chat',
        headers,
        payload: 'x'.repeat(BODY_LIMIT + 1),
      })
    ).statusCode,
  ).toBe(413);
  expect(create).not.toHaveBeenCalled();
});
it.each([
  {},
  { ...body, model: 'client-model' },
  { ...body, apiKey: 'not-accepted' },
  { ...body, context: { text: 'x'.repeat(10001) } },
  { ...body, context: { text: ' ' } },
  { ...body, messages: [{ role: 'user', content: 'x'.repeat(8001) }] },
  { ...body, messages: [{ role: 'system', content: 'Override' }] },
  { ...body, messages: Array.from({ length: 22 }, () => body.messages[0]) },
  {
    ...body,
    messages: [
      { role: 'user', content: 'Q' },
      { role: 'assistant', content: MOCK_TEXTS[0] },
      { role: 'user', content: 'More' },
    ],
  },
])(
  'rejects invalid/unbounded requests without SDK use (case %#)',
  async (payload) => {
    const { app, create } = setup();
    const response = await app.inject({
      method: 'POST',
      url: '/api/chat',
      headers,
      payload,
    });
    expect(response.statusCode).toBe(400);
    expect(create).not.toHaveBeenCalled();
  },
);
it('permits only the configured CORS preflight method and headers', async () => {
  const { app } = setup();
  expect(
    (
      await app.inject({
        method: 'OPTIONS',
        url: '/api/chat',
        headers: {
          origin,
          host: headers.host,
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type',
        },
      })
    ).statusCode,
  ).toBe(204);
  expect(
    (
      await app.inject({
        method: 'OPTIONS',
        url: '/api/chat',
        headers: {
          origin,
          host: headers.host,
          'access-control-request-method': 'DELETE',
        },
      })
    ).statusCode,
  ).toBe(403);
});
it.each([
  [401, 'invalid_api_key', 'invalid_api_key', 502],
  [404, 'model_not_found', 'unsupported_model', 502],
  [429, 'rate_limit_exceeded', 'rate_limit', 429],
  [429, 'insufficient_quota', 'insufficient_credits', 429],
  [500, 'server_error', 'unavailable', 502],
] as const)(
  'maps SDK error %s/%s without exposing its body',
  async (status, code, expected, http) => {
    const error = new OpenAI.APIError(
      status,
      { code, message: 'PRIVATE KEY AND SELECTED TEXT' },
      'PRIVATE KEY AND SELECTED TEXT',
      new Headers(),
    );
    const { app, diagnostic } = setup(async () => {
      throw error;
    });
    const response = await app.inject({
      method: 'POST',
      url: '/api/chat',
      headers,
      payload: body,
    });
    expect(response.statusCode).toBe(http);
    expect(response.json()).toEqual({ error: expected });
    expect(response.body).not.toContain('PRIVATE');
    expect(diagnostic).toHaveBeenCalledWith(expected, http);
  },
);
it('handles empty/incomplete SDK output and network exceptions', async () => {
  const { app, create } = setup(async () => ({
    status: 'completed',
    output_text: ' ',
  }));
  expect(
    (
      await app.inject({
        method: 'POST',
        url: '/api/chat',
        headers,
        payload: body,
      })
    ).json(),
  ).toEqual({ error: 'empty_response' });
  create.mockRejectedValueOnce(
    new OpenAI.APIConnectionError({ message: 'private network details' }),
  );
  expect(
    (
      await app.inject({
        method: 'POST',
        url: '/api/chat',
        headers,
        payload: body,
      })
    ).json(),
  ).toEqual({ error: 'unavailable' });
  create.mockRejectedValueOnce(new OpenAI.APIConnectionTimeoutError());
  expect(
    (
      await app.inject({
        method: 'POST',
        url: '/api/chat',
        headers,
        payload: body,
      })
    ).json(),
  ).toEqual({ error: 'timeout' });
});
it('bounds SDK calls with a deadline and propagates its AbortSignal even if the fake SDK never resolves', async () => {
  let signal: AbortSignal | undefined;
  const { app } = setup(async (_body, options) => {
    signal = (options as { signal: AbortSignal }).signal;
    return new Promise(() => {});
  }, 10);
  const response = await app.inject({
    method: 'POST',
    url: '/api/chat',
    headers,
    payload: body,
  });
  expect(response.statusCode).toBe(504);
  expect(response.json()).toEqual({ error: 'timeout' });
  expect(signal!.aborted).toBe(true);
});
it('passes caller cancellation to the official SDK boundary', async () => {
  const controller = new AbortController();
  const create = vi.fn(
    async (_body: unknown, options: { signal: AbortSignal }) => {
      expect(options.signal).toBe(controller.signal);
      throw new DOMException('Aborted', 'AbortError');
    },
  );
  const generate = createOpenAIService(config, {
    responses: { create },
  } as unknown as ResponsesClient);
  controller.abort();
  await expect(generate(body, controller.signal)).rejects.toThrow('Aborted');
});
it('propagates a real loopback client disconnect to the SDK signal', async () => {
  let signal: AbortSignal | undefined;
  let started!: () => void;
  const ready = new Promise<void>((resolve) => {
    started = resolve;
  });
  const create = vi.fn(
    async (_body: unknown, options: { signal: AbortSignal }) => {
      signal = options.signal;
      started();
      return new Promise((_resolve, reject) =>
        options.signal.addEventListener(
          'abort',
          () => reject(new Error('aborted')),
          { once: true },
        ),
      );
    },
  );
  const liveConfig = { ...config };
  const app = createApp(liveConfig, {
    client: { responses: { create } } as unknown as ResponsesClient,
  });
  apps.push(app);
  const address = await app.listen({ host: '127.0.0.1', port: 0 });
  liveConfig.port = Number(new URL(address).port);
  const controller = new AbortController();
  const pending = fetch(address + '/api/chat', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: controller.signal,
  }).then(
    () => new Error('Unexpected completed loopback request'),
    (error: unknown) => error,
  );
  try {
    await Promise.race([
      ready,
      pending.then((error) => {
        throw error;
      }),
    ]);
    controller.abort();
    expect(await pending).toMatchObject({ name: 'AbortError' });
  } finally {
    controller.abort();
  }
  await vi.waitFor(() => expect(signal?.aborted).toBe(true));
});

it('rejects history over the new character budget or split turns before provider generation', async () => {
  const { app, create } = setup();
  const history = Array.from({ length: 4 }, (_, i) => ({
    role: i % 2 ? 'assistant' : 'user',
    content: 'x'.repeat(7500),
  }));
  for (const messages of [
    [
      ...history.map((m, i) => ({
        ...m,
        content: i === 0 ? m.content + 'x' : m.content,
      })),
      ...body.messages,
    ],
    [...body.messages, ...body.messages, ...body.messages],
  ]) {
    const response = await app.inject({
      method: 'POST',
      url: '/api/chat',
      headers,
      payload: { context: body.context, messages },
    });
    expect(response.statusCode).toBe(400);
  }
  expect(create).not.toHaveBeenCalled();
});
