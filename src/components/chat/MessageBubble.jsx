import {
  Check,
  CheckCheck,
  Copy,
  Edit3,
  ExternalLink,
  File,
  Forward,
  Image,
  Info,
  MessageSquare,
  Reply,
  Smile,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { REACTION_EMOJIS } from "../../lib/chatConstants";
import { formatFileSize, formatTime, getName } from "../../lib/chatUtils";
import { getEmojiOnlySegments, isRenderableReaction, splitTextWithLinks } from "../../lib/messageText";
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

function MessageText({ text, isOwn }) {
  const parts = splitTextWithLinks(text);
  return (
    <p className="message-text">
      {parts.map((part, index) => part.type === "link" ? (
        <a
          key={`${part.value}-${index}`}
          className={`message-link ${isOwn ? "own" : ""}`}
          href={part.value}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          {part.value}
        </a>
      ) : part.value)}
    </p>
  );
}

function AttachmentList({ attachments = [] }) {
  if (!attachments.length) return null;
  const images = attachments.filter((file) => String(file.type || "").startsWith("image/") && file.url);
  const files = attachments.filter((file) => !images.includes(file));

  return (
    <div className="attachment-list">
      {images.length > 0 && (
        <div className={`attachment-image-grid count-${Math.min(images.length, 4)}`}>
          {images.map((file, index) => (
            <a key={`${file.name}-${index}`} className="attachment-image" href={file.url} target="_blank" rel="noreferrer">
              <img src={file.url} alt={file.name || "Image attachment"} loading="lazy" />
              <span><Image size={13} /> {file.name || "Image"}</span>
            </a>
          ))}
        </div>
      )}
      {files.map((file, index) => (
        <a key={`${file.name}-${index}`} className="attachment-chip" href={file.url || "#"} target="_blank" rel="noreferrer">
          <File size={16} />
          <span>{file.name || "Attachment"}</span>
          <small>{formatFileSize(file.size)}</small>
          {file.url && <ExternalLink size={13} />}
        </a>
      ))}
    </div>
  );
}

function groupReactions(reactions = [], currentUser) {
  const grouped = new Map();
  for (const entry of reactions || []) {
    const emoji = typeof entry === "string" ? entry : entry?.emoji;
    if (!emoji || !isRenderableReaction(emoji)) continue;
    const existing = grouped.get(emoji) || { emoji, count: 0, reactedByMe: false };
    existing.count += 1;
    if (entry?.userId && entry.userId === currentUser?.publicId) existing.reactedByMe = true;
    grouped.set(emoji, existing);
  }
  return [...grouped.values()].slice(0, 5);
}

function ReactionPills({ reactions = [], onReaction, onViewReactions, message, currentUser }) {
  const entries = useMemo(() => groupReactions(reactions, currentUser), [currentUser, reactions]);
  const clickTimerRef = useRef(null);

  useEffect(() => () => {
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
  }, []);

  if (!entries.length) return null;

  const totalReactionKinds = new Set((message.reactions || []).map((entry) => entry.emoji || entry).filter(Boolean)).size;
  const moreCount = Math.max(0, totalReactionKinds - entries.length);

  const handleClick = (emoji) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      onViewReactions?.(message);
      return;
    }
    clickTimerRef.current = setTimeout(() => {
      onReaction(message, emoji);
      clickTimerRef.current = null;
    }, 180);
  };

  return (
    <div className="reaction-pills">
      {entries.map(({ emoji, count, reactedByMe }) => (
        <button
          key={emoji}
          type="button"
          className={reactedByMe ? "active" : ""}
          onClick={() => handleClick(emoji)}
          onContextMenu={(event) => { event.preventDefault(); onViewReactions?.(message); }}
          title="Click to react, double-click for details"
        >
          <AnimatedEmoji emoji={emoji} mode="burst" playToken={count} size={15} />
          {count > 1 && <span>{count}</span>}
        </button>
      ))}
      {moreCount > 0 && (
        <button type="button" onClick={() => onViewReactions?.(message)}>+{moreCount}</button>
      )}
    </div>
  );
}

function MessageToolbar({
  isOwn,
  message,
  onReply,
  onThread,
  onForward,
  onEdit,
  onDelete,
  onReaction,
  onViewReactions,
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyMessage = async () => {
    const text = String(message.text || "").trim();
    if (!text) return;
    await navigator.clipboard?.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 900);
  };

  return (
    <div className={`message-toolbar ${expanded ? "expanded" : ""}`}>
      <div className="quick-reactions">
        {REACTION_EMOJIS.map((emoji) => (
          <button key={emoji} type="button" onClick={() => onReaction(message, emoji)} title={`React with ${emoji}`}>
            <AnimatedEmoji emoji={emoji} mode="loop" size={22} />
          </button>
        ))}
        <button type="button" className={expanded ? "active" : ""} onClick={() => setExpanded((value) => !value)} title="More reactions">
          <Smile size={18} />
        </button>
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
        {message.text && <IconButton title={copied ? "Copied" : "Copy"} onClick={copyMessage}><Copy size={15} /></IconButton>}
        {(message.reactions || []).length > 0 && <IconButton title="Reaction details" onClick={() => onViewReactions?.(message)}><Info size={15} /></IconButton>}
        {isOwn && !message.senderDeleted && <IconButton title="Edit" onClick={() => onEdit(message)}><Edit3 size={15} /></IconButton>}
        {isOwn && !message.senderDeleted && <IconButton title="Delete" onClick={() => onDelete(message)}><Trash2 size={15} /></IconButton>}
      </div>
    </div>
  );
}

export function MessageBubble({
  message,
  previous,
  next,
  currentUser,
  highlighted,
  searchQuery,
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
  const emojiSegments = !message.senderDeleted && !message.attachments?.length ? getEmojiOnlySegments(text) : [];
  const emojiOnly = emojiSegments.length > 0 && emojiSegments.length <= 3;

  return (
    <div className={`message-row ${isOwn ? "own" : ""} ${highlighted ? "search-match" : ""} ${previousSame ? "grouped-prev" : ""} ${nextSame ? "grouped-next" : ""}`} data-search={searchQuery?.trim() || undefined}>
      {!isOwn && <div className="bubble-avatar-slot">{!nextSame && <Avatar entity={sender} size="sm" />}</div>}
      <div className="bubble-stack">
        {!isOwn && !previousSame && <span className="bubble-sender">{getName(sender)}</span>}
        <div className={`message-bubble ${message.senderDeleted ? "deleted" : ""} ${emojiOnly ? "emoji-message-bubble" : ""}`}>
          <MessageToolbar
            isOwn={isOwn}
            message={message}
            onReply={onReply}
            onThread={onThread}
            onForward={onForward}
            onEdit={onEdit}
            onDelete={onDelete}
            onReaction={onReaction}
            onViewReactions={onViewReactions}
          />
          {message.forwardedFrom && <span className="forwarded-line"><Forward size={12} /> Forwarded</span>}
          {message.quotedMessage?.text && (
            <button type="button" className="quote-preview">
              <Reply size={13} />
              <span>{message.quotedMessage.text}</span>
            </button>
          )}
          {text && (emojiOnly ? (
            <p className={`emoji-only-message count-${emojiSegments.length}`}>
              {emojiSegments.map((emoji, index) => (
                <AnimatedEmoji key={`${emoji}-${index}`} emoji={emoji} mode="loop" size={emojiSegments.length === 1 ? 54 : 44} />
              ))}
            </p>
          ) : <MessageText text={text} isOwn={isOwn} />)}
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
          <ReactionPills reactions={message.reactions} onReaction={onReaction} onViewReactions={onViewReactions} message={message} currentUser={currentUser} />
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
