import { Hash, Loader2, Search, UserPlus } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { displayError } from "../../lib/chatUtils";
import { Avatar } from "../common/Avatar";
import { Modal } from "../common/Modal";
import { SearchInput } from "../common/SearchInput";

export function RoomDiscoveryModal({ open, token, onClose, onJoined }) {
  const [query, setQuery] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const rooms = useQuery(api.rooms.discover, token && open ? { authToken: token, search: query } : "skip");
  const joinRoom = useMutation(api.rooms.joinRoom);
  const joinByInvite = useMutation(api.rooms.joinByInvite);

  const run = async (label, action) => {
    setBusy(label);
    setError("");
    try {
      const room = await action();
      if (room) {
        onJoined?.(room);
        onClose?.();
      }
    } catch (err) {
      setError(displayError(err));
    } finally {
      setBusy("");
    }
  };

  const joinInvite = (event) => {
    event.preventDefault();
    const code = inviteCode.trim().replace(/^.*\/invite\//, "");
    if (!code) return;
    run("invite", () => joinByInvite({ authToken: token, inviteCode: decodeURIComponent(code) }));
  };

  return (
    <Modal open={open} onClose={onClose} title="Find rooms" eyebrow="Groups" size="lg">
      <div className="modal-stack">
        <form className="invite-code-row" onSubmit={joinInvite}>
          <label>
            <span>Invite link or code</span>
            <input value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} placeholder="/invite/..." />
          </label>
          <button type="submit" className="secondary-button" disabled={busy === "invite" || !inviteCode.trim()}>
            {busy === "invite" ? <Loader2 size={15} className="spin" /> : <UserPlus size={15} />}
            Join
          </button>
        </form>
        <div className="list-separator">Discoverable rooms</div>
        <SearchInput value={query} onChange={setQuery} placeholder="Search rooms" />
        <div className="entity-list">
          {rooms === undefined ? (
            <div className="empty-inline"><Loader2 size={18} className="spin" /> Loading rooms...</div>
          ) : rooms.length === 0 ? (
            <div className="empty-inline"><Search size={18} /> No discoverable rooms.</div>
          ) : rooms.map((room) => (
            <div key={room.roomId} className="entity-row entity-row-actionable">
              <div className="entity-main-button static">
                <Avatar entity={room} kind="room" />
                <span>
                  <strong>{room.name}</strong>
                  <small>{room.description || `${room.memberCount || 0} members`}</small>
                </span>
              </div>
              <button
                type="button"
                className="secondary-button tiny"
                disabled={room.joined || busy === room.roomId}
                onClick={() => room.joined ? onJoined?.(room) : run(room.roomId, () => joinRoom({ authToken: token, roomId: room.roomId }))}
              >
                <Hash size={13} />
                {room.joined ? "Open" : "Join"}
              </button>
            </div>
          ))}
        </div>
        {error && <p className="form-error">{error}</p>}
      </div>
    </Modal>
  );
}
