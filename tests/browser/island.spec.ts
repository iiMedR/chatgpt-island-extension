import { test, expect, chromium } from '@playwright/test';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, sep } from 'node:path';
import { readFileSync } from 'node:fs';
test.beforeAll(() => {
  const info = JSON.parse(readFileSync('dist/build-info.json', 'utf8')) as {
    aiMode: string;
  };
  expect(
    info.aiMode,
    'Browser tests require an offline build; never use real API billing here.',
  ).toBe('mock');
});

const fixture = `<!doctype html><html class="light"><head><title>ChatGPT Island — local conversation fixture</title><link rel="icon" href="data:,"><style>
body{margin:0;background:#fafafa;color:#222;font:15px/1.7 system-ui}main{max-width:620px;margin:80px 32px;padding:24px}h1{font-size:22px}p{margin:24px 0}textarea{padding:12px;border:1px solid #ddd;width:90%;font:inherit}button{font-size:36px}html.dark body{background:#171717;color:#eee}
</style></head><body><main id="original"><h1>Local conversation fixture</h1><div data-message-author-role="user"><p>What does RAG do?</p></div><div data-message-author-role="assistant"><p data-testid="excerpt">In short, RAG grounds the model’s responses in real, relevant information.</p><p data-testid="other">Retrieval supplies context before an answer is generated.</p></div><textarea aria-label="Original composer" placeholder="Original conversation input"></textarea></main></body></html>`;

for (const size of [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 700 },
  { width: 480, height: 640 },
  { width: 360, height: 640 },
]) {
  test(`built extension floating UI at ${size.width}×${size.height}`, async () => {
    const profile = await mkdtemp(join(tmpdir(), 'island-browser-'));
    if (
      !resolve(profile).startsWith(resolve(tmpdir()) + sep + 'island-browser-')
    )
      throw new Error('Unexpected browser profile path');
    const extension = resolve('dist');
    const context = await chromium
      .launchPersistentContext(profile, {
        channel: 'chromium',
        executablePath: process.env.ISLAND_CHROMIUM_EXECUTABLE,
        headless: true,
        viewport: size,
        args: [
          `--disable-extensions-except=${extension}`,
          `--load-extension=${extension}`,
        ],
      })
      .catch(async (error: unknown) => {
        await rm(profile, { recursive: true, force: true });
        throw error;
      });
    try {
      const unexpectedNetwork: string[] = [];
      await context.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        if (
          url.origin === 'https://chatgpt.com' &&
          route.request().isNavigationRequest()
        ) {
          await route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: fixture,
          });
        } else if (url.protocol === 'http:' || url.protocol === 'https:') {
          unexpectedNetwork.push(url.origin);
          await route.abort();
        } else await route.continue();
      });
      const worker =
        context.serviceWorkers()[0] ??
        (await context.waitForEvent('serviceworker'));
      const page = context.pages()[0] ?? (await context.newPage());
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning')
          errors.push(message.text());
      });
      await page.goto('https://chatgpt.com/c/island-fixture');
      await expect(page).toHaveTitle(
        'ChatGPT Island — local conversation fixture',
      );
      const original = await page.locator('#original').innerHTML();
      const assignments = await worker.evaluate(() => chrome.commands.getAll());
      expect(
        assignments.find((command) => command.name === 'open-island')?.shortcut,
      ).toBeTruthy();
      const trigger = () =>
        worker.evaluate(async () => {
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
      expect(await trigger()).toBe('no-selection');
      async function select(testId: string) {
        await page.getByTestId(testId).evaluate((element) => {
          const focused =
            document.activeElement?.shadowRoot?.activeElement ??
            document.activeElement;
          if (focused instanceof HTMLElement) focused.blur();
          const range = document.createRange();
          range.selectNodeContents(element);
          const selection = window.getSelection()!;
          selection.removeAllRanges();
          selection.addRange(range);
          document.dispatchEvent(new Event('mouseup'));
        });
      }
      await select('excerpt');
      // Exercise the real worker/content channel. Native OS shortcut delivery is a manual check.
      await expect.poll(trigger).toBe('triggered');
      const dialog = page.getByRole('dialog', { name: 'ChatGPT Island' });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText('Selected context')).toBeVisible();
      const input = dialog.getByRole('textbox');
      await expect(input).toBeFocused();
      await expect(
        dialog.getByRole('button', { name: 'Send question' }),
      ).toBeDisabled();
      await input.fill('Explain this part.');
      await input.press('Shift+Enter');
      await input.press('x');
      await expect(input).toHaveValue('Explain this part.\nx');
      await input.press('Enter');
      await expect(dialog.getByText('Development placeholder')).toBeVisible();
      await expect(
        dialog.getByText(/AI integration is not connected yet/),
      ).toBeVisible();
      await input.fill('How does retrieval help?');
      await input.press('Enter');
      await expect(dialog.getByText('Development placeholder')).toHaveCount(2);
      await expect(dialog.getByText('How does retrieval help?')).toBeVisible();
      await input.fill('Retained draft');
      expect(await trigger()).toBe('triggered');
      await expect(input).toHaveValue('Retained draft');
      expect(await page.locator('[data-chatgpt-island-root]').count()).toBe(1);
      const before = await dialog.boundingBox();
      expect(before).not.toBeNull();
      const header = dialog.getByLabel('Move ChatGPT Island with arrow keys');
      const headerBox = (await header.boundingBox())!;
      await page.mouse.move(headerBox.x + 60, headerBox.y + 22);
      await page.mouse.down();
      await page.mouse.move(0, 0, { steps: 5 });
      await page.mouse.up();
      const dragged = (await dialog.boundingBox())!;
      expect(dragged.x).toBeGreaterThanOrEqual(0);
      expect(dragged.y).toBeGreaterThanOrEqual(0);
      const handle = dialog.getByRole('button', {
        name: 'Resize island with arrow keys or drag',
      });
      const handleBox = (await handle.boundingBox())!;
      await page.mouse.move(handleBox.x + 8, handleBox.y + 8);
      await page.mouse.down();
      await page.mouse.move(35, 35, { steps: 5 });
      await page.mouse.up();
      const resized = (await dialog.boundingBox())!;
      expect(resized.width).toBeGreaterThanOrEqual(
        Math.min(340, size.width - 24),
      );
      expect(resized.height).toBeGreaterThanOrEqual(300);
      await dialog.getByRole('button', { name: 'Expand island' }).click();
      const expanded = (await dialog.boundingBox())!;
      expect(expanded.x + expanded.width).toBeLessThanOrEqual(size.width);
      await dialog.getByRole('button', { name: 'Restore island' }).click();
      expect(await dialog.boundingBox()).toEqual(resized);
      await select('other');
      // Allow the known selection debounce to complete before refocusing the island.
      await page.waitForTimeout(120);
      await expect.poll(trigger).toBe('triggered');
      await expect(input).toHaveValue('');
      await expect(dialog.getByText('Development placeholder')).toHaveCount(0);
      await expect(
        dialog.getByText(
          'Retrieval supplies context before an answer is generated.',
        ),
      ).toBeVisible();
      const screenshots = process.env.ISLAND_SCREENSHOT_DIR;
      if (screenshots) {
        await mkdir(screenshots, { recursive: true });
        await page.screenshot({
          path: join(screenshots, `island-light-${size.width}.png`),
        });
      }
      await page.locator('html').evaluate((element) => {
        element.setAttribute('class', 'dark');
      });
      await expect(page.locator('[data-chatgpt-island-root]')).toHaveAttribute(
        'data-theme',
        'dark',
      );
      await expect(dialog).toHaveCSS('background-color', 'rgb(33, 33, 33)');
      if (screenshots)
        await page.screenshot({
          path: join(screenshots, `island-dark-${size.width}.png`),
        });
      await input.press('Escape');
      await expect(dialog).toHaveCount(0);
      expect(await trigger()).toBe('triggered');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText('Development placeholder')).toHaveCount(0);
      await page.setViewportSize({ width: 320, height: 400 });
      await expect
        .poll(async () => {
          const rect = (await dialog.boundingBox())!;
          return rect.x + rect.width <= 320 && rect.y + rect.height <= 400;
        })
        .toBe(true);
      await dialog.getByRole('button', { name: 'Close island' }).click();
      await expect(dialog).toHaveCount(0);
      expect(await page.locator('#original').innerHTML()).toBe(original);
      await expect(
        page.getByRole('textbox', { name: 'Original composer' }),
      ).toHaveValue('');
      expect(unexpectedNetwork).toEqual([]);
      expect(errors).toEqual([]);
    } finally {
      await context.close();
      await rm(profile, { recursive: true, force: true });
    }
  });
}
