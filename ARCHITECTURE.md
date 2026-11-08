# Architecture

## Technology and build

Manifest V3, React 19, strict TypeScript 6.0, Vite 7, Tailwind 4, Vitest, ESLint 10, and Prettier. Node 24 LTS is the pinned runtime. TypeScript stays on 6.0 because the installed typescript-eslint supports versions below 6.1; TypeScript 7 is incompatible. Vite's official React and Tailwind plugins serve the popup. Vite's build API emits a module worker and a standalone IIFE content script; no third-party extension integration or compatibility layer is needed. The TypeScript manifest is the single configuration source, emitted with each popup build. The lockfile pins the resolved dependency graph.

Compatibility references: [Vite requirements](https://vite.dev/guide/), [Tailwind Vite installation](https://tailwindcss.com/docs/installation/using-vite), [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts), and [Chrome tabs permissions](https://developer.chrome.com/docs/extensions/reference/api/tabs). Automated checks validate the installed combination; they do not substitute for Chrome installation tests.

## Execution contexts

- Background: registers installation listener synchronously at module evaluation; development-only diagnostics. No timers, persistent state, or attempts to keep the worker alive.
- Content: declaratively injected at document idle on the exact HTTPS ChatGPT origin, in Chrome's default isolated world. Owns a selection manager and the existing content-running ping responder. Reads only explicitly selected assistant-response text and validates its DOM ancestry. Does not modify the host DOM or read input values.
- Popup: short-lived React document. Queries the active tab on mount, checks exact URL origin, handles missing tabs/URLs and rejected API calls. Async updates are cancelled on unmount. Ready means supported origin only.
- Future island: intentionally unimplemented. Its eventual UI and temporary state belong in a separate module rather than in popup or worker lifetime.

Only directories with current responsibilities exist. Shared components, hooks, services, and types should be introduced when real consumers justify them.

## Permissions and communication

Only `activeTab` is requested. Opening the action gives temporary access to the active tab's URL. No `tabs`, storage, scripting, broad host, AI host, or incognito permission. Static content injection is restricted to `https://chatgpt.com/*`.

The sole current message is `FOUNDATION_PING`, returning `{running:true}` from content to an extension caller. Future messages should use a discriminated TypeScript protocol with runtime payload validation, sender/origin checks, request identifiers, and explicit failures. Worker restarts must not destroy authoritative conversation state; keep temporary island state in its mounted context. Do not create a long-lived port just to defeat worker suspension.

## Styling isolation

Popup styles are isolated in their own extension document. CSS variables define light/dark background, foreground, muted, border, secondary surface, input surface, and radius tokens. Tailwind maps utilities to tokens, with system typography and system theme detection.

Future content UI should mount a dedicated root into a Shadow DOM and inject its compiled stylesheet inside that root. Define tokens on `:host`, reset inherited typography at that boundary, and scope Tailwind preflight there. Do not inject today's global popup stylesheet into ChatGPT. Shadow DOM isolates CSS, not secrets or trust.

## Security and future provider boundary

Only explicitly selected assistant text is read. No full-conversation collection, network requests, credential collection, HTML injection, remote scripts, or persisted data exist. Production uses MV3's default extension CSP. React renders plain text; future markdown must sanitize untrusted output and restrict links. Never use eval or remotely hosted executable code.

## Selection module (Milestone 02)

`selection-dom.ts` owns native Selection/Range access and ancestry validation. `selection-validator.ts` is pure text validation: trim boundaries, reject empty text and text beyond 10,000 UTF-16 code units. Internal spacing is unchanged. `selection-types.ts` defines the immutable text/source URL/timestamp/source type record. `selection-manager.ts` owns event scheduling, state, and lifecycle. `getSelection()` is an internal, synchronous integration boundary for future content modules, not a runtime message exposing selected text. The current worker and popup receive no selection data.

The manager debounces `selectionchange`, passive `mouseup`, and passive `keyup` for 80 ms, reads the live selection at processing time, and deduplicates unchanged captures. It never prevents default events. No MutationObserver or continuous document scan exists: dynamic responses are validated when selected. Only range-local elements and their ancestors are checked.

Assistant ownership requires both range endpoints to resolve to the same nearest semantic message: `[data-message-author-role="assistant"]` or `article[data-turn="assistant"]`. Role attributes take precedence. User messages, missing/unknown roles, shadow-root selections, disconnected nodes, multiple ranges, editable ancestors/focused controls, forms, buttons, sidebar/search/navigation regions, and `[data-chatgpt-island-root]` are excluded. Intersecting excluded elements or another message inside the range also cause rejection, even with valid endpoints. Markdown descendants need no class-specific logic. This deliberately conservative policy may reject selections near response controls or alternate markup.

These semantic attributes are DOM assumptions, not an official ChatGPT contract. Both forms have fixture coverage, but no claim is made that either matches every current ChatGPT rollout. Unknown layouts fail closed. No generated class names, full message text, message IDs, account data, or other tabs are collected.

The most recent valid capture is held only in the content context; invalid/collapsed/outside selections preserve it. Origin/path changes invalidate it, including conversation/project routes; query/hash-only changes do not. `currententrychange` (when available) and `popstate` handle committed SPA navigation without patching History APIs. A one-second URL-only check covers missing/isolated-world events; every capture and getter also checks the URL. See [Chrome Navigation API documentation](https://developer.chrome.com/docs/web-platform/navigation-api). URL checks do not inspect page content. Same-path conversation switches, if introduced by ChatGPT, would require a revised lifecycle signal.

Navigation cancels pending processing and remembers only weak endpoint references/offsets to reject an unchanged stale DOM selection without retaining old DOM trees. Pagehide clears and suspends capture; pageshow resumes after BFCache restoration. Non-BFCache pagehide disposes the manager. Disposal removes listeners, cancels timers, and clears the record; full reload/context destruction naturally drops memory. An explicit internal `clear()` follows the same invalidation rule. No text is stored in browser storage, sent through messaging, or transmitted externally. Development diagnostics contain only fixed lifecycle labels and rejection reasons; production removes the debug callback.

Future provider calls belong behind an explicit service boundary, with user consent for the selected context, minimal provider host access, bounded requests, abort handling, and safe errors. Never bundle API secrets or scrape ChatGPT session tokens/private endpoints. Credentials and provider choice need a separate design before implementation. This extension must not send into ChatGPT's composer or create history conversations.
