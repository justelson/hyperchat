import { useEffect, useMemo, useRef } from "react";
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
  currentUser,
  onReply,
  onThread,
  onForward,
  onEdit,
  onDelete,
  onReaction,
  onViewReactions,
  typingUsers,
}) {
  const rows = useMemo(() => groupWithDates(messages), [messages]);
  const listRef = useRef(null);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages.length, selected?.conversationId]);

  return (
    <div className="message-scroll" ref={listRef}>
      <div className="message-column">
        <ChatIntro selected={selected} summary={summary} room={room} currentUser={currentUser} />
        {rows.map((row, index) => row.type === "date" ? (
          <div className="date-separator" key={row.id}>{row.label}</div>
        ) : (
          <MessageBubble
            key={row.id}
            message={row.message}
            previous={rows[index - 1]}
            next={rows[index + 1]}
            currentUser={currentUser}
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
