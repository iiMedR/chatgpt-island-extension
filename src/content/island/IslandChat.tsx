import { useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import {
  MAX_MESSAGE_LENGTH,
  validateQuestion,
} from './conversation/conversation-manager';
import type { ConversationManager } from './conversation/conversation-manager';

export function IslandChat({
  manager,
  focusVersion,
}: {
  manager: ConversationManager;
  focusVersion: number;
}) {
  const state = useSyncExternalStore(manager.subscribe, manager.getSnapshot);
  const composer = useRef<HTMLTextAreaElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const messages = state.conversation?.messages;
  const submitting = state.status === 'submitting';
  const validation = validateQuestion(state.input);
  const tooLong = state.input.trim().length > MAX_MESSAGE_LENGTH;
  useLayoutEffect(() => {
    composer.current?.focus({ preventScroll: true });
  }, [focusVersion]);
  useLayoutEffect(() => {
    const field = composer.current;
    if (!field) return;
    field.style.height = 'auto';
    field.style.height = `${Math.max(24, Math.min(field.scrollHeight, 112))}px`;
  }, [state.input]);
  useLayoutEffect(() => {
    if (nearBottom.current && scroller.current)
      scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [messages]);
  async function submit() {
    if (submitting || !validation.valid) return;
    const result = await manager.submit();
    if (result === 'success') composer.current?.focus({ preventScroll: true });
  }
  return (
    <>
      <div
        className="conversation"
        ref={scroller}
        role="region"
        aria-label="Island conversation"
        tabIndex={0}
        onScroll={(event) => {
          const node = event.currentTarget;
          nearBottom.current =
            node.scrollHeight - node.scrollTop - node.clientHeight < 48;
        }}
      >
        <section className="message context">
          <h3>Selected context</h3>
          <blockquote tabIndex={0} aria-label="Selected text context">
            {state.conversation?.context.text}
          </blockquote>
        </section>
        {!messages?.length ? (
          <p className="empty-note">Ask a question about this passage.</p>
        ) : null}
        <div
          role="log"
          aria-label="Temporary messages"
          aria-live="polite"
          aria-relevant="additions"
        >
          {messages?.map((message) => (
            <article className={`message ${message.role}`} key={message.id}>
              <h3>
                {message.role === 'user'
                  ? 'Your question'
                  : message.kind === 'ai'
                    ? 'Assistant'
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
          aria-busy={submitting}
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <textarea
            ref={composer}
            rows={1}
            aria-label="Ask about the selected text"
            placeholder="Ask about the selected text…"
            aria-invalid={tooLong}
            aria-describedby="island-composer-hint"
            readOnly={submitting}
            value={state.input}
            onChange={(event) => manager.setInput(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                if (!event.repeat) void submit();
              }
            }}
          />
          <button
            type="submit"
            className="send-button"
            aria-label={
              state.status === 'error' ? 'Retry question' : 'Send question'
            }
            disabled={submitting || !validation.valid}
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
        <p className="composer-hint" id="island-composer-hint">
          {tooLong
            ? 'Questions must be 8,000 characters or fewer.'
            : submitting
              ? manager.kind === 'ai'
                ? 'Waiting for AI response…'
                : 'Preparing local placeholder…'
              : manager.kind === 'ai'
                ? 'Selected context and island messages are sent to OpenAI.'
                : 'Local preview · AI not connected'}
          {state.input.length > 7800
            ? ` · ${state.input.trim().length.toLocaleString()} / 8,000`
            : ''}
        </p>
        {state.error ? (
          <p className="request-error" role="alert">
            {state.error}
          </p>
        ) : null}
      </div>
    </>
  );
}
