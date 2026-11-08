import { useLayoutEffect, useRef, useState } from 'react';
import type { IslandOpenPayload } from '../island-trigger';
import { PLACEHOLDER_RESPONSE } from './island-types';
import type { IslandMessage } from './island-types';
import { useIslandWindow } from './useIslandWindow';

interface Props {
  context: IslandOpenPayload;
  focusVersion: number;
  session: number;
  onClose: () => void;
}
function IslandChat({
  context,
  focusVersion,
}: Pick<Props, 'context' | 'focusVersion'>) {
  const [messages, setMessages] = useState<IslandMessage[]>([]);
  const [input, setInput] = useState('');
  const composer = useRef<HTMLTextAreaElement>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const sequence = useRef(0);
  useLayoutEffect(() => {
    composer.current?.focus({ preventScroll: true });
  }, [focusVersion]);
  useLayoutEffect(() => {
    const field = composer.current;
    if (!field) return;
    field.style.height = 'auto';
    field.style.height = `${Math.max(24, Math.min(field.scrollHeight, 112))}px`;
  }, [input]);
  useLayoutEffect(() => {
    if (conversation.current)
      conversation.current.scrollTop = conversation.current.scrollHeight;
  }, [messages]);
  function submit() {
    const question = input.trim();
    if (!question) return;
    const createdAt = Date.now();
    const id = ++sequence.current;
    setMessages((previous) => [
      ...previous,
      { id: `${id}-user`, role: 'user', content: question, createdAt },
      {
        id: `${id}-placeholder`,
        role: 'assistant',
        content: PLACEHOLDER_RESPONSE,
        createdAt,
      },
    ]);
    setInput('');
    composer.current?.focus({ preventScroll: true });
  }
  return (
    <>
      <div
        className="conversation"
        ref={conversation}
        role="region"
        aria-label="Island conversation"
        tabIndex={0}
      >
        <section className="message context">
          <h3>Selected context</h3>
          <blockquote tabIndex={0} aria-label="Selected text context">
            {context.selectedText}
          </blockquote>
        </section>
        {messages.length === 0 ? (
          <p className="empty-note">Ask a question about this passage.</p>
        ) : null}
        <div
          role="log"
          aria-label="Temporary messages"
          aria-live="polite"
          aria-relevant="additions"
        >
          {messages.map((message) => (
            <article className={`message ${message.role}`} key={message.id}>
              <h3>
                {message.role === 'user'
                  ? 'Your question'
                  : 'Development placeholder'}
              </h3>
              <p>{message.content}</p>
            </article>
          ))}
        </div>
      </div>
      <div className="composer-area">
        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <textarea
            ref={composer}
            rows={1}
            aria-label="Ask about the selected text"
            placeholder="Ask about the selected text…"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                if (!event.repeat) submit();
              }
            }}
          />
          <button
            type="submit"
            className="send-button"
            aria-label="Send question"
            disabled={!input.trim()}
          >
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M10 16V4m-5 5 5-5 5 5" />
            </svg>
          </button>
        </form>
        <p className="local-note">Local preview · AI not connected</p>
      </div>
    </>
  );
}

export function Island({ context, focusVersion, session, onClose }: Props) {
  const floating = useIslandWindow();
  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="island-title"
      className="island"
      style={{
        left: floating.rect.x,
        top: floating.rect.y,
        width: floating.rect.width,
        height: floating.rect.height,
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
          event.preventDefault();
          onClose();
        }
      }}
      onKeyUp={(event) => event.stopPropagation()}
    >
      <header
        className="island-header"
        {...floating.drag}
        tabIndex={0}
        aria-label="Move ChatGPT Island with arrow keys"
      >
        <div>
          <h2 id="island-title">ChatGPT Island</h2>
          <p>Isolated chat</p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="icon-button"
            aria-label={floating.expanded ? 'Restore island' : 'Expand island'}
            onClick={floating.toggleExpanded}
          >
            <svg
              aria-hidden="true"
              width="17"
              height="17"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              {floating.expanded ? (
                <>
                  <path d="M6 6V3h11v11h-3" />
                  <rect x="3" y="6" width="11" height="11" rx="1" />
                </>
              ) : (
                <rect x="3" y="3" width="14" height="14" rx="2" />
              )}
            </svg>
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Close island"
            onClick={onClose}
          >
            <svg
              aria-hidden="true"
              width="17"
              height="17"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="m5 5 10 10M15 5 5 15" />
            </svg>
          </button>
        </div>
      </header>
      <IslandChat key={session} context={context} focusVersion={focusVersion} />
      <button
        type="button"
        className="resize-handle"
        aria-label="Resize island with arrow keys or drag"
        disabled={floating.expanded}
        {...floating.resize}
      >
        <svg
          aria-hidden="true"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          stroke="currentColor"
        >
          <path d="m3 9 6-6M6 9l3-3" />
        </svg>
      </button>
    </section>
  );
}
