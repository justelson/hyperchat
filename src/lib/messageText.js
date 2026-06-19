const emojiSegmenter =
  typeof Intl !== "undefined" && Intl.Segmenter
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

const EMOJI_SEGMENT_PATTERN = /^[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji}\uFE0F\uFE0E\u200D\u20E3\u{1F3FB}-\u{1F3FF}]+$/u;
const EMOJI_SIGNAL_PATTERN = /[\p{Extended_Pictographic}\p{Emoji_Presentation}\u20E3]/u;
const URL_PATTERN = /(https?:\/\/[^\s<>"']+)/giu;

export function getEmojiOnlySegments(text = "") {
  const trimmed = String(text || "").trim();
  if (!trimmed) return [];

  const segments = emojiSegmenter
    ? [...emojiSegmenter.segment(trimmed)].map((entry) => entry.segment)
    : Array.from(trimmed);

  const visibleSegments = segments.filter((segment) => !/^\s+$/u.test(segment));
  if (!visibleSegments.length) return [];

  return visibleSegments.every((segment) =>
    EMOJI_SEGMENT_PATTERN.test(segment) && EMOJI_SIGNAL_PATTERN.test(segment)
  )
    ? visibleSegments
    : [];
}

export function isRenderableReaction(emoji = "") {
  return getEmojiOnlySegments(emoji).length === 1;
}

export function splitTextWithLinks(text = "") {
  const value = String(text || "");
  const parts = [];
  let lastIndex = 0;

  for (const match of value.matchAll(URL_PATTERN)) {
    const raw = match[0];
    const index = match.index || 0;
    if (index > lastIndex) {
      parts.push({ type: "text", value: value.slice(lastIndex, index) });
    }

    const trailing = raw.match(/[),.!?;:]+$/)?.[0] || "";
    const href = trailing ? raw.slice(0, -trailing.length) : raw;
    parts.push({ type: "link", value: href });
    if (trailing) parts.push({ type: "text", value: trailing });
    lastIndex = index + raw.length;
  }

  if (lastIndex < value.length) {
    parts.push({ type: "text", value: value.slice(lastIndex) });
  }

  return parts.length ? parts : [{ type: "text", value }];
}
