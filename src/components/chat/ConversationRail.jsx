import { Compass, Hash, LogOut, MessageSquare, Pin, Plus, Settings, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { appRouteForSummary, conversationEntity, formatTime, getName, searchBlob } from "../../lib/chatUtils";
import { Avatar } from "../common/Avatar";
import { IconButton } from "../common/IconButton";
import { SearchInput } from "../common/SearchInput";
import { NotificationMenu } from "../notifications/NotificationMenu";
import { NewChatModal } from "./NewChatModal";
import { NewRoomModal } from "./NewRoomModal";
import { RoomDiscoveryModal } from "./RoomDiscoveryModal";

const filters = [
  { id: "all", label: "All" },
  { id: "direct", label: "Chats" },
  { id: "room", label: "Rooms" },
  { id: "unread", label: "Unread" },
];

function ConversationTypeBadge({ type }) {
  return (
    <span className={`conversation-type-badge ${type}`}>
      {type === "room" ? <><Hash size={11} /> Room</> : <><MessageSquare size={11} /> Chat</>}
    </span>
  );
}

function ConversationItem({ summary, selected, currentUser, presenceById, onSelect }) {
  const entity = conversationEntity(summary);
  const isRoom = summary.type === "room";
  const isLocked = !isRoom && summary.canMessage === false;
  const unread = Number(summary.unreadCount || 0) > 0;
  const lastText = isLocked
    ? summary.accessReason || (summary.canRestoreFriendship ? "Restore friendship to continue this chat" : "Add this person as a friend before messaging")
    : summary.lastMessage?.text || (summary.isDraft ? "Ready to message" : isRoom ? `${summary.room?.memberCount || 0} members` : "No messages yet");
  const lastPrefix = summary.lastMessage?.senderId === currentUser?.publicId ? "You: " : "";
  const isOnline = !isRoom && presenceById?.get(summary.directUserId)?.isOnline;

  return (
    <button
      type="button"
      className={`conversation-item ${selected ? "selected" : ""} ${unread ? "unread" : ""} ${isLocked ? "locked" : ""}`}
      onClick={() => onSelect(summary)}
    >
      <Avatar entity={entity} kind={isRoom ? "room" : "user"} online={isOnline} />
      <span className="conversation-main">
        <span className="conversation-title">
          <strong>{summary.title}</strong>
          {summary.pinned && <Pin size={12} />}
          <small>{formatTime(summary.lastMessageAt || summary.updatedAt)}</small>
        </span>
        {isLocked ? (
          <span className="conversation-preview locked-preview">
            <span className="rail-lock-status">{lastText}</span>
          </span>
        ) : (
          <span className="conversation-preview">
            <ConversationTypeBadge type={summary.type} />
            <span>{lastPrefix}{lastText}</span>
          </span>
        )}
      </span>
      {unread && <span className="unread-badge">{Math.min(Number(summary.unreadCount), 99)}</span>}
    </button>
  );
}

export function ConversationRail({
  token,
  currentUser,
  selected,
  summaries,
  users,
  presenceById,
  search,
  onSearch,
  onSelectSummary,
  onStartDirect,
  canAccessPowerGroups,
  onCreateRoom,
  onOpenRoom,
  onOpenSettings,
  onNavigate,
  onLogout,
  onStartResize,
}) {
  const [filter, setFilter] = useState("all");
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [showDiscoverRooms, setShowDiscoverRooms] = useState(false);

  const railSummaries = useMemo(() => {
    const base = summaries || [];
    if (!selected?.conversationId || base.some((summary) => summary.conversationId === selected.conversationId)) {
      return base;
    }

    return [{
      type: selected.type,
      conversationId: selected.conversationId,
      directUserId: selected.directUserId,
      title: selected.title || getName(selected.user) || selected.room?.name || "New conversation",
      user: selected.user,
      room: selected.room,
      canMessage: selected.canMessage,
      canRestoreFriendship: selected.canRestoreFriendship,
      accessReason: selected.accessReason,
      updatedAt: Date.now(),
      isDraft: true,
    }, ...base];
  }, [selected, summaries]);

  const visibleSummaries = useMemo(() => {
    const lowered = search.trim().toLowerCase();
    return railSummaries
      .filter((summary) => {
        if (filter === "direct" && summary.type !== "direct") return false;
        if (filter === "room" && summary.type !== "room") return false;
        if (filter === "unread" && Number(summary.unreadCount || 0) <= 0) return false;
        return !lowered || searchBlob(summary.title, summary.lastMessage?.text, summary.type).includes(lowered);
      });
  }, [filter, railSummaries, search]);

  const pinned = visibleSummaries.filter((summary) => summary.pinned);
  const regular = visibleSummaries.filter((summary) => !summary.pinned);

  const renderList = (items) => items.map((summary) => (
    <ConversationItem
      key={summary.conversationId}
      summary={summary}
      currentUser={currentUser}
      presenceById={presenceById}
      selected={selected?.conversationId === summary.conversationId}
      onSelect={onSelectSummary}
    />
  ));

  return (
    <aside className="conversation-rail">
      <header className="rail-header">
        <div className="rail-title">
          <span className="brand-mark compact">H</span>
          <div>
            <strong>Hyperchat</strong>
            <small>Chats and rooms</small>
          </div>
        </div>
        <div className="rail-actions">
          <IconButton title="New chat" onClick={() => setShowNewChat(true)}><Plus size={18} /></IconButton>
          <IconButton title="New room" onClick={() => setShowNewRoom(true)}><Users size={18} /></IconButton>
          <IconButton title="Find rooms" onClick={() => setShowDiscoverRooms(true)}><Compass size={18} /></IconButton>
        </div>
      </header>

      <div className="rail-tools">
        <SearchInput value={search} onChange={onSearch} placeholder="Search chats" />
        <div className="rail-filters">
          {filters.map((item) => (
            <button key={item.id} type="button" className={filter === item.id ? "active" : ""} onClick={() => setFilter(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="conversation-list">
        {pinned.length > 0 && (
          <>
            <div className="list-separator">Pinned</div>
            {renderList(pinned)}
          </>
        )}
        {regular.length > 0 && (
          <>
            <div className="list-separator">{pinned.length ? "Recent" : "Conversations"}</div>
            {renderList(regular)}
          </>
        )}
        {visibleSummaries.length === 0 && (
          <div className="rail-empty">
            <MessageSquare size={28} />
            <p>No conversations found</p>
            <span>Start a chat or create a room.</span>
          </div>
        )}
      </div>

      <footer className="rail-account-footer">
        <button type="button" className="rail-account-button" onClick={onOpenSettings}>
          <Avatar entity={currentUser} online />
          <span>
            <strong>{getName(currentUser)}</strong>
            <small>{currentUser?.status || currentUser?.username || "Available"}</small>
          </span>
        </button>
        <div className="rail-account-actions">
          <NotificationMenu token={token} enabled={currentUser?.settings?.notifications !== false} onNavigate={(path) => onNavigate?.(path || appRouteForSummary(selected))} />
          <IconButton title="Settings" onClick={onOpenSettings}><Settings size={18} /></IconButton>
          <IconButton title="Sign out" onClick={onLogout}><LogOut size={18} /></IconButton>
        </div>
      </footer>

      <button type="button" className="sidebar-resize-handle" aria-label="Resize sidebar" onPointerDown={onStartResize} />

      <NewChatModal
        open={showNewChat}
        token={token}
        users={users}
        presenceById={presenceById}
        onClose={() => setShowNewChat(false)}
        onStartDirect={onStartDirect}
      />
      <NewRoomModal
        open={showNewRoom}
        token={token}
        users={users}
        canAccessPowerGroups={canAccessPowerGroups}
        onClose={() => setShowNewRoom(false)}
        onCreateRoom={onCreateRoom}
      />
      <RoomDiscoveryModal
        open={showDiscoverRooms}
        token={token}
        onClose={() => setShowDiscoverRooms(false)}
        onJoined={onOpenRoom}
      />
    </aside>
  );
}
