import { act, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import axe from 'axe-core';
import { createIslandController } from '../src/content/island/island-controller';
let controller: ReturnType<typeof createIslandController> | undefined;
afterEach(() => {
  act(() => controller?.dispose());
  controller = undefined;
});
it('has no axe violations in the open shadow island for supported jsdom rules', async () => {
  controller = createIslandController(document);
  act(() =>
    controller!.open({
      selectedText: 'Reference',
      sourceUrl: 'https://chatgpt.com/c/test',
      capturedAt: 1,
      triggeredAt: 2,
    }),
  );
  const host = document.querySelector<HTMLElement>(
    '[data-chatgpt-island-root]',
  )!;
  const ui = within(host.shadowRoot!.querySelector('div')!);
  expect(ui.getByRole('dialog')).toBeInTheDocument();
  // jsdom has no layout/canvas. Contrast and real focus/tab order need Chromium/manual checks.
  const results = await axe.run(document.body.parentElement!, {
    rules: {
      'color-contrast': { enabled: false },
      'document-title': { enabled: false },
      'html-has-lang': { enabled: false },
      region: { enabled: false },
    },
  });
  expect(
    results.violations.map(({ id, nodes }) => ({
      id,
      targets: nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});
