# ChatGPT Island

Independent Chrome extension for exploring selected ChatGPT text in an isolated floating conversation. Not affiliated with OpenAI. Milestone 03 adds a keyboard-triggered, local island-open request using the last captured assistant selection. The floating conversation is not implemented yet.

## Requirements and installation

- Node.js 24 LTS, npm, Git, and current Chrome desktop.
- From this directory run `npm ci` (or `npm install` for the initial setup).
- Run `npm run build` before tests that inspect generated assets.

## Commands

| Command                | Purpose                                                          |
| ---------------------- | ---------------------------------------------------------------- |
| `npm run dev`          | Build and watch all three entries with development diagnostics   |
| `npm run build`        | Generate the production unpacked extension in `dist/`            |
| `npm run typecheck`    | Strict TypeScript validation                                     |
| `npm run lint`         | ESLint and React hook checks                                     |
| `npm run test`         | Vitest popup, URL, entry, and built-manifest checks; build first |
| `npm run format`       | Format source and documentation                                  |
| `npm run format:check` | Check formatting                                                 |

Development uses disk builds rather than a remote Vite/HMR server: Chrome loads local files under its extension CSP. Wait for all three initial builds, load `dist`, and reload the extension after changes. Refresh ChatGPT after reloading the extension. No remote code or relaxed CSP is needed.

## Load and verify in Chrome

1. Run `npm run build`.
2. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select this project's `dist` directory.
3. Confirm ChatGPT Island 0.1.0 appears without errors. Pin it from Chrome's Extensions menu.
4. Open `https://chatgpt.com/`, refresh it, and open the popup. Expect **Ready**. This indicates a supported URL, not working AI functionality.
5. On `https://example.com/`, open the popup. Expect **Open ChatGPT to get started**.
6. Inspect the popup by right-clicking it and choosing **Inspect**. Check Console and test light/dark system themes.
7. On the extension details card, click the service worker inspection link. An inactive worker between events is normal. Check Console and the card's Errors section.
8. To see initialization logs, use `npm run dev`, reload the extension, and refresh ChatGPT. Enable Debug/Verbose console messages. ChatGPT DevTools should show the content initialization log in the extension's isolated context. Production deliberately omits these logs.
9. To verify content execution in production, use the popup DevTools console: `const [tab] = await chrome.tabs.query({active:true,currentWindow:true}); await chrome.tabs.sendMessage(tab.id, {type:'FOUNDATION_PING'})`. Expect `{running:true}` on a refreshed ChatGPT page. No receiver is expected on unrelated sites. This probe reads no conversation data.

## Limitations

No floating island, AI requests, follow-up conversations, persistent storage, analytics, or ChatGPT history changes. Chrome restricted pages may hide URL access and show the unsupported state. Icons are omitted; `public/icons` reserves a location for original assets. See PROGRESS.md for actual verification results.

## Shortcut usage and customization (Milestone 03)

Highlight assistant-response text, allow the selection capture debounce (80 ms) to finish, and press **Alt+Shift+E** while Chrome has focus. The command retrieves the last valid capture, including after clicking elsewhere. Invalid new selections leave the previous valid capture available, as in Milestone 02. Refresh or switch conversations first when testing the no-selection case. Nothing opens visually in this milestone.

Open `chrome://extensions/shortcuts`, find **ChatGPT Island → Explore the last selected assistant text**, and assign or customize the shortcut. Chrome may leave it blank if another extension owns it; operating-system/browser shortcuts may take priority. The extension never overwrites your assignment or installs a DOM keyboard fallback. On macOS, Alt is Option. See [Chrome's Commands API requirements](https://developer.chrome.com/docs/extensions/reference/api/commands). `chrome.commands.getAll()` in the worker console shows the actual assignment; a blank shortcut means unassigned.

## Manually verify shortcut routing

1. Run `npm run build`, open `chrome://extensions`, and reload the unpacked extension. Refresh `https://chatgpt.com` afterward so its content script belongs to the current extension context. Confirm the shortcut assignment at `chrome://extensions/shortcuts`.
2. Open the service worker console through the extension card's **service worker** inspection link. In Sources, open `background.js`, pretty-print it, and set a breakpoint at `tabs.sendMessage`. Highlight assistant text, wait briefly, then press Alt+Shift+E. Confirm one send to the command tab's top frame, with only `{type:'ISLAND_OPEN_REQUEST'}`. Resume execution promptly. Breakpoints can cause the two-second response timeout, so use the development build below for less intrusive verification.
3. Production logs and the temporary development handler are deliberately removed. To check a production content result directly, use the popup DevTools console on ChatGPT: `const [tab] = await chrome.tabs.query({active:true,currentWindow:true}); await chrome.tabs.sendMessage(tab.id, {type:'ISLAND_OPEN_REQUEST'}, {frameId:0})`. Expect `{status:'triggered'}` with a valid capture. This probe tests messaging/selection retrieval; the breakpoint test checks the actual shortcut path. Neither result contains selected text or claims a visible island exists.
4. To observe the temporary handler itself, run `npm run dev`, wait for all three builds, reload the extension, and refresh ChatGPT. Enable Verbose/Debug in both consoles. Select assistant text and press the shortcut. Expect **Island-open received** once and **Trigger: triggered** in ChatGPT's content-script console, plus **Command: triggered** in the worker console. No selected text should appear. Repeated presses may each trigger once, with no UI.
5. Refresh ChatGPT and press the shortcut without capturing valid text. Expect **no-selection**, no handler event, and no uncaught error. Try an invalid selection first (composer, sidebar, or user message) and repeat. After a previous valid capture, invalid new selections intentionally preserve it.
6. Capture text, switch conversations, then press the shortcut: expect **no-selection**. On an unsupported website, expect **unsupported-tab** in the development worker console and no content handler event. No script is injected there.
7. With ChatGPT open, reload the extension without refreshing the page and test again. A missing/invalidated receiver may report **messaging-failed**; refresh ChatGPT to recover. Disabled site access or tabs opened before installation can also have no receiver. An unresponsive receiver reports **response-timeout** after two seconds; no automatic retries occur.
8. In a development install/update, a blank assignment produces **Shortcut: shortcut-unassigned**. Assign it manually; if the command never reaches the worker, check Chrome/OS shortcut conflicts and that Chrome has focus. Return to `npm run build` and reload when finished to restore the log-free production build.

Manual Chrome integration tests have not been performed in this session. Unit tests use mocked Chrome APIs and DOM fixtures.

## Manually test selection detection (Milestone 02)

1. Run `npm run dev`, reload the unpacked extension, and refresh a ChatGPT conversation containing an assistant response. In ChatGPT DevTools enable Verbose/Debug messages; filter for `[ChatGPT Island] Selection`. Logs contain lifecycle labels and rejection reasons only, never selected text. Allow about 80 ms after selecting.
2. Drag over assistant prose, bold text, list items, or code. Expect `detected` and `validated`. Leading/trailing whitespace is trimmed; internal whitespace is retained. A range may cross Markdown elements within one response.
3. Use Shift+Arrow (or Shift+click, with keyboard caret browsing enabled if needed) to change a selection inside the same response. Expect validation. Normal selection, copy, scrolling, and typing should remain unaffected.
4. Select whitespace or more than 10,000 trimmed UTF-16 code units. Expect `rejected` with `empty` or `oversized`. Exactly 10,000 is allowed. Select user text, sidebar text, composer/search text, or across messages: expect rejection. Input-native selections may appear as an empty document selection and are never read from input values.
5. After a valid capture, collapse the selection or click elsewhere. Expect rejection of the empty selection and no `cleared` event: the last valid capture is retained. The automated lifecycle test verifies the retained value directly; no production text-inspection endpoint is exposed.
6. Navigate to another conversation using the sidebar, New chat, and Back/Forward. Expect `cleared` immediately through navigation events or within one second through the URL safety check. An unchanged old DOM range is ignored until the selection changes. Hash/query changes alone keep the selection.
7. Refresh or leave the page: state is cleared. Back/Forward cache restoration starts empty. Inspect DevTools Network and storage: selection capture creates neither requests nor persistent records. Run `npm run build` and reload to confirm selection diagnostics disappear in production.

These are manual instructions, not claims of completed real-ChatGPT integration tests. ChatGPT markup varies; inspect the selected element's ancestry for `data-message-author-role="assistant"` or `article[data-turn="assistant"]`. Unknown markup is rejected rather than guessed from generated classes.
