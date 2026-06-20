import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { groupWithDates, getName } from "../../lib/chatUtils";
import { Avatar } from "../common/Avatar";
import { ChatIntro } from "./ChatIntro";
import { MessageBubble } from "./MessageBubble";

function TypingIndicator({ typingUsers = [] }) {
  if (!typingUsers.length) return null;
  const first = typingUsers[0]?.user;
  return (
    <div className="typing-indicator">
      <Avatar entity={first} size="sm" />
      <span className="typing-bubble"><i /><i /><i /></span>
      <small>{typingUsers.map((entry) => getName(entry.user)).join(", ")} typing</small>
    </div>
  );
}

export function MessageList({
  selected,
  summary,
  room,
  messages = [],
  loading,
  canLoadMore,
  onLoadMore,
  searchQuery,
  matchedMessageIds,
  currentUser,
  onReadLast,
  onReply,
  onThread,
  onForward,
  onEdit,
  onDelete,
  onReaction,
  onViewReactions,
  typingUsers,
  lockedReason,
  lockedActionLabel,
  lockedActionBusy,
  lockedError,
  onLockedAction,
}) {
  const rows = useMemo(() => groupWithDates(messages), [messages]);
  const listRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);
  const previousConversationRef = useRef("");
  const preserveBottomOffsetRef = useRef(0);
  const loadingOlderRef = useRef(false);

  const readLastIfVisible = () => {
    const node = listRef.current;
    const last = messages[messages.length - 1];
    if (!node || !last) return;
    const nearBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 140;
    if (nearBottom) onReadLast?.(last);
  };

  useLayoutEffect(() => {
    const node = listRef.current;
    if (!node || !loadingOlderRef.current) return;
    node.scrollTop = Math.max(0, node.scrollHeight - preserveBottomOffsetRef.current);
    loadingOlderRef.current = false;
  }, [messages.length]);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    const conversationChanged = previousConversationRef.current !== selected?.conversationId;
    if (conversationChanged) previousConversationRef.current = selected?.conversationId || "";
    if (!conversationChanged && !shouldStickToBottomRef.current) return;
    requestAnimationFrame(() => {
      node.scrollTop = node.scrollHeight;
      readLastIfVisible();
    });
  }, [messages.length, selected?.conversationId]);

  useEffect(() => {
    readLastIfVisible();
  }, [messages.length, selected?.conversationId]);

  return (
    <div
      className="message-scroll"
      ref={listRef}
      onScroll={(event) => {
        const node = event.currentTarget;
        shouldStickToBottomRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 140;
        if (shouldStickToBottomRef.current) readLastIfVisible();
      }}
    >
      <div className="message-column">
        <ChatIntro selected={selected} summary={summary} room={room} currentUser={currentUser} />
        {canLoadMore && (
          <button
            type="button"
            className="load-earlier-button"
            onClick={() => {
              const node = listRef.current;
              if (node) preserveBottomOffsetRef.current = node.scrollHeight - node.scrollTop;
              loadingOlderRef.current = true;
              onLoadMore?.();
            }}
          >
            Load earlier
          </button>
        )}
        {loading && <div className="message-loading-row">Loading messages...</div>}
        {lockedReason && (
          <div className="conversation-lock">
            <span>{lockedReason}</span>
            {lockedActionLabel && (
              <button type="button" disabled={lockedActionBusy} onClick={onLockedAction}>
                {lockedActionBusy ? "Restoring..." : lockedActionLabel}
              </button>
            )}
            {lockedError && <small>{lockedError}</small>}
          </div>
        )}
        {rows.map((row, index) => row.type === "date" ? (
          <div className="date-separator" key={row.id}>{row.label}</div>
        ) : (
          <MessageBubble
            key={row.id}
            message={row.message}
            previous={rows[index - 1]}
            next={rows[index + 1]}
            currentUser={currentUser}
            highlighted={matchedMessageIds?.has(row.message.messageId || row.message._id)}
            searchQuery={searchQuery}
            onReply={onReply}
            onThread={onThread}
            onForward={onForward}
            onEdit={onEdit}
            onDelete={onDelete}
            onReaction={onReaction}
            onViewReactions={onViewReactions}
          />
        ))}
        <TypingIndicator typingUsers={typingUsers} />
      </div>
    </div>
  );
}
