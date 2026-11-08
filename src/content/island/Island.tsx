import { IslandChat } from './IslandChat';
import type { ConversationManager } from './conversation/conversation-manager';
import { useIslandWindow } from './useIslandWindow';
interface Props {
  manager: ConversationManager;
  focusVersion: number;
  session: number;
  onClose: () => void;
}
export function Island({ manager, focusVersion, session, onClose }: Props) {
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
      <IslandChat key={session} manager={manager} focusVersion={focusVersion} />
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
