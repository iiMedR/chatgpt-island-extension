# ChatGPT Island — 0.9.1 Developer Preview

Developer preview for trusted local technical evaluation, requiring a separately configured Node backend and OpenAI API setup. Independent extension; not affiliated with OpenAI or ready for general public release.

Milestone 07 improves follow-up context on the existing integration, which connects the island to the OpenAI Responses API through a local Node.js backend. **API usage may incur charges.** The API key belongs only in the backend environment. Never put it in extension code, browser storage, a build variable, Git, or a chat message.

## Install and configure

Use Node.js 24 LTS and desktop Chrome. From this repository:

```sh
npm ci
npm --prefix server ci
npm run build
```

Open `chrome://extensions`, enable Developer mode, load unpacked `dist`, and copy the extension's actual 32-character ID. Copy `server/.env.example` to `server/.env` locally and configure:

```env
OPENAI_API_KEY=your-local-key
OPENAI_MODEL=gpt-4.1-mini
PORT=8787
EXTENSION_ORIGIN=chrome-extension://your-actual-extension-id
```

Replace the entire origin example with the actual ID (letters a–p only). No real `.env` is committed. Restart the backend after changing configuration. If loading from another directory changes the extension ID, update this exact origin; do not use wildcard origins. The extension uses `http://127.0.0.1:8787/api/chat`, so keep PORT=8787 unless deliberately changing and rebuilding the shared endpoint too.

`gpt-4.1-mini` is a configurable example with [Responses API support](https://developers.openai.com/api/docs/models/gpt-4.1-mini). Choose a supported model available to your API project. A ChatGPT subscription does not configure this backend's API credentials.

Start the backend:

```sh
npm run server:dev
```

In a separate terminal, use `npm run dev` for extension watch builds. Reload the extension and refresh ChatGPT after rebuilding. For compiled backend execution, run `npm run build`, then `npm --prefix server start`.

## Commands

| Command                 | Purpose                                                   |
| ----------------------- | --------------------------------------------------------- |
| `npm run dev`           | Watch extension builds using the real adapter             |
| `npm run server:dev`    | Start local backend with server/.env                      |
| `npm run build`         | Build production extension and backend                    |
| `npm run server:build`  | Build backend only                                        |
| `npm run typecheck`     | Check extension and backend TypeScript                    |
| `npm run lint`          | Check both packages and tests                             |
| `npm run test`          | Unit, UI, backend and mocked full-flow tests; build first |
| `npm run build:offline` | Explicit mock-only extension build                        |
| `npm run dev:offline`   | Watch mock-only extension builds                          |
| `npm run test:browser`  | Build offline, then run Playwright extension fixtures     |

All automated OpenAI calls are mocked; standard tests incur no API usage. Browser tests require installed Playwright Chromium (`npx playwright install chromium`) and assert offline build metadata before interacting. They leave `dist` in mock mode: **run `npm run build` afterward to restore real integration**. Offline builds disable the worker AI relay; there is no silent fallback from failed real requests to invented answers.

## Use the island

Highlight text inside one ChatGPT assistant response, allow the 80 ms selection debounce to finish, then press **Alt+Shift+E**. Configure this command through `chrome://extensions/shortcuts` if Chrome leaves it unassigned or another binding takes precedence. No global page keyboard interception is used.

The island displays **Selected context** separately from your questions. Enter submits; Shift+Enter adds a newline; IME Enter does not submit mid-composition. Questions are trimmed and limited to 8,000 UTF-16 units. Blank or oversized drafts cannot be sent. Input grows for multiline content. While submitting, a subtle status appears and duplicate sends are blocked. A successful answer is labeled **Assistant**, clears the draft and refocuses the composer. Offline mock answers remain labeled **Development placeholder**.

Follow-ups retain the original selected context and ordered island history. Requests retain up to 20 completed history messages (10 whole user/assistant turns), with a 30,000-character history budget, plus the current question and original selected text. Oldest complete turns are omitted from requests only; every message remains visible until the island closes. These configurable limits use UTF-16 text units, approximate token usage, and do not guarantee a token count. No AI summarization requests are made. Selected context is included once, separately. Model output is limited to 2,048 tokens and 16,000 text units; incomplete/empty output produces a safe error. Failed questions remain editable; Retry question replaces the failed unanswered turn rather than duplicating it.

Drag the header or use its arrow keys. Resize from the bottom-right handle or its arrow keys. Expand/restore stays within the viewport; default dimensions are 460 × 520 with viewport-adjusted minimums. Light/dark host theme attributes are preferred, with system theme fallback. Messages scroll internally without forcing a reader who scrolled upward back to the bottom.

Close using the close control or Escape inside the island. This aborts pending work and clears its temporary context, draft and chat. Reopening starts fresh using the selection manager's independent retained valid capture. Repeating the same capture while open focuses the current chat; another valid capture replaces it. Navigation clears the capture and closes the island. Unsupported, user-message, editable, sidebar and cross-region selections are rejected. Invalid new selections retain the last valid capture under the existing selection rules.

## Manual Chrome and API verification

These live steps have **not** been performed in this session:

1. Configure your backend API key and exact extension origin as above.
2. Start the backend with `npm run server:dev`.
3. Run `npm run build`; reload `dist` through `chrome://extensions`, then refresh ChatGPT.
4. Open `https://chatgpt.com` and verify shortcut assignment.
5. Select part of one assistant response.
6. Press Alt+Shift+E and verify the excerpt and focused composer.
7. Type “Explain this part in simple words.”
8. Submit; verify the waiting state and disabled duplicate submission.
9. Verify a real answer labeled Assistant appears, then composer focus returns.
10. Ask a follow-up question.
11. Verify the answer uses the selected context and previous island turns.
12. Close and reopen the island.
13. Verify the previous temporary conversation was discarded; test a different selected context too.
14. Stop the backend, submit again, and verify a concise connection error and editable retry. Restart and retry. Close during a request to verify no late answer appears in a reopened chat.
15. Confirm original ChatGPT messages and composer remain unchanged. Also test drag, resize, expand/restore, light/dark themes and a small viewport.

Inspect the service worker through its extension card and content/island through ChatGPT DevTools. Development builds emit fixed shortcut/selection status labels, never text. The backend logs only fixed error codes/statuses. Missing receivers after extension reload require refreshing ChatGPT. Inspect requests only with your own non-sensitive test content; browser DevTools can expose request bodies even though the extension does not log them.

## Troubleshooting

- Backend unavailable: start the server, keep port 8787 free, grant the new loopback host permission by reloading the extension, and refresh ChatGPT.
- Origin rejected: copy the actual extension ID and restart the backend. Use 127.0.0.1, not localhost. Host and Origin must both match exactly.
- Missing/invalid API key: set the server environment locally and restart; never move the key into the extension.
- Unsupported model: change OPENAI_MODEL to an available Responses-compatible model and restart.
- Rate limit or insufficient credits: check your API project's limits/billing; there is no automatic paid retry.
- Timeout: retry manually. Backend generation has a 25-second deadline, worker relay 28 seconds and client 30 seconds. Closing/changing context aborts the request.
- Empty/incomplete answer: a safe error is shown rather than fabricated or partial content. Retry or ask a shorter question.

## Privacy and local-development limits

Only explicitly selected, validated assistant text (up to 10,000 UTF-16 units), your island questions, and bounded real island answers are transmitted: content → extension worker → loopback backend → OpenAI. URLs, capture timestamps, IDs and mock answers are stripped from provider requests. No complete original conversation is read. No original message or ChatGPT composer is modified. No selected text, questions or answers are logged or written to browser storage/database. React renders text safely, without raw HTML.

The official SDK exists only in `server/`. Credentials are loaded only there. Responses use separate trusted instructions, untrusted reference context, `stream:false` and `store:false`, with no server-side conversation IDs. [Stateless Responses requests](https://developers.openai.com/api/docs/guides/migrate-to-responses) do not guarantee zero provider retention; OpenAI data policies still apply. Shadow DOM isolates styles, not secrets from the host page.

The server binds only 127.0.0.1, validates exact Origin/Host, restricts CORS, JSON shape and body size, rejects client model/credentials, and disables SDK retries and content logging. **CORS/Origin checks are not authentication.** This backend is for a trusted local machine and must not be exposed publicly. There are no accounts, subscriptions, public deployment, streaming, persistent history.

Manifest permissions are activeTab plus only `http://127.0.0.1/*` host access; Chrome match patterns cannot restrict that permission to one port, but runtime code uses the fixed port/path. Content injection remains limited to HTTPS chatgpt.com. No incognito access is enabled. Semantic ChatGPT DOM attributes remain a compatibility assumption; unknown layouts fail closed.

Actual verification and pending browser/live API limitations are recorded in PROGRESS.md.

## Milestone 07 follow-up checks

Build/reload the production extension, configure the local backend as above, and refresh ChatGPT. These manual scenarios have not been executed in this session. Use non-sensitive test text; real requests may incur API costs. In every scenario confirm the original ChatGPT messages and composer remain unchanged.

- **A — Follow-up:** Select a technical paragraph, press Alt+Shift+E, ask “Explain this simply.” and wait. Ask “Can you give me an example?” Verify the answer refers to the selected text and preceding island answer. Repeat the shortcut with the same selection: retain history/draft and focus the composer.
- **B — Longer chat:** Ask at least 12 short follow-up questions. Verify visible chronological history is retained. In the extension service worker DevTools Network panel, inspect the localhost request body: context.text occurs once, messages contains at most 20 completed prior messages plus the current question, and prior-message content lengths total at most 30,000. Roles alternate user/assistant ending with the current user question. Test longer text to reach the character limit. The selected text and current question have separate 10,000/8,000 limits; older turns may be unavailable to the model even though still visible. Inspection is manual only; content is never logged by the extension/backend.
- **C — New selection:** Start a chat, select different assistant text and trigger again. Verify the old history/draft/error is discarded and only new selected context enters the next request. Closing and reopening also starts fresh.
- **D — Failure/retry:** Stop the backend, submit, verify an inline error and preserved editable question, restart the backend and retry. Verify one question bubble, one answer and no duplicated request history. Editing a failed draft replaces that unanswered question. No fake answer or error text is included in future context.
- **E — Cancellation:** Submit, close while pending, then reopen with a new selection. Verify no old answer/error appears. Also change selection while pending. Cancellation cannot reverse provider processing already completed or guarantee that no API usage was charged.

## Milestone 08 window interaction checks

Geometry stays in memory while the island is open, including message updates, same-selection refocus and context replacement. Closing resets geometry for the next opening. Pointer movement is frame-batched; grab only the header, or use its arrow keys (16 px steps). Header buttons remain independent. Drag the subtle bottom-right handle or focus it and use arrow keys to resize. Expanded mode disables movement/resizing; Restore clamps the saved geometry to the current visible viewport after resizing/zooming.

Opening uses a brief opacity fade, disabled by prefers-reduced-motion and stopped immediately on a pointer gesture. Closing is immediate so cancellation, cleanup and focus restoration happen without waiting for animation. No geometry or message animations are added. Focus returns to the saved connected control, including controls inside another Shadow DOM, only when focus was in the island at close. A delayed answer does not pull focus back from the page or header. Escape during IME composition leaves the island open; otherwise Escape is scoped to the island. There is no focus trap.

Host data-theme/data-color-scheme, explicit light/dark classes and color-scheme take precedence over system theme fallback. Styles remain inside the island Shadow DOM. Scroll the context into the conversation; the outer island prevents wheel chaining into ChatGPT. New messages follow only near the bottom. Very small/short visible viewports reduce the preferred 340 × 300 minimums; the composer area can scroll internally rather than clipping its controls. At extreme dimensions no layout can display all content simultaneously.

Build with npm run build, reload the extension at chrome://extensions, refresh ChatGPT, start the configured local backend, then perform these **unexecuted manual Chrome scenarios**. Offline-only interaction testing may use npm run build:offline instead, with labeled mock responses; rebuild production afterward. Real API testing may incur charges.

- **A — Basic:** Select assistant text, press Alt+Shift+E, verify right-side margins and composer focus. Submit a question; verify the answer and stable outer dimensions. Close; confirm temporary chat disappears and original ChatGPT messages/input stay untouched.
- **B — Drag:** Drag the header to all four edges. Confirm the island stays visible, text underneath is not selected and close/expand buttons remain clickable. Cancel a touch/pen pointer gesture and verify movement stops. Try moving with header arrow keys too.
- **C — Resize:** Drag the bottom-right handle larger/smaller, check minimums where space permits and viewport maximums. Keep the composer visible, test long unbroken text/code as plain text, and verify no horizontal layout overflow. Repeat with keyboard resize arrows.
- **D — Expand/restore:** Move and resize, submit questions, expand and restore. Confirm saved geometry and messages survive. Resize the browser or change zoom while expanded; Restore should fit within the new visible viewport. Repeating the same selection preserves geometry/history; a new selection preserves geometry but resets the chat.
- **E — Keyboard/focus:** Tab through header, controls, conversation, selected context, composer, send and resize handle; check visible focus. Shift+Enter adds a newline; Enter sends. Focus the page while waiting and verify an answer does not steal focus. Escape during text composition must not close; otherwise Escape inside closes and restores connected prior focus. Escape outside must not affect the island.
- **F — Theme/responsive:** Test light/dark host changes while open and system fallback when no explicit theme is available. Test widths 1920, 1440, 1024, 768 and 480, plus a short viewport. Enable OS reduced motion: no opening fade. Scroll old messages while an answer arrives; reading position should remain stable. At the bottom, new answers should come into view. Confirm the original ChatGPT conversation remains unchanged throughout.

## Milestone 09 audit and release status

Current status: local prototype under verification, **not ready for public distribution**. See [TESTING.md](TESTING.md) for unit/component/integration/browser commands, fetch network guard, CI and manual checks, and [SECURITY.md](SECURITY.md) for the local threat model/reporting policy. No paid API test is part of the suite.

The backend admits at most four simultaneous provider requests per process, returning a safe busy error for additional work. Wait and retry manually; this is not authentication or a cost cap. Unknown routes return fixed errors rather than echoing URL/query content. Origin/CORS controls still do not protect against hostile local processes forging headers; public packaging needs an authorization/provisioning decision.

`npm run test:backend-browser` adds built-extension tests against an exclusive credential-free localhost mock HTTP server; stop your local backend before running it. The test fails if port 8787 is occupied. Rebuild with `npm run build` afterward. Existing `test:browser` remains mock-only UI testing. Windows browser launch failures and unperformed live Chrome checks remain explicit release blockers. CI is configured to run both suites on Linux, but has not been run remotely in this session.

Dependency advisories were reviewed before patching development tooling: Vitest's patched 4.1 line and a minimatch 11.x override address the reported test/glob advisories. No AI provider/model or production dependency major was changed. API costs still require the developer to control project billing/usage; cancellation cannot reverse already billed work.

## Developer preview installation and release package

Version **0.9.1 — Developer Preview** is for trusted local technical evaluation. It is not a public consumer release or Chrome Web Store approval. The extension requires a separately configured local Node backend and server-side OpenAI API key; the ZIP does not install/start that service. Public deployment/client authorization, browser/live API evidence, hosted privacy/contact information and final store assets remain blockers.

From the repository root:

```sh
npm ci
npm --prefix server ci
npm run typecheck
npm run lint
npm run build
npm run test
npm run package:preview
npm run verify:package
```

package:preview rebuilds production, checks the manifest/runtime allowlist, excludes build/test metadata and secrets, generates releases/chatgpt-island-v0.9.1.zip, SHA256SUMS.txt, FILE_LIST.txt and release notes. verify:package checks its hash, extracts into a clean temporary directory, validates manifest-at-root/assets/icons and byte-for-byte extraction, then removes only that checked temporary directory. Generated releases/ and dist/ stay Git-ignored; scripts, version/locks and release documentation are committed. Canonical ZIP metadata enables identical package bytes for identical built inputs; it is not a claim of identical builds across all operating systems/toolchains or a Git timestamp change.

Verify the ZIP checksum against SHA256SUMS.txt, extract it to a stable folder, enable Chrome Developer mode at chrome://extensions and Load unpacked that folder (manifest.json is at its root). Copy the newly loaded extension's actual ID into server/.env EXTENSION_ORIGIN, start/restart the backend, and refresh ChatGPT. Moving extracted folders may change the ID. Do not grant incognito access. Uninstall/disable normally through Chrome and stop the backend when finished.

Before each new temporary AI conversation, review the in-island disclosure and check **Allow AI processing for this temporary conversation**, then submit your question. Merely opening, checking consent or typing does not send an AI request. Same-selection refocus retains consent; close or new selected context clears it. Only a boolean in React memory is retained—no new permission or browser storage. You can decline by closing without submitting. The context may already be captured locally by explicit selection; only intentional submission transmits it. Offline mock mode performs no provider processing and does not ask for AI consent.

Read [release notes](docs/RELEASE_NOTES.md), [release checklist](docs/RELEASE_CHECKLIST.md), [privacy-policy draft](docs/PRIVACY_POLICY.md), [store listing](docs/STORE_LISTING.md), [screenshot plan](docs/SCREENSHOT_PLAN.md), [production plan](docs/PRODUCTION_READINESS_PLAN.md) and [manual submission guide](docs/CHROME_WEB_STORE_SUBMISSION.md). Public privacy/contact URLs and store screenshots are not invented. No upload, publication, deployment, Git tag or push is part of these commands.

## Sign in with ChatGPT — feasibility assessed, not available in this build

Milestone 11 investigated official Sign in with ChatGPT documentation. Version 0.9.1 still uses the separately configured API-key backend. There is no Continue with ChatGPT, Connected or Disconnect feature in this build, and a ChatGPT subscription does not authorize its existing API-key requests.

The documented open-source/local-runtime route is a possible future integration, subject to this project's eligibility and secure runtime provisioning. A Chrome-only migration is not verified: the provider's documented callback and Chrome Identity's callback differ, and extension-origin inference/token CORS was not established. This repository's own open-source licensing/private-client approval is unresolved. No workaround, speculative sign-in button or extra Chrome permission was added.

Read [OAuth feasibility and migration gates](docs/OAUTH_FEASIBILITY.md) for the 15-question evidence matrix, current official links, eligible-account/usage limitations and a conditional local-helper plan. Identity login and authorization for inference are separate; successful login would not prove usable plan access. No OAuth credentials or account access were requested or tested.

Closing the island still clears its temporary chat, consent and pending work. There is currently no OAuth session to disconnect. A future verified implementation must keep authentication independent of that cleanup, expose an explicit Disconnect action, and never silently fall back from plan usage to separately billed API-key inference. Until then, use the existing backend configuration and consent instructions above; no authorization steps for an unimplemented feature are implied.

## Browser installation troubleshooting (0.9.1)

After installing/reloading, refresh the ChatGPT conversation tab. The popup now requires a successful content-script probe before saying ChatGPT page connected. If it asks to refresh, reload the page; URL support alone is insufficient. It also shows the browser's actual shortcut assignment. Configure a missing/conflicting binding at chrome://extensions/shortcuts.

Highlight text inside an assistant response, then click Open island in the extension popup to test the selection/receiver independently of native shortcut delivery. Missing selection and receiver errors are shown without logging or returning the text. A backend is not needed to display the window; it is needed for AI answers. OAuth remains feasibility-only, not a hidden login setting. The selection getter now flushes only pending debounced validation, preserving all prior range/exclusion/privacy rules.
