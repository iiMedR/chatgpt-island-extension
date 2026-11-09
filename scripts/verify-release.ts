import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { inspectZip, releaseName, sha256 } from './release-package';
const bytes = await readFile(`releases/${releaseName}`);
const expected = (await readFile('releases/SHA256SUMS.txt', 'utf8')).trim();
if (expected !== `${sha256(bytes)}  ${releaseName}`)
  throw Error('Release checksum mismatch.');
const files = inspectZip(bytes);
const temporary = await mkdtemp(join(tmpdir(), 'island-release-check-'));
try {
  for (const [name, data] of Object.entries(files)) {
    const target = resolve(temporary, name);
    if (!target.startsWith(resolve(temporary) + sep))
      throw Error('Unsafe extraction path.');
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, data);
    if (!(await readFile(target)).equals(Buffer.from(data)))
      throw Error('Extracted content mismatch.');
  }
  if (!files['manifest.json']) throw Error('Manifest is not at archive root.');
  console.info(
    JSON.stringify({
      verified: true,
      bytes: bytes.length,
      sha256: sha256(bytes),
      files: Object.keys(files).sort(),
      extractedAndChecked: true,
    }),
  );
} finally {
  if (
    resolve(temporary).startsWith(
      resolve(tmpdir()) + sep + 'island-release-check-',
    )
  )
    await rm(temporary, { recursive: true, force: true });
}
