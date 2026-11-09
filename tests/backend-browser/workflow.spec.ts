import { test, expect, chromium } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { isChatRequest } from '../../src/shared/ai-contract';
import type { ChatRequest } from '../../src/shared/ai-contract';
const bodies: ChatRequest[] = [];
let behavior: 'success' | 'failure' | 'pending' = 'success';
let aborted = 0;
const server = createServer((req, res) => {
  const origin = req.headers.origin ?? '';
  if (!/^chrome-extension:\/\/[a-p]{32}$/.test(origin)) {
    res.writeHead(403).end();
    return;
  }
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }
  if (req.method !== 'POST' || req.url !== '/api/chat') {
    res.writeHead(404).end();
    return;
  }
  let text = '';
  req.on('data', (chunk) => {
    text += chunk;
    if (text.length > 262144) req.destroy();
  });
  req.on('end', () => {
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (!isChatRequest(body)) {
      res.writeHead(400).end();
      return;
    }
    bodies.push(body);
    res.setHeader('Content-Type', 'application/json');
    if (behavior === 'pending') {
      res.on('close', () => {
        aborted++;
      });
      return;
    }
    if (behavior === 'failure') {
      res.writeHead(503).end(JSON.stringify({ error: 'unavailable' }));
      return;
    }
    res.end(
      JSON.stringify({
        text: `Mock backend answer for ${body.messages.at(-1)!.content}`,
      }),
    );
  });
});
test.beforeAll(async () => {
  expect(JSON.parse(readFileSync('dist/build-info.json', 'utf8')).aiMode).toBe(
    'mock-backend',
  );
  // Exclusive bind must succeed before browser creation. Never reuse a developer's live backend.
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(8787, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
});
test.afterAll(async () => {
  server.closeAllConnections();
  if (server.listening)
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
});
let context: BrowserContext;
let page: Page;
let profile: string;
const fixture = `<!doctype html><html lang="en"><title>Island backend fixture</title><body><main id="original"><p data-message-author-role="user">PRIVATE ORIGINAL QUESTION</p><article data-turn="assistant"><p data-testid="selection">Dependency injection <strong>supplies objects</strong> to a class.</p><pre data-testid="new-selection">New reference code</pre><p>PRIVATE UNSELECTED ORIGINAL CONTENT</p></article><textarea aria-label="Original input"></textarea></main></body></html>`;
test.beforeEach(async () => {
  bodies.length = 0;
  behavior = 'success';
  aborted = 0;
  profile = await mkdtemp(join(tmpdir(), 'island-backend-browser-'));
  try {
    context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium',
      executablePath: process.env.ISLAND_CHROMIUM_EXECUTABLE,
      headless: true,
      args: [
        `--disable-extensions-except=${resolve('dist')}`,
        `--load-extension=${resolve('dist')}`,
      ],
    });
  } catch (error) {
    await cleanupProfile();
    throw error;
  }
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (
      url.origin === 'https://chatgpt.com' &&
      route.request().isNavigationRequest()
    )
      return route.fulfill({ contentType: 'text/html', body: fixture });
    if (url.origin === 'http://127.0.0.1:8787') return route.continue();
    return route.abort();
  });
  page = context.pages()[0] ?? (await context.newPage());
  await page.goto('https://chatgpt.com/c/mock-backend');
});
async function cleanupProfile() {
  if (
    profile &&
    resolve(profile).startsWith(
      resolve(tmpdir()) + sep + 'island-backend-browser-',
    )
  )
    await rm(profile, { recursive: true, force: true });
}
test.afterEach(async () => {
  if (context) await context.close();
  await cleanupProfile();
});
async function trigger() {
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent('serviceworker'));
  return worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const result = await chrome.tabs.sendMessage(
      tab.id!,
      { type: 'ISLAND_OPEN_REQUEST' },
      { frameId: 0 },
    );
    return result.status as string;
  });
}
async function select(id = 'selection') {
  await page.getByTestId(id).evaluate((element) => {
    const active = document.activeElement?.shadowRoot?.activeElement;
    if (active instanceof HTMLElement) active.blur();
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
  await page.waitForTimeout(120);
  expect(await trigger()).toBe('triggered');
}
async function send(question: string) {
  const input = page.getByRole('textbox', {
    name: 'Ask about the selected text',
  });
  await input.fill(question);
  await input.press('Enter');
}
test('selection → built island → real relay → mock HTTP backend, follow-up and privacy', async () => {
  const original = await page.locator('#original').innerHTML();
  await select();
  await send('Explain simply');
  await expect(
    page.getByText('Mock backend answer for Explain simply', { exact: true }),
  ).toBeVisible();
  await send('Give an example');
  await expect(
    page.getByText('Mock backend answer for Give an example', { exact: true }),
  ).toBeVisible();
  expect(bodies).toHaveLength(2);
  expect(bodies[1].messages.map((m) => m.role)).toEqual([
    'user',
    'assistant',
    'user',
  ]);
  expect(bodies[1].context.text).toBe(
    'Dependency injection supplies objects to a class.',
  );
  expect(JSON.stringify(bodies)).not.toMatch(/PRIVATE|sourceUrl|capturedAt/);
  expect(await trigger()).toBe('triggered');
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await page.getByRole('button', { name: 'Close island' }).click();
  for (let i = 0; i < 5; i++) {
    expect(await trigger()).toBe('triggered');
    await expect(page.getByRole('dialog')).toHaveCount(1);
    await page.getByRole('button', { name: 'Close island' }).click();
  }
  expect(await page.locator('#original').innerHTML()).toBe(original);
  await expect(
    page.getByRole('textbox', { name: 'Original input' }),
  ).toHaveValue('');
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
});
test('backend failure retries without duplicate question', async () => {
  await select();
  behavior = 'failure';
  await send('Retry me');
  await expect(page.getByRole('alert')).toBeVisible();
  behavior = 'success';
  await page.getByRole('button', { name: 'Retry question' }).click();
  await expect(
    page.getByText('Mock backend answer for Retry me', { exact: true }),
  ).toBeVisible();
  expect(bodies).toHaveLength(2);
  expect(bodies[1].messages).toEqual([{ role: 'user', content: 'Retry me' }]);
  await expect(page.getByText('Retry me', { exact: true })).toHaveCount(1);
});
test('close/context change abort HTTP and cannot resurrect old answers', async () => {
  await select();
  behavior = 'pending';
  await send('Pending');
  await expect.poll(() => bodies.length).toBe(1);
  await page.getByRole('button', { name: 'Close island' }).click();
  await expect.poll(() => aborted).toBe(1);
  behavior = 'success';
  await select('new-selection');
  await send('New question');
  await expect(
    page.getByText('Mock backend answer for New question', { exact: true }),
  ).toBeVisible();
  expect(bodies[1]).toEqual({
    context: { text: 'New reference code' },
    messages: [{ role: 'user', content: 'New question' }],
  });
  await expect(page.getByText('Pending', { exact: true })).toHaveCount(0);
});
