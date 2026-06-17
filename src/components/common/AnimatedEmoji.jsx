import { useEffect, useMemo, useState } from "react";

const GOOGLE_ANIMATED_EMOJI_BASE = "https://fonts.gstatic.com/s/e/notoemoji/latest";
const GOOGLE_ANIMATED_EMOJI_SIZE = 512;
const availability = new Map();
const preloads = new Map();

function emojiToCodepointSlug(emoji = "") {
  return Array.from(emoji)
    .map((symbol) => symbol.codePointAt(0)?.toString(16))
    .filter(Boolean)
    .join("_");
}

function getAssetUrls(slug) {
  return {
    webp: `${GOOGLE_ANIMATED_EMOJI_BASE}/${slug}/${GOOGLE_ANIMATED_EMOJI_SIZE}.webp`,
    gif: `${GOOGLE_ANIMATED_EMOJI_BASE}/${slug}/${GOOGLE_ANIMATED_EMOJI_SIZE}.gif`,
  };
}

function preloadEmoji(slug) {
  if (!slug || availability.has(slug)) return Promise.resolve(availability.get(slug) === true);
  if (preloads.has(slug)) return preloads.get(slug);
  if (typeof Image === "undefined") return Promise.resolve(false);

  const promise = new Promise((resolve) => {
    const { webp, gif } = getAssetUrls(slug);
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      availability.set(slug, true);
      resolve(true);
    };
    image.onerror = () => {
      const fallback = new Image();
      fallback.decoding = "async";
      fallback.onload = () => {
        availability.set(slug, true);
        resolve(true);
      };
      fallback.onerror = () => {
        availability.set(slug, false);
        resolve(false);
      };
      fallback.src = gif;
    };
    image.src = webp;
  });
  preloads.set(slug, promise);
  return promise;
}

export function warmAnimatedEmojiAssets(emojis = []) {
  return Promise.all(emojis.map((emoji) => preloadEmoji(emojiToCodepointSlug(emoji))));
}

export function AnimatedEmoji({ emoji, mode = "static", size = 20, className = "", label, playToken = 0 }) {
  const slug = useMemo(() => emojiToCodepointSlug(emoji), [emoji]);
  const [hovered, setHovered] = useState(false);
  const [ready, setReady] = useState(() => availability.get(slug) === true);
  const shouldAnimate = mode === "loop" || (mode === "hover" && hovered) || (mode === "burst" && playToken);
  const urls = slug ? getAssetUrls(slug) : null;

  useEffect(() => {
    let cancelled = false;
    if (!slug || !shouldAnimate) return undefined;
    preloadEmoji(slug).then((ok) => {
      if (!cancelled) setReady(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [shouldAnimate, slug]);

  return (
    <span
      className={`animated-emoji ${shouldAnimate ? "animating" : ""} ${className}`}
      style={{ "--emoji-size": `${size}px` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={label || emoji}
      role="img"
    >
      {ready && shouldAnimate && urls ? (
        <picture>
          <source srcSet={urls.webp} type="image/webp" />
          <img src={urls.gif} alt="" draggable={false} />
        </picture>
      ) : (
        <span aria-hidden="true">{emoji}</span>
      )}
    </span>
  );
}
