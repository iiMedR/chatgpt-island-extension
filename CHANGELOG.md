# Changelog

## 0.9.1 — Developer Preview, prepared 2026-11-09

- Verify the content script before reporting page connectivity in the popup; show actual command assignment and a manual Open island control with safe failure feedback.
- Flush already-scheduled selection validation when a shortcut arrives before its debounce finishes.
- Clarify that OAuth sign-in remains unimplemented and that opening the island does not require the AI backend.

## 0.9.0 — Developer Preview, prepared 2026-11-09

First prepared preview package; not a public release. No Git release/tag or store upload was created.

- Foundation: Manifest V3, React/TypeScript, minimal activeTab/loopback access and ChatGPT-only content injection.
- Validated assistant selection and browser Commands API shortcut.
- Shadow DOM floating island, safe text rendering, light/dark themes, responsive drag/resize/expand and focus/scroll refinements.
- Temporary conversation state, bounded complete-turn follow-ups, retries, cancellation and stale-response protection.
- Local Node/Fastify backend with server-only OpenAI Responses credentials and safe validation/errors; non-streaming requests, no persistent chat database.
- Security/reliability tests, mocked workflow/browser suites, accessibility checks, dependency patches and key-free CI configuration.
- Explicit per-conversation affirmative AI processing consent, neutral provisional raster icons and production-only deterministic packaging/verification.
- Store/privacy/screenshot/submission drafts and public-backend readiness plan, with unresolved publication blockers.

Previous repository package version was 0.1.0 throughout implementation. Milestones 01–09 were development checkpoints, not separately published releases; no historical release dates or intermediate version releases are asserted.
