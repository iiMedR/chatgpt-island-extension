import { mkdir, readFile, writeFile } from 'node:fs/promises';
import {
  distributionFiles,
  inspectZip,
  makeZip,
  releaseName,
  sha256,
} from './release-package';
const files = await distributionFiles();
const bytes = makeZip(files);
const extracted = inspectZip(bytes);
for (const name of Object.keys(files))
  if (!Buffer.from(files[name]).equals(Buffer.from(extracted[name])))
    throw Error('Archive round-trip differs.');
await mkdir('releases', { recursive: true });
await writeFile(`releases/${releaseName}`, bytes);
await writeFile(
  'releases/SHA256SUMS.txt',
  `${sha256(bytes)}  ${releaseName}\n`,
);
await writeFile(
  'releases/FILE_LIST.txt',
  Object.keys(files).sort().join('\n') + '\n',
);
await writeFile(
  'releases/RELEASE_NOTES.md',
  await readFile('docs/RELEASE_NOTES.md'),
);
console.info(
  JSON.stringify({
    file: `releases/${releaseName}`,
    bytes: bytes.length,
    sha256: sha256(bytes),
    files: Object.keys(files).length,
  }),
);
