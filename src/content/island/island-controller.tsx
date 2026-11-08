import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import type { IslandOpenPayload } from '../island-trigger';
import { Island } from './Island';
import { observeTheme } from './theme';
import css from './island.css?inline';
import { createConversationManager } from './conversation/conversation-manager';
import type { ConversationManager } from './conversation/conversation-manager';
import type { AIAdapter } from './conversation/conversation-types';
import { mockAIAdapter } from './conversation/mock-ai-adapter';

export function createIslandController(
  document: Document,
  adapter: AIAdapter = mockAIAdapter,
) {
  let host: HTMLElement | null = null;
  let root: Root | null = null;
  let stopTheme: (() => void) | null = null;
  let context: IslandOpenPayload | null = null;
  let manager: ConversationManager | null = null;
  let previousFocus: HTMLElement | null = null;
  let session = 0;
  let focusVersion = 0;
  function close(restoreFocus = true) {
    const wasFocused = document.activeElement === host;
    manager?.dispose();
    manager = null;
    root?.unmount();
    root = null;
    stopTheme?.();
    stopTheme = null;
    host?.remove();
    host = null;
    context = null;
    if (restoreFocus && wasFocused && previousFocus?.isConnected)
      previousFocus.focus({ preventScroll: true });
    previousFocus = null;
  }
  return {
    open(payload: IslandOpenPayload) {
      if (!host) {
        previousFocus =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        host = document.createElement('div');
        host.setAttribute('data-chatgpt-island-root', '');
        host.style.cssText =
          'all:initial!important;position:fixed!important;inset:0!important;display:block!important;z-index:2147483647!important;pointer-events:none!important';
        const shadow = host.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent = css;
        const mount = document.createElement('div');
        shadow.append(style, mount);
        document.documentElement.append(host);
        root = createRoot(mount);
        stopTheme = observeTheme(host, document, document.defaultView!);
      }
      if (
        !context ||
        context.selectedText !== payload.selectedText ||
        new URL(context.sourceUrl).pathname !==
          new URL(payload.sourceUrl).pathname
      ) {
        session++;
        manager?.dispose();
        manager = createConversationManager(
          {
            text: payload.selectedText,
            sourceUrl: payload.sourceUrl,
            capturedAt: payload.capturedAt,
          },
          adapter,
        );
        context = payload;
      }
      root!.render(
        <Island
          session={session}
          manager={manager!}
          focusVersion={++focusVersion}
          onClose={() => close()}
        />,
      );
    },
    close,
    dispose() {
      close(false);
    },
  };
}
