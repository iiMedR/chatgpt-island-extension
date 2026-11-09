# ChatGPT Island — 0.10.1 Local Preview

Use your authorized ChatGPT plan for an isolated conversation about selected assistant text. This personal Windows project uses official Sign in with ChatGPT through a local Node helper; no API key is required and there is no automatic API-billing fallback. Independent extension; not affiliated with OpenAI. Eligible plan/workspace permissions and usage limits apply.

Repository: [iiMedR/chatgpt-island-extension](https://github.com/iiMedR/chatgpt-island-extension).

## ChatGPT plan requirement

**ChatGPT Free is not supported for this extension's ChatGPT-plan AI requests. Free-plan users must upgrade to an eligible ChatGPT Plus or Pro plan before using AI answers.** Signing in with a free account does not enable plan usage, even if the extension loads and the floating island opens.

If authorization shows **"A required permission is unavailable. You can’t continue with this workspace and plan"**, check the signed-in account's subscription. If it is on Free, upgrade in ChatGPT, then start a fresh sign-in from the extension and approve plan access. If you already have an eligible plan on another account, choose **Use another account or workspace** and sign in with that account instead.

A subscription is necessary but does not guarantee access: OpenAI must also permit plan usage for the selected account and workspace. An upgrade does not fix unrelated selection bugs or an OAuth registration bound to another workspace. Opening the island itself does not require a paid plan; generating AI answers does.

See the [official OpenAI sign-in quickstart](https://developers.openai.com/siwc/quickstart) for eligible plans and authorization requirements. Usage remains subject to your plan's allowance, available credits and OpenAI's policies.

## Install and configure

Use Node.js 24 and desktop Chrome/Opera on Windows:

```sh
git clone https://github.com/iiMedR/chatgpt-island-extension.git
cd chatgpt-island-extension
```

```sh
npm ci
npm --prefix server ci
npm run build
```

Load unpacked dist through chrome://extensions and copy its actual 32-character extension ID. Start the helper from PowerShell in the repository:

```powershell
.\scripts\start-chatgpt-helper.ps1 -ExtensionId YOUR_ACTUAL_EXTENSION_ID
```

Keep that terminal/helper running. Alternatively configure only EXTENSION_ORIGIN=chrome-extension://your-actual-extension-id and PORT=8787 in server/.env, then run npm run server:dev after the build. OPENAI_API_KEY and OPENAI_MODEL are ignored by the normal helper entry point. An extension loaded from a different folder may have a different ID; restart the helper with that exact ID.

Open the extension popup and choose **Continue with ChatGPT**. Complete OpenAI sign-in and approve plan usage. Reopen the popup; it should show **Using ChatGPT plan**, the account's available models, **Manage usage**, and **Disconnect**. Identity sign-in alone is insufficient without plan permission. If an authorization page says the attempt ended, cancel the waiting sign-in with Disconnect and start a fresh one; do not reuse an old authorization tab.

The helper stores credentials encrypted with Windows DPAPI under the current Windows account in LocalAppData/ChatGPT Island/auth. Host/client registration metadata persists for returning sign-ins; conversations never do. Do not copy that directory into Git, browser storage or another computer. Disconnect removes local tokens and attempts remote revocation; if it reports failure, also revoke the connection in ChatGPT settings.

See [ChatGPT sign-in](docs/CHATGPT_SIGN_IN.md) for scope, limitations and validation status. The extension ZIP contains only browser assets; it does not start or bundle the helper. The vendored OpenAI DevKit is licensed for personal noncommercial use; its license and pinned source are included under server/vendor/siwc-local.

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

Follow-ups retain the original selected context and ordered island history. Requests retain up to 20 completed history messages (10 whole user/assistant turns), with a 30,000-character history budget, plus the current question and original selected text. Oldest complete turns are omitted from requests only; every message remains visible until the island closes. These configurable limits use UTF-16 text units, approximate token usage, and do not guarantee a token count. No AI summarization requests are made. Selected context is included once, separately. Completed model output is limited to 16,000 text units; character limits do not guarantee a token budget and plan requests do not set max_output_tokens; incomplete/empty output produces a safe error. Failed questions remain editable; Retry question replaces the failed unanswered turn rather than duplicating it.

Drag the header or use its arrow keys. Resize from the bottom-right handle or its arrow keys. Expand/restore stays within the viewport; default dimensions are 460 × 520 with viewport-adjusted minimums. Light/dark host theme attributes are preferred, with system theme fallback. Messages scroll internally without forcing a reader who scrolled upward back to the bottom.

Close using the close control or Escape inside the island. This aborts pending work and clears its temporary context, draft and chat. Reopening starts fresh using the selection manager's independent retained valid capture. Repeating the same capture while open focuses the current chat; another valid capture replaces it. Navigation clears the capture and closes the island. Unsupported, user-message, editable, sidebar and cross-region selections are rejected. Invalid new selections retain the last valid capture under the existing selection rules.

## Manual Chrome and ChatGPT-plan verification

1. Build, start the helper for the exact extension ID, reload the extension and refresh ChatGPT.
2. Complete Continue with ChatGPT and approve plan usage; verify Using ChatGPT plan and model discovery.
3. Select assistant text and open the island with the popup or assigned shortcut.
4. Allow AI processing for this temporary conversation, ask a question and verify an Assistant answer.
5. Ask a follow-up; verify context/history remain ordered, then close and reopen to verify cleanup.
6. Stop the helper to verify a safe error and editable retry; restart it and retry.
7. Disconnect in the popup, verify inference requires sign-in, and reconnect if desired.

Live selection/window/popup checks passed on the user's Chrome session. Initial OAuth authorization opened successfully; full consent/inference results are tracked in PROGRESS.md, not inferred from automated mocks. No paid API-key requests are made by tests.

## Troubleshooting

- Free-plan permission error: upgrade to an eligible ChatGPT Plus or Pro plan, then authorize again. If an eligible subscription already exists, select that account and workspace; purchasing another plan is not a remedy for every authorization error.
- Helper unavailable: keep the helper running on 127.0.0.1:8787 with the exact extension origin. It is needed for sign-in and answers, but not for opening the island.
- Sign-in says attempt ended: close old authorization tabs, cancel the waiting sign-in with Disconnect, and start from Continue with ChatGPT again. Report repeated failures; do not paste authorization URLs or token files.
- Identity connected but no plan permission: authorize plan usage; an identity-only login cannot run inference.
- Model unavailable: reopen the popup and choose a model from the account catalog.
- Plan limit: use Manage usage in ChatGPT settings. No API-key fallback is attempted.
- Timeout: helper/relay/UI deadlines are 180/185/190 seconds. Closing/changing context aborts the request.
- Selection rejected: the popup's bounded structural diagnostics contain no conversation text. Refresh ChatGPT after extension reload.

## Privacy and limitations

Only explicitly selected, validated assistant text and this temporary island's bounded history are sent after affirmative per-conversation consent. The original ChatGPT conversation and composer are untouched. No chat history, selected text or drafts are persisted. Authentication registration and OS-encrypted credentials persist separately so returning sign-ins/refresh work. Tokens never enter the page or extension. Disconnect removes local credentials and attempts remote revocation; close only clears the temporary chat.

This helper supports Windows DPAPI and personal local noncommercial use. It is not a hosted service or a standalone browser-only OAuth client. It buffers completed streamed responses rather than displaying progressive tokens. Account eligibility, granted permissions, plan allowance/credits and provider retention policy still apply. Character budgets do not guarantee a token count. The helper is bound to loopback with exact browser Origin checks, which do not authenticate other programs running as your Windows user.

## Packaging and evidence

Run npm run package:preview and npm run verify:package for the current production browser ZIP and checksum under releases/. These archives exclude the Node helper, credentials, source and test files. Keep the repository helper installed separately. No public publication, push, deployment or store approval is implied.

See PROGRESS.md for actual test/browser results, docs/CHATGPT_SIGN_IN.md for the OAuth architecture, and server/vendor/siwc-local/LICENSE for the upstream DevKit's noncommercial terms. The historical Milestone 11 feasibility report is superseded for this personal local-runtime implementation; commercial or browser-only distribution is not approved by this change.
