import { Hash, Users } from "lucide-react";
import { dicebearUrl, getName, hashColor, initials } from "../../lib/chatUtils";

export function Avatar({ entity, size = "md", online = false, kind = "user", className = "" }) {
  const isRoom = kind === "room" || entity?.type === "room" || entity?.roomId;
  const name = isRoom ? (entity?.name || entity?.title || "Room") : getName(entity);
  const color = entity?.avatarColor || hashColor(entity?.roomId || entity?.publicId || name);

  if (isRoom) {
    return (
      <span className={`avatar avatar-${size} avatar-room ${className}`} style={{ "--avatar": color }}>
        <span className="room-avatar-pattern" aria-hidden="true" />
        <span className="room-avatar-icon" aria-hidden="true">
          {size === "xs" ? <Hash size={12} /> : <Users size={size === "lg" ? 24 : 17} />}
        </span>
        <span className="sr-only">{name}</span>
      </span>
    );
  }

  const src = entity?.settings?.showProfilePhoto === false
    ? ""
    : (entity?.profilePic || dicebearUrl(entity || { fullName: name }));

  return (
    <span className={`avatar avatar-${size} ${className}`} style={{ "--avatar": color }}>
      <span className="avatar-crop">
        <span className="avatar-fallback">{initials(name)}</span>
        {src && <img src={src} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} />}
      </span>
      {online && <span className="avatar-presence" />}
    </span>
  );
}
