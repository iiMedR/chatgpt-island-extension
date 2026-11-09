# Release checklist — 0.9.0 Developer Preview

Prepared 2026-11-09. PASS means the specific scoped evidence below exists, not public approval. Public release is blocked. No upload/publish/tag/push is authorized by this checklist. Automated command counts and artifact hash are recorded in PROGRESS.md and releases/SHA256SUMS.txt after final verification.

| Area / check                                                           | Status       | Evidence or next action                                                                     |
| ---------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------- |
| Functionality: selection/command/UI/context/composer/follow-ups        | PASS         | Existing unit/component/mocked backend integration suite; this is not native Chrome proof   |
| Functionality: actual native shortcut/live ChatGPT/real AI answer      | NOT VERIFIED | Run extracted package with real Chrome and separately authorized backend/API setup          |
| Functionality: close/replacement/cancellation/state isolation          | PASS         | Mocked regression tests; repeat manual checks in Chrome                                     |
| Security: no bundled key/SDK, minimal activeTab + loopback permissions | PASS         | Production artifact/manifest and package validation tests                                   |
| Security: backend validation/timeouts/safe errors                      | PASS         | Backend regression tests; localhost remains trusted development only                        |
| Security: authenticated public or untrusted-local access               | FAIL         | No authenticated provisioning/service; execute production readiness plan                    |
| Security: text rendering/injection role separation                     | PASS         | React plain text and structured prompt tests; no claim of complete model injection immunity |
| Privacy: explicit AI submission consent                                | PASS         | Unchecked control, send/Enter gate and lifecycle tests; memory-only preference              |
| Privacy: bounded selected-only requests/no persistent chat             | PASS         | Source and mocked workflow/storage tests                                                    |
| Privacy: hosted policy URL/operator/contact/store declarations         | FAIL         | Draft placeholders must be replaced and reviewed by responsible owner                       |
| Privacy: public compliance approval including loopback transmission    | NOT VERIFIED | Human review against current policies and applicable obligations                            |
| UX: theme/geometry/focus/motion/scroll controls                        | PASS         | Scoped DOM/pure geometry and CSS tests only                                                 |
| UX: rendered light/dark/narrow/zoom/contrast/assistive technology      | NOT VERIFIED | Windows browser launch failed; run real browser/manual checklist                            |
| Distribution: consistent 0.9.0 numeric version, preview version_name   | PASS         | Version tests cover manifest/packages/locks                                                 |
| Distribution: valid manifest/runtime scripts/CSS/icons in ZIP          | PASS         | Build and archive/extraction tests after package generation                                 |
| Distribution: original provisional PNG icons                           | PASS         | Deterministic 16/32/48/128 px generation; visually inspected 128 px                         |
| Distribution: final icon/name/trademark approval                       | NOT VERIFIED | Maintainer/design review required                                                           |
| Distribution: reproducible ZIP/checksum/extracted asset validation     | PASS         | package:preview and verify:package; see final PROGRESS evidence                             |
| Distribution: listing/privacy/submission drafts and screenshot plan    | PASS         | Draft files in docs/; not submitted                                                         |
| Distribution: genuine store screenshots                                | FAIL         | Capture approved real states; no mock answer presented as real                              |
| Distribution: backend available automatically to consumer users        | FAIL         | ZIP excludes backend; technical user must install/configure Node server                     |
| Distribution: developer account/fees/distribution settings             | NOT VERIFIED | Maintainer must confirm account and separately authorize any payment/submission             |
| Distribution: hosted CI/browser suites                                 | NOT VERIFIED | Configuration exists; no GitHub run performed here                                          |

Backend absence is acceptable only for the explicitly documented local developer-preview setup. It is a public distribution blocker. No confirmed unresolved critical source vulnerability is asserted; High blockers are backend authorization/operability, Medium blockers include missing actual browser evidence, privacy/contact/cost review and genuine screenshots, and Low blockers include provisional branding/accessibility review. Obtain independent approvals before changing any FAIL/NOT VERIFIED row.
