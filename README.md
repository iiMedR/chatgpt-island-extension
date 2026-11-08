# ChatGPT Island

Independent Chrome extension for exploring selected assistant text in a floating mini-chat. Not affiliated with OpenAI.

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

The server binds only 127.0.0.1, validates exact Origin/Host, restricts CORS, JSON shape and body size, rejects client model/credentials, and disables SDK retries and content logging. **CORS/Origin checks are not authentication.** This backend is for a trusted local machine and must not be exposed publicly. There are no accounts, subscriptions, public deployment, streaming, persistent history or Milestone 08 features.

Manifest permissions are activeTab plus only `http://127.0.0.1/*` host access; Chrome match patterns cannot restrict that permission to one port, but runtime code uses the fixed port/path. Content injection remains limited to HTTPS chatgpt.com. No incognito access is enabled. Semantic ChatGPT DOM attributes remain a compatibility assumption; unknown layouts fail closed.

Actual verification and pending browser/live API limitations are recorded in PROGRESS.md.

## Milestone 07 follow-up checks

Build/reload the production extension, configure the local backend as above, and refresh ChatGPT. These manual scenarios have not been executed in this session. Use non-sensitive test text; real requests may incur API costs. In every scenario confirm the original ChatGPT messages and composer remain unchanged.

- **A — Follow-up:** Select a technical paragraph, press Alt+Shift+E, ask “Explain this simply.” and wait. Ask “Can you give me an example?” Verify the answer refers to the selected text and preceding island answer. Repeat the shortcut with the same selection: retain history/draft and focus the composer.
- **B — Longer chat:** Ask at least 12 short follow-up questions. Verify visible chronological history is retained. In the extension service worker DevTools Network panel, inspect the localhost request body: context.text occurs once, messages contains at most 20 completed prior messages plus the current question, and prior-message content lengths total at most 30,000. Roles alternate user/assistant ending with the current user question. Test longer text to reach the character limit. The selected text and current question have separate 10,000/8,000 limits; older turns may be unavailable to the model even though still visible. Inspection is manual only; content is never logged by the extension/backend.
- **C — New selection:** Start a chat, select different assistant text and trigger again. Verify the old history/draft/error is discarded and only new selected context enters the next request. Closing and reopening also starts fresh.
- **D — Failure/retry:** Stop the backend, submit, verify an inline error and preserved editable question, restart the backend and retry. Verify one question bubble, one answer and no duplicated request history. Editing a failed draft replaces that unanswered question. No fake answer or error text is included in future context.
- **E — Cancellation:** Submit, close while pending, then reopen with a new selection. Verify no old answer/error appears. Also change selection while pending. Cancellation cannot reverse provider processing already completed or guarantee that no API usage was charged.
