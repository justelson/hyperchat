import { SmilePlus } from "lucide-react";
import { useMemo, useState } from "react";
import { REACTION_EMOJIS } from "../../lib/chatConstants";
import { getName } from "../../lib/chatUtils";
import { isRenderableReaction } from "../../lib/messageText";
import { AnimatedEmoji } from "../common/AnimatedEmoji";
import { Avatar } from "../common/Avatar";
import { EmojiPicker } from "../common/EmojiPicker";
import { Modal } from "../common/Modal";

function groupReactions(reactions = []) {
  const map = new Map();
  for (const reaction of reactions) {
    const emoji = reaction?.emoji || reaction;
    if (!emoji || !isRenderableReaction(emoji)) continue;
    if (!map.has(emoji)) map.set(emoji, []);
    map.get(emoji).push(reaction);
  }
  return [...map.entries()].map(([emoji, rows]) => ({ emoji, rows }));
}

export function ReactionDetailsModal({ open, message, currentUser, onClose, onReaction }) {
  const groups = useMemo(() => groupReactions(message?.reactions || []), [message?.reactions]);
  const allRows = useMemo(() => groups.flatMap((group) => group.rows), [groups]);
  const [active, setActive] = useState("all");
  const currentRows = active === "all"
    ? allRows
    : groups.find((group) => group.emoji === active)?.rows || [];

  return (
    <Modal open={open} onClose={onClose} title="Reactions" eyebrow="Message" size="md">
      <div className="reaction-details">
        <div className="quick-reaction-row">
          {REACTION_EMOJIS.map((emoji) => (
            <button key={emoji} type="button" onClick={() => onReaction?.(emoji)}>
              <AnimatedEmoji emoji={emoji} mode="hover" size={24} />
            </button>
          ))}
        </div>
        {groups.length > 0 ? (
          <>
            <div className="reaction-tabs">
              <button type="button" className={active === "all" ? "active" : ""} onClick={() => setActive("all")}>
                <span>All</span>
                <span>{allRows.length}</span>
              </button>
              {groups.map((group) => (
                <button key={group.emoji} type="button" className={active === group.emoji ? "active" : ""} onClick={() => setActive(group.emoji)}>
                  <AnimatedEmoji emoji={group.emoji} mode="burst" playToken={group.rows.length} size={18} />
                  <span>{group.rows.length}</span>
                </button>
              ))}
            </div>
            <div className="reaction-user-list">
              {currentRows.map((reaction, index) => {
                const isOwn = reaction.userId === currentUser?.publicId;
                return (
                  <button key={`${reaction.emoji}-${reaction.userId}-${index}`} type="button" className="entity-row" onClick={() => isOwn && onReaction?.(reaction.emoji)}>
                    <Avatar entity={reaction.user} size="sm" />
                    <span>
                      <strong>{isOwn ? "You" : getName(reaction.user)}</strong>
                      <small>{isOwn ? "Click to remove your reaction" : "Reacted"}</small>
                    </span>
                    <AnimatedEmoji emoji={reaction.emoji} mode="static" size={20} />
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="empty-inline"><SmilePlus size={19} /> No reactions yet.</div>
        )}
        <EmojiPicker compact onSelect={onReaction} />
      </div>
    </Modal>
  );
}
