# Privacy policy draft — ChatGPT Island 0.9.0 Developer Preview

Prepared 2026-11-09. Draft for human review; not a published legal policy. Operator/contact: [MAINTAINER_CONTACT_REQUIRED]. Public policy URL: [PUBLIC_PRIVACY_POLICY_URL_REQUIRED]. No email, business address or hosted policy is configured.

## Purpose and browser-local information

ChatGPT Island helps users explore selected ChatGPT assistant text in a separate temporary floating chat. It is independent of OpenAI. On supported https://chatgpt.com pages, the selection manager validates a user's explicit text range within one assistant response and keeps the last valid normalized excerpt in memory, with its page URL and capture time for lifecycle validation. It does not collect the complete original conversation or original composer contents. Invalid ranges, user messages, editable areas, sidebar and cross-region selections are rejected.

Opening the island displays that reference locally. It does not itself send an AI request. User questions, temporary answers, geometry, and consent state remain in memory. The island does not submit to the original ChatGPT composer or modify original messages. Shadow DOM isolates styles, not confidential information from the host website; the host may inspect displayed DOM.

## Intentional submission and local backend

Before AI submission, an unchecked in-island control explains transmission and requires affirmative permission for that temporary conversation. A separate send action is still required. Closing or choosing a different reference resets consent; same-selection refocus preserves it. No consent preference or conversation is written to browser storage.

After consent and send, selected text, the current question, and bounded completed real island history are sent through the extension worker to http://127.0.0.1:8787/api/chat on the user's machine. URLs, capture times, local IDs, unrelated page messages, and mock/failed/pending assistant messages are excluded. Requests retain at most 20 prior completed messages/30,000 UTF-16 history units, plus selected context up to 10,000 and a current question up to 8,000. Character limits approximate tokens.

The separately installed local Node backend forwards that content over HTTPS to OpenAI's Responses API using the developer's configured model/key. AI usage can incur charges, separate from a ChatGPT subscription. The extension ZIP does not install a backend or include an API key. Do not select or submit secrets or other information you do not want processed by OpenAI.

## Provider processing, logs and retention

The application requests stateless non-streaming Responses with store:false, without server-side conversation IDs. This does not guarantee zero provider retention or override OpenAI's policies, account settings or legal obligations. Consult current provider data terms before use. The local application has no conversation database or persistent chat history. Backend diagnostics contain fixed codes/statuses, with request-body and SDK logging disabled. No analytics or advertising integration is implemented; application content is not sent to an analytics service. Provider infrastructure may process operational/API metadata independently.

Closing clears island context/messages/draft/retry state and cancels or invalidates pending work; the independent selection manager can retain its last valid capture until navigation/page lifecycle invalidation. Cancellation cannot reverse already processed or billed provider work. Browser DevTools, OS diagnostics, screenshots, browser operation, and provider-controlled records are outside the application's in-memory cleanup guarantee.

## Security and permissions

Credentials stay in the local server environment, outside the extension. Runtime validation, loopback binding, exact Origin/Host/CORS, size/history limits, deadlines and four-request concurrency containment reduce misuse. Origin/CORS are not authentication; hostile local processes can forge headers and spend quota. This preview is only for a trusted development machine and must not be publicly hosted.

activeTab supports active-tab checks/shortcut targeting; the sole host permission http://127.0.0.1/* permits the worker to reach the local backend (Chrome host patterns do not constrain ports). Static content injection is limited to https://chatgpt.com/*. No storage, all-sites, scripting, tabs or incognito-enablement permission is requested. All executable extension code is packaged locally.

## Choices, changes and contact

Decline by closing without checking consent or sending. Stop the backend to prevent local AI requests. Close the island to clear its temporary chat; refresh/navigate to clear retained capture; disable/uninstall through chrome://extensions to stop extension operation. Manage/revoke the API key through its provider and remove server/.env when no longer needed. Provider retention/deletion choices must be handled through the provider's current controls; this preview does not implement provider-record deletion.

Update this draft and in-product disclosures when processing changes; obtain new consent where required. Before public distribution, identify the responsible operator, review applicable legal obligations, publish an accessible accurate policy and contact, complete store privacy declarations, and resolve authentication/consent review. No complete Chrome Web Store compliance claim is made.
