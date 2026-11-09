# Store listing draft — not submitted

Version: 0.9.0 Developer Preview. Public distribution is blocked. Name availability, trademark/brand use and final operator identity require human review; no affiliation or endorsement is implied.

**Name:** ChatGPT Island

**Short description:** Explore selected ChatGPT text in a temporary floating AI conversation. Local backend setup required.

**Detailed description draft:**

Explore one passage from a ChatGPT assistant response without changing the original conversation. Highlight an excerpt and press Alt+Shift+E (customizable through Chrome's extension shortcuts). ChatGPT Island opens a compact floating conversation with the selected reference visible separately from your question.

Type a question, review and affirm the AI-processing disclosure, then submit. A separately configured local backend can request an OpenAI explanation. Ask follow-up questions with the original excerpt and recent island discussion as context. Move, resize, expand/restore or close the island. Temporary chat and consent are discarded on close; different selected text starts a new conversation.

This is a developer preview for technical evaluation. It requires Node.js 24, a running local backend, configuration of the actual extension origin, and your own server-side OpenAI API credentials. It is not one-click consumer software. API charges are separate from a ChatGPT subscription; API usage is not included. No credentials belong in the extension. Selected text/questions/recent history leave the browser only when AI submission is intentionally allowed and sent. OpenAI processing/retention policies apply. There is no persistent island chat history, analytics, automatic prompt submission or complete original-conversation collection.

Independent project, not an official OpenAI product. Live Chrome/API compatibility and native shortcut behavior remain unverified in the current environment. Do not submit this draft as a publicly available, fully verified product.

## Metadata and permissions

Single purpose: help users explore selected ChatGPT text through an isolated AI conversation. Language: English. Suggested category: **Productivity → Education**, reflecting explanation/learning. Its current existence was verified against the [official Education category](https://chromewebstore.google.com/category/extensions/productivity/education) on 2026-11-09; confirm the dashboard choice at submission.

| Access                                  | Justification                                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| activeTab                               | Inspect and target the user's active supported tab when the action/command is invoked                        |
| http://127.0.0.1/*                      | Worker communication with the separately configured localhost backend; runtime fixes port 8787 and /api/chat |
| https://chatgpt.com/* content injection | Validate explicit assistant selections and display the isolated overlay on the supported site                |

No additional Chrome permissions or remote executable code. The loopback permission is intentional for this preview and unsuitable as an unexplained development URL in a consumer listing.

## Assets and publication fields

Provisional original PNG icons are generated at 16/32/48/128 px; 128 px artwork has transparent padding. Final visual/branding approval is pending. No proprietary logo is used. Store screenshots are missing: follow SCREENSHOT_PLAN.md. The [official image requirements](https://developer.chrome.com/docs/webstore/images) call for a store icon and at least one real screenshot; optional promo images are not created here.

Privacy-policy URL, homepage/support/contact, operator identity, name availability, developer account eligibility, distribution audience and privacy declarations: **human completion required**. No URLs, account enrollment or payments have been invented or performed. Listing must accurately disclose selected/user-provided text sent to OpenAI; do not select zero-data-processing declarations.
