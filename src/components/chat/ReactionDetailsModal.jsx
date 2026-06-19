import { SmilePlus } from "lucide-react";
import { useMemo, useState } from "react";
import { REACTION_EMOJIS } from "../../lib/chatConstants";
import { getName } from "../../lib/chatUtils";
import { AnimatedEmoji } from "../common/AnimatedEmoji";
import { Avatar } from "../common/Avatar";
import { EmojiPicker } from "../common/EmojiPicker";
import { Modal } from "../common/Modal";

function groupReactions(reactions = []) {
  const map = new Map();
  for (const reaction of reactions) {
    const emoji = reaction?.emoji || reaction;
    if (!emoji) continue;
    if (!map.has(emoji)) map.set(emoji, []);
    map.get(emoji).push(reaction);
  }
  return [...map.entries()].map(([emoji, rows]) => ({ emoji, rows }));
}

export function ReactionDetailsModal({ open, message, currentUser, onClose, onReaction }) {
  const groups = useMemo(() => groupReactions(message?.reactions || []), [message?.reactions]);
  const [active, setActive] = useState("");
  const current = active ? groups.find((group) => group.emoji === active) : groups[0];

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
              {groups.map((group) => (
                <button key={group.emoji} type="button" className={(active || groups[0]?.emoji) === group.emoji ? "active" : ""} onClick={() => setActive(group.emoji)}>
                  <AnimatedEmoji emoji={group.emoji} mode="burst" playToken={group.rows.length} size={18} />
                  <span>{group.rows.length}</span>
                </button>
              ))}
            </div>
            <div className="reaction-user-list">
              {(current?.rows || []).map((reaction, index) => {
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
