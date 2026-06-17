import { ArrowLeft, BellOff, Hash, Info, MoreVertical, Pin, Search } from "lucide-react";
import { getName } from "../../lib/chatUtils";
import { Avatar } from "../common/Avatar";
import { IconButton } from "../common/IconButton";

export function ChatHeader({
  selected,
  currentSummary,
  room,
  presence,
  typingUsers,
  onBack,
  onInfo,
  onSearch,
  onTogglePin,
  onToggleMute,
}) {
  if (!selected) return <header className="chat-header empty-header" />;
  const isRoom = selected.type === "room";
  const entity = isRoom ? (room || currentSummary?.room || selected.room) : (currentSummary?.user || selected.user);
  const title = isRoom ? entity?.name || selected.title || "Room" : getName(entity);
  const typingLabel = typingUsers?.length ? `${typingUsers.map((entry) => getName(entry.user)).join(", ")} typing...` : "";
  const presenceLabel = isRoom
    ? `${room?.memberCount || currentSummary?.room?.memberCount || selected.room?.memberCount || 0} members`
    : presence?.isOnline ? "Online" : "Offline";

  return (
    <header className="chat-header">
      <button type="button" className="mobile-back" onClick={onBack} aria-label="Back to conversations">
        <ArrowLeft size={21} />
      </button>
      <button type="button" className="chat-identity" onClick={onInfo}>
        <Avatar entity={entity} kind={isRoom ? "room" : "user"} online={!isRoom && presence?.isOnline} />
        <span>
          <strong>{title}</strong>
          <small className={typingLabel ? "typing" : ""}>{typingLabel || presenceLabel}</small>
        </span>
        {isRoom && <span className="header-kind"><Hash size={12} /> Room</span>}
      </button>
      <div className="chat-header-actions">
        <IconButton title="Search this chat" onClick={onSearch}><Search size={18} /></IconButton>
        <IconButton title={currentSummary?.pinned ? "Unpin" : "Pin"} onClick={onTogglePin}><Pin size={18} fill={currentSummary?.pinned ? "currentColor" : "none"} /></IconButton>
        <IconButton title={currentSummary?.muted ? "Unmute" : "Mute"} onClick={onToggleMute}><BellOff size={18} /></IconButton>
        <IconButton title={isRoom ? "Room info" : "Contact info"} onClick={onInfo}><Info size={18} /></IconButton>
        <IconButton title="More" onClick={onInfo}><MoreVertical size={18} /></IconButton>
      </div>
    </header>
  );
}
