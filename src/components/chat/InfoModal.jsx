import { ArrowLeft, BarChart3, BellOff, Copy, Edit3, Hash, Link, Pin, Plus, RotateCw, Search, Shield, ShieldCheck, UserMinus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { displayError, formatTime, getName, searchBlob } from "../../lib/chatUtils";
import { Avatar } from "../common/Avatar";
import { SegmentControl, ToggleRow } from "../common/FormControls";
import { Modal } from "../common/Modal";
import { SearchInput } from "../common/SearchInput";

function InfoAction({ icon: Icon, label, onClick, active }) {
  return (
    <button type="button" className={`info-action ${active ? "active" : ""}`} onClick={onClick}>
      <Icon size={19} />
      <span>{label}</span>
    </button>
  );
}

export function InfoModal({
  open,
  selected,
  summary,
  room,
  currentUser,
  users,
  onClose,
  onAddMembers,
  onRemoveMember,
  onUpdateMemberRole,
  onLeaveRoom,
  onUpdateRoom,
  onRotateInviteLink,
  onUpdateSettings,
  onTogglePin,
  onToggleMute,
  onShowSearch,
}) {
  const [view, setView] = useState("");
  const [memberIds, setMemberIds] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [roomDraft, setRoomDraft] = useState({ name: "", description: "" });
  const [roomSettingsDraft, setRoomSettingsDraft] = useState({});
  const [settingsDraft, setSettingsDraft] = useState({});
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState("");
  const isRoom = selected?.type === "room";
  const entity = isRoom ? (room || summary?.room || selected?.room) : (summary?.user || selected?.user);

  useEffect(() => {
    if (!open) {
      setView("");
      setFeedback("");
      setMemberIds([]);
      setMemberSearch("");
    }
  }, [open]);

  useEffect(() => {
    setRoomDraft({ name: room?.name || entity?.name || "", description: room?.description || entity?.description || "" });
    setRoomSettingsDraft(room?.settings || entity?.settings || {});
  }, [entity?.description, entity?.name, entity?.settings, room]);

  useEffect(() => {
    setSettingsDraft(currentUser?.settings || {});
  }, [currentUser?.settings]);

  const availableUsers = useMemo(() => {
    const currentMembers = new Set((room?.members || []).map((member) => member.userId));
    const lowered = memberSearch.trim().toLowerCase();
    return (users || [])
      .filter((user) => !currentMembers.has(user.publicId))
      .filter((user) => !lowered || searchBlob(user.fullName, user.username, user.email).includes(lowered))
      .slice(0, 80);
  }, [memberSearch, room?.members, users]);

  if (!selected || !entity) return null;

  const run = async (label, action, success) => {
    setBusy(label);
    setFeedback("");
    try {
      await action();
      setFeedback(success);
    } catch (err) {
      setFeedback(displayError(err));
    } finally {
      setBusy("");
    }
  };

  const stats = {
    members: room?.memberCount || entity?.memberCount || 0,
    lastMessage: summary?.lastMessageAt ? formatTime(summary.lastMessageAt) : "None",
    unread: Number(summary?.unreadCount || 0),
  };
  const viewerRole = room?.viewerRole || "";
  const canManageMembers = ["owner", "admin"].includes(viewerRole);
  const isOwner = viewerRole === "owner";

  const hero = (
    <div className="info-hero-card">
      <div className="info-backdrop" />
      <Avatar entity={entity} kind={isRoom ? "room" : "user"} size="lg" online={!isRoom} />
      <h2>{isRoom ? entity.name : getName(entity)}</h2>
      <p>{isRoom ? entity.description || `${stats.members} members` : entity.bio || entity.status || entity.username || "Contact"}</p>
      <div className="info-badges">
        <span>{isRoom ? "Room" : "Chat"}</span>
        {summary?.pinned && <span>Pinned</span>}
        {summary?.muted && <span>Muted</span>}
      </div>
    </div>
  );

  const mainView = (
    <>
      {hero}
      <div className="info-actions">
        <InfoAction icon={Search} label="Search" onClick={() => { onShowSearch?.(); onClose?.(); }} />
        <InfoAction icon={Pin} label={summary?.pinned ? "Pinned" : "Pin"} active={summary?.pinned} onClick={onTogglePin} />
        <InfoAction icon={BellOff} label={summary?.muted ? "Muted" : "Mute"} active={summary?.muted} onClick={onToggleMute} />
        <InfoAction icon={isRoom ? Users : Shield} label={isRoom ? "Members" : "Privacy"} onClick={() => setView(isRoom ? "members" : "privacy")} />
      </div>
      <div className="info-nav-list">
        {isRoom && <button type="button" onClick={() => setView("members")}><Users size={18} /><span>Members</span><small>{stats.members}</small></button>}
        {isRoom && <button type="button" onClick={() => setView("room-settings")}><Edit3 size={18} /><span>Room settings</span><small>Name and permissions</small></button>}
        <button type="button" onClick={() => setView("stats")}><BarChart3 size={18} /><span>Activity</span><small>{stats.lastMessage}</small></button>
        {!isRoom && <button type="button" onClick={() => setView("privacy")}><Shield size={18} /><span>Privacy</span><small>Visibility controls</small></button>}
      </div>
      {isRoom && viewerRole !== "owner" && (
        <button type="button" className="secondary-button danger info-wide-action" disabled={busy === "leave"} onClick={() => run("leave", onLeaveRoom, "Left room")}>
          Leave room
        </button>
      )}
    </>
  );

  const header = (title) => (
    <div className="subview-header">
      <button type="button" onClick={() => setView("")}><ArrowLeft size={18} /></button>
      <strong>{title}</strong>
    </div>
  );

  const membersView = (
    <>
      {header("Members")}
      <div className="modal-stack">
        <SearchInput value={memberSearch} onChange={setMemberSearch} placeholder="Add members" />
        <div className="entity-list">
          {(room?.members || []).map((member) => {
            const canRemove = canManageMembers
              && member.userId !== currentUser?.publicId
              && member.role !== "owner"
              && (isOwner || member.role === "member");
            const canPromote = isOwner && member.role === "member";
            const canDemote = isOwner && member.role === "admin";
            return (
              <div key={member.membershipId || member.userId} className="entity-row static member-management-row">
                <Avatar entity={member.user} size="sm" />
                <span>
                  <strong>{getName(member.user)}</strong>
                  <small>{member.role}</small>
                </span>
                {(canRemove || canPromote || canDemote) && (
                  <div className="entity-actions">
                    {canPromote && (
                      <button type="button" className="secondary-button tiny" onClick={() => run(`promote-${member.userId}`, () => onUpdateMemberRole(member.userId, "admin"), "Member promoted")}>
                        <ShieldCheck size={13} /> Admin
                      </button>
                    )}
                    {canDemote && (
                      <button type="button" className="secondary-button tiny" onClick={() => run(`demote-${member.userId}`, () => onUpdateMemberRole(member.userId, "member"), "Member demoted")}>
                        Member
                      </button>
                    )}
                    {canRemove && (
                      <button type="button" className="icon-mini danger" title="Remove member" onClick={() => run(`remove-${member.userId}`, () => onRemoveMember(member.userId), "Member removed")}>
                        <UserMinus size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="list-separator">Add people</div>
        <div className="entity-list">
          {availableUsers.map((user) => {
            const picked = memberIds.includes(user.publicId);
            return (
              <button
                key={user.publicId}
                type="button"
                className={`entity-row ${picked ? "selected" : ""}`}
                onClick={() => setMemberIds((current) => picked ? current.filter((id) => id !== user.publicId) : [...current, user.publicId])}
              >
                <Avatar entity={user} size="sm" />
                <span><strong>{getName(user)}</strong><small>{user.username ? `@${user.username}` : "Available"}</small></span>
                <span className={`checkbox-box ${picked ? "checked" : ""}`} />
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="primary-button"
          disabled={!memberIds.length || busy === "members"}
          onClick={() => run("members", () => onAddMembers(memberIds), "Members added")}
        >
          <Plus size={16} /> Add selected
        </button>
      </div>
    </>
  );

  const roomSettingsView = (
    <>
      {header("Room settings")}
      <div className="modal-stack">
        <label><span>Name</span><input value={roomDraft.name} onChange={(event) => setRoomDraft({ ...roomDraft, name: event.target.value })} /></label>
        <label><span>Description</span><textarea value={roomDraft.description} onChange={(event) => setRoomDraft({ ...roomDraft, description: event.target.value })} /></label>
        <label>
          <span>Visibility</span>
          <SegmentControl
            value={room?.visibility || "private"}
            onChange={(visibility) => run("room", () => onUpdateRoom({ visibility }), "Room updated")}
            options={[
              { value: "private", label: "Private" },
              { value: "discoverable", label: "Discover" },
              ...(room?.visibility === "power" ? [{ value: "power", label: "Power" }] : []),
            ]}
            className="visibility-segments"
          />
        </label>
        <ToggleRow checked={Boolean(roomSettingsDraft.onlyAdminsCanMessage)} onChange={(value) => setRoomSettingsDraft({ ...roomSettingsDraft, onlyAdminsCanMessage: value })} title="Only admins can message" description="Members can still read the room." />
        <ToggleRow checked={roomSettingsDraft.allowMemberInvites !== false} onChange={(value) => setRoomSettingsDraft({ ...roomSettingsDraft, allowMemberInvites: value })} title="Member invites" description="Allow members to add people." />
        <ToggleRow checked={roomSettingsDraft.allowLinks !== false} onChange={(value) => setRoomSettingsDraft({ ...roomSettingsDraft, allowLinks: value })} title="Invite links" description="Allow people with the link to join." />
        <ToggleRow checked={roomSettingsDraft.allowFiles !== false} onChange={(value) => setRoomSettingsDraft({ ...roomSettingsDraft, allowFiles: value })} title="File attachments" description="Allow files in this room." />
        {room?.inviteCode && roomSettingsDraft.allowLinks !== false && (
          <div className="invite-link-panel">
            <span><Link size={15} /> Invite link</span>
            <code>{`${window.location.origin}/invite/${encodeURIComponent(room.inviteCode)}`}</code>
            <div>
              <button type="button" className="secondary-button tiny" onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/invite/${encodeURIComponent(room.inviteCode)}`)}>
                <Copy size={13} /> Copy
              </button>
              <button type="button" className="secondary-button tiny" onClick={() => run("invite", onRotateInviteLink, "Invite link rotated")}>
                <RotateCw size={13} /> Rotate
              </button>
            </div>
          </div>
        )}
        <button
          type="button"
          className="primary-button"
          disabled={busy === "room"}
          onClick={() => run("room", () => onUpdateRoom({ name: roomDraft.name, description: roomDraft.description, settings: roomSettingsDraft }), "Room updated")}
        >
          Save room
        </button>
      </div>
    </>
  );

  const privacyView = (
    <>
      {header("Privacy")}
      <div className="modal-stack">
        <ToggleRow checked={settingsDraft.readReceipts !== false} onChange={(value) => setSettingsDraft({ ...settingsDraft, readReceipts: value })} title="Read receipts" description="Show when you have seen messages." />
        <ToggleRow checked={settingsDraft.typingIndicator !== false} onChange={(value) => setSettingsDraft({ ...settingsDraft, typingIndicator: value })} title="Typing indicators" description="Show when you are typing." />
        <ToggleRow checked={settingsDraft.lastSeen !== false} onChange={(value) => setSettingsDraft({ ...settingsDraft, lastSeen: value })} title="Last seen" description="Show recent presence." />
        <ToggleRow checked={settingsDraft.showProfilePhoto !== false} onChange={(value) => setSettingsDraft({ ...settingsDraft, showProfilePhoto: value })} title="Profile photo" description="Show your uploaded avatar." />
        <button type="button" className="primary-button" disabled={busy === "privacy"} onClick={() => run("privacy", () => onUpdateSettings(settingsDraft), "Privacy saved")}>Save privacy</button>
      </div>
    </>
  );

  const statsView = (
    <>
      {header("Activity")}
      <div className="stats-grid">
        <div><span>Unread</span><strong>{stats.unread}</strong></div>
        <div><span>{isRoom ? "Members" : "Kind"}</span><strong>{isRoom ? stats.members : "Direct"}</strong></div>
        <div><span>Last message</span><strong>{stats.lastMessage}</strong></div>
        <div><span>Type</span><strong>{isRoom ? "Room" : "Chat"}</strong></div>
      </div>
    </>
  );

  return (
    <Modal open={open} onClose={onClose} title={isRoom ? "Room info" : "Contact info"} size="lg" bodyClassName="info-modal-body">
      {view === "" && mainView}
      {view === "members" && membersView}
      {view === "room-settings" && roomSettingsView}
      {view === "privacy" && privacyView}
      {view === "stats" && statsView}
      {feedback && <p className={`panel-feedback ${/saved|updated|added/i.test(feedback) ? "" : "error"}`}>{feedback}</p>}
    </Modal>
  );
}
