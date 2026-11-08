import { useEffect, useState } from 'react';
import { isSupportedUrl } from '../utils/isSupportedUrl';
type Status = 'checking' | 'ready' | 'unsupported' | 'error';
export default function App() {
  const [status, setStatus] = useState<Status>('checking');
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (active)
          setStatus(isSupportedUrl(tab?.url) ? 'ready' : 'unsupported');
      } catch {
        if (active) setStatus('error');
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  const label = {
    checking: 'Checking active tab…',
    ready: 'Ready',
    unsupported: 'Open ChatGPT to get started',
    error: 'Unable to check this tab. Reopen the popup to retry.',
  }[status];
  return (
    <main className="w-80 space-y-5 p-5">
      <header className="space-y-2">
        <h1 className="text-lg font-semibold tracking-tight">ChatGPT Island</h1>
        <p className="text-sm text-muted">
          Explore selected text without leaving your conversation.
        </p>
      </header>
      <p
        role="status"
        className="flex items-center gap-2 rounded-panel border border-outline bg-secondary p-3 text-sm"
      >
        <span
          aria-hidden="true"
          className={`h-2 w-2 shrink-0 rounded-full ${status === 'ready' ? 'bg-foreground' : 'bg-muted'}`}
        />
        {label}
      </p>
      <p className="text-xs leading-relaxed text-muted">
        Foundation preview. Floating conversations and AI responses are not
        available yet.
      </p>
      <footer className="border-t border-outline pt-3 text-xs text-muted">
        Independent extension. Not affiliated with OpenAI.
      </footer>
    </main>
  );
}
