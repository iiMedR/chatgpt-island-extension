import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { expect, it } from 'vitest';
import { manifest } from '../manifest.config';
it('limits permissions and injection scope', () => {
  expect(manifest.manifest_version).toBe(3);
  expect(manifest.permissions).toEqual(['activeTab']);
  expect(manifest.content_scripts?.[0].matches).toEqual([
    'https://chatgpt.com/*',
  ]);
  expect(manifest.host_permissions).toEqual(['http://127.0.0.1/*']);
  expect(manifest.commands).toEqual({
    'open-island': {
      suggested_key: { default: 'Alt+Shift+E' },
      description: expect.any(String),
    },
  });
});
it('ships popup, background, and standalone content assets', () => {
  const built = JSON.parse(
    readFileSync('dist/manifest.json', 'utf8'),
  ) as typeof manifest;
  expect(built).toEqual(manifest);
  for (const file of [
    built.action!.default_popup!,
    built.background!.service_worker!,
    ...built.content_scripts![0].js!,
  ])
    expect(existsSync(`dist/${file}`)).toBe(true);
  expect(readFileSync('dist/content.js', 'utf8')).not.toMatch(/\bimport\s/);
  expect(readFileSync('dist/content.js', 'utf8')).not.toContain(
    'console.debug',
  );
  expect(readFileSync('dist/background.js', 'utf8')).not.toContain(
    'console.debug',
  );
  const content = readFileSync('dist/content.js', 'utf8');
  expect(content).toContain('Selected context');
  expect(content).toContain('.resize-handle');
  expect(content).toContain('--background');
  expect(content).not.toContain('process.env.NODE_ENV');
});
it('does not bundle backend SDK, provider endpoint or server credential values', () => {
  for (const entry of readdirSync('dist', { recursive: true })) {
    if (!/\.(?:js|json|html|css)$/.test(String(entry))) continue;
    const text = readFileSync(`dist/${entry}`, 'utf8');
    expect(text).not.toContain('test-server-key-canary-ISLAND-M06');
    expect(text).not.toContain('https://api.openai.com/v1');
    expect(text).not.toContain('X-Stainless');
    expect(text).not.toMatch(/sk-(?:proj-)?[A-Za-z0-9_-]{32,}/);
  }
});

it('ships reduced-motion opening feedback and isolated wrapping/scroll rules', () => {
  const css = readFileSync('src/content/island/island.css', 'utf8');
  expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
  expect(css).toMatch(/animation:\s*none/);
  expect(css).toContain('overflow-wrap: anywhere');
  expect(css).toContain('overscroll-behavior: contain');
  expect(css).not.toMatch(/transition:\s*all/);
  expect(readFileSync('dist/content.js', 'utf8')).toContain(
    'prefers-reduced-motion',
  );
});
