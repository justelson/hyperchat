import { Bell, BellOff } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { formatTime, getName } from "../../lib/chatUtils";
import { Avatar } from "../common/Avatar";
import { IconButton } from "../common/IconButton";

function notificationText(notification) {
  const actor = getName(notification.actor);
  const preview = notification.meta?.preview ? `: ${notification.meta.preview}` : "";
  if (notification.type === "friend_request") return `${actor} sent a friend request`;
  if (notification.type === "friend_accept") return `${actor} accepted your friend request`;
  if (notification.type === "room_invite") return `${actor} invited you to a room`;
  if (notification.type === "thread_reply") return `${actor} replied in a thread${preview}`;
  if (notification.type === "room_message") return `${actor} messaged a room${preview}`;
  return `${actor} sent you a message${preview}`;
}

function notificationRoute(notification) {
  if (notification?.entity?.roomId) return `/app/rooms/${encodeURIComponent(notification.entity.roomId)}`;
  if (notification?.entity?.conversationId) return `/app/chats/${encodeURIComponent(notification.entity.conversationId)}`;
  return "/app";
}

export function NotificationMenu({ token, enabled = true, onNavigate }) {
  const [open, setOpen] = useState(false);
  const notifications = useQuery(api.notifications.list, token && open && enabled ? { authToken: token, limit: 30 } : "skip") || [];
  const unreadCount = useQuery(api.notifications.unreadCount, token && enabled ? { authToken: token } : "skip");
  const markRead = useMutation(api.notifications.markRead);
  const markReadByContext = useMutation(api.notifications.markReadByContext);
  const unread = Number(unreadCount || 0);

  const openNotification = async (notification) => {
    try {
      await Promise.all([
        markRead({ authToken: token, notificationId: notification.notificationId || notification.id }),
        markReadByContext({
          authToken: token,
          conversationId: notification.entity?.conversationId,
          roomId: notification.entity?.roomId,
          threadId: notification.entity?.threadId,
        }),
      ]);
    } catch {
      // Navigation should still happen if marking read races with deleted data.
    }
    setOpen(false);
    onNavigate?.(notificationRoute(notification));
  };

  return (
    <div className="notification-menu">
      <IconButton title={enabled ? "Notifications" : "Notifications off"} onClick={() => setOpen((value) => !value)}>
        {enabled ? <Bell size={18} /> : <BellOff size={18} />}
        {enabled && unread > 0 && <span className="notification-count">{Math.min(unread, 99)}</span>}
      </IconButton>
      {open && (
        <section className="notification-popover">
          <header>
            <strong>Notifications</strong>
            {enabled && notifications.length > 0 && <button type="button" onClick={() => markRead({ authToken: token }).catch(() => {})}>Mark all read</button>}
          </header>
          {!enabled ? (
            <p className="empty-copy">Notifications are off.</p>
          ) : notifications.length === 0 ? (
            <p className="empty-copy">Nothing new.</p>
          ) : (
            <div className="notification-list">
              {notifications.map((notification) => (
                <button
                  key={notification.notificationId || notification.id}
                  type="button"
                  className={notification.isRead ? "" : "unread"}
                  onClick={() => openNotification(notification)}
                >
                  <Avatar entity={notification.actor} size="sm" />
                  <span>
                    <strong>{notificationText(notification)}</strong>
                    <small>{formatTime(notification.createdAt)}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
