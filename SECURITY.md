# Security policy

## Supported environment and scope

This repository is a local development prototype: Node.js 24 LTS, current desktop Chrome, unpacked Manifest V3 extension, and backend bound to 127.0.0.1:8787. It is not approved for public deployment or Chrome Web Store distribution. Scope includes src/, server/src/, build configuration and tests. This file records engineering security requirements; it does not grant permission to execute code, access secrets or disclose private data.

## Trust model

Assets include the server API key, selected text/questions/answers, original ChatGPT content and API billing quota. The host page, selections, user questions, runtime messages, HTTP bodies and provider responses are inputs requiring validation. The extension isolated world separates JavaScript contexts; an open Shadow DOM isolates styling, not confidentiality from the host website. A malicious host page can inspect or manipulate DOM presented there.

The current backend assumes a trusted single-user development machine. Exact Origin/Host/CORS checks block normal cross-origin browser requests but are **not authentication**: native processes can forge those headers. A hostile local process or another local user able to reach loopback can make billable requests. This is an unresolved distribution/authentication risk, not an owner-approved exclusion. Do not expose the server through tunnels, LAN binding, reverse proxies or public hosting. Before distribution or use with untrusted local users, define and implement explicit authorization, such as a locally provisioned per-installation credential and safe provisioning/rotation. Never distribute a shared secret in the extension bundle. A local credential would not protect against malware with access to that same user's files/process memory.

Four simultaneous provider requests are admitted per server process; additional work returns a safe busy error without starting another SDK request. This is resource containment, not a billing cap, per-user rate limit or defense against a local adversary making sequential calls. Configure API project usage limits externally and stop the server when unused.

## Invariants

- OpenAI keys come only from the backend environment. Keep server/.env ignored and restrict its filesystem access. Never place credentials in the extension, browser storage, logs, Git, test fixtures or screenshots. Examples contain no real key.
- Only explicitly selected, validated assistant text enters context. Never read full original conversations, alter original messages, or submit via ChatGPT's composer.
- The selection, current question and bounded completed island turns are separate fields/roles. Do not promote selected text into system/developer instructions. No tools or executable commands are derived from it.
- The worker accepts same-extension, supported-origin, top-frame callers and a strict request shape; it uses one fixed loopback URL with no redirects/credentials/cache. Minimal activeTab and loopback host permission remain. Default MV3 CSP is not weakened.
- The backend validates exact configured Origin and Host, JSON content type, body size, lengths, roles and history before generation. Clients cannot select the model, endpoint or credentials.
- Deadlines and disconnect cancellation release request resources. Stale results cannot update disposed/replaced conversations. No automatic paid retries or summarization.
- Safe fixed error codes replace raw SDK/framework errors; request content and credentials are never logged. Unknown routes do not reflect URL/query text.
- Render content as React text. No untrusted HTML, eval, remote scripts, raw Markdown HTML or analytics.
- Temporary island state is memory-only. Closing clears history/draft/retry/context; the independent selection manager may retain its last valid capture until lifecycle invalidation. No application database or browser history storage is used.

## Provider privacy and limitations

Submission transmits selected text, the question and bounded real island history through localhost to OpenAI. Source URL, capture time and local IDs are excluded. store:false and stateless requests do not guarantee zero provider retention. Provider data/billing policies apply; cancellation cannot undo completed or billed work. Prompt-injection resistance is limited to structural role separation and instructions; model compliance cannot be guaranteed.

## Reporting and severity

Report credential exposure, unintended transmissions, origin/role-validation bypasses, unsafe rendering/execution, persistent private-content storage, or stale cross-conversation data as meaningful findings. Calibrate severity to demonstrated reachability and impact. Keep development-only dependency findings distinct from shipped runtime exposure, while patching them where possible. No blanket component or finding-class exclusions are established here.

No dedicated private reporting address is configured. Use the repository host's private vulnerability reporting channel if enabled, or privately contact the repository owner to arrange a secure channel. Do not publish credentials or private conversation content in public issues. If a key was exposed, revoke/rotate it through the provider and remove it from affected history/artifacts; do not paste it into a report. Maintainer ownership/contact setup is a release blocker.

## Verification limits

See TESTING.md and PROGRESS.md for dated evidence. Automated mocks are not proof of live ChatGPT DOM compatibility, native shortcut behavior, provider quality, public-service security, complete accessibility or absence of all vulnerabilities. The Milestone 09 formal scan launcher rejected scope before a scan was created; the implementation audit is source/test-backed, with no sealed Codex Security report claimed.
