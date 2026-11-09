import { useEffect, useState } from 'react';

const BASE = 'http://127.0.0.1:8787';
type Session = {
  status: string;
  sharing: boolean;
  model?: string;
  error?: string;
  needsAuthorization?: boolean;
};
type Model = { slug: string; displayName: string };
async function local<T>(path: string, body?: object): Promise<T> {
  const response = await fetch(BASE + path, {
    method: 'POST',
    credentials: 'omit',
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (!response.ok) throw new Error('Local helper request failed');
  return response.json() as Promise<T>;
}
export function ChatGPTAccount() {
  const [session, setSession] = useState<Session>();
  const [models, setModels] = useState<Model[]>([]);
  const [model, setModel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function refresh() {
      try {
        const response = await fetch(BASE + '/auth/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
          credentials: 'omit',
          cache: 'no-store',
          redirect: 'error',
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(5000),
          ]),
        });
        if (!response.ok) throw Error();
        const value = (await response.json()) as Session;
        if (!controller.signal.aborted) {
          setSession(value);
          setError('');
          if (value.status === 'connecting')
            timer = setTimeout(() => void refresh(), 2000);
        }
      } catch {
        if (!controller.signal.aborted)
          setError('Start the local ChatGPT helper, then reopen this popup.');
      }
    }
    void refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [revision]);
  useEffect(() => {
    let active = true;
    if (session?.sharing && !models.length)
      void local<{ models: Model[]; selectedModel: string }>('/auth/models')
        .then((value) => {
          if (active) {
            setModels(value.models);
            setModel(value.selectedModel);
          }
        })
        .catch(() => {
          if (active)
            setError('Could not load models. Reopen the popup to retry.');
        });
    return () => {
      active = false;
    };
  }, [session?.sharing, models.length]);
  async function connect(newProfile = false) {
    setBusy(true);
    setError('');
    try {
      const { url } = await local<{ url: string }>(
        session?.needsAuthorization ? '/auth/resume' : '/auth/start',
        newProfile ? { newProfile: true } : {},
      );
      const parsed = new URL(url);
      if (
        parsed.origin !== 'https://auth.openai.com' ||
        parsed.pathname !== '/api/accounts/authorize'
      )
        throw Error();
      await chrome.tabs.create({ url });
      setSession({ status: 'connecting', sharing: false });
      setRevision((value) => value + 1);
    } catch {
      setError(
        'Could not start sign-in. Check the local helper and try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      aria-label="ChatGPT account"
      className="space-y-2 border-t border-outline pt-3 text-sm"
    >
      <p>
        {session?.sharing
          ? 'Using ChatGPT plan'
          : session?.status === 'connecting'
            ? 'Waiting for ChatGPT authorization…'
            : 'Connect your ChatGPT plan'}
      </p>
      {session?.sharing ? (
        <>
          <label>
            Model
            <select
              aria-label="ChatGPT model"
              value={model}
              disabled={busy || !models.length}
              onChange={(event) => {
                const value = event.target.value;
                setBusy(true);
                void local('/auth/model', { model: value })
                  .then(() => setModel(value))
                  .catch(() => setError('Could not change model.'))
                  .finally(() => setBusy(false));
              }}
              style={{ color: 'inherit', background: '#303030', width: '100%' }}
            >
              {models.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.displayName}
                </option>
              ))}
            </select>
          </label>
          <a
            href="https://chatgpt.com/settings/usage"
            target="_blank"
            rel="noreferrer"
          >
            Manage usage
          </a>
        </>
      ) : (
        <button
          type="button"
          disabled={
            busy ||
            (session?.status === 'connecting' && !session.needsAuthorization)
          }
          onClick={() => void connect()}
          className="rounded-panel border border-outline bg-secondary p-3"
        >
          {session?.needsAuthorization
            ? 'Continue sign-in'
            : 'Continue with ChatGPT'}
        </button>
      )}
      {!session?.sharing && session?.status === 'disconnected' ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void connect(true)}
        >
          Use another account or workspace
        </button>
      ) : null}
      {session && session.status !== 'disconnected' ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void local('/auth/disconnect', {})
              .then(() => {
                setSession({ status: 'disconnected', sharing: false });
                setModels([]);
                setModel('');
              })
              .catch(() =>
                setError(
                  'Disconnect failed. Retry while the helper is running.',
                ),
              )
              .finally(() => setBusy(false));
          }}
        >
          Disconnect
        </button>
      ) : null}
      <p className="text-xs">
        Uses your authorized ChatGPT plan. No API-key billing fallback. The
        local helper must remain running.
      </p>
      {session?.error || error ? (
        <p role="alert">{session?.error || error}</p>
      ) : null}
    </section>
  );
}
