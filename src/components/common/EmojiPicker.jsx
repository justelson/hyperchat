import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { EMOJI_NAMES, QUICK_EMOJI_CATEGORIES } from "../../lib/chatConstants";
import { AnimatedEmoji } from "./AnimatedEmoji";

const emojiRows = QUICK_EMOJI_CATEGORIES.flatMap((category) =>
  category.items.map((emoji) => ({ emoji, category: category.id }))
);

export function EmojiPicker({ onSelect, compact = false }) {
  const [activeCategory, setActiveCategory] = useState("recent");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    if (query.trim()) {
      const lowered = query.trim().toLowerCase();
      return emojiRows.filter((entry) => {
        const names = EMOJI_NAMES[entry.emoji] || "";
        return entry.emoji.includes(lowered) || entry.category.includes(lowered) || names.includes(lowered);
      });
    }
    return QUICK_EMOJI_CATEGORIES.find((category) => category.id === activeCategory)?.items.map((emoji) => ({ emoji })) || [];
  }, [activeCategory, query]);

  return (
    <div className={`emoji-picker ${compact ? "compact" : ""}`}>
      <label className="emoji-search">
        <Search size={15} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search emoji" />
      </label>
      {!query && (
        <div className="emoji-tabs">
          {QUICK_EMOJI_CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              className={activeCategory === category.id ? "active" : ""}
              onClick={() => setActiveCategory(category.id)}
            >
              {category.label}
            </button>
          ))}
        </div>
      )}
      <div className="emoji-grid">
        {filtered.map((item, index) => (
          <button key={`${item.emoji}-${index}`} type="button" onClick={() => onSelect?.(item.emoji)}>
            <AnimatedEmoji emoji={item.emoji} mode="hover" size={compact ? 22 : 26} />
          </button>
        ))}
      </div>
    </div>
  );
}
