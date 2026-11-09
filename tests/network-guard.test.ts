import { expect, it } from 'vitest';
it('blocks accidental provider and unrelated public fetch requests in the standard suite', async () => {
  await expect(fetch('https://api.openai.com/v1/responses')).rejects.toThrow(
    'External network requests are disabled',
  );
  await expect(fetch('https://example.com')).rejects.toThrow(
    'External network requests are disabled',
  );
});
