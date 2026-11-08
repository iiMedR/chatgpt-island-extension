# Progress

## Milestone plan

Prompts 01 and 02 were supplied. Milestones 03–10 below remain a proposed roadmap, not requirements from unseen prompts.

1. Project setup and foundation — implemented and automated checks passed; manual Chrome verification pending.
2. Selection detection and validated context capture — implemented; automated verification passed. Real ChatGPT compatibility remains manually unverified.
3. Shortcut and isolated floating shell — not started.
4. Context preview and question composer — not started.
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

No browser-level verification yet. Readiness reports URL support only. Milestone 02 adds selection capture; the next proposed milestone is shortcut handling and the isolated floating shell. Milestone 03 has not started.

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
