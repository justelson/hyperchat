import { Check, Loader2, Users } from "lucide-react";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { displayError, getName, searchBlob } from "../../lib/chatUtils";
import { Avatar } from "../common/Avatar";
import { SegmentControl } from "../common/FormControls";
import { Modal } from "../common/Modal";
import { SearchInput } from "../common/SearchInput";

export function NewRoomModal({ open, token, users, canAccessPowerGroups = false, onClose, onCreateRoom }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberIds, setMemberIds] = useState([]);
  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const friends = useQuery(api.friends.listFriends, token && open ? { authToken: token } : "skip");

  const filteredUsers = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return (friends ?? users ?? [])
      .filter((user) => !lowered || searchBlob(user.fullName, user.username, user.email).includes(lowered))
      .slice(0, 80);
  }, [friends, query, users]);

  const visibilityOptions = useMemo(() => [
    { value: "private", label: "Private" },
    { value: "discoverable", label: "Discoverable" },
    ...(canAccessPowerGroups ? [{ value: "power", label: "Power" }] : []),
  ], [canAccessPowerGroups]);

  const reset = () => {
    setName("");
    setDescription("");
    setMemberIds([]);
    setQuery("");
    setVisibility("private");
    setError("");
  };

  const close = () => {
    reset();
    onClose?.();
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      await onCreateRoom?.({ name: name.trim(), description: description.trim(), memberIds, visibility });
      close();
    } catch (err) {
      setError(displayError(err, "Could not create room"));
    } finally {
      setBusy(false);
    }
  };

  const footer = (
    <>
      <button type="button" className="secondary-button" disabled={busy} onClick={close}>Cancel</button>
      <button type="submit" form="new-room-form" className="primary-button" disabled={busy || name.trim().length < 2}>
        {busy ? <Loader2 size={16} className="spin" /> : <Users size={16} />}
        Create room
      </button>
    </>
  );

  return (
    <Modal open={open} onClose={busy ? undefined : close} title="New room" eyebrow="Group chat" size="lg" footer={footer}>
      <form id="new-room-form" className="modal-stack" onSubmit={submit}>
        <div className="room-preview-line">
          <Avatar entity={{ name: name || "New room", roomId: name || "new-room", type: "room" }} kind="room" size="lg" />
          <div>
            <strong>{name || "Room name"}</strong>
            <small>{memberIds.length + 1} member{memberIds.length === 0 ? "" : "s"} including you</small>
          </div>
        </div>
        <label>
          <span>Name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Room name" autoFocus />
        </label>
        <label>
          <span>Description</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What is this room for?" />
        </label>
        <label>
          <span>Visibility</span>
          <SegmentControl
            value={visibility}
            onChange={setVisibility}
            options={visibilityOptions}
            className="visibility-segments"
          />
        </label>
        <SearchInput value={query} onChange={setQuery} placeholder="Add members" />
        <div className="entity-list member-select-list">
          {filteredUsers.map((user) => {
            const picked = memberIds.includes(user.publicId);
            return (
              <button
                key={user.publicId}
                type="button"
                className={`entity-row ${picked ? "selected" : ""}`}
                onClick={() => setMemberIds((current) => picked ? current.filter((id) => id !== user.publicId) : [...current, user.publicId])}
              >
                <Avatar entity={user} />
                <span>
                  <strong>{getName(user)}</strong>
                  <small>{user.username ? `@${user.username}` : "Available"}</small>
                </span>
                <span className={`checkbox-box ${picked ? "checked" : ""}`} aria-hidden="true">
                  {picked && <Check size={13} />}
                </span>
              </button>
            );
          })}
        </div>
        {error && <p className="form-error">{error}</p>}
      </form>
    </Modal>
  );
}
