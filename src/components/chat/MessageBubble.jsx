import { Check, CheckCheck, Edit3, File, Forward, MessageSquare, Paperclip, Reply, Smile, Trash2 } from "lucide-react";
import { useState } from "react";
import { REACTION_EMOJIS } from "../../lib/chatConstants";
import { formatFileSize, formatTime, getName } from "../../lib/chatUtils";
import { AnimatedEmoji } from "../common/AnimatedEmoji";
import { Avatar } from "../common/Avatar";
import { EmojiPicker } from "../common/EmojiPicker";
import { IconButton } from "../common/IconButton";

function MessageStatus({ message, isOwn }) {
  if (!isOwn) return null;
  const readCount = (message.readBy || []).filter((entry) => entry.userId !== message.senderId && !entry.hiddenByPrivacy).length;
  const deliveredCount = (message.deliveredBy || []).filter((entry) => entry.userId !== message.senderId).length;
  if (readCount > 0) return <span title="Seen"><CheckCheck size={13} /> Seen</span>;
  if (deliveredCount > 0) return <span title="Delivered"><CheckCheck size={13} /> Delivered</span>;
  return <span title="Sent"><Check size={13} /> Sent</span>;
}

function AttachmentList({ attachments = [] }) {
  if (!attachments.length) return null;
  return (
    <div className="attachment-list">
      {attachments.map((file, index) => {
        const isImage = String(file.type || "").startsWith("image/") && file.url;
        return (
          <a key={`${file.name}-${index}`} className="attachment-chip" href={file.url || "#"} target="_blank" rel="noreferrer">
            {isImage ? <img src={file.url} alt="" /> : <File size={16} />}
            <span>{file.name || "Attachment"}</span>
            <small>{formatFileSize(file.size)}</small>
          </a>
        );
      })}
    </div>
  );
}

function ReactionPills({ reactions = [], onReaction, onViewReactions, message }) {
  const grouped = reactions.reduce((acc, entry) => {
    const emoji = entry.emoji || entry;
    if (!emoji) return acc;
    acc[emoji] = (acc[emoji] || 0) + 1;
    return acc;
  }, {});
  const entries = Object.entries(grouped).slice(0, 5);
  if (!entries.length) return null;
  return (
    <div className="reaction-pills">
      {entries.map(([emoji, count]) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onReaction(message, emoji)}
          onDoubleClick={() => onViewReactions?.(message)}
          onContextMenu={(event) => { event.preventDefault(); onViewReactions?.(message); }}
        >
          <AnimatedEmoji emoji={emoji} mode="burst" playToken={count} size={15} />
          {count > 1 && <span>{count}</span>}
        </button>
      ))}
      {(message.reactions || []).length > entries.length && (
        <button type="button" onClick={() => onViewReactions?.(message)}>+{(message.reactions || []).length - entries.length}</button>
      )}
    </div>
  );
}

function MessageToolbar({ isOwn, message, onReply, onThread, onForward, onEdit, onDelete, onReaction }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`message-toolbar ${expanded ? "expanded" : ""}`}>
      <div className="quick-reactions">
        {REACTION_EMOJIS.map((emoji) => (
          <button key={emoji} type="button" onClick={() => onReaction(message, emoji)}>
            <AnimatedEmoji emoji={emoji} mode="loop" size={22} />
          </button>
        ))}
        <button type="button" onClick={() => setExpanded((value) => !value)}><Smile size={18} /></button>
      </div>
      {expanded && (
        <div className="toolbar-emoji-picker">
          <EmojiPicker compact onSelect={(emoji) => { onReaction(message, emoji); setExpanded(false); }} />
        </div>
      )}
      <div className="message-action-row">
        <IconButton title="Reply" onClick={() => onReply(message)}><Reply size={15} /></IconButton>
        <IconButton title="Thread" onClick={() => onThread(message)}><MessageSquare size={15} /></IconButton>
        <IconButton title="Forward" onClick={() => onForward(message)}><Forward size={15} /></IconButton>
        {isOwn && <IconButton title="Edit" onClick={() => onEdit(message)}><Edit3 size={15} /></IconButton>}
        {isOwn && <IconButton title="Delete" onClick={() => onDelete(message)}><Trash2 size={15} /></IconButton>}
      </div>
    </div>
  );
}

export function MessageBubble({
  message,
  previous,
  next,
  currentUser,
  onReply,
  onThread,
  onForward,
  onEdit,
  onDelete,
  onReaction,
  onViewReactions,
}) {
  const isOwn = message.senderId === currentUser?.publicId || message.isOwn;
  const previousSame = previous && previous.type !== "date" && previous.message?.senderId === message.senderId && Math.abs(Number(message.createdAt || 0) - Number(previous.message?.createdAt || 0)) < 10 * 60 * 1000;
  const nextSame = next && next.type !== "date" && next.message?.senderId === message.senderId && Math.abs(Number(next.message?.createdAt || 0) - Number(message.createdAt || 0)) < 10 * 60 * 1000;
  const sender = isOwn ? currentUser : message.senderProfile;
  const text = message.senderDeleted ? "Message deleted" : message.text;
  const emojiOnly = !message.senderDeleted
    && !message.attachments?.length
    && /^\p{Extended_Pictographic}(?:\uFE0F|\u200D|\p{Extended_Pictographic})*$/u.test(String(text || "").trim());

  return (
    <div className={`message-row ${isOwn ? "own" : ""} ${previousSame ? "grouped-prev" : ""} ${nextSame ? "grouped-next" : ""}`}>
      {!isOwn && <div className="bubble-avatar-slot">{!nextSame && <Avatar entity={sender} size="sm" />}</div>}
      <div className="bubble-stack">
        {!isOwn && !previousSame && <span className="bubble-sender">{getName(sender)}</span>}
        <div className={`message-bubble ${message.senderDeleted ? "deleted" : ""}`}>
          <MessageToolbar
            isOwn={isOwn}
            message={message}
            onReply={onReply}
            onThread={onThread}
            onForward={onForward}
            onEdit={onEdit}
            onDelete={onDelete}
            onReaction={onReaction}
          />
          {message.forwardedFrom && <span className="forwarded-line"><Forward size={12} /> Forwarded</span>}
          {message.quotedMessage?.text && (
            <button type="button" className="quote-preview">
              <Reply size={13} />
              <span>{message.quotedMessage.text}</span>
            </button>
          )}
          {text && (emojiOnly ? (
            <p className="emoji-only-message"><AnimatedEmoji emoji={text.trim()} mode="loop" size={44} /></p>
          ) : <p>{text}</p>)}
          <AttachmentList attachments={message.attachments} />
          {(!isOwn || !nextSame) && (
            <div className="bubble-meta">
              {message.edited && <span>edited</span>}
              <span>{formatTime(message.createdAt)}</span>
              <MessageStatus message={message} isOwn={isOwn} />
            </div>
          )}
        </div>
        <div className={`bubble-pills ${isOwn ? "own" : ""}`}>
          <ReactionPills reactions={message.reactions} onReaction={onReaction} onViewReactions={onViewReactions} message={message} />
          {Number(message.threadReplyCount || 0) > 0 && (
            <button type="button" className="thread-pill" onClick={() => onThread(message)}>
              <MessageSquare size={12} />
              {message.threadReplyCount}
              {Number(message.threadUnreadCount || 0) > 0 && <span className="thread-dot" />}
            </button>
          )}
        </div>
      </div>
      {isOwn && <div className="bubble-avatar-slot" />}
    </div>
  );
}
