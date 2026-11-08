# Progress

## Milestone plan

Prompts 01–06 were supplied. Earlier sections are historical checkpoints. Milestone 06 implements the local backend and Responses integration with mocked automated evidence; live OpenAI and Chrome verification remain pending. Later milestones remain a proposed roadmap, not requirements from unseen prompts.

1. Project setup and foundation — implemented and automated checks passed; manual Chrome verification pending.
2. Selection detection and validated context capture — implemented; automated verification passed. Real ChatGPT compatibility remains manually unverified.
3. Keyboard shortcut and island trigger — implemented and automated verification passed; live Chrome testing pending.
4. Floating island UI — implemented; partial verification status recorded below.
5. Message composer and context management — implemented; verification recorded below.
6. Real AI provider integration — implemented; Partial pending configured live OpenAI/Chrome verification below.
7. Provider/conversation refinement — not started (provisional plan).
8. Theme, accessibility, and interaction refinement — not started.
9. Security, regression, and browser compatibility verification — not started.
10. Release packaging and distribution documentation — not started.

## Milestone 01 checklist

- [x] React, strict TypeScript, Tailwind light/dark tokens.
- [x] MV3 manifest, scoped content script, installation worker, minimal permissions.
- [x] Popup supported/unsupported/error states.
- [x] Build, watch, typecheck, lint, test, and format scripts.
- [x] Initial README and architecture documentation.
- [x] No selection, shortcuts, floating UI, or AI integration.
- [x] Production build and artifact checks pass.
- [x] Typecheck, lint, tests, and formatting pass.
- [ ] Manual Chrome unpacked installation, popup, worker, and content verification.
- [x] One logical conventional Git commit (initial foundation commit; inspect `git log -1`).

## Verification

Verified on 2026-11-08 using Node 24.22.1:

- `npm run build`: passed; generated manifest, popup HTML/JS/CSS, background module, and standalone content IIFE.
- `npm run typecheck`: passed, strict TypeScript 6.0.3.
- `npm run lint`: passed, ESLint 10.14.0.
- `npm run test`: 16 tests across 3 files passed, covering URL boundaries, popup rendering/status/errors, entry listeners, content probe/no DOM changes, manifest constraints, and built entry files.
- `npm run format` and `npm run format:check`: passed.
- `npm run dev`: all three initial watch builds passed; development diagnostics included. Watch process stopped after verification; production build restored afterward.
- `npm ls --depth=0`: resolved dependency tree has no peer dependency errors.

Initial sandbox npm downloads failed due DNS restrictions; network-enabled installation succeeded. ESLint 9 was deprecated and replaced with ESLint 10. An attempted latest-toolchain update encountered peer conflicts; the verified Vite 7 combination was retained. TypeScript latest (7) was incompatible with typescript-eslint and replaced with its supported 6.0 series. No dependency overrides or legacy-peer-deps are used.

Manual Chrome verification has not been performed: the exposed desktop browser is Opera, and Chrome is absent from the available app/browser inventory. Do not interpret implemented configuration as observed browser registration. Full manual instructions are in README.md. Status is **partial** solely for pending Chrome verification.

## Known issues and next step

The floating UI now renders in a local Opera fixture. Live ChatGPT/unpacked Chrome integration remains unverified. The popup's Ready label still reports supported URL only. No AI integration has started.

## Milestone 02 — text selection detection

- [x] Dedicated typed selection module with DOM access, pure validation, and lifecycle/state separation.
- [x] Debounced mouse, keyboard, and native selection-change handling.
- [x] Trimmed assistant text, empty/whitespace/oversized rejection, 10,000-character limit.
- [x] Nested Markdown and single-response multi-element selections.
- [x] Reject user messages, editable/composer/search/sidebar/extension UI and cross-region ranges.
- [x] Most recent valid selection retained after collapse or invalid selections.
- [x] URL/navigation invalidation, pending capture cancellation, stale range suppression, page lifecycle cleanup.
- [x] Memory only, no external transmission, no new permissions, no host DOM changes.
- [x] Development-only fixed diagnostic labels without selected text.
- [x] README manual instructions and architecture/privacy/DOM assumptions documented.
- [x] Strict typecheck, lint, tests, formatting, and production build pass.
- [x] Conventional commit: `feat: implement chatgpt text selection detection` (see Git history).
- [ ] Manual Chrome/real ChatGPT integration verification (not performed).

Verification on 2026-11-08: `npm run typecheck`, `npm run lint`, `npm run test` (51 tests in 4 files), `npm run build`, and `npm run format:check` passed. The suite now includes DOM fixtures and fake-timer lifecycle tests in addition to the foundation tests. Production content output is checked for standalone bundling and absence of `console.debug`. No packages or permissions were added. Initial verification caught a nullable-selection TypeScript error and an old test's incomplete URL mock; both were corrected before final verification.

Status: **Complete for the implemented milestone and automated acceptance checks**; manual integration remains unverified. Fixture tests do not prove live ChatGPT behavior. DOM assumptions: semantic `data-message-author-role` or `article[data-turn]` ancestry, with unknown markup rejected. Limitations: UTF-16 length semantics, conservative rejection around embedded controls, up to one-second navigation fallback latency, path-based conversation identity, and stale identical ranges ignored after invalidation until selection changes. Chrome's Navigation API events may vary across isolated worlds; URL polling and access-time guards are included without patching browser APIs. Nothing from Milestone 03 is implemented.

## Milestone 03 — keyboard shortcut and island trigger

- [x] Manifest `open-island` command with suggested `Alt+Shift+E`, verified against Chrome's documented key requirements and generated manifest.
- [x] Browser-scoped Commands API listener; supplied command tab preferred, active-tab fallback when absent.
- [x] Reject unsupported/inactive/navigating-away tabs and invalid IDs without messaging them.
- [x] Typed, runtime-validated background-to-top-frame request and status response; no text sent to background.
- [x] Local selection retrieval reuses Milestone 02 validation and lifecycle expiration; no recapture or competing state/TTL.
- [x] One immutable local payload/callback per valid request; repeated invocations supported without duplicate registration.
- [x] Idempotent content initialization disposes prior listeners/timers and resets state.
- [x] Safe statuses for missing/invalid selection, missing receiver, messaging/query failure, timeout, invalid response, context invalidation, and handler failure.
- [x] Shortcut assignment checks on install/update and documented user customization/recovery.
- [x] Temporary development handler logs only a fixed receipt label; production diagnostics removed.
- [x] No floating UI, network calls, persistent storage, prompt submission, additional permissions, or dependencies.
- [x] README, architecture, future-island notes, and progress updated.
- [x] Typecheck, lint, 105 automated tests, production build, formatting, and generated-manifest inspection passed.
- [x] Conventional commit: `feat: add keyboard shortcut for island trigger` (see Git history).
- [ ] Manual Chrome shortcut assignment/delivery and real ChatGPT integration (not performed).

Verification on 2026-11-08, Node 24.22.1:

| Check                          | Actual result                                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run typecheck`            | Passed                                                                                                                                           |
| `npm run lint`                 | Passed                                                                                                                                           |
| `npm run test`                 | 105 tests passed across 7 files                                                                                                                  |
| `npm run build`                | Passed; manifest, popup, worker, and standalone content assets generated                                                                         |
| `npm run format:check`         | Passed                                                                                                                                           |
| Generated `dist/manifest.json` | `commands.open-island.suggested_key.default` is `Alt+Shift+E`; permissions remain only `activeTab`; content matches only `https://chatgpt.com/*` |
| Production runtime bundles     | Both worker and content pass assertions excluding `console.debug`                                                                                |

Tests include mocked command events, tab fallback/validation, missing receiver, bounded timeout cleanup, malformed replies, assignment checks, local typed payloads, invalid/stale selections, missing/context-invalidated state, callback/channel failures, repeated initialization, and an in-process mocked background-to-content path proving one request produces one local receipt without text in messages/logs. These are unit/fixture tests, not real browser integration tests.

Known limitations: Chrome/OS conflicts can leave the shortcut unassigned or prevent delivery. Refresh ChatGPT after extension reload/install to restore a reachable content script. The trigger uses the last completed capture, so pressing within the existing 80 ms debounce can return no-selection. Invalid new page selections intentionally retain an earlier valid record. Existing semantic DOM and path-based lifecycle assumptions remain. Production has no visual feedback or receipt logs; the README describes production breakpoints/status probing and a separate development-build handler check.

Scope clarifications: the earlier provisional roadmap included a shell in Milestone 03; the supplied Prompt 03 places all floating UI in Milestone 04, and none was built. Selection expiration reuses existing navigation/page lifecycle rules instead of inventing an age TTL. The only new worker timer is a two-second per-message response deadline required for unresponsive receivers; it is cleared on completion and never drives retries. A timed-out acknowledgement cannot cancel a request already delivered. No API integration or Milestone 04 implementation has started.

Status: **Complete for implementation and automated acceptance checks**, with manual Chrome verification explicitly pending. No browser integration success is claimed.

## Milestone 04 — floating island UI

- [x] Valid production trigger mounts one React island in an extension-owned Shadow DOM.
- [x] Separate selected-context bubble, local questions, and labeled deterministic development placeholder.
- [x] Neutral light/dark theme tokens shared with popup, scoped compiled CSS, no global stylesheet or original message/input changes.
- [x] Composer focus, blank-submit prevention, Enter/Shift+Enter/IME behavior, multiline growth, local Escape, normal Tab navigation, and visible focus.
- [x] Header dragging and bottom-right resizing with pointer capture, cancellation/cleanup, keyboard alternatives, pure viewport bounds, and adaptive minimums.
- [x] Expand/restore without fullscreen; viewport resize/visualViewport adaptation while open.
- [x] Same-context triggers keep chat/draft and focus composer; changed context resets chat while preserving geometry; one live root/window.
- [x] Close unmounts and clears temporary chat, removes host, and releases theme/window/gesture listeners. Reopen starts fresh.
- [x] Selection lifecycle invalidation closes the island using the existing manager's onClear callback.
- [x] React text-only rendering; no persistent writes, network/AI calls, full conversation reads, text logging, or new permissions.
- [x] README usage/manual checklist, architecture, and progress updated.
- [x] Typecheck, lint, production build, and 121 unit/DOM tests across 9 files passed.
- [x] Built IIFE checked for embedded island UI/CSS, no unresolved Node environment global, and no development logging.
- [x] Rendered Opera synthetic fixture: light/dark context/question/placeholder visible, composer focused, one island, original input empty, no page errors; 360 × 640 embedded viewport visually contained.
- [x] Conventional commit: `feat: implement floating island UI` (see Git history).
- [ ] Playwright unpacked-extension suite: both planned cases blocked before page load by Windows `spawn UNKNOWN`.
- [ ] Manual Chrome/real ChatGPT shortcut, native pointer dragging/resizing, OS/IME behavior, and full integration verification.

Verification on 2026-11-08, Node 24.22.1:

| Check                  | Actual result                                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`    | Passed                                                                                                                  |
| `npm run lint`         | Passed                                                                                                                  |
| `npm run test`         | 121 tests passed across 9 files                                                                                         |
| `npm run build`        | Passed; content IIFE embeds production React and scoped island CSS (about 239 kB before gzip)                           |
| `npm run format:check` | Passed after formatting                                                                                                 |
| `npm run test:browser` | 2 tests could not execute: Chromium process creation failed with `spawn UNKNOWN`; no page loaded                        |
| Rendered preview       | Opera local synthetic fixture at desktop and embedded 360 × 640 viewport; screenshots and accessibility state inspected |

Browser availability: the dedicated Browser plugin/skill is absent, so the requested regular Playwright path was attempted. Both downloaded Chromium 1254 and pre-existing Chromium 1248 failed to spawn, including a retry through the app's Node runtime. The in-app browser could not reach the initial sandbox-local server. Desktop input automation timed out waiting for app access. An exposed loopback fixture plus the Opera connector provided rendered evidence without accessing actual ChatGPT messages: a temporary production-bundle copy outside the repository mapped the supported origin to localhost, with a mocked Chrome runtime and scripted synthetic submission. This preview does not prove actual Chrome installation, native shortcut delivery, or physical pointer behavior. It reported one island, focused composer, two temporary messages, original composer empty, and zero page errors in light/dark modes; screenshots showed no clipping in the narrow embedded viewport. No Playwright integration success is claimed.

The added unit tests cover opening from a valid typed trigger; selected text; focus; empty messages; Enter, native-default Shift+Enter and IME guard; local placeholder; closing/focus restoration/fresh reopen; same/new context behavior; expansion/restoration and retained geometry; root/body theme selection and system fallback; literal untrusted HTML text; viewport clamping/adaptive minimums; pointer capture/release/cancel, header control exclusion, non-primary buttons, resize minimums, viewport shrink, and unmount cleanup. Existing selection/command/messaging tests still pass. Their mocked content bridge isolates its callback consumer; real rendering is tested separately with the controller and typed trigger.

Implementation choices: the UI lives in `src/content/island`, with two React components (window and keyed chat session), a controller, geometry hook/helpers, scoped stylesheet, and theme observer. Popup/Shadow DOM tokens were extracted into one shared CSS file. Vite library-mode NODE_ENV substitution was added to avoid bundling development React and unresolved process globals. Playwright is the only added development dependency; no production dependency or manifest permission was added. Screenshots, temporary harness/server, and browser reports are outside the repository. The browser suite uses a synthetic intercepted ChatGPT-origin page and the real worker/content request, not real account content or native OS shortcut events.

Known limitations: the Chrome end-to-end and native pointer checks remain pending because the browser runtime cannot launch here. The last completed selection still uses the existing 80 ms debounce and semantic ChatGPT DOM/path assumptions. A closed island clears chat/draft but the selection manager retains its valid capture until lifecycle invalidation, permitting fresh reopen. Extremely short viewports may limit usable content space despite relaxed minimums. Host CSS isolation is implemented, but Shadow DOM is not a confidentiality boundary against the host page. AI responses remain unavailable; no Milestone 05 work has started.

Status: **Partial** — implementation, unit tests, production assets, and rendered component previews are complete; unpacked Chrome/native interaction verification is explicitly outstanding.

## Milestone 05 — message composer and context management

- [x] Separate immutable SelectionContext with exact selected text, source URL, and the original capture timestamp, carried through the existing local trigger.
- [x] Typed IslandConversation/ChatMessage/AIRequest/AIAdapter and idle/submitting/success/error snapshots; UUID conversation/message IDs.
- [x] Dedicated field-whitelisted, immutable request builder: context once, ordered island history/current question, no host conversation reads.
- [x] Replaceable local Promise-based mock adapter; constant labeled response, no network, keys, artificial delay, or website automation.
- [x] Composer trimming, multiline/auto-height, Enter/Shift+Enter/IME behavior, normalized 8,000-unit limit with visible feedback, empty-send prevention, and success-only input clearing/refocus.
- [x] Follow-ups preserve original context and completed local turns without duplicate context messages.
- [x] Synchronous pending-request lock; read-only pending input; safe inline adapter errors; editable retained question and retry without a duplicated failed turn.
- [x] AbortController plus request tickets invalidate pending results on close/context replacement; late success/failure cannot repopulate cleared or new state.
- [x] Controller owns one manager per keyed chat; repeated identical shortcuts retain state/geometry; new context starts fresh.
- [x] Near-bottom-only auto-scrolling respects a reader who scrolls upward.
- [x] React text rendering; no persistence, text logging, external transmission, original-message edits, new permissions, or new dependencies.
- [x] README workflow/manual checklist, architecture, current popup copy, and progress updated.
- [x] Strict typecheck, lint, unit/DOM tests, production build, and formatting pass (results below).
- [x] Conventional commit: `feat: implement island conversation management` (see Git history).
- [ ] Actual unpacked Chrome load/shortcut/live ChatGPT verification; both Playwright cases remain blocked at Chromium process launch.

Verification on 2026-11-08, Node 24.22.1:

| Command/check          | Actual result                                                                                                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`    | Passed                                                                                                                                                                                  |
| `npm run lint`         | Passed after removing an unused test parameter                                                                                                                                          |
| `npm run test`         | 144 tests passed across 11 files                                                                                                                                                        |
| `npm run build`        | Passed; updated content IIFE includes the local conversation manager, request builder, mock adapter, React UI and embedded CSS                                                          |
| `npm run format:check` | Passed after formatting                                                                                                                                                                 |
| `npm run test:browser` | Retried both 1280 × 800 and 360 × 640 cases; both stopped before page load with Windows `spawn UNKNOWN`                                                                                 |
| Rendered fixture       | Opera localhost-mapped production-bundle preview showed two questions/two labeled mock replies, one context and island, focused composer, original composer empty, and zero page errors |

The 23 new tests cover blank/whitespace inputs; exact 8,000-unit boundaries and oversized editable drafts; question trimming; selected text/timestamp preservation; immutable request construction and exclusion of unrelated fields; ordered follow-ups; unique IDs; deterministic mock behavior and abort; duplicate pending sends; safe errors and edited/unchanged retries; empty adapter results; late success/rejection after disposal; fresh conversations; inline UI errors and success refocus; context replacement and actual next-request metadata; cleanup/host-page preservation; respectful scrolling; and safe literal text rendering. Existing shortcut, selection, window and style/build tests continue to pass. The trigger payload test now verifies the original capture timestamp. Playwright specs were extended with a follow-up turn but did not reach a page in this environment.

Rendered evidence came from a separate synthetic local fixture with a mock runtime and only the supported-origin string mapped to localhost in a temporary copy of the production bundle. It is not a browser extension installation or real ChatGPT test. The fixture's accessibility tree showed one Selected context, ordered local turns, and four message articles; its status reported focused=true, originalEmpty=true and errors=0. Screenshot/harness artifacts are outside the repository. The actual Chrome load condition is therefore unverified rather than reported as passed.

Architecture choices: a small per-session immutable manager is owned by the island controller and consumed through React useSyncExternalStore. This allows synchronous send locking and immediate disposal before unmount, avoiding cancellation gaps during context replacement without Redux/global state. Retry updates the unanswered failed tail, preserving its ID, rather than injecting the question twice. Request data remains local and snapshots cannot mutate UI history. No provider or network implementation was added; AbortSignal support prepares a replaceable boundary only.

Known limitations and next steps: real Chrome/native shortcut integration remains pending because Chromium cannot spawn here. The default mock has no natural error/latency mode; injected test adapters cover failures and cancellation without adding product simulation controls. Length limits count normalized UTF-16 units; oversized drafts are rejected, not silently truncated. Selected context remains accessible in the scrollable conversation, with the same selection-manager debounce/lifecycle/semantic DOM assumptions as previous milestones. Closing clears island context/messages/draft but preserves the independent last valid capture for a fresh reopen. Future provider work requires a separately specified and authorized milestone; no Milestone 06 implementation has begun.

Status: **Partial** — implementation and automated unit/build verification are complete, with rendered follow-up evidence; actual Chrome installation/integration remains explicitly unverified.

## Milestone 06 — local backend and Responses API

Status: **Partial** — implementation and automated verification passed; a configured paid OpenAI response and actual Chrome extension installation/shortcut flow have not been verified. No API key was provided or sought, and no paid API call was made. Milestone 07 has not begun.

Implemented:

- Separate TypeScript Fastify backend with official OpenAI Node SDK, server-only environment credentials/configured model, fixed loopback binding and validated exact extension origin/Host.
- Strict shared payload validation, JSON/body/history/role limits, separate trusted instructions and untrusted selected context, stateless non-streaming Responses requests with store:false and bounded output. Context appears once; URLs/timestamps/IDs and mock messages are excluded.
- Real production adapter via one-request runtime Ports and fixed worker loopback relay; only loopback host permission added. Explicit offline builds retain the mock and disable relay registration, with build metadata guarding browser tests against paid calls.
- Waiting/real Assistant labels, privacy notice, allowlisted errors, retry without duplicate questions, layered deadlines, disconnect/close/context-change cancellation and stale-response protection.
- README setup, usage, exact manual checklist, cost warning, troubleshooting and privacy/security limitations; architecture updated to describe the current provider boundary.

Actual verification:

| Command/check          | Result                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| npm run typecheck      | Passed; includes backend equivalent typecheck                                                                                                          |
| npm run lint           | Passed; covers server and extension                                                                                                                    |
| npm run build          | Passed; production extension plus backend TypeScript output                                                                                            |
| npm run test           | 182 tests passed across 14 files; all provider calls mocked                                                                                            |
| npm run test:browser   | Offline build and guard succeeded; both cases failed before page load because Playwright Chromium executable was absent in the sandbox                 |
| Production restoration | Rebuilt after browser attempt; dist/build-info.json reports openai                                                                                     |
| Manifest inspection    | Correct command, activeTab, only http://127.0.0.1/* host permission, ChatGPT-only content injection                                                    |
| Credential boundary    | Production build ran with synthetic server-key canary; generated-asset tests found neither canary, key patterns, provider endpoint nor SDK identifiers |
| Loopback cancellation  | Real ephemeral HTTP disconnect test passed with loopback access outside sandbox; SDK itself mocked                                                     |
| Live API/manual Chrome | Not performed; no configured key, browser unavailable                                                                                                  |

The 38 additional tests cover schema/body/history/content-type/origin/Host validation; separate provider instructions and ordered context; missing/invalid credentials; unsupported model; quota/rate limits; incomplete/empty output; network/deadline failures; worker sender validation and one fetch per port; adapter/worker disconnect cancellation; stripped metadata/mock messages; real-answer UI labels; and a complete manager→adapter→worker→Fastify→mock SDK flow with follow-up history. Earlier disposal/stale-response, safe rendering, original-page preservation and retry tests remain passing. The socket test initially encountered sandbox bind restrictions, then passed with explicit local-loopback access. No test reached the real provider.

Dependencies are locked independently in server/package-lock.json (Fastify 5.12.8 and OpenAI 7.53.0). The root SDK-free extension package remains separate. Root checks intentionally cover both packages, without adding monorepo tooling.

Known limits: trusted local development only; Origin/CORS is not authentication. Extension IDs require explicit environment updates. Chrome host patterns cannot limit loopback permission by port, but code fixes port 8787/path. API usage can cost money. store:false does not guarantee zero provider retention. History is bounded at 21 messages/60,000 UTF-16 units, answers at 2,048 tokens/16,000 units, and generation at 25 seconds (worker 28/client 30). Incomplete output fails safely. No streaming, persistence, public hosting, accounts or automatic retries. ChatGPT semantic DOM/native shortcut compatibility remains a manual concern.

Remaining evidence: follow README's live 15-step checklist with a locally configured key and available Chrome; confirm real output/follow-up context, cancellation, unavailable backend errors and unchanged original conversation. No remaining milestone implementation is authorized by this checkpoint.
