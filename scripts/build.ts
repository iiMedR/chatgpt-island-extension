import { build, mergeConfig } from 'vite';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import config from '../vite.config';
import { manifest } from '../manifest.config';
const watch = process.argv.includes('--watch');
const offline = process.argv.includes('--offline');
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
            JSON.stringify({ aiMode: offline ? 'mock' : 'openai' }),
          );
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
