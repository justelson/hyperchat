import { MessageSquare } from "lucide-react";
import { useMemo, useState } from "react";
import { getName, searchBlob } from "../../lib/chatUtils";
import { Avatar } from "../common/Avatar";
import { Modal } from "../common/Modal";
import { SearchInput } from "../common/SearchInput";

export function NewChatModal({ open, users, presenceById, onClose, onStartDirect }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return (users || [])
      .filter((user) => !lowered || searchBlob(user.fullName, user.username, user.email).includes(lowered))
      .slice(0, 80);
  }, [query, users]);

  const start = (user) => {
    onStartDirect?.(user);
    setQuery("");
    onClose?.();
  };

  return (
    <Modal open={open} onClose={onClose} title="New chat" eyebrow="Direct message" size="md">
      <div className="modal-stack">
        <SearchInput value={query} onChange={setQuery} placeholder="Search people" />
        <div className="entity-list">
          {filtered.length === 0 ? (
            <div className="empty-inline"><MessageSquare size={20} /> No people found.</div>
          ) : filtered.map((user) => (
            <button key={user.publicId} type="button" className="entity-row" onClick={() => start(user)}>
              <Avatar entity={user} online={presenceById?.get(user.publicId)?.isOnline} />
              <span>
                <strong>{getName(user)}</strong>
                <small>{user.username ? `@${user.username}` : user.email || "Available"}</small>
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
