# ChatGPT-plan sign-in — personal Windows runtime

Implemented in 0.10.0 using the official OpenAI Sign in with ChatGPT DevKit, pinned at commit `0a36fefeb913055c8c7a1a29b63d82b96b2e841a`. Its unmodified local SDK source, license and notices are vendored under `server/vendor/siwc-local`; local build metadata is adapted. This project's integration is for the user's personal local noncommercial use. No commercial enrollment or standalone browser-only OAuth support is claimed.

## Runtime and authentication

The Node helper is the OAuth client. The popup sends JSON POST start/status/models/model/disconnect operations to fixed IPv4 loopback port 8787. Exact extension Origin and Host checks apply to every route; arbitrary websites and content scripts cannot invoke these routes directly. Origin checks constrain browser callers, not native processes running as the same OS user. The normal entry point always injects the ChatGPT-plan provider; legacy API-key functions remain for existing regression tests and are never automatic fallback.

The SDK persists one opaque host ID, registers with dynamic_agent_client on first use, retains the issued client registration, and opens the official authorization URL from an intentional popup click. A separate ephemeral IPv4 loopback callback requires fresh state, nonce and PKCE S256. The SDK exchanges the code, verifies signed identity/issuer/audience/expiry/nonce and checks actual plan-usage permission. Provider credentials and ID tokens never enter the extension. Token-bearing URL hints are omitted by the SDK. Email hints can be used by the SDK for returning sign-ins but are not logged or shown by the helper API.

Windows DPAPI CurrentUser encrypts credential files through a hidden PowerShell process, with input/output carried only through private pipes. No secret appears in command arguments, source, logs or environment variables. DPAPI is not protection against another process already running as the same Windows user. There is no plaintext fallback. Other operating systems are not supported by this credential provider. Credential metadata and encrypted tokens live under LocalAppData/ChatGPT Island/auth, outside the repository. The SDK provides locked/atomic updates, serialized refresh rotation and profile/session invalidation. Authentication survives island close; temporary context/history/draft do not.

The popup polls safe status only while sign-in is pending, with no overlapping polls. Reopening reads status again. Plan permission is distinct from identity sign-in. The popup discovers models from the authorized account's model catalog; model choice is memory-only in the helper and defaults to the first eligible catalog entry. No API-key model is silently reused. Disconnect cancels sign-in/inference and removes credentials while retaining registration metadata; remote revocation failure is reported as an error and users should also revoke access in ChatGPT settings.

## Requests and lifecycle

The existing content → worker → loopback request path remains. Selected text appears once as a JSON reference-data user message, separate from application instructions and ordered island history. No original conversation is collected. The SDK uses public Responses requests with the OAuth bearer, stream:true and store:false, and requires response.completed. It rejects interrupted, failed and incomplete streams. The helper buffers the completed answer for the existing UI, so progressive token display is not implemented. It does not set unsupported max_output_tokens or server conversation IDs. Usage is charged against the authorized ChatGPT-plan allowance/credits under provider policy; it is not unlimited usage or automatic interaction with the website's composer.

Existing bounded history, retry deduplication, request ownership and stale-response invalidation remain. Helper/relay/UI deadlines are 180/185/190 seconds, with cancellation on disconnect and a 16,000-unit output guard. No paid summarization or extra inference probes are issued. Model discovery is performed when needed, not on every status poll. Failed plan requests never fall back to paid API-key billing.

## Evidence and remaining checks

- Real Windows DPAPI encryption/decryption round-trip passed with a harmless test string.
- Mocked SDK test verifies fresh PKCE/state/nonce, stable host ID, mismatched callback rejection and cancellation without token exchange.
- Provider tests cover reference isolation, chronological history, model selection, missing identity/permission, cancellation/output bounds, error sanitization and origin restrictions.
- Popup tests cover deliberate sign-in, authorization-destination validation, model discovery and disconnect.
- Live Chrome POST status returned 200 with disconnected state; Continue with ChatGPT opened the official account-selection page.
- One user attempt reached a provider "Start a new sign-in" page while the local listener was still pending. Its exact provider-side cause is unknown; it is not evidence of completed OAuth. Full consent, token validation/refresh/revocation and plan inference remain unverified until explicitly recorded in PROGRESS.md.

Official references: [local overview](https://developers.openai.com/siwc/token-sharing-open-source), [registration](https://developers.openai.com/siwc/token-sharing-open-source/sign-in), [inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference), [integration cookbook](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt).

Live update: the latest official consent screen explicitly reports "A required permission is unavailable. You can’t continue with this workspace and plan" and disables Continue. This blocks end-to-end approval for the selected account/workspace; its precise eligibility/policy cause is not established. No API-key fallback or plan upgrade was attempted. Initial-code recovery is now supported through a queued retry URL/Continue sign-in action, with unfinished registrations reused. A callback page alone is not treated as a validated session.

Use another account or workspace deliberately creates a separate registration, preserving the prior one. This can be used when the provider refuses plan permission for a workspace; it does not bypass eligibility or grant extra allowance. The retry bridge exposes only a needsAuthorization flag in status; a deliberate Continue sign-in action retrieves the fresh authorization URL, so stale first-attempt URLs are not reused.

0.10.1 account-switch fix: Use another account or workspace is available during a pending sign-in. It cancels that pending attempt and begins a new registration, even if a retry URL was queued. To use another account, choose that action in the extension rather than changing accounts inside an old workspace-bound authorization page. Existing registrations are retained; provider plan/workspace eligibility still applies independently.
