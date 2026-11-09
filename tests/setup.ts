import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Fail closed if a test accidentally reaches a real provider through fetch.
// Keep actual loopback HTTP cancellation tests available; explicit mocks replace this guard.
const nativeFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1')
    return Promise.reject(
      new Error('External network requests are disabled in tests.'),
    );
  return nativeFetch(input, init);
};
afterEach(cleanup);
