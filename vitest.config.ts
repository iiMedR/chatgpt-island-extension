import { configDefaults, defineConfig } from 'vitest/config';
export default defineConfig({
  define: { __ISLAND_OFFLINE__: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    exclude: [
      ...configDefaults.exclude,
      'tests/browser/**',
      'tests/backend-browser/**',
    ],
  },
});
