# ChatGPT Island 0.9.5 — Developer Preview

Prepared 2026-11-09. Local technical evaluation only; not publicly published, Web Store approved or verified for consumer use.

The extension ZIP does not include or start the backend. Node.js 24, the repository backend, a locally configured server-side OpenAI API key, exact extension Origin and port 8787 are required. API usage can incur charges independently of a ChatGPT subscription. No key belongs in the extension.

Includes validated assistant selections, Alt+Shift+E command, temporary floating React/Shadow DOM chat, drag/resize/expand, bounded follow-ups, local-backend Responses integration, retry/cancellation, safe errors and per-conversation affirmative AI consent. Only the consent flag lives in memory; closing/new context resets it. No chat history is persisted.

Remaining blockers: actual Chrome/native shortcut/real ChatGPT compatibility and live API workflow unverified; local backend has no client authentication or per-user spending limits; no hosted service, public privacy-policy URL, maintainer contact, approved branding or real store screenshots. All nine configured browser cases previously stopped at Windows spawn UNKNOWN. See docs/RELEASE_CHECKLIST.md and PROGRESS.md for current evidence.

Install: verify SHA256SUMS.txt, extract the ZIP to a stable local folder, load that folder via chrome://extensions → Developer mode → Load unpacked, then copy its actual ID into server/.env EXTENSION_ORIGIN. Restart the backend and refresh ChatGPT. An extracted folder change can change the extension ID. The archive contains manifest.json at its root. Do not load test/mock builds as release artifacts.

No publishing, deployment, Git tag or push was performed. Public release remains blocked.
