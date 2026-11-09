# Progress

## Milestone plan

Prompts 01–10 were supplied. Earlier sections are historical checkpoints. Milestone 10 prepares a controlled 0.9.0 developer-preview package and release drafts; live OpenAI and Chrome verification remain pending. Later milestones remain a proposed roadmap, not requirements from unseen prompts.

1. Project setup and foundation — implemented and automated checks passed; manual Chrome verification pending.
2. Selection detection and validated context capture — implemented; automated verification passed. Real ChatGPT compatibility remains manually unverified.
3. Keyboard shortcut and island trigger — implemented and automated verification passed; live Chrome testing pending.
4. Floating island UI — implemented; partial verification status recorded below.
5. Message composer and context management — implemented; verification recorded below.
6. Real AI provider integration — implemented; Partial pending configured live OpenAI/Chrome verification below.
7. Follow-up conversations and context optimization — implemented; automated evidence and remaining manual checks below.
8. Floating window UX and interaction polish — implemented; automated evidence and browser limitations below.
9. Testing, security and reliability — implemented; Partial due browser/live integration and distribution blockers below.
10. Developer-preview packaging and release preparation — implemented; public release blocked and live verification pending below.

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

## Milestone 07 — follow-up conversations and context optimization

Status: **Partial** — implementation, automated tests, production builds and documentation are verified. Live Chrome/API scenarios A–E remain unperformed; no claim of real model conversational quality or native extension delivery is made. Milestone 08 has not begun.

Implemented a pure context-manager at the existing adapter boundary. It keeps the original selected reference and current question, retains the newest complete user/real-assistant pairs under both configured limits (20 prior messages / 30,000 prior-history characters), and strips metadata, failed/pending/mock turns and unmatched messages. Older pairs are omitted only from requests; the full temporary UI history remains intact. At the first pair that cannot fit, retention stops rather than splitting a turn or backfilling disconnected older history. Selected text and current question have independent existing 10,000/8,000-unit limits. These are UTF-16 character approximations, not token guarantees. No summarization or auxiliary provider requests were added.

The manager records pending/failed/complete message states, preserves retry IDs, and explicitly checks conversation ownership alongside request tickets and abort state. Failed user turns are replaced on retry, with no fake assistant response or error text in request history. Shared runtime validation now enforces alternating whole history turns and the same character budget in both the worker and backend. Immutable local snapshots carry status; wire payloads remain only context.text and role/content messages.

Selection validation, same-context focus/history retention, new-context disposal, viewport/UI behavior, scroll preservation, backend/model configuration and separate trusted instructions/untrusted reference roles are reused. Temporary data stays in memory; close clears context/messages/draft/retry/pending state. No persistence, original-conversation collection or original-composer submission was introduced.

Actual verification:

| Check                  | Result                                                                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| npm run typecheck      | Passed; includes separate backend typecheck                                                                                         |
| npm run lint           | Passed; includes extension, backend and tests                                                                                       |
| npm run build          | Passed; production extension and compiled backend                                                                                   |
| npm run test           | 196 tests passed across 15 files; all provider calls mocked                                                                         |
| npm run format:check   | Passed                                                                                                                              |
| Request inspection     | Pure wire-builder tests verify original reference once, ordered complete pairs, current question once, exact bounds and no metadata |
| Backend validation     | Over-budget history and split roles return 400 without invoking the SDK                                                             |
| Manual Chrome/live API | Not performed; prior environment lacked Chromium and no backend key is configured                                                   |

Fourteen additional tests cover first/multiple follow-ups; exact 20-message and 30,000-character boundaries; selected/current text at maximum lengths; whole-turn pruning and chronological retention; failed/pending/mock/orphan exclusion; deterministic immutable snapshots; duplicate IDs; injection-like text staying in a user reference; full UI-store history and stable IDs after 14 turns; retry completion state and history; no browser persistence API writes; and backend rejection before provider generation. Existing tests continue covering same-selection preservation, replacement/close cleanup, late success/error rejection, abort propagation, respectful scrolling and unchanged original page. The existing socket cancellation test ran with loopback access outside the sandbox. No paid API calls or browser integration tests ran during this milestone.

Files: added conversation/context-manager.ts and tests/context-manager.test.ts; updated conversation types/manager/request-builder/OpenAI adapter, shared schema/limits, adapter/backend tests and README/ARCHITECTURE/PROGRESS. No manifest, model, provider or dependency change was required.

Known limits: older visible discussion can fall out of model context; counts approximate token usage. The application preserves roles and trusted instructions but cannot guarantee model immunity to arbitrary prompt injection. The local backend remains unauthenticated trusted development infrastructure, not public hosting. store:false does not promise zero provider retention; cancellation cannot undo already processed/billed provider work. Standard tests use mocks rather than validating live model answers. README contains exact manual scenarios A–E for normal/long follow-ups, replacement, failure/retry and close cancellation, each checking original-page preservation. Later milestones remain unstarted.

## Milestone 08 — floating window UX and interaction polish

Status: **Partial** — code, unit/DOM tests and production builds pass; rendered/native Chrome verification is blocked by the environment. Milestone 09 has not begun.

Changes: frame-batched pointer geometry, stable hook callbacks, single-pointer ownership, final movement flush, frame/listener/capture cleanup, and no animation during gestures. Existing viewport/default/minimum/expand/restore helpers remain in use, with responsive regression coverage. Closing still resets geometry; open-session geometry survives chat updates and selection replacement. Focus restoration now follows nested shadow focus and avoids detached controls; successful responses refocus only when the composer still owns focus. Added a 120 ms opacity-only opening animation with reduced-motion override, internal short-viewport composer scrolling, nonshrinking header controls, wrapped hints and context-to-conversation scroll chaining. Closing remains immediate to cancel requests and clear sensitive data without an exit timer.

Existing Enter/Shift+Enter, IME Escape exemption, non-modal Tab behavior, visible focus, keyboard move/resize, theme token/attribute/system fallback, near-bottom scrolling, cancellation, context limits and retries are preserved. No backend contracts, provider settings, permissions, dependencies or extra AI requests changed. No persistent geometry/history storage was introduced.

Actual verification on 2026-11-09:

| Command/check                      | Actual result                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| npm run typecheck                  | Passed, including backend equivalent                                                                   |
| npm run lint                       | Passed with no remaining hook warning                                                                  |
| npm run test                       | 210 tests passed across 15 files; provider calls mocked                                                |
| npm run build                      | Passed, extension and backend compile; production mode restored after browser attempts                 |
| npm run format:check               | Passed                                                                                                 |
| npm run test:browser               | Expanded to six viewport cases; all stopped before page load: sandbox Chromium executable missing      |
| Host-cache browser attempt         | Same offline suite retried outside sandbox; all six failed at browser spawn with Windows spawn UNKNOWN |
| Manual Chrome/live API/rendered QA | Not performed; no screenshot/visual pass is claimed                                                    |

Fourteen added tests cover frame coalescing (multiple moves produce one render), foreign pointer cancellation, final flush, queued-frame/unmount cleanup, viewport listener removal, clamped restore, six initial/move/resize viewport widths (1920/1440/1024/768/480/280), composing Escape and reachable controls, nested-shadow/detached focus restoration, delayed-answer focus ownership, long plain text/geometry stability, and reduced-motion/wrapping/scroll CSS plus compiled asset presence. Existing tests continue checking selection/shortcut isolation, same/new selections, one root, themes, safe rendering, scroll position, pending cancellation and original-page preservation. Browser fixtures now cover 1920/1440/1024/768/480/360 widths when Chromium can run. Browser plugin was not available, so the frontend testing skill used the existing Playwright test path. All browser runs explicitly built offline to avoid paid calls; final dist is rebuilt in production mode.

Files modified: useIslandWindow.ts, IslandChat.tsx, island-controller.tsx, island.css; window/island/conversation UI/build tests; browser viewport fixtures; README, ARCHITECTURE and PROGRESS. Pure window helpers, theme detection, selection/commands and backend implementation are reused.

Known limits: DOM and pure-geometry tests cannot establish rendered contrast, actual browser Tab order, native drag smoothness, wheel behavior, zoom correctness or extension loading. Execute README's exact manual scenarios A–F in Chrome, including host themes, reduced motion, short viewports, pending-response focus and original-conversation preservation. At extreme viewport sizes the composer scrolls and not all content fits at once. No fade-out/geometry transition was added; immediate cleanup and unanimated dragging are intentional. Live provider functionality remains unverified with actual credentials; all previous mocked AI regression tests pass. Milestone 09 remains unstarted.

## Milestone 09 — testing, security and reliability

Status: **Partial**. Source/test-backed implementation audit, fixes, CI configuration and documentation are complete. Native browser/load/shortcut/live-ChatGPT compatibility and public distribution authorization remain unverified/unresolved. Milestone 10 has not begun; public Web Store packaging is not ready.

Audit scope: repository inventory/status/recent commits; README/architecture/progress; manifest/default CSP and permissions; background commands/AI relay; content initialization and range/selection manager; React/Shadow DOM/styles/focus/geometry; conversation manager/context pruning/request builder/adapter; Fastify/OpenAI/config/error boundaries; tests, scripts, dependency locks and absence of existing CI. Production source search reviewed every use of HTML insertion, dynamic execution, fetch, URL construction, storage, logging, timers, observers and DOM queries. No original-conversation scan, unsafe HTML/eval/remote script, analytics or persistent chat storage was found in production source. Semantic ChatGPT DOM remains a fixture-backed assumption. No unrelated changes were present initially.

Implemented/fixed:

- Low-severity error sanitization defect: Fastify's default unknown-route body reflected requested URL/query. A fixed 404 payload now replaces it, with regression evidence excluding private marker text.
- Bounded backend admission: at most four active provider requests per process; overflow returns busy/429 before calling SDK, and finally releases slots. This reduces accidental concurrent load/cost; it is not authentication, a total billing cap or sequential-abuse protection.
- Dependency remediation: initial root npm audit reported 2 critical and 11 moderate affected packages (development graph), including Tinypool gadget advisories and Vitest/mocker traversal plus minimatch glob amplification. Reviewed Node/Vite compatibility, then moved Vitest 3.2.7 to patched 4.1.12 and added a development minimatch override resolving to 11.0.5. Removed the old Tinypool dependency. Avoided audit-force and unrelated latest-major updates. Tests/types/lint pass after one test mock-call type annotation required by newer Vitest types. Added axe-core 4.14.0 for structural accessibility checks.
- Standard-test fetch guard rejects external/provider URLs unless a test explicitly supplies a mock, preserving actual local cancellation tests. No paid or live API call was made.
- Full fixture workflow test composes selection, command routing, React UI, validated backend/SDK mock and follow-up history; checks no unrelated selected-page data, original input/message preservation, one root and 20 close/reopen cycles. Existing ai-flow covers runtime Port/worker transport separately.
- New built-extension/mock HTTP suite covers follow-up privacy, retry and pending close/new-context isolation. It must exclusively bind port 8787 before browser launch, contains no SDK/key, and fails on collision. Separate build metadata/config guard test modes. Existing six-viewport UI suite remains offline-only.
- GitHub Actions installs both lockfiles, checks types/lint/format/build/tests/audits, installs Chromium, runs both suites, then restores production. Read-only repository permission, no keys, paid calls, publishing or deployment. Workflow has not been run on GitHub in this session.
- Added root SECURITY.md and TESTING.md; updated README/ARCHITECTURE and this evidence. Policy resolver confirms the root policy applies. No owner-approved vulnerability exclusions were invented.

### Actual verification, 2026-11-09

| Command/check                       | Actual result                                                                                                                                                                                      |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| npm run typecheck                   | Passed, including backend typecheck                                                                                                                                                                |
| npm run lint                        | Passed                                                                                                                                                                                             |
| npm run format:check                | Passed                                                                                                                                                                                             |
| npm run build                       | Passed, extension and backend; final dist mode openai                                                                                                                                              |
| npm run test                        | 218 tests passed across 18 files under Vitest 4.1.12                                                                                                                                               |
| npm audit (root, after remediation) | Exit 0, zero advisories at every severity                                                                                                                                                          |
| npm audit (server)                  | Exit 0, zero advisories at every severity                                                                                                                                                          |
| npm outdated (root)                 | Exit 1 listing available newer majors; current packages meet declared wanted ranges                                                                                                                |
| npm outdated (server)               | Exit 0, no outdated packages reported                                                                                                                                                              |
| npm run test:browser                | All 6 cases fail before page load at Windows browser spawn UNKNOWN                                                                                                                                 |
| npm run test:backend-browser        | Local mock setup succeeded; all 3 cases fail before page load at Windows browser spawn UNKNOWN                                                                                                     |
| axe structural checks               | No violations in enabled jsdom-supported rules; contrast/host-document rules excluded explicitly                                                                                                   |
| Bundle credentials                  | Built with synthetic server-key canary; artifact tests reject canary/key patterns/provider SDK/endpoint in extension                                                                               |
| Coverage percentage                 | Not measured; no percentage claimed                                                                                                                                                                |
| Live Chrome/OpenAI/manual           | Not performed; no credentials or paid calls used                                                                                                                                                   |
| Formal security scan                | Launcher rejected scope with “Scan scope must reference an existing directory inside the target.” No registered/sealed scan or certification claimed; implementation audit continued independently |

Advisory references: [Tinypool worker-options gadget](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3), [Tinypool run-options gadget](https://github.com/advisories/GHSA-85c8-ppgw-ccpr), [Vitest/mocker traversal](https://github.com/advisories/GHSA-82fw-gwwq-j7x9), [minimatch amplification](https://github.com/advisories/GHSA-g3hv-75wg-m249). The initial critical labels concern the development dependency graph, not a demonstrated shipped extension RCE. Patched graph is clean according to the dated npm audit, not a guarantee against undisclosed vulnerabilities.

Outdated-major assessment: newer jest-dom, Chrome/Node types, React Vite plugin, jsdom, TypeScript, Vite and Vitest majors were available. Node types remain aligned with Node 24; TypeScript stays on the existing supported parser/toolchain combination. No unpatched audited advisory required adopting those unrelated majors. The minimatch override crosses a major in development tooling and needs ongoing review; remove it when upstream ranges include the patched version. No production framework/SDK/model change was needed.

### Acceptance evidence and blockers

- [x] Source implementation audit and confirmed fixes; selection/commands/conversation/window/lifecycle/failure/security regressions pass.
- [x] Primary workflow has executed DOM/backend mocked coverage; separate transport integration passes.
- [x] Key-only-server boundary, bounded request privacy, no application persistence and original-page preservation are covered by source/tests.
- [x] Prompt instructions/reference role separation tested; no promise of complete injection immunity.
- [x] Backend validation/access limitations reviewed and documented; simultaneous work bounded.
- [x] Dependency advisories assessed and patched; builds/checks pass.
- [x] Performance reviewed: the existing coalescing test measures multiple moves yielding one render per frame; cleanup/cycle tests pass. No live CPU/heap benchmark or “no slowdown” claim.
- [x] Accessibility source/control/focus review and axe structural check; no full-compliance claim.
- [x] CI configured, security/testing documentation created.
- [ ] Actual unpacked Chrome loading, native OS shortcut, worker restart/focus behavior and real ChatGPT DOM verified in a running browser.
- [ ] Real browser responsive/scroll/zoom/contrast/assistive technology verification.
- [ ] GitHub Actions executed successfully on hosted runner.
- [ ] Public backend authorization/provisioning, explicit distribution privacy/cost requirements and private maintainer reporting contact resolved.

| Severity | Finding/readiness assessment                                                                                                                                                                                                                                                                                                                             |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Critical | Initial critical dev-tool advisories remediated. No confirmed unresolved critical source defect identified in reviewed paths; this is not proof of absence.                                                                                                                                                                                              |
| High     | Public distribution blocker: local processes can forge Origin/Host and spend the backend API quota. Current trusted-machine prototype has no client authentication. Public hosting/distribution requires a separately specified authorization/provisioning design; do not distribute shared secrets. Four-request admission does not fix authentication. |
| Medium   | Windows browser launch failure prevents all 9 rendered cases; live DOM/native shortcut/worker/browser behavior and remote CI remain unverified. Provider costs are disclosed but no in-app hard spending cap exists. Public distribution needs an explicit privacy/authorization/cost assessment.                                                        |
| Low      | Manual contrast/screen-reader/zoom/wheel checks and configured private reporting contact are pending. Keep the development override reviewed; no visual defect is asserted without rendered evidence.                                                                                                                                                    |

Release decision: **not Chrome Web Store/public-backend ready**. Local development can continue under documented trusted-machine assumptions. Before Milestone 10 packaging, obtain running-browser evidence (including the mock backend transport cases), decide how users securely provision/authenticate a local backend, review cost/privacy disclosures and provider handling, configure maintainer reporting, and run hosted CI. No additional API calls, public infrastructure, accounts, payments or packaging were implemented.

Final regression additions explicitly test overlapping command calls targeting two different supplied ChatGPT tab IDs without fallback queries, plus all three instruction-like reference examples (ignore instructions / reveal prompt / send conversation elsewhere) remaining separate user-reference data. A targeted sandbox run stopped before collection because Vitest's temporary-cache rename returned EPERM; the final full suite outside that sandbox passed all 218 tests. This environmental failure is not reported as a test pass.

## Milestone 10 — 0.9.0 developer-preview release preparation

Release type: **Developer Preview (Option A)**. No secure hosted backend or deployment exists, so localhost architecture is preserved. Overall status: **Partial** for complete runtime/browser verification; developer-preview packaging/documentation are implemented, and public release is **blocked**. No upload, publication, deployment, registration fee, tag or push was performed. Earlier sections are historical milestone evidence.

Implemented:

- Consistent 0.9.0 project/backend/lockfile/manifest version, Developer Preview version_name, accurate setup-required description, popup/README labeling and CHANGELOG without invented prior releases.
- Original provisional neutral raster icons generated deterministically at 16/32/48/128 px, registered for manifest/action, with transparent padding and no proprietary logo. 128 px was visually inspected; final branding/name approval remains unverified. Removed obsolete public/icons/.gitkeep after the package allowlist correctly rejected its copied output.
- Explicit unchecked AI submission consent, separate from send. It names selected text/question/recent history, localhost/OpenAI, costs and provider retention. The sole preference is an in-memory boolean for the keyed temporary conversation, retained for same-selection refocus and cleared on close/new selection. No new permission/browser storage or automatic API request. Consent acceptance returns focus to the composer. Existing offline mock mode makes no provider requests.
- Production/openai-only build metadata guard and narrow archive allowlist. Manifest/runtime/popup references, icon PNG dimensions, empty/oversized files, unwanted source/test/env/map files and secret/SDK/development markers are checked before packaging. Archive entries are bounded/path-validated before clean extraction. Third-party React/ReactDOM/Tailwind license notices are included from installed locked dependencies. The repository's own external-distribution licensing decision still needs human approval; no license is invented.
- Sorted deterministic ZIP entries/canonical archive metadata and SHA-256; no source or Git timestamps are changed. Determinism is scoped to identical built inputs and verified locally, not a guarantee across every OS/compiler version. Generated releases/ and dist/ are intentionally Git-ignored; generators, tests, locked versions, source/docs and CI changes are committed.
- package:preview rebuilds production and writes the extension-only ZIP, checksums, file list and notes. verify:package checks the hash, unpacks to a fresh checked temporary directory, verifies asset bytes/manifest-at-root, then cleans up. The ZIP neither installs nor deploys the separately configured backend.
- Privacy policy, store listing, screenshot plan, PASS/FAIL/NOT VERIFIED checklist, manual submission guide, actionable production-readiness plan and release notes in docs/. README/ARCHITECTURE/SECURITY/TESTING updated for actual preview/consent/package behavior. CI packages and verifies only after its checks/browser stages; no remote CI run is claimed.

Official Chrome policies and current preparation/publication/listing/image/account guidance were reviewed on 2026-11-09. The official Education category exists and is recommended for this explanation/learning tool, subject to dashboard/owner review. Single purpose, disclosure/consent, minimal access, packaged code, third-party processing, name/branding, actual screenshots, privacy URL and setup/cost requirements are reflected in drafts. Compliance is **not certified**: public operator/contact/policy URL, authenticated backend provisioning, pre-installation disclosure/security review (including loopback HTTP) and reviewer approval remain unresolved. References are linked in docs; no public URL/email or actual account state is invented.

### Verification evidence

Final actual command results, ZIP size/hash, file list and Git status are recorded below after the final package run. New tests cover numeric/preview version consistency, all icon sizes, deterministic archive/readback, allowlisting/missing/tampered/secret content, rejection of mock/development builds and consent send/Enter/lifecycle. Existing local integration/security/backend tests remain applicable. An initial manifest read using import.meta.url failed under jsdom's virtual URL; it now reads the repository-root package file, matching the documented root execution directory. Initial package rejection of .gitkeep was resolved by deleting the obsolete placeholder. Both were caught and fixed rather than hidden.

Both browser suites were attempted again: six offline UI viewport cases and three exclusive mock-HTTP cases stopped before page load with Windows spawn UNKNOWN. No new application screenshots, native extracted-extension loading or real API answer is claimed. No paid requests or real credentials were used. Screenshot instructions explicitly require genuine future captures and prohibit presenting mock responses as real AI output.

### Remaining blockers and conclusion

| Severity | Unresolved issue                                                                                                                                          | Next action                                                                                        |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Critical | No unresolved critical source defect confirmed in reviewed paths; not proof of absence                                                                    | Retain independent review and repeat checks after changes                                          |
| High     | No secure consumer-accessible backend or authenticated local provisioning; current loopback process trusts local clients and has no per-user spend quotas | Execute docs/PRODUCTION_READINESS_PLAN.md before public distribution; do not expose current server |
| Medium   | Browser/ChatGPT/native shortcut/live API verification, extracted Chrome load and hosted CI unverified                                                     | Run documented scenarios on working Chrome with separately authorized live API checks              |
| Medium   | Public policy URL/contact/operator identity, privacy/cost/security review and genuine screenshots missing                                                 | Complete responsible-owner review and publish accurate documentation only with authorization       |
| Low      | Provisional icon/name, project licensing and manual accessibility/zoom/contrast approval pending                                                          | Obtain human branding/licensing review and actual assistive-technology/visual evidence             |

Developer-preview ZIP is for controlled local technical evaluation with documented limitations. **Developer preview ready — public release blocked.** This conclusion concerns the prepared artifact, not a claim of fully verified runtime behavior or store acceptance. No further milestone, public backend, publishing action or Git tag was started.

### Final automated/package results (2026-11-09)

| Command/check                                  | Actual result                                                                                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| npm run typecheck                              | Passed; includes backend equivalent                                                                                                                          |
| npm run lint                                   | Passed                                                                                                                                                       |
| npm run test                                   | 224 tests passed across 19 files; real providers mocked, public fetch guarded                                                                                |
| npm run build / package:preview                | Production extension and backend compile; package generator passed                                                                                           |
| npm run verify:package                         | ZIP checksum, clean temporary extraction, root manifest and all runtime byte comparisons passed                                                              |
| npm audit / server npm audit                   | Both exited 0, zero advisories, including development ZIP dependency                                                                                         |
| npm run test:browser                           | 6 cases stopped before page load with Windows spawn UNKNOWN                                                                                                  |
| npm run test:backend-browser                   | 3 cases stopped before page load with Windows spawn UNKNOWN                                                                                                  |
| Live API / extracted Chrome load / screenshots | NOT VERIFIED; no paid calls or real product captures                                                                                                         |
| Production manifest                            | JSON parsed; MV3, 0.9.0 + Developer Preview, module worker, ChatGPT-only content, correct command/popup/icons, activeTab and loopback only, no CSP weakening |
| Secret scan                                    | Built with synthetic server-key canary; client/package marker/key-pattern scans passed; no backend/env/test/map/node_modules/.git files in ZIP               |

Artifact: releases/chatgpt-island-v0.9.0.zip. The authoritative final checksum/size is in releases/SHA256SUMS.txt and the package command output; this avoids stale copied hashes when rebuilding. Its complete verified file list is in releases/FILE_LIST.txt: manifest.json, background.js, content.js, the runtime popup HTML and its compiled JS/CSS assets, four PNG icons and THIRD_PARTY_NOTICES.txt (11 files). releases/RELEASE_NOTES.md is a separate companion copied from tracked docs/RELEASE_NOTES.md. Generated artifacts are intentionally ignored, not omitted accidentally from Git. No backend installer/service is present.

Release drafts are complete as drafts; final screenshot images, hosted policy/contact URLs, account eligibility, name/branding/licensing and public authorization are FAIL or NOT VERIFIED in the checklist. The first archive generation attempt failed on an obsolete .gitkeep, and initial artifact test imports failed on a virtual jsdom URL; both were fixed and all 224 tests then passed. The final formatting check initially flagged manifest.config.ts; formatting was corrected and checked again. No unresolved functional test failure is hidden. Browser startup failures remain unresolved environmental evidence, not passes.
