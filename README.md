# ChatGPT Island

Independent Chrome extension foundation for exploring selected ChatGPT text in an isolated floating conversation. Not affiliated with OpenAI. Milestone 01 provides only installation, entry points, and a status popup.

## Requirements and installation

- Node.js 24 LTS, npm, Git, and current Chrome desktop.
- From this directory run `npm ci` (or `npm install` for the initial setup).
- Run `npm run build` before tests that inspect generated assets.

## Commands

| Command                | Purpose                                                          |
| ---------------------- | ---------------------------------------------------------------- |
| `npm run dev`          | Build and watch all three entries with development diagnostics   |
| `npm run build`        | Generate the production unpacked extension in `dist/`            |
| `npm run typecheck`    | Strict TypeScript validation                                     |
| `npm run lint`         | ESLint and React hook checks                                     |
| `npm run test`         | Vitest popup, URL, entry, and built-manifest checks; build first |
| `npm run format`       | Format source and documentation                                  |
| `npm run format:check` | Check formatting                                                 |

Development uses disk builds rather than a remote Vite/HMR server: Chrome loads local files under its extension CSP. Wait for all three initial builds, load `dist`, and reload the extension after changes. Refresh ChatGPT after reloading the extension. No remote code or relaxed CSP is needed.

## Load and verify in Chrome

1. Run `npm run build`.
2. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select this project's `dist` directory.
3. Confirm ChatGPT Island 0.1.0 appears without errors. Pin it from Chrome's Extensions menu.
4. Open `https://chatgpt.com/`, refresh it, and open the popup. Expect **Ready**. This indicates a supported URL, not working AI functionality.
5. On `https://example.com/`, open the popup. Expect **Open ChatGPT to get started**.
6. Inspect the popup by right-clicking it and choosing **Inspect**. Check Console and test light/dark system themes.
7. On the extension details card, click the service worker inspection link. An inactive worker between events is normal. Check Console and the card's Errors section.
8. To see initialization logs, use `npm run dev`, reload the extension, and refresh ChatGPT. Enable Debug/Verbose console messages. ChatGPT DevTools should show the content initialization log in the extension's isolated context. Production deliberately omits these logs.
9. To verify content execution in production, use the popup DevTools console: `const [tab] = await chrome.tabs.query({active:true,currentWindow:true}); await chrome.tabs.sendMessage(tab.id, {type:'FOUNDATION_PING'})`. Expect `{running:true}` on a refreshed ChatGPT page. No receiver is expected on unrelated sites. This probe reads no conversation data.

## Limitations

No selection capture, keyboard shortcuts, floating island, AI requests, follow-up conversations, storage, analytics, or ChatGPT history changes. Chrome restricted pages may hide URL access and show the unsupported state. Icons are omitted; `public/icons` reserves a location for original assets. See PROGRESS.md for actual verification results.
