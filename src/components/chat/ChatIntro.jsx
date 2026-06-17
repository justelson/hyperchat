import { Hash } from "lucide-react";
import { getName } from "../../lib/chatUtils";
import { Avatar } from "../common/Avatar";

export function ChatIntro({ selected, summary, room, currentUser }) {
  if (!selected) return null;
  const isRoom = selected.type === "room";
  const entity = isRoom ? (room || summary?.room || selected.room) : (summary?.user || selected.user);
  const title = isRoom ? entity?.name || selected.title || "Room" : getName(entity);

  return (
    <div className="chat-intro">
      <div className="intro-avatars">
        <Avatar entity={entity} kind={isRoom ? "room" : "user"} size="lg" />
        {!isRoom && <Avatar entity={currentUser} size="lg" />}
      </div>
      <h2>{title}</h2>
      <p>{isRoom ? `${entity?.memberCount || 0} members in this room` : "This is the beginning of your conversation."}</p>
      {isRoom && <span className="intro-pill"><Hash size={13} /> Room chat</span>}
    </div>
  );
}
