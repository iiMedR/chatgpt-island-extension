import { readFileSync, existsSync } from 'node:fs';
import { expect, it } from 'vitest';
import { manifest } from '../manifest.config';
it('limits permissions and injection scope', () => {
  expect(manifest.manifest_version).toBe(3);
  expect(manifest.permissions).toEqual(['activeTab']);
  expect(manifest.content_scripts?.[0].matches).toEqual([
    'https://chatgpt.com/*',
  ]);
  expect(manifest.host_permissions).toBeUndefined();
  expect(manifest.commands).toBeUndefined();
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
});
