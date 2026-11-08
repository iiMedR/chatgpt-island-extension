# Architecture

## Technology and build

Manifest V3, React 19, strict TypeScript 6.0, Vite 7, Tailwind 4, Vitest, ESLint 10, and Prettier. Node 24 LTS is the pinned runtime. TypeScript stays on 6.0 because the installed typescript-eslint supports versions below 6.1; TypeScript 7 is incompatible. Vite's official React and Tailwind plugins serve the popup. Vite's build API emits a module worker and a standalone IIFE content script; no third-party extension integration or compatibility layer is needed. The TypeScript manifest is the single configuration source, emitted with each popup build. The lockfile pins the resolved dependency graph.

Compatibility references: [Vite requirements](https://vite.dev/guide/), [Tailwind Vite installation](https://tailwindcss.com/docs/installation/using-vite), [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts), and [Chrome tabs permissions](https://developer.chrome.com/docs/extensions/reference/api/tabs). Automated checks validate the installed combination; they do not substitute for Chrome installation tests.

## Execution contexts

- Background: registers installation listener synchronously at module evaluation; development-only diagnostics. No timers, persistent state, or attempts to keep the worker alive.
- Content: declaratively injected at document idle on the exact HTTPS ChatGPT origin, in Chrome's default isolated world. Only an origin guard, development diagnostic, and content-running ping responder. Never touches the DOM, inputs, selections, or conversations.
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

No conversation reads, network requests, credential collection, HTML injection, remote scripts, or persisted data exist. Production uses MV3's default extension CSP. React renders plain text; future markdown must sanitize untrusted output and restrict links. Never use eval or remotely hosted executable code.

Future provider calls belong behind an explicit service boundary, with user consent for the selected context, minimal provider host access, bounded requests, abort handling, and safe errors. Never bundle API secrets or scrape ChatGPT session tokens/private endpoints. Credentials and provider choice need a separate design before implementation. This extension must not send into ChatGPT's composer or create history conversations.
