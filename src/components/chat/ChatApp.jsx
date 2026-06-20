import { Hash, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { DEFAULT_ACCENT, TOKEN_KEY } from "../../lib/chatConstants";
import {
  appRouteForSummary,
  directConversationId,
  getName,
  getSettingsSectionFromPath,
  normalizeVisualSettings,
  parseConversationRoute,
} from "../../lib/chatUtils";
import { useResolvedTheme } from "../../hooks/useResolvedTheme";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useSidebarResize } from "../../hooks/useSidebarResize";
import { IconButton } from "../common/IconButton";
import { SettingsPage } from "../settings/SettingsPage";
import { ChatHeader } from "./ChatHeader";
import { Composer } from "./Composer";
import { ConversationRail } from "./ConversationRail";
import { ForwardDialog } from "./ForwardDialog";
import { InfoModal } from "./InfoModal";
import { MessageList } from "./MessageList";
import { ThreadPanel } from "./ThreadPanel";
import { ReactionDetailsModal } from "./ReactionDetailsModal";

export function ChatApp({ token, onLogout, routePath = "/app", navigate }) {
  const currentUser = useQuery(api.auth.me, token ? { authToken: token } : "skip");
  const summaries = useQuery(api.conversations.list, token ? { authToken: token } : "skip") || [];
  const rooms = useQuery(api.rooms.list, token ? { authToken: token } : "skip") || [];
  const friends = useQuery(api.friends.listFriends, token ? { authToken: token } : "skip") || [];
  const capabilities = useQuery(api.access.capabilities, token ? { authToken: token } : "skip") || {};
  const createRoom = useMutation(api.rooms.create);
  const joinByInvite = useMutation(api.rooms.joinByInvite);
  const addMembers = useMutation(api.rooms.addMembers);
  const removeMember = useMutation(api.rooms.removeMember);
  const updateMemberRole = useMutation(api.rooms.updateMemberRole);
  const leaveRoom = useMutation(api.rooms.leave);
  const rotateInviteLink = useMutation(api.rooms.rotateInviteLink);
  const updateRoom = useMutation(api.rooms.update);
  const updateProfile = useMutation(api.users.updateProfile);
  const updateProfilePhoto = useMutation(api.users.updateProfilePhoto);
  const clearProfilePhoto = useMutation(api.users.clearProfilePhoto);
  const updateSettings = useMutation(api.users.updateSettings);
  const sendDirect = useMutation(api.messages.sendDirect);
  const sendRoom = useMutation(api.messages.sendRoom);
  const editMessage = useMutation(api.messages.edit);
  const deleteMessage = useMutation(api.messages.remove);
  const reactMessage = useMutation(api.messages.toggleReaction);
  const markRead = useMutation(api.messages.markConversationRead);
  const setPreference = useMutation(api.conversations.setPreference);
  const heartbeat = useMutation(api.presence.heartbeat);
  const setTyping = useMutation(api.presence.setTyping);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [threadRoot, setThreadRoot] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [forwardSource, setForwardSource] = useState(null);
  const [reactionTarget, setReactionTarget] = useState(null);
  const [messageLimit, setMessageLimit] = useState(160);
  const typingTimerRef = useRef(null);
  const lastMarkedReadRef = useRef("");
  const { sidebarWidth, isResizing, startResizing } = useSidebarResize();
  const isMobileLayout = useMediaQuery("(max-width: 760px)");

  const currentSummary = summaries.find((summary) => summary.conversationId === selected?.conversationId);
  const directAccessBlocked = selected?.type === "direct" && (selected.canMessage === false || currentSummary?.canMessage === false);
  const directAccessReason = currentSummary?.accessReason || selected?.accessReason || "Add this person as a friend before messaging";
  const canUseSelectedConversation = Boolean(selected && !directAccessBlocked);
  const room = useQuery(api.rooms.get, token && selected?.type === "room" ? { authToken: token, roomId: selected.conversationId } : "skip");
  const messageResult = useQuery(api.messages.list, token && canUseSelectedConversation ? {
    authToken: token,
    conversationType: selected.type,
    conversationId: selected.conversationId,
    limit: messageLimit,
  } : "skip");
  const messages = messageResult || [];
  const messagesLoading = canUseSelectedConversation && messageResult === undefined;
  const typingUsers = useQuery(api.presence.listTyping, token && canUseSelectedConversation ? {
    authToken: token,
    conversationType: selected.type,
    conversationId: selected.conversationId,
  } : "skip") || [];

  const presenceIds = useMemo(() => {
    const ids = new Set(friends.map((user) => user.publicId));
    summaries.forEach((summary) => {
      if (summary.directUserId) ids.add(summary.directUserId);
    });
    return [...ids];
  }, [friends, summaries]);
  const presence = useQuery(api.presence.getUsersPresence, token ? { authToken: token, userIds: presenceIds } : "skip") || [];
  const presenceById = useMemo(() => new Map(presence.map((entry) => [entry.userId, entry])), [presence]);
  const routeConversation = useMemo(() => parseConversationRoute(routePath), [routePath]);
  const settingsSection = useMemo(() => getSettingsSectionFromPath(routePath), [routePath]);
  const isSettingsRoute = routePath.startsWith("/settings");
  const inviteCode = useMemo(() => {
    const match = routePath.match(/^\/invite\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : "";
  }, [routePath]);
  const appSettings = normalizeVisualSettings(currentUser?.settings || {});
  const resolvedTheme = useResolvedTheme(appSettings.theme || "system");

  useEffect(() => {
    const applySelected = (next) => {
      const isSame = selected?.type === next.type
        && selected?.conversationId === next.conversationId
        && selected?.directUserId === next.directUserId;
      if (!isSame) setSelected(next);
    };

    if (isSettingsRoute) return;
    if (routeConversation) {
      const summary = summaries.find((entry) => entry.conversationId === routeConversation.conversationId);
      if (summary) {
        applySelected({ type: summary.type, conversationId: summary.conversationId, directUserId: summary.directUserId, title: summary.title, user: summary.user, room: summary.room, canMessage: summary.canMessage, accessReason: summary.accessReason });
        return;
      }
      if (routeConversation.type === "room") {
        const targetRoom = rooms.find((entry) => entry.roomId === routeConversation.conversationId || entry._id === routeConversation.conversationId);
        if (targetRoom) {
          applySelected({ type: "room", conversationId: targetRoom.roomId || targetRoom._id, title: targetRoom.name, room: targetRoom });
          return;
        }
      }
      if (routeConversation.type === "direct" && currentUser) {
        const [first, second] = routeConversation.conversationId.replace(/^direct:/, "").split(":");
        const otherId = first === currentUser.publicId ? second : first;
        const user = friends.find((entry) => entry.publicId === otherId);
        if (user) {
          applySelected({ type: "direct", conversationId: routeConversation.conversationId, directUserId: user.publicId, title: getName(user), user, canMessage: true });
          return;
        }
      }
    }
    if (!selected && !isMobileLayout && summaries.length > 0 && routePath === "/app") {
      const first = summaries[0];
      setSelected({ type: first.type, conversationId: first.conversationId, directUserId: first.directUserId, title: first.title, user: first.user, room: first.room, canMessage: first.canMessage, accessReason: first.accessReason });
      navigate?.(appRouteForSummary(first), { replace: true });
    }
  }, [currentUser, friends, isMobileLayout, isSettingsRoute, navigate, routeConversation, rooms, routePath, selected, summaries]);

  useEffect(() => {
    if (!token || !inviteCode || !currentUser) return;
    let cancelled = false;
    joinByInvite({ authToken: token, inviteCode })
      .then((nextRoom) => {
        if (cancelled || !nextRoom?.roomId) return;
        setSelected({ type: "room", conversationId: nextRoom.roomId, title: nextRoom.name, room: nextRoom });
        navigate?.(`/app/rooms/${encodeURIComponent(nextRoom.roomId)}`, { replace: true });
      })
      .catch(() => navigate?.("/app", { replace: true }));
    return () => {
      cancelled = true;
    };
  }, [currentUser, inviteCode, joinByInvite, navigate, token]);

  useEffect(() => {
    if (!token) return undefined;
    heartbeat({ authToken: token }).catch(() => {});
    const id = setInterval(() => heartbeat({ authToken: token }).catch(() => {}), 45_000);
    return () => clearInterval(id);
  }, [heartbeat, token]);

  useEffect(() => {
    setMessageLimit(160);
    lastMarkedReadRef.current = "";
  }, [selected?.conversationId, selected?.type]);

  const uploadFiles = useCallback(async (files) => {
    const uploaded = [];
    for (const file of files) {
      const uploadUrl = await generateUploadUrl({ authToken: token });
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!response.ok) throw new Error(`Upload failed for ${file.name}`);
      const { storageId } = await response.json();
      uploaded.push({ storageId, name: file.name, type: file.type || "application/octet-stream", size: file.size });
    }
    return uploaded;
  }, [generateUploadUrl, token]);

  const uploadAvatar = useCallback(async (file) => {
    if (!file) return null;
    const uploadUrl = await generateUploadUrl({ authToken: token });
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!response.ok) throw new Error("Avatar upload failed");
    const { storageId } = await response.json();
    return await updateProfilePhoto({ authToken: token, storageId });
  }, [generateUploadUrl, token, updateProfilePhoto]);

  const startTyping = useCallback(() => {
    if (!selected || directAccessBlocked || currentUser?.settings?.typingIndicator === false) return;
    setTyping({ authToken: token, conversationType: selected.type, conversationId: selected.conversationId, isTyping: true }).catch(() => {});
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setTyping({ authToken: token, conversationType: selected.type, conversationId: selected.conversationId, isTyping: false }).catch(() => {});
    }, 1600);
  }, [currentUser?.settings?.typingIndicator, directAccessBlocked, selected, setTyping, token]);

  const clearComposerContext = () => {
    setReplyTo(null);
    setEditing(null);
    if (editing) setComposerText("");
  };

  const sendCurrentMessage = async (text, attachments = []) => {
    if (!selected) return;
    if (directAccessBlocked) throw new Error(directAccessReason);
    if (editing) {
      await editMessage({ authToken: token, messageId: editing.messageId || editing._id, text });
      setEditing(null);
      setComposerText("");
      return;
    }
    const quotedMessage = replyTo ? {
      messageId: replyTo.messageId || replyTo._id,
      text: replyTo.text,
      senderId: replyTo.senderId,
      createdAt: replyTo.createdAt,
    } : undefined;
    if (selected.type === "room") {
      if (room?.settings?.allowFiles === false && attachments.length > 0) {
        throw new Error("File attachments are disabled in this room");
      }
      await sendRoom({ authToken: token, roomId: selected.conversationId, text, attachments, quotedMessage });
    } else {
      await sendDirect({ authToken: token, receiverId: selected.directUserId, text, attachments, quotedMessage });
    }
    setComposerText("");
    setReplyTo(null);
  };

  const selectSummary = (summary) => {
    setSelected({ type: summary.type, conversationId: summary.conversationId, directUserId: summary.directUserId, title: summary.title, user: summary.user, room: summary.room, canMessage: summary.canMessage, accessReason: summary.accessReason });
    setThreadRoot(null);
    setShowInfo(false);
    navigate?.(appRouteForSummary(summary));
  };

  const startDirect = (user) => {
    const conversationId = directConversationId(currentUser.publicId, user.publicId);
    setSelected({
      type: "direct",
      conversationId,
      directUserId: user.publicId,
      title: getName(user),
      user,
      canMessage: true,
    });
    setThreadRoot(null);
    navigate?.(`/app/chats/${encodeURIComponent(conversationId)}`);
  };

  const matchedMessageIds = useMemo(() => {
    const query = messageSearch.trim().toLowerCase();
    if (!query) return new Set();
    return new Set(messages
      .filter((message) => [message.text, message.senderProfile?.fullName, message.quotedMessage?.text].filter(Boolean).join(" ").toLowerCase().includes(query))
      .map((message) => message.messageId || message._id));
  }, [messageSearch, messages]);

  const markLastVisibleRead = useCallback((lastMessage) => {
    if (!selected || directAccessBlocked || !lastMessage) return;
    const messageId = lastMessage.messageId || lastMessage._id;
    if (!messageId) return;
    const readKey = `${selected.type}:${selected.conversationId}:${messageId}`;
    if (lastMarkedReadRef.current === readKey) return;
    lastMarkedReadRef.current = readKey;
    markRead({
      authToken: token,
      conversationType: selected.type,
      conversationId: selected.conversationId,
      lastReadMessageId: messageId,
    }).catch(() => {
      lastMarkedReadRef.current = "";
    });
  }, [directAccessBlocked, markRead, selected, token]);

  if (currentUser === undefined) {
    return <main className="loading-screen"><span className="loader-orbit" /> Loading Hyperchat...</main>;
  }

  if (!currentUser) {
    localStorage.removeItem(TOKEN_KEY);
    onLogout();
    return null;
  }

  const themeClass = resolvedTheme === "dark" ? "theme-dark" : "theme-light";
  const densityClass = `density-${appSettings.density || "compact"}`;
  const wallpaperClass = `wallpaper-${appSettings.chatWallpaper || "doodle"}`;
  const shellStyle = {
    "--color-sparkle-primary": appSettings.accent || DEFAULT_ACCENT,
    "--message-font-size": `${appSettings.fontSize || 14}px`,
    "--sidebar-width": `${sidebarWidth}px`,
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    onLogout();
    navigate?.("/auth/sign-in", { replace: true });
  };

  const backToChats = () => navigate?.(selected ? `/app/${selected.type === "room" ? "rooms" : "chats"}/${encodeURIComponent(selected.conversationId)}` : "/app");

  return (
    <main className={`app-shell ${selected && !isSettingsRoute ? "has-selection" : ""} ${isSettingsRoute ? "settings-open" : ""} ${themeClass} ${densityClass} ${wallpaperClass} theme-pack-${appSettings.themePack || "fieldstone"} ${isResizing ? "is-resizing" : ""}`} style={shellStyle}>
      <ConversationRail
        token={token}
        currentUser={currentUser}
        selected={selected}
        summaries={summaries}
        users={friends}
        presenceById={presenceById}
        search={search}
        onSearch={setSearch}
        onSelectSummary={selectSummary}
        onStartDirect={startDirect}
        canAccessPowerGroups={Boolean(capabilities.canAccessPowerGroups)}
        onCreateRoom={async (payload) => {
          const nextRoom = await createRoom({ authToken: token, ...payload });
          setSelected({ type: "room", conversationId: nextRoom.roomId, title: nextRoom.name, room: nextRoom });
          navigate?.(`/app/rooms/${encodeURIComponent(nextRoom.roomId)}`);
        }}
        onOpenRoom={(nextRoom) => {
          setSelected({ type: "room", conversationId: nextRoom.roomId, title: nextRoom.name, room: nextRoom });
          navigate?.(`/app/rooms/${encodeURIComponent(nextRoom.roomId)}`);
        }}
        onOpenSettings={() => navigate?.("/settings")}
        onNavigate={navigate}
        onLogout={logout}
        onStartResize={startResizing}
      />

      <section className={`chat-pane ${isSettingsRoute ? "settings-pane" : ""}`}>
        {isSettingsRoute ? (
          <SettingsPage
            section={settingsSection}
            currentUser={currentUser}
            onBackToChats={backToChats}
            onNavigate={navigate}
            onUpdateProfile={(updates) => updateProfile({ authToken: token, updates })}
            onUpdateSettings={(settings) => updateSettings({ authToken: token, settings })}
            onUploadAvatar={uploadAvatar}
            onClearAvatar={() => clearProfilePhoto({ authToken: token })}
            onLogout={logout}
          />
        ) : (
          <>
            <ChatHeader
              selected={selected}
              currentSummary={currentSummary}
              room={room}
              presence={selected?.type === "direct" ? presenceById.get(selected.directUserId) : null}
              typingUsers={typingUsers}
              onBack={() => { setSelected(null); navigate?.("/app"); }}
              onInfo={() => setShowInfo(true)}
              onSearch={() => setShowMessageSearch((value) => !value)}
              onTogglePin={() => currentSummary && setPreference({ authToken: token, conversationId: currentSummary.conversationId, pinned: !currentSummary.pinned })}
              onToggleMute={() => currentSummary && setPreference({ authToken: token, conversationId: currentSummary.conversationId, muted: !currentSummary.muted })}
            />

            {showMessageSearch && (
              <div className="message-search">
                <Search size={15} />
                <input value={messageSearch} onChange={(event) => setMessageSearch(event.target.value)} placeholder="Search this chat" autoFocus />
                {messageSearch.trim() && <span className="message-search-count">{matchedMessageIds.size}</span>}
                <IconButton title="Close search" onClick={() => { setShowMessageSearch(false); setMessageSearch(""); }}><X size={16} /></IconButton>
              </div>
            )}

            {!selected ? (
              <div className="empty-chat">
                <Hash size={34} />
                <h2>Select a chat</h2>
                <p>Direct messages and rooms live in the sidebar.</p>
              </div>
            ) : (
              <>
                <MessageList
                  selected={selected}
                  summary={currentSummary}
                  room={room}
                  messages={messages}
                  loading={messagesLoading}
                  canLoadMore={!messagesLoading && messages.length >= messageLimit}
                  lockedReason={directAccessBlocked ? directAccessReason : ""}
                  onLoadMore={() => setMessageLimit((current) => Math.min(current + 80, 600))}
                  searchQuery={messageSearch}
                  matchedMessageIds={matchedMessageIds}
                  currentUser={currentUser}
                  typingUsers={typingUsers}
                  onReadLast={markLastVisibleRead}
                  onReply={(message) => { setReplyTo(message); setEditing(null); }}
                  onThread={setThreadRoot}
                  onForward={setForwardSource}
                  onEdit={(message) => { setEditing(message); setReplyTo(null); setComposerText(message.text || ""); }}
                  onDelete={(message) => deleteMessage({ authToken: token, messageId: message.messageId || message._id })}
                  onReaction={(message, emoji) => reactMessage({ authToken: token, messageId: message.messageId || message._id, emoji })}
                  onViewReactions={setReactionTarget}
                />
                <Composer
                  value={composerText}
                  onChange={setComposerText}
                  onSend={sendCurrentMessage}
                  replyTo={replyTo}
                  editing={editing}
                  onCancelContext={clearComposerContext}
                  onTyping={startTyping}
                  uploadFiles={uploadFiles}
                  attachmentsDisabled={selected?.type === "room" && room?.settings?.allowFiles === false}
                  disabledReason={directAccessBlocked ? directAccessReason : ""}
                />
              </>
            )}
          </>
        )}
      </section>

      {!isSettingsRoute && threadRoot && (
        <ThreadPanel
          token={token}
          currentUser={currentUser}
          threadRoot={threadRoot}
          onClose={() => setThreadRoot(null)}
          uploadFiles={uploadFiles}
          attachmentsDisabled={selected?.type === "room" && room?.settings?.allowFiles === false}
        />
      )}

      {!isSettingsRoute && showInfo && (
        <InfoModal
          open={showInfo}
          selected={selected}
          summary={currentSummary}
          room={room}
          currentUser={currentUser}
          users={friends}
          onClose={() => setShowInfo(false)}
          onAddMembers={(memberIds) => selected?.type === "room" && addMembers({ authToken: token, roomId: selected.conversationId, memberIds })}
          onRemoveMember={(memberId) => selected?.type === "room" && removeMember({ authToken: token, roomId: selected.conversationId, memberId })}
          onUpdateMemberRole={(memberId, role) => selected?.type === "room" && updateMemberRole({ authToken: token, roomId: selected.conversationId, memberId, role })}
          onLeaveRoom={async () => {
            if (selected?.type !== "room") return;
            await leaveRoom({ authToken: token, roomId: selected.conversationId });
            setShowInfo(false);
            setThreadRoot(null);
            setSelected(null);
            navigate?.("/app", { replace: true });
          }}
          onUpdateRoom={(patch) => selected?.type === "room" && updateRoom({ authToken: token, roomId: selected.conversationId, ...patch })}
          onRotateInviteLink={() => selected?.type === "room" && rotateInviteLink({ authToken: token, roomId: selected.conversationId })}
          onUpdateSettings={(settings) => updateSettings({ authToken: token, settings })}
          onTogglePin={() => currentSummary && setPreference({ authToken: token, conversationId: currentSummary.conversationId, pinned: !currentSummary.pinned })}
          onToggleMute={() => currentSummary && setPreference({ authToken: token, conversationId: currentSummary.conversationId, muted: !currentSummary.muted })}
          onShowSearch={() => setShowMessageSearch(true)}
        />
      )}

      {!isSettingsRoute && (
        <ForwardDialog
          token={token}
          source={forwardSource}
          summaries={summaries}
          users={friends}
          onClose={() => setForwardSource(null)}
        />
      )}

      {!isSettingsRoute && (
        <ReactionDetailsModal
          open={Boolean(reactionTarget)}
          message={reactionTarget}
          currentUser={currentUser}
          onClose={() => setReactionTarget(null)}
          onReaction={(emoji) => reactionTarget && reactMessage({ authToken: token, messageId: reactionTarget.messageId || reactionTarget._id, emoji })}
        />
      )}
    </main>
  );
}
