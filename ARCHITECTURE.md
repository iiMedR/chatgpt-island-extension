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
2. openai-adapter strips URLs, timestamps, IDs and assistant mock messages. It retains at most 21 recent messages and 60,000 total UTF-16 text units, dropping oldest turns and leading orphan assistant messages. The current question and original selected reference remain.
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

Origin and Host checks, exact CORS, restricted JSON, limits, timeout and loopback binding reduce local exposure. They are **not authentication**: a local native client can forge headers. This is trusted local development, not a public production backend. No accounts, public deployment, streaming, persistence or Milestone 07 features are included.

## Offline mode and verification

Production initialization explicitly injects createOpenAIAdapter; isolated controller tests can inject a mock. --offline builds inject the mock and compile out relay registration. dist/build-info.json records openai or mock mode. Browser fixtures build and assert mock mode before sending questions, preventing accidental paid test calls. Restore production with npm run build afterward.

Root typecheck/build cover both packages; root ESLint and Vitest cover server code/tests too. SDK calls are mocked, including a full manager→adapter→worker→Fastify→SDK fixture with follow-ups. A real ephemeral loopback disconnect test verifies SDK abort propagation without contacting OpenAI. Artifact tests scan for a synthetic server-key canary, real-key patterns and bundled provider SDK/endpoint. Native Chrome load/shortcut delivery and a configured real API answer remain separate manual verification requirements.
