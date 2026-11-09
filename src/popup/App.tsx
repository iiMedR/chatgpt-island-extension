import { useEffect, useState } from 'react';
import { isSupportedUrl } from '../utils/isSupportedUrl';
import { handleCommand, RESPONSE_TIMEOUT_MS } from '../background/commands';
type Status = 'checking' | 'ready' | 'unsupported' | 'refresh' | 'error';
const messages: Record<string, string> = {
  triggered: 'Island opened. Close this popup to use it.',
  'no-selection':
    'Highlight text in a ChatGPT assistant response, then try again.',
  'invalid-selection':
    'The captured selection is invalid. Select assistant text again.',
  'unsupported-tab': 'Open a ChatGPT conversation first.',
};
export default function App() {
  const [status, setStatus] = useState<Status>('checking');
  const [tab, setTab] = useState<chrome.tabs.Tab>();
  const [shortcut, setShortcut] = useState('');
  const [feedback, setFeedback] = useState('');
  const [opening, setOpening] = useState(false);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void (async () => {
      try {
        const [current] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (!active) return;
        if (!isSupportedUrl(current?.url)) {
          setStatus('unsupported');
          return;
        }
        if (!Number.isInteger(current.id)) {
          setStatus('refresh');
          return;
        }
        setTab(current);
        try {
          const response: unknown = await Promise.race([
            chrome.tabs.sendMessage(
              current.id!,
              { type: 'FOUNDATION_PING' },
              { frameId: 0 },
            ),
            new Promise<null>((resolve) => {
              timer = setTimeout(() => resolve(null), RESPONSE_TIMEOUT_MS);
            }),
          ]);
          if (active)
            setStatus(
              typeof response === 'object' &&
                response !== null &&
                'running' in response &&
                response.running === true
                ? 'ready'
                : 'refresh',
            );
        } catch {
          if (active) setStatus('refresh');
        } finally {
          clearTimeout(timer);
        }
        try {
          const assigned = (await chrome.commands.getAll()).find(
            (command) => command.name === 'open-island',
          )?.shortcut;
          if (active)
            setShortcut(
              assigned
                ? `Shortcut: ${assigned}`
                : 'Shortcut not assigned. Set it at chrome://extensions/shortcuts.',
            );
        } catch {
          if (active)
            setShortcut('Check the shortcut at chrome://extensions/shortcuts.');
        }
      } catch {
        if (active) setStatus('error');
      }
    })();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);
  async function open() {
    if (opening || status !== 'ready' || !tab) return;
    setOpening(true);
    setFeedback('');
    try {
      const result = await handleCommand('open-island', tab);
      setFeedback(
        messages[result] ??
          'Could not reach the page. Refresh ChatGPT after reloading the extension.',
      );
      if (
        [
          'messaging-failed',
          'response-timeout',
          'context-invalidated',
        ].includes(result)
      )
        setStatus('refresh');
    } finally {
      setOpening(false);
    }
  }
  const label = {
    checking: 'Checking active tab…',
    ready: 'ChatGPT page connected',
    unsupported: 'Open ChatGPT to get started',
    refresh:
      'Refresh this ChatGPT tab after installing or reloading the extension.',
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
        className="rounded-panel border border-outline bg-secondary p-3 text-sm"
      >
        {label}
      </p>
      <p className="text-xs leading-relaxed text-muted">{shortcut}</p>
      <button
        type="button"
        disabled={status !== 'ready' || opening}
        onClick={() => void open()}
        className="rounded-panel border border-outline bg-secondary p-3 text-sm"
      >
        {opening ? 'Opening…' : 'Open island'}
      </button>
      {feedback ? (
        <p role="status" className="text-sm">
          {feedback}
        </p>
      ) : null}
      <p className="text-xs leading-relaxed text-muted">
        Developer preview. OAuth sign-in is not implemented. AI answers require
        the local backend and OpenAI API setup; opening the island does not
        require the backend.
      </p>
      <footer className="border-t border-outline pt-3 text-xs text-muted">
        Independent extension. Not affiliated with OpenAI.
      </footer>
    </main>
  );
}
