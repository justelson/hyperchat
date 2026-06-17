import { Forward, Loader2 } from "lucide-react";
import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { displayError, getName } from "../../lib/chatUtils";
import { Avatar } from "../common/Avatar";
import { Modal } from "../common/Modal";
import { SearchInput } from "../common/SearchInput";

export function ForwardDialog({ token, source, summaries, users, onClose }) {
  const forwardMessage = useMutation(api.messages.forwardMessage);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [busyTarget, setBusyTarget] = useState("");
  if (!source) return null;

  const rows = [
    ...(summaries || []).map((summary) => ({
      id: summary.conversationId,
      type: summary.type,
      title: summary.title,
      entity: summary.type === "room" ? summary.room : summary.user,
      payload: {
        targetType: summary.type,
        targetUserId: summary.type === "direct" ? summary.directUserId : undefined,
        targetRoomId: summary.type === "room" ? summary.conversationId : undefined,
      },
    })),
    ...(users || []).map((user) => ({
      id: user.publicId,
      type: "direct",
      title: getName(user),
      entity: user,
      payload: { targetType: "direct", targetUserId: user.publicId },
    })),
  ].filter((row, index, all) => all.findIndex((candidate) => candidate.id === row.id) === index)
    .filter((row) => !query.trim() || row.title.toLowerCase().includes(query.trim().toLowerCase()));

  const runForward = async (row) => {
    setBusyTarget(row.id);
    setError("");
    try {
      await forwardMessage({
        authToken: token,
        messageId: source.messageId || source._id,
        ...row.payload,
      });
      onClose();
    } catch (err) {
      setError(displayError(err, "Could not forward message"));
    } finally {
      setBusyTarget("");
    }
  };

  return (
    <Modal open={Boolean(source)} onClose={onClose} title="Forward message" eyebrow="Send to" size="md">
      <div className="modal-stack">
        <div className="forward-preview">{source.text || "Attachment"}</div>
        <SearchInput value={query} onChange={setQuery} placeholder="Search conversations" />
        {error && <p className="form-error">{error}</p>}
        <div className="entity-list">
          {rows.map((row) => (
            <button key={row.id} type="button" className="entity-row" disabled={Boolean(busyTarget)} onClick={() => runForward(row)}>
              <Avatar entity={row.entity} kind={row.type === "room" ? "room" : "user"} size="sm" />
              <span>
                <strong>{row.title}</strong>
                <small>{row.type === "room" ? "Room" : "Direct chat"}</small>
              </span>
              {busyTarget === row.id ? <Loader2 size={16} className="spin" /> : <Forward size={16} />}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
