# Chrome Web Store submission guide — human-only future workflow

Reviewed official [publication instructions](https://developer.chrome.com/docs/webstore/publish/) and [developer policies](https://developer.chrome.com/docs/webstore/program-policies/policies) on 2026-11-09. This guide does not authorize upload, registration/payment, review submission or publication. **Do not submit this developer-preview ZIP while RELEASE_CHECKLIST.md has public blockers.**

1. Resolve the backend, verification, privacy/contact and assets blockers in PRODUCTION_READINESS_PLAN.md. Recheck current policies before any future submission.
2. A maintainer must register or access the Chrome Web Store developer account and complete the dashboard's identity/contact/security requirements. Any required fee or service purchase needs separate authorization; none was paid here.
3. Open the Chrome Developer Dashboard linked from the official publication page. Verify the correct publisher account.
4. After explicit authorization, create a new item and upload the reviewed ZIP with manifest.json at its root. Confirm version, permissions and package validation. This task did not upload anything.
5. Enter the approved product name and descriptions from STORE_LISTING.md, language and current category. Do not remove local backend/API cost limitations or preview identification without changing and verifying the architecture first.
6. Upload approved PNG store icon and genuine screenshots from SCREENSHOT_PLAN.md; optional promotional assets may be added only if accurate.
7. Complete the dashboard's single-purpose and privacy fields based on actual data flows. Declare selected text/user questions/history processing and OpenAI sharing accurately. Review permission justifications, remote-code answers and any certifications against the code; no blanket zero-data statement.
8. Provide the real accessible privacy-policy URL, support/contact and required operator information. Placeholders in this repository are not valid submission values.
9. Choose the appropriate available distribution audience/regions with the owner. Restricted distribution is not a substitute for secure backend authorization or policy compliance.
10. Review all fields, release ZIP hash, runtime behavior, permissions, branding, costs and privacy disclosures. Keep screenshot content consistent with the submitted version.
11. Only after explicit owner approval, submit for review using the dashboard. Follow the current publishing controls; approval/review is not guaranteed. Do not automate this step from these scripts.
12. Respond to reviewer feedback through the publisher account; reproduce/fix issues and repeat verification without disclosing private prompts or credentials.
13. For a future update, increase the Chrome-compatible version, document changes, regenerate/test the ZIP/checksum, upload the new package to the same item and review changed disclosures. Never silently switch backend or processing practices.

Official references: [register](https://developer.chrome.com/docs/webstore/register/), [prepare package](https://developer.chrome.com/docs/webstore/prepare/), [listing fields](https://developer.chrome.com/docs/webstore/cws-dashboard-listing), [images](https://developer.chrome.com/docs/webstore/images). Dashboard options can change; this is a draft manual guide, not a claim of acceptance or legal compliance.
