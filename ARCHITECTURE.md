# Architecture

## Build and execution contexts

Manifest V3, React 19, strict TypeScript 6.0, Vite 7, Tailwind 4, Vitest, ESLint 10 and Node 24. The TypeScript manifest emits the popup, module worker and ChatGPT-only content IIFE. React and inline island CSS are bundled locally, without remote scripts or relaxed CSP. A separate server package contains Fastify and the official OpenAI SDK; neither is bundled into the extension.

Content owns selection validation, the trigger controller, one Shadow DOM React root and temporary conversation state. The popup checks supported active-tab status. The worker handles browser commands and a narrowly validated AI transport. The backend alone owns credentials and provider configuration. Worker restarts cannot erase authoritative conversation state in content; an interrupted request fails safely and can be retried manually.

## Selection and shortcut lifecycle

The selection manager reads only a native explicitly selected range contained in one semantic assistant response. Its validator trims boundaries, preserves internal text, and rejects empty or over-10,000-unit text. Editable controls, user messages, sidebar, extension UI and cross-region ranges are rejected. The manager debounces capture by 80 ms and retains the last valid capture; navigation/page lifecycle invalidation clears it. No full conversation is collected.

The browser-scoped open-island command suggests Alt+Shift+E. Commands API registration is idempotent. The worker prefers the command's supplied tab, falling back to the active current-window tab only when absent. It validates supported exact HTTPS origin, active status, pending navigation and ID, then sends a typed frame-zero ISLAND_OPEN_REQUEST. This trigger message carries no selected text. A two-second response deadline bounds missing receivers. Chrome assignment conflicts are diagnosed safely in development; users customize through chrome://extensions/shortcuts.

Content retrieves the existing validated capture and emits a typed island-open payload with selectedText, sourceUrl, original capturedAt and triggeredAt. Missing/invalid state returns a typed rejection, with no page recapture. One registered listener and controller avoid duplicate events/roots. Repeating an identical capture focuses the current composer; a different capture disposes the old conversation before replacement. Closing clears island state while the independent selection capture can remain valid for reopening.

## React and window isolation

The controller owns one React root in an extension-owned shadow host. Closing unmounts and removes it. Compiled island.css?inline is injected inside the shadow root, with token variables on :host and a local typography/box-sizing reset. No global ChatGPT CSS is modified. Shadow DOM isolates styles, not confidential content from the host website.

A dedicated window hook handles pointer capture for header dragging and corner resizing, pointer cancellation, keyboard movement/resizing, viewport clamping and viewport changes. Idle document gesture listeners are avoided. Expand preserves prior geometry for restoration; no Fullscreen API is used. Header/composer stay outside the scrollable conversation. Explicit host light/dark attributes/classes take precedence over system fallback. Focus enters the composer, Escape is scoped to the island, and Tab can leave the non-modal dialog. User content is rendered as React text, never raw HTML.

## Conversation model and request lifecycle

A per-conversation immutable manager supplies snapshots through useSyncExternalStore. IslandConversation contains a unique ID, SelectionContext (text/sourceUrl/capturedAt), ordered ChatMessages, creation time, draft and idle/submitting/success/error request state. UUID message IDs are unique. Assistant kind distinguishes real AI output from mock output; the UI labels these Assistant and Development placeholder respectively.

Input validation trims questions and rejects blank or over-8,000-unit input. Enter submits, Shift+Enter inserts a newline, and IME composition is respected. A synchronous pending lock blocks duplicate submissions. The manager adds the question, builds an immutable structured AIRequest, invokes an injected AIAdapter, then adds the answer and clears/refocuses the composer on success. Failure retains the editable question with an inline safe error. Retry updates the unanswered tail instead of adding a duplicate turn.

AbortController and request tickets invalidate work synchronously on disposal or context replacement, preventing late success/error updates. Draft, history and selected context are never persisted. Scroll behavior follows new messages only when the reader is already near the bottom.

## Production data flow

1. The request builder snapshots selected context and ordered island messages separately.
2. openai-adapter delegates to the pure context-manager wire builder, which strips URLs, timestamps, IDs and non-complete/mock turns. It retains at most 20 completed history messages and 30,000 history UTF-16 units, plus the current user question. The current question and original selected reference remain.
3. A dedicated runtime Port sends one validated AI_REQUEST to the extension worker. One port per request provides disconnect-based cancellation, not a keepalive mechanism.
4. ai-relay accepts only the same extension ID, supported ChatGPT sender URL and top frame. It validates exact message shape and payload, ignores repeat messages, and performs one fetch to the fixed http://127.0.0.1:8787/api/chat URL. Redirects, credentials and cache are disabled.
5. Fastify validates Origin, Host, JSON content type, 256 KiB body limit and strict shared schema before generation.
6. The server calls the official SDK responses.create with its configured model and key. Separate trusted instructions describe incomplete external context, ask for clarification and tell the model to treat the reference as untrusted data. A JSON-encoded selected reference appears once as user material, followed by ordered island turns.
7. Completed nonempty output_text returns as {text}; allowlisted failures return only {error:code}. The relay and adapter validate output before updating the live conversation.

This worker relay is necessary because [content-script requests use the page origin](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests). Only the loopback host permission is added to activeTab. Chrome match patterns cannot scope it to a port; code still fixes port/path. Declarative injection stays restricted to https://chatgpt.com/*. No tabs/storage/scripting/all-sites/OpenAI host permissions or incognito enablement are added.

## Backend and OpenAI boundary

server/src/config.ts reads server-side environment configuration: OPENAI_API_KEY, OPENAI_MODEL, PORT and exact EXTENSION_ORIGIN. Missing key produces a safe request error; invalid origin/port fails startup with fixed messages. The server binds only 127.0.0.1. Extension ID changes require explicitly updating the environment, never wildcard CORS.

The official Node SDK uses fixed https://api.openai.com/v1, disabled logs and retries, separate instructions, stream:false, store:false and max_output_tokens:2048. Only completed answers up to 16,000 units are accepted. No provider conversation ID, database, tools, arbitrary client model/key or ChatGPT website automation is used. The configured gpt-4.1-mini example supports Responses; it is replaceable server-side. References: [SDK](https://developers.openai.com/api/docs/libraries), [model](https://developers.openai.com/api/docs/models/gpt-4.1-mini), [stateless requests](https://developers.openai.com/api/docs/guides/migrate-to-responses). store:false is not a guarantee of zero provider retention.

The shared schema accepts only context.text and bounded role/content messages, with first/last user roles, role allowlisting, per-role lengths and no extra fields. Known mock response strings are also rejected server-side. Historical mock responses never become provider context.

## Cancellation, errors and local security

Client deadline is 30 seconds, worker fetch deadline 28 seconds and backend generation deadline 25 seconds. Client cancellation disconnects the Port, aborting worker fetch. HTTP disconnect aborts the SDK signal. Backend races generation against deadline/disconnect, releasing listeners and timers even if an injected adapter ignores cancellation. No automatic paid retries occur.

Errors distinguish missing/invalid key, unsupported model, rate limit, insufficient credits, timeout, unavailable backend/provider, invalid payload and empty/incomplete answer. Raw SDK messages/stacks never reach the browser. Backend diagnostics contain only fixed error codes and HTTP statuses; SDK and HTTP request-content logging are disabled. Development shortcut diagnostics contain fixed labels only.

Origin and Host checks, exact CORS, restricted JSON, limits, timeout and loopback binding reduce local exposure. They are **not authentication**: a local native client can forge headers. This is trusted local development, not a public production backend. No accounts, public deployment, streaming or persistence are included.

## Offline mode and verification

Production initialization explicitly injects createOpenAIAdapter; isolated controller tests can inject a mock. --offline builds inject the mock and compile out relay registration. dist/build-info.json records openai or mock mode. Browser fixtures build and assert mock mode before sending questions, preventing accidental paid test calls. Restore production with npm run build afterward.

Root typecheck/build cover both packages; root ESLint and Vitest cover server code/tests too. SDK calls are mocked, including a full manager→adapter→worker→Fastify→SDK fixture with follow-ups. A real ephemeral loopback disconnect test verifies SDK abort propagation without contacting OpenAI. Artifact tests scan for a synthetic server-key canary, real-key patterns and bundled provider SDK/endpoint. Native Chrome load/shortcut delivery and a configured real API answer remain separate manual verification requirements.

## Milestone 07 context optimization

context-manager.ts owns pure deterministic production request construction, independent of React and DOM. request-builder.ts still creates an immutable local snapshot, including message completion status. Context is a separate immutable object, never injected into the visible question/history. Metadata stays local and is removed at the wire boundary. The same extension/backend schema enforces the limits from shared/ai-contract.ts:

- MAX_COMPLETED_HISTORY_MESSAGES = 20 (10 completed pairs).
- MAX_HISTORY_CHARACTERS = 30,000; excludes selected reference/current question.
- Original selected text <=10,000 and current question <=8,000; neither is truncated.
- Up to 21 wire messages and 48,000 aggregate text units. Character counts approximate tokens, with no token guarantee.

Algorithm: require a final user question and unique local message IDs; scan earlier messages in insertion order for adjacent complete user/assistant pairs. Absent status is treated as complete for compatibility. Exclude pending/failed users or assistants, mock-kind/known-placeholder answers, and orphan messages together with their unmatched questions. Starting at the newest eligible pair, retain whole pairs while both count and character budgets permit. Stop at the first pair that cannot fit rather than backfilling disconnected older discussion. Restore chronological order and append the current question exactly once. Strict schema validation rejects malformed lengths/roles/shape; the server independently requires alternating complete pairs followed by one user question and checks the history budget. No messages are partially sliced. UI history is unchanged by this selection.

The manager now explicitly marks the current user pending, failed on error, and complete on success alongside a complete assistant. Retry reuses its stable ID and replaces the failed tail with the edited/current question. Error labels are state, never conversation content. Each request captures its owning conversation ID in addition to existing request tickets/AbortController; both success and failure are discarded if ownership changed. One synchronous pending lock prevents overlaps. Closing/replacing disposes the manager and clears messages, draft, retry ID and context. Same-selection triggers retain the existing manager and focus behavior.

Provider/model, trusted instructions, untrusted-reference JSON role, store:false, non-streaming behavior and server-only credentials are unchanged. No new tools, summarization, paid auxiliary calls or persistent conversation IDs exist. Backend memory holds only the current HTTP request and no conversation cache/database. This limits application retention; it does not change provider retention policies or turn prompt instructions into a guarantee of model compliance against every injection.

## Milestone 08 window UX

useIslandWindow retains geometry in its existing per-Island hook. State survives chat snapshot updates, same-selection refocus and conversation replacement; unmount resets geometry. Existing pure helpers clamp preferred defaults/minimums to the visual viewport, including offsetLeft/offsetTop for zoom/pan, with layout-viewport fallback. Expand stores prior geometry; Restore revalidates it against current boundaries. No backend contract or model changes are involved.

Pointer gestures store ownership, original rect and latest candidate in refs. Only the primary left pointer from a header/resize handle may start, header buttons are excluded, and another active pointer cannot replace or terminate ownership. Pointer capture routes motion without idle document listeners. Multiple movements coalesce into at most one pending requestAnimationFrame and one geometry state publication per frame; ending a gesture commits its final candidate and cancels the queued callback. Cancellation/lost capture ends the gesture. Viewport changes stop gestures before fitting; unmount cancels callbacks without publishing state, releases capture and removes viewport listeners. Stable callbacks prevent listeners from rebinding after geometry updates. No new polling or libraries.

A 120 ms CSS opacity opening animation stays inside Shadow DOM, stops on drag/resize, and is disabled by prefers-reduced-motion. Geometry never transitions during movement. Closing remains immediate for deterministic request abort/state disposal/focus restoration; no exit timer or delayed sensitive text retention is introduced. Existing semantic dialog, accessible labels, focus indicators and keyboard move/resize remain. IME Escape is exempt and Tab is not trapped.

The controller saves the deepest focused HTMLElement across open shadow roots and restores only connected controls when the island owned focus at close. IslandChat checks current focus ownership after success before refocusing the composer; pending responses cannot steal focus from the page or header. Disposed/unmounted inputs are ignored. Theme observation stays limited to attributes of html/body plus system media changes, and is removed when closed.

The conversation is the independent flex scroll region with min-height:0 and wrapping plain-text messages. Selected context can chain into the conversation; outer overscroll containment avoids moving the underlying page. The composer can shrink and scroll internally on unusually short viewports. Near-bottom tracking preserves manual reading position; message updates do not change outer geometry. Existing trusted-context/request limits, retry and cancellation are untouched.

## Milestone 09 audit boundaries and test architecture

The implementation audit covers manifest/build/CSP, commands and frame/tab routing, content initialization/disposal, range validation, Shadow DOM/React text rendering, conversation/request/history boundaries, Port transport, fixed localhost fetch and backend configuration/schema/provider handling. No production use of innerHTML/dangerouslySetInnerHTML/eval, persistent storage or analytics was found in src/ or server/src/. Test-only fixture HTML is static. Source tree inventory showed no duplicate production controller, dead provider implementation or CI; the legacy src/island/README.md is a directory guide rather than a second UI. The old mock is deliberately retained for offline/test injection. Host DOM compatibility remains unverified.

Backend Origin/Host/CORS, loopback binding, strict input and default MV3 extension permissions are controls against browser-origin misuse; they are not local-client authentication. The local threat model and unresolved hostile-local-client risk live in SECURITY.md. Four active requests per process bound simultaneous generation; overflow returns busy/429 before SDK invocation. Slots are released in finally on completion, failure, timeout/disconnect. This does not impose a lifetime API budget or prevent sequential abuse. Unknown-route responses are fixed, with no framework URL/query reflection. These are small containment/error-boundary changes, not public-service authorization.

TESTING.md maps unit, component, integration, mocked full UI/backend and unpacked browser cases. Standard Vitest fetch defaults to rejecting non-loopback network access, while explicit transport/SDK mocks remain and actual loopback cancellation can run. The UI/backend workflow test composes representative selected text, command handler, controller/composer and Fastify→SDK mock for follow-ups; a separate transport test covers real adapter/Port/worker logic. Repeated cycles verify host removal and no extra provider calls; they are not heap profiling.

A separate Playwright configuration builds a marked mock-backend artifact with the production adapter. An exclusive, keyless HTTP test server must own port 8787 before browser creation; occupied ports fail safely. No OpenAI service implementation is imported by that fixture. It tests worker-to-HTTP transport, follow-up request privacy, failure/retry and cancellation/context changes. The original offline suite covers six UI viewport sizes. Neither browser suite proves native OS shortcut delivery or authenticated live ChatGPT compatibility. CI installs Chromium and runs both; local Windows could not spawn it. Browser test artifacts are never release artifacts and production must be rebuilt after testing.

axe-core tests open Shadow DOM structure with explicit jsdom limitations; contrast/native keyboard/assistive technology need a rendered audit. Runtime performance evidence is limited to frame-coalescing render counts and resource cleanup tests. Selection has a one-second URL-only navigation fallback (not full DOM polling); observers remain restricted to host theme attributes. No CPU/heap timing or live-page slowdown claim is made.

Dependency audit fixes use the reviewed Vitest 4.1 security line and development-only minimatch 11 override, tested with the existing Vite/Node combination. Production OpenAI/Fastify configuration stays unchanged. GitHub Actions verifies both lockfile installs, build/type/lint/format/tests, audits and browser suites without secrets or deployment. No security scan certification or remote CI pass is inferred from this configuration.
