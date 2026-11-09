# ChatGPT Island 0.10.0 — Personal Local Preview

Adds Continue with ChatGPT, plan authorization, account-specific model discovery/selection, Windows DPAPI credentials and disconnect through the local Node helper. The normal helper uses only ChatGPT-plan OAuth; API-key billing is not a fallback. Existing selected-text isolation, bounded follow-ups, per-conversation consent and cancellation remain.

The browser ZIP does not include/start the helper. Build the repository with Node 24, load the extension and start scripts/start-chatgpt-helper.ps1 with its actual extension ID. This integration is for personal local noncommercial Windows use. No hosted, commercial or Web Store release is claimed. Account eligibility, granted scopes and plan limits apply.

Automated/provider tests use mocks. Live sign-in/callback/inference evidence and unresolved issues are recorded in PROGRESS.md. Do not interpret a working sign-in button as proof that provider authorization and plan inference completed.
