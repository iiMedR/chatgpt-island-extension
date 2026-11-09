import { readFile, readdir, lstat } from 'node:fs/promises';
import { posix, join } from 'node:path';
import { createHash } from 'node:crypto';
import { zipSync, unzipSync } from 'fflate';
import type { Zippable } from 'fflate';
import { manifest } from '../manifest.config';
export const releaseName = `chatgpt-island-v${manifest.version}.zip`;
const allowed =
  /^(manifest\.json|THIRD_PARTY_NOTICES\.txt|background\.js|content\.js|src\/popup\/index\.html|assets\/[\w-]+\.(?:js|css)|icons\/icon-(?:16|32|48|128)\.png)$/;
export function validateFiles(files: Record<string, Uint8Array>) {
  const names = Object.keys(files).sort();
  if (names.some((name) => !allowed.test(name)))
    throw Error('Unexpected distribution file.');
  const text = (name: string) => {
    if (!files[name]) throw Error(`Missing runtime asset: ${name}`);
    return new TextDecoder().decode(files[name]);
  };
  const built: unknown = JSON.parse(text('manifest.json'));
  if (JSON.stringify(built) !== JSON.stringify(manifest))
    throw Error('Manifest differs from approved preview configuration.');
  const required = [
    'THIRD_PARTY_NOTICES.txt',
    manifest.background!.service_worker!,
    manifest.action!.default_popup!,
    ...manifest.content_scripts![0].js!,
    ...Object.values(manifest.icons!),
  ];
  for (const name of required)
    if (!files[name]) throw Error(`Missing runtime asset: ${name}`);
  for (const match of text(manifest.action!.default_popup!).matchAll(
    /(?:src|href)="([^"]+)"/g,
  )) {
    const target = posix.normalize(posix.join('src/popup', match[1]));
    if (!allowed.test(target) || !files[target])
      throw Error('Popup references missing or remote asset.');
  }
  for (const [name, bytes] of Object.entries(files)) {
    if (bytes.length === 0 || bytes.length > 2_000_000)
      throw Error('Empty or oversized distribution file.');
    if (name.endsWith('.png')) {
      const size = Number(/icon-(\d+)\.png$/.exec(name)![1]);
      const data = Buffer.from(bytes);
      if (
        data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
        data.readUInt32BE(16) !== size ||
        data.readUInt32BE(20) !== size
      )
        throw Error('Invalid icon dimensions/format.');
    } else {
      const source = new TextDecoder().decode(bytes);
      if (
        /sk-(?:proj-)?[A-Za-z0-9_-]{32,}|test-server-key-canary-ISLAND-M06|https:\/\/api\.openai\.com\/v1|X-Stainless|sourceMappingURL|console\.debug/.test(
          source,
        )
      )
        throw Error('Secret, SDK or development marker in distribution.');
    }
  }
  return names;
}
export async function distributionFiles(directory = 'dist') {
  const info = JSON.parse(
    await readFile(join(directory, 'build-info.json'), 'utf8'),
  ) as { aiMode: string; buildMode: string };
  if (info.aiMode !== 'openai' || info.buildMode !== 'production')
    throw Error('Packaging requires a production OpenAI build.');
  const files: Record<string, Uint8Array> = {};
  async function walk(relative: string) {
    for (const entry of await readdir(join(directory, relative), {
      withFileTypes: true,
    })) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink())
        throw Error('Symlinks are not distribution files.');
      if (entry.isDirectory()) await walk(name);
      else if (name !== 'build-info.json') {
        if (!(await lstat(join(directory, name))).isFile())
          throw Error('Unexpected file type.');
        files[name] = await readFile(join(directory, name));
      }
    }
  }
  await walk('');
  validateFiles(files);
  return files;
}
export function makeZip(files: Record<string, Uint8Array>) {
  validateFiles(files);
  const entries: Zippable = {};
  for (const name of Object.keys(files).sort())
    entries[name] = [files[name], { mtime: new Date(1980, 0, 1, 0, 0, 0) }];
  return zipSync(entries, { level: 9 });
}
export function inspectZip(bytes: Uint8Array) {
  if (bytes.length > 5_000_000) throw Error('Oversized release archive.');
  const seen = new Set<string>();
  let expandedSize = 0;
  const files = unzipSync(bytes, {
    filter: (file) => {
      expandedSize += file.originalSize;
      if (
        !allowed.test(file.name) ||
        seen.has(file.name) ||
        seen.size >= 32 ||
        file.originalSize > 2_000_000 ||
        expandedSize > 4_000_000
      )
        throw Error('Unexpected or oversized archive member.');
      seen.add(file.name);
      return true;
    },
  });
  validateFiles(files);
  return files;
}
export const sha256 = (bytes: Uint8Array) =>
  createHash('sha256').update(bytes).digest('hex');
