# ChatGPT Island

Independent Chrome extension for exploring selected assistant text in a floating, isolated mini-chat. Not affiliated with OpenAI.

Milestone 05 adds typed local conversation management to the floating UI. **Real AI responses are not implemented.** Questions and follow-ups are assembled into structured local requests and processed by a deterministic mock adapter. Nothing is sent to ChatGPT or an AI provider.

## Requirements and installation

Use Node.js 24 LTS, npm, Git, and current desktop Chrome. From this directory:

```sh
npm ci
npm run build
```

Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `dist`. Refresh ChatGPT after installing or reloading the extension. The generated manifest includes the popup, module service worker, browser command, and ChatGPT-only content IIFE, with React and the island stylesheet embedded in that content bundle.

## Development commands

| Command                | Purpose                                                                       |
| ---------------------- | ----------------------------------------------------------------------------- |
| `npm run dev`          | Watch all three disk builds with development diagnostics                      |
| `npm run build`        | Generate the production unpacked extension in `dist/`                         |
| `npm run typecheck`    | Strict TypeScript checks                                                      |
| `npm run lint`         | ESLint and React hooks checks                                                 |
| `npm run test`         | Vitest unit/DOM-fixture tests; build first for artifact checks                |
| `npm run test:browser` | Playwright unpacked-extension fixture tests; build and install Chromium first |
| `npm run format`       | Format source and documentation                                               |
| `npm run format:check` | Check formatting                                                              |

Watch mode uses local files rather than remote HMR scripts. Wait for all three builds, reload the extension, and refresh ChatGPT after code changes. No remote code or relaxed extension CSP is needed.

## Open and use the island

1. Highlight text inside one ChatGPT assistant response and allow the existing 80 ms selection debounce to finish.
2. Press **Alt+Shift+E** while Chrome has focus. The island opens near the right edge and focuses its composer.
3. The **Selected context** bubble contains your original normalized excerpt. Type in **Ask about the selected text…**. Enter sends; Shift+Enter inserts a newline; IME composition Enter does not send. Questions are trimmed at their boundaries and must contain 1–8,000 UTF-16 units after trimming. Oversized drafts stay editable with a visible limit message; they are not silently truncated or sent.
4. The question appears separately from the excerpt, followed by **Development placeholder**. This is deterministic local text, not an AI-generated answer. Ask follow-ups normally: each local request includes the original context once and the ordered island history. The composer clears and receives focus only after a successful response. While pending, input is read-only and duplicate sends are blocked. An adapter failure leaves your question intact with a safe inline error; the same send control becomes **Retry question**. You may edit the question before retrying; it replaces the failed turn instead of duplicating it. The current mock always succeeds; injected-adapter tests exercise failures.
5. Drag the header or focus it and use arrow keys to move. Drag the bottom-right affordance or focus it and use arrow keys to resize. The default is 460 × 520, with 340 × 300 minimums that shrink when the viewport cannot accommodate them.
6. Use **Expand island** to enlarge it inside the viewport, and **Restore island** to recover the previous geometry when it still fits. No browser fullscreen is used.
7. Close with **Close island** or Escape while focus is inside. Closing removes the overlay, clears its conversation/context/draft, aborts pending work, and invalidates late replies. Tab can leave this non-modal dialog normally. Focus returns to the previously focused page control when appropriate.
8. Repeating the shortcut with the same capture focuses the existing composer and preserves the draft/chat. A different capture replaces the context and temporary chat while preserving window geometry. Closing and reopening starts a fresh temporary conversation.

An invalid new page selection preserves the previous valid capture, as in Milestone 02. A shortcut with no valid capture does not open anything. Navigation or page lifecycle invalidation clears the capture and closes the island. No selection, question, or temporary message is persisted.

## Shortcut assignment and diagnostics

Customize the command at `chrome://extensions/shortcuts` under **ChatGPT Island → Explore the last selected assistant text**. Chrome can leave a conflicting shortcut unassigned; OS/browser shortcuts can take precedence. On macOS Alt means Option. The extension does not change your preferences or intercept global DOM keyboard events. See [Chrome Commands API](https://developer.chrome.com/docs/extensions/reference/api/commands).

On `chrome://extensions`, inspect the extension card's **service worker** and Errors section. Inspect the popup by right-clicking it → **Inspect**. Open ChatGPT DevTools for content/island errors; the Elements panel exposes `[data-chatgpt-island-root]` and its shadow root.

For fixed-label diagnostics, use `npm run dev`, reload the extension, refresh ChatGPT, and enable Verbose/Debug in both consoles. Selection validation/rejection/clearing appears in content diagnostics; successful open requests report **Island-open received** and **Trigger: triggered**; the worker reports **Command: triggered**. Text is never logged. Production removes these diagnostics. Inspect assignment with `chrome.commands.getAll()` in the worker console.

Missing/invalidated shortcut receivers report a safe messaging failure in development; refresh ChatGPT after extension reload to recover. Unresponsive background/content message channels have a two-second deadline and are not retried. Adapter failures inside an open island have separate safe inline feedback; real AI behavior remains unimplemented.

## Exact manual Chrome checklist

1. Build, reload the extension at `chrome://extensions`, refresh ChatGPT, and confirm the shortcut is assigned.
2. Select assistant prose, nested bold/list content, or code; press Alt+Shift+E. Confirm one island, the correct excerpt, and focused input.
3. Submit a question with Enter; verify the distinct question bubble and clearly labeled local placeholder. Test Shift+Enter, blank input, the disabled send button, and multiline growth.
4. Scroll a long context/conversation. Confirm the header and composer remain available. The context scroll area is keyboard-focusable. Scroll upward before sending a follow-up: new messages should not force you back down. When already near the bottom, new messages should come into view.
5. Drag by the header against every viewport edge. Confirm controls do not initiate dragging. Cancel a pointer gesture and confirm movement stops.
6. Resize down to the minimum and up to the visible limits. Expand/restore. Resize the browser, including a narrow 360 px window and a short viewport; check clipping and access to the composer.
7. Repeat the shortcut with the same selection and a draft/chat present: retain them and focus the composer. Select a different response excerpt and repeat: replace only the temporary chat/context, with one window/root.
8. Close and reopen: the conversation/draft is fresh. Escape outside the island should not close it or change ChatGPT keyboard behavior. Tab should leave it normally.
9. Switch ChatGPT between light/dark modes while open, then test system-theme fallback. Explicit host theme attributes/classes are preferred over system settings.
10. Refresh or switch conversations: the island closes and capture clears. Test user-message/composer/sidebar selections and cross-message ranges without a prior valid capture; no island should open. Test unsupported websites too.
11. Confirm original messages and the original composer are unchanged. Inspect Network and storage: the island sends no requests or persistent writes. For safe-rendering QA, select literal HTML/script text in an assistant code block; it must remain text.

## Automated browser fixtures and actual verification

```sh
npx playwright install chromium
npm run build
npm run test:browser
```

The Playwright suite uses an isolated temporary profile with the built extension and intercepts a synthetic `https://chatgpt.com/c/island-fixture` page locally. It exercises the real worker/content message channel and UI at 1280 × 800 and 360 × 640, including native textarea newline behavior, pointer gestures, themes, lifecycle, and host preservation. It does not test native OS shortcut delivery or access a real ChatGPT account. Optional `ISLAND_CHROMIUM_EXECUTABLE` selects a compatible test-browser executable; `ISLAND_SCREENSHOT_DIR` saves screenshots outside the repository. Reports/profiles use temporary directories, with path checks before cleanup.

**Actual session results:** 144 Vitest tests passed; production build, typecheck, lint, and formatting passed. The updated two Playwright tests could not launch Chromium: Windows returned `spawn UNKNOWN` before either page loaded. Milestone 05's separate Opera-rendered synthetic fixture verified two questions and two labeled mock responses with one preserved context, composer focus, original input empty, and zero page errors. Milestone 04 also checked light/dark styling and a 360 × 640 embedded viewport. These previews used a local-only copy of the production bundle with its origin guard mapped to localhost and a mock runtime; they were not unpacked-extension or real-ChatGPT integration tests. Native drag/resize and actual Chrome shortcut delivery remain manual checks. See PROGRESS.md for exact status.

## Privacy and limitations

Only explicitly selected, validated assistant text enters local memory. Empty/whitespace selections, selections over 10,000 trimmed UTF-16 units, editable controls, user messages, navigation, extension UI, and cross-region ranges are rejected. Semantic ChatGPT DOM attributes remain compatibility assumptions; unknown layouts fail closed. Permissions remain only `activeTab`, with content restricted to `https://chatgpt.com/*`.

The island adds/removes only its own host element, never edits original messages, never submits to the original composer, never collects full conversations, never logs text, and never performs AI/network requests. Shadow DOM isolates styling; it is not a security boundary against the host website. There is no persistent history, provider integration, markdown rendering, or cross-tab conversation state. Icons/logos are original monochrome UI primitives; no OpenAI logo is used.

## Milestone 05 local conversation checklist

1. Run `npm run build`; reload the unpacked extension and refresh ChatGPT.
2. Select text in one assistant response, then press Alt+Shift+E.
3. Verify the **Selected context** bubble preserves the excerpt and the composer has focus.
4. Type **Explain this part to me.** and submit with Enter.
5. Verify a separate question bubble and the labeled mock response. The input should clear and regain focus.
6. Ask **How does retrieval help?** (or another follow-up). Verify earlier questions/responses remain in order, with one selected-context bubble.
7. Test Shift+Enter and multiline input. Try blank/whitespace input: no request should be submitted.
8. Paste 8,001 non-whitespace characters: verify the limit message and disabled send button. Exactly 8,000 normalized characters is allowed. Text length uses JavaScript UTF-16 units, as does the existing selection limit.
9. Close and reopen using the retained valid capture: expect a fresh, empty island conversation. Closing clears island context; the independent selection manager still retains its valid capture until lifecycle invalidation.
10. Select a different assistant excerpt and invoke the shortcut: verify replacement context and no previous island messages. Repeating the same capture should preserve the current draft/chat.
11. Scroll upward in a longer conversation and submit again: reading position should be preserved. Scroll to the bottom and submit: new messages should come into view.
12. Confirm the original ChatGPT messages and original composer remain unchanged. Inspect Network/storage: no AI request or conversation persistence should occur.

Request failure/retry and delayed responses are verified with injected test adapters, not a fake-error control or artificial latency in the product. The default mock is deterministic and returns immediately. Full Chrome load/shortcut verification is still pending because the current test environment cannot spawn Chromium.
