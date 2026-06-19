import { Check, MessageSquare, UserPlus, X } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { displayError, getName, searchBlob } from "../../lib/chatUtils";
import { Avatar } from "../common/Avatar";
import { Modal } from "../common/Modal";
import { SearchInput } from "../common/SearchInput";

function relationLabel(relationship) {
  if (relationship?.status === "friend") return "Friend";
  if (relationship?.status === "incoming") return "Wants to connect";
  if (relationship?.status === "outgoing") return "Request sent";
  return "Not connected";
}

export function NewChatModal({ open, token, users, presenceById, onClose, onStartDirect }) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const people = useQuery(api.friends.searchPeople, token && open ? { authToken: token, search: query, limit: 80 } : "skip");
  const pending = useQuery(api.friends.pending, token && open ? { authToken: token } : "skip");
  const requestFriend = useMutation(api.friends.request);
  const respondFriend = useMutation(api.friends.respond);
  const removeFriend = useMutation(api.friends.remove);

  const filtered = useMemo(() => {
    if (people) return people;
    const lowered = query.trim().toLowerCase();
    return (users || [])
      .filter((user) => !lowered || searchBlob(user.fullName, user.username, user.email).includes(lowered))
      .map((user) => ({ ...user, relationship: { status: "none" } }))
      .slice(0, 80);
  }, [people, query, users]);

  const incoming = pending?.incoming || [];

  const start = (user) => {
    onStartDirect?.(user);
    setQuery("");
    onClose?.();
  };

  const run = async (id, action) => {
    setBusy(id);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(displayError(err));
    } finally {
      setBusy("");
    }
  };

  const renderPerson = (user) => {
    const relationship = user.relationship || { status: "none" };
    const id = user.publicId;
    const canMessage = relationship.status === "friend";
    return (
      <div key={id} className="entity-row entity-row-actionable">
        <button type="button" className="entity-main-button" onClick={() => canMessage && start(user)} disabled={!canMessage}>
          <Avatar entity={user} online={presenceById?.get(user.publicId)?.isOnline} />
          <span>
            <strong>{getName(user)}</strong>
            <small>{user.username ? `@${user.username}` : user.email || relationLabel(relationship)}</small>
          </span>
        </button>
        <div className="entity-actions">
          {relationship.status === "friend" && (
            <>
              <button type="button" className="secondary-button tiny" onClick={() => start(user)}><MessageSquare size={13} /> Message</button>
              <button type="button" className="icon-mini danger" title="Remove friend" onClick={() => run(`remove-${id}`, () => removeFriend({ authToken: token, userId: id }))}><X size={13} /></button>
            </>
          )}
          {relationship.status === "incoming" && (
            <>
              <button type="button" className="secondary-button tiny" disabled={busy === `accept-${relationship.friendshipId}`} onClick={() => run(`accept-${relationship.friendshipId}`, () => respondFriend({ authToken: token, friendshipId: relationship.friendshipId, accept: true }))}><Check size={13} /> Accept</button>
              <button type="button" className="icon-mini" title="Decline" onClick={() => run(`decline-${relationship.friendshipId}`, () => respondFriend({ authToken: token, friendshipId: relationship.friendshipId, accept: false }))}><X size={13} /></button>
            </>
          )}
          {relationship.status === "outgoing" && <span className="request-chip">Pending</span>}
          {relationship.status === "none" && (
            <button type="button" className="secondary-button tiny" disabled={busy === `request-${id}`} onClick={() => run(`request-${id}`, () => requestFriend({ authToken: token, targetUserId: id }))}>
              <UserPlus size={13} /> Add
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="New chat" eyebrow="Direct message" size="md">
      <div className="modal-stack">
        <SearchInput value={query} onChange={setQuery} placeholder="Search people" />
        {!query && incoming.length > 0 && (
          <>
            <div className="list-separator">Requests</div>
            <div className="entity-list compact-list">
              {incoming.map((entry) => renderPerson({ ...entry.user, relationship: { status: "incoming", friendshipId: entry.friendshipId } }))}
            </div>
          </>
        )}
        <div className="list-separator">{query ? "People" : "Contacts"}</div>
        <div className="entity-list">
          {filtered.length === 0 ? (
            <div className="empty-inline"><MessageSquare size={20} /> No people found.</div>
          ) : filtered.map(renderPerson)}
        </div>
        {error && <p className="form-error">{error}</p>}
      </div>
    </Modal>
  );
}
