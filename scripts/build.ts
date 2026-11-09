import { build, mergeConfig } from 'vite';
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import config from '../vite.config';
import { manifest } from '../manifest.config';
import { writeIcons } from './icons';
const watch = process.argv.includes('--watch');
const offline = process.argv.includes('--offline');
const mockBackend = process.argv.includes('--mock-backend');
const mode = watch ? 'development' : 'production';
process.env.NODE_ENV = mode;
// Clean once: a popup rebuild must not remove the worker/content watcher outputs.
await rm('dist', { recursive: true, force: true });
await build(
  mergeConfig(config, {
    configFile: false,
    mode,
    plugins: [
      {
        name: 'extension-manifest',
        async writeBundle() {
          await mkdir('dist', { recursive: true });
          await writeFile(
            'dist/build-info.json',
            JSON.stringify({
              buildMode: mode,
              aiMode: offline
                ? 'mock'
                : mockBackend
                  ? 'mock-backend'
                  : 'openai',
            }),
          );
          await writeIcons('dist/icons');
          const notices = await Promise.all(
            ['react', 'react-dom', 'tailwindcss'].map(
              async (name) =>
                `${name}\n${await readFile(`node_modules/${name}/LICENSE`, 'utf8')}`,
            ),
          );
          await writeFile('dist/THIRD_PARTY_NOTICES.txt', notices.join('\n\n'));
          await writeFile(
            'dist/manifest.json',
            JSON.stringify(manifest, null, 2),
          );
        },
      },
    ],
    build: { watch: watch ? {} : null, emptyOutDir: false },
  }),
);
for (const entry of ['background', 'content']) {
  await build({
    configFile: false,
    mode,
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      __ISLAND_OFFLINE__: JSON.stringify(offline),
    },
    build: {
      emptyOutDir: false,
      copyPublicDir: false,
      watch: watch ? {} : null,
      lib: {
        entry: `src/${entry}/index.ts`,
        name: entry,
        formats: [entry === 'content' ? 'iife' : 'es'],
        fileName: () => `${entry}.js`,
      },
    },
  });
}
