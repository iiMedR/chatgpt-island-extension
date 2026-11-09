import { expect, it } from 'vitest';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import {
  distributionFiles,
  makeZip,
  inspectZip,
  sha256,
  validateFiles,
} from '../scripts/release-package';
import { iconPng } from '../scripts/icons';
import { manifest } from '../manifest.config';
it('refuses mock, mock-backend and development build metadata before packaging', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'island-package-test-'));
  try {
    for (const info of [
      { aiMode: 'mock', buildMode: 'production' },
      { aiMode: 'mock-backend', buildMode: 'production' },
      { aiMode: 'openai', buildMode: 'development' },
    ]) {
      await writeFile(join(temp, 'build-info.json'), JSON.stringify(info));
      await expect(distributionFiles(temp)).rejects.toThrow(
        'production OpenAI build',
      );
    }
  } finally {
    if (
      resolve(temp).startsWith(resolve(tmpdir()) + sep + 'island-package-test-')
    )
      await rm(temp, { recursive: true, force: true });
  }
});
it('keeps project, backend, locks and Chrome preview version consistent', async () => {
  for (const name of [
    'package.json',
    'package-lock.json',
    'server/package.json',
    'server/package-lock.json',
  ])
    expect(JSON.parse(await readFile(name, 'utf8')).version).toBe('0.9.3');
  expect(manifest.version).toBe('0.9.3');
  expect(manifest.version_name).toContain('Developer Preview');
});
it('generates original raster icons at every registered size', () => {
  for (const size of [16, 32, 48, 128]) {
    const bytes = iconPng(size);
    expect(bytes.readUInt32BE(16)).toBe(size);
    expect(bytes.readUInt32BE(20)).toBe(size);
    expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  }
});
it('packages only runtime files with root manifest, reproducible bytes and safe round-trip', async () => {
  const files = await distributionFiles();
  const first = makeZip(files),
    second = makeZip(files);
  expect(sha256(first)).toBe(sha256(second));
  const unpacked = inspectZip(first);
  expect(Object.keys(unpacked).sort()).toEqual(Object.keys(files).sort());
  expect(unpacked['manifest.json']).toBeDefined();
  expect(unpacked['build-info.json']).toBeUndefined();
  for (const name of Object.keys(files))
    expect(Buffer.from(unpacked[name])).toEqual(Buffer.from(files[name]));
});
it('rejects unwanted files, tampered manifest, missing assets and source/secret markers', async () => {
  const files = await distributionFiles();
  expect(() =>
    validateFiles({ ...files, '../escape': new Uint8Array() }),
  ).toThrow();
  expect(() =>
    validateFiles({ ...files, 'server/.env': new Uint8Array() }),
  ).toThrow();
  expect(() =>
    validateFiles({ ...files, 'content.js.map': new Uint8Array() }),
  ).toThrow();
  expect(() =>
    validateFiles({
      ...files,
      'manifest.json': new TextEncoder().encode('{}'),
    }),
  ).toThrow();
  const missing = { ...files };
  delete missing['icons/icon-128.png'];
  expect(() => validateFiles(missing)).toThrow();
  expect(() =>
    validateFiles({
      ...files,
      'content.js': new TextEncoder().encode(
        'test-server-key-canary-ISLAND-M06',
      ),
    }),
  ).toThrow();
});
