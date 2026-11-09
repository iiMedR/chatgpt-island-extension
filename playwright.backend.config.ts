import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
export default defineConfig({
  testDir: './tests/backend-browser',
  workers: 1,
  timeout: 30000,
  reporter: 'list',
  outputDir: join(tmpdir(), 'chatgpt-island-backend-browser-results'),
});
