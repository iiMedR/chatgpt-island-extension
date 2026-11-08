# Progress

## Milestone plan

Prompts 01–03 were supplied. Milestone 04 is the floating island UI, as specified by Prompt 03; later milestones remain a proposed roadmap, not requirements from unseen prompts.

1. Project setup and foundation — implemented and automated checks passed; manual Chrome verification pending.
2. Selection detection and validated context capture — implemented; automated verification passed. Real ChatGPT compatibility remains manually unverified.
3. Keyboard shortcut and island trigger — implemented and automated verification passed; live Chrome testing pending.
4. Floating island UI — not started.
5. Provider configuration and secure integration boundary — not started.
6. AI requests, response display, cancellation, and errors — not started.
7. Temporary follow-up conversation state — not started.
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

No browser-level verification yet. Readiness reports URL support only. Milestone 03 adds the shortcut and local trigger; Milestone 04 will implement the floating island UI and has not started.

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
