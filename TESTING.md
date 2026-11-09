# Testing

## Environment and commands

Use Node.js 24 LTS, npm, loopback socket access, and Chrome/Playwright Chromium for browser cases. Install from both lockfiles:

```sh
npm ci
npm --prefix server ci
npm run typecheck
npm run lint
npm run format:check
npm run build
npm run test
npm audit
npm --prefix server audit
```

Typecheck and build include backend equivalents; root lint and Vitest cover both packages. Artifact tests require a build first. Standard tests mock OpenAI; a default fetch guard rejects public/provider requests while allowing actual 127.0.0.1 cancellation tests. This is a fetch safety guard, not an OS network sandbox; no real API key is needed or permitted in fixtures/CI. No paid calls are authorized by this test workflow.

## Categories and coverage

- Unit: selection text/range validity, excluded/editable/user/sidebar/cross-region ranges, bounded complete-turn history, request shape/order, statuses, retry IDs, error mapping and pure viewport geometry.
- Components: Shadow DOM island, composer/IME/limits, waiting/error/retry, focus ownership/restoration, safe text, light/dark tokens, geometry preservation and respectful scrolling.
- Integration: command/tab selection, background/content channels, same-extension sender checks, service unavailability/disconnect, controller replacement/disposal, Fastify Origin/Host/content type/body/history validation, SDK error mapping, deadlines, actual loopback cancellation, concurrent-admission/release and sanitized unknown routes.
- Full workflow in jsdom: representative assistant selection → command handler → real React controller/composer → Fastify validation → mocked SDK → ordered follow-up → 20 close/reopen cycles, with no original-page modification or unselected content in requests. Transport is an injected test adapter here; the separate ai-flow test exercises the actual runtime Port/worker adapter chain.
- Accessibility: axe-core walks the island's open Shadow DOM. jsdom lacks layout/canvas, so color-contrast is disabled; document-title/html-lang/region checks are excluded because those belong to the host document. Visible controls, IME Escape, focus and reduced-motion CSS are also covered by existing tests. This is not accessibility certification or a real Tab-order/contrast audit.
- Artifacts: generated manifest/assets, no synthetic backend-key canary/provider SDK/endpoint or key patterns in client bundles, reduced-motion rules and standalone content script.

No line/branch coverage percentage was measured. Counts and command outcomes are recorded in PROGRESS.md. Representative fixtures do not prove compatibility with authenticated live ChatGPT.

## Browser suites

```sh
npx playwright install chromium
npm run test:browser
npm run test:backend-browser
npm run build
```

Browser plugin was unavailable; these suites use the existing Playwright framework. test:browser builds mock-only mode and exercises the built unpacked extension at widths 1920/1440/1024/768/480/360. It covers geometry, themes, composer/follow-ups, repeated/new selection, close/reopen and fixture preservation.

test:backend-browser builds a production-adapter test artifact marked mock-backend. Before browser creation, the suite must exclusively bind its credential-free deterministic HTTP mock on 127.0.0.1:8787. If the port is occupied it fails; it never reuses another backend. Stop your local development backend first. The mock contains no OpenAI SDK/key and never contacts a provider. Scenarios cover real worker-to-HTTP transport, ordered follow-ups/privacy, backend failure/retry and pending close/cancellation/new-context isolation. Requests are held in test memory only; unexpected page traffic is blocked. Both suites assert build mode before actions. They invoke the typed trigger message programmatically, not a real OS shortcut; Commands API routing/assignment are separately unit tested.

ISLAND_CHROMIUM_EXECUTABLE may select a compatible installed executable. Optional ISLAND_SCREENSHOT_DIR saves interaction screenshots outside the repository for the UI suite. Temporary profiles/reports have checked paths before removal. Always rebuild production after either browser suite; test builds must not be distributed.

Current Windows environment could not launch Chromium (spawn UNKNOWN outside the sandbox; executable absent inside). Browser cases fail rather than being silently skipped. No rendered/native/live-API pass is claimed. The new Linux GitHub Actions workflow installs Chromium and runs both suites without keys, deployments or paid calls. Its remote run has not been executed in this session.

## Manual acceptance

README contains exact setup, Milestone 06 live API steps, Milestone 07 follow-up/failure scenarios A–E and Milestone 08 interaction scenarios A–F. Run those in real Chrome and additionally verify:

1. Shortcut assignment/customization/conflicts; command delivery to the active one of two ChatGPT tabs and rejection on an unsupported site.
2. Reload the extension, refresh stale tabs, stop/restart the worker, then retry. Ensure no old-context answer/duplicate listener appears.
3. Mouse and keyboard selection of nested bold/italic, lists, multiline code and cross-element text in one assistant response. Reject editable/user/sidebar/island/cross-message selections with no prior valid capture.
4. Navigate during a pending request, close/reopen repeatedly and change selection while pending; no stale answer/error should reappear. Original ChatGPT messages/composer must remain unchanged.
5. Tab navigation, screen-reader announcements, contrast, reduced motion, light/dark themes, zoom, scroll chaining and actual drag/resize across the documented viewport sizes.
6. With non-sensitive content only, inspect worker Network request bodies and browser storage: only selected context plus bounded island messages should leave; no URLs/timestamps, unrelated messages, analytics or persistent chat data.
7. Configure invalid/missing key/model and simulated backend failure locally; verify safe feedback/retry and no raw stack or credential leak. A real API test requires explicit authorization and may incur charges; it has not been run for this milestone.

## Audits and release gate

Run npm audit for both packages after lockfile changes. Milestone 09 updated Vitest to the patched 4.1 line and overrides development minimatch to patched 11.x; keep the override under review and remove it once upstream ranges include the fix. Do not use npm audit fix --force or silently upgrade unrelated majors. npm outdated reports available majors; availability alone is not a security finding.

CI runs install/type/lint/format/build/tests/audits and both browser suites, then restores a production build. Local passes do not prove that workflow has passed on GitHub. Public packaging remains gated on live Chrome/browser evidence, an explicit authorization/provisioning decision for the local backend, privacy/cost UX and maintainer reporting setup. See SECURITY.md and PROGRESS.md for severity and unresolved risks.

## 0.9.0 release and consent verification

After a production build, tests/release.test.ts checks consistent versions/manifest, original icon PNG headers/dimensions, deterministic ZIP bytes and lossless readback, required assets, path/file allowlisting and rejection of tampered/secret/development content. UI tests verify send/Enter cannot invoke a real adapter before explicit consent, same-context retention, new-context/close reset, and no implicit send from checking alone. The built-extension HTTP fixture must check the real consent control before sending; its answers remain mock fixtures, not actual AI captures.

```sh
npm run package:preview
npm run verify:package
```

These commands must run from the repository root. Verification extracts the newly generated archive to a clean temporary directory, checks manifest-at-root, runtime references and content hashes, and cleans up. Inspect releases/FILE_LIST.txt and SHA256SUMS.txt. package:preview always rebuilds production; offline/mock/backend-test builds are rejected. Repeated packaging of identical built inputs should give the same ZIP SHA-256. No source/Git timestamps are modified; canonical archive metadata is documented.

Manual addition: load the extracted ZIP folder into real Chrome, reconfigure its actual extension Origin, verify the unchecked consent notice, test decline/close, affirm and submit, follow up, replace context and confirm consent resets. Inspect the original conversation and network as in existing checklists. Real OpenAI calls need separately authorized local credentials; none are made by automated release verification. Capture store screenshots only from actual approved demonstration states; docs/SCREENSHOT_PLAN.md records missing captures rather than fabricating them.
