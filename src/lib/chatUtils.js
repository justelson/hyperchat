import { DEFAULT_ACCENT, SETTINGS_SECTIONS } from "./chatConstants";

export const directConversationId = (a, b) => `direct:${[String(a), String(b)].sort().join(":")}`;

export const getName = (user) => user?.fullName || user?.name || user?.username || "Unknown";

export const initials = (name = "") =>
  String(name || "H")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "H";

export const createAvatarSeed = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `avatar_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export const dicebearUrl = (entity) => {
  const style = entity?.avatarStyle || entity?.settings?.avatarStyle || "adventurer-neutral";
  const seed = entity?.avatarSeed || entity?.settings?.avatarSeed || entity?.username || entity?.publicId || getName(entity);
  return `https://api.dicebear.com/9.x/${encodeURIComponent(style)}/svg?seed=${encodeURIComponent(seed || "hyperchat")}&radius=50`;
};

export const hashColor = (value = "", fallback = DEFAULT_ACCENT) => {
  const palette = ["#a85612", "#116a5b", "#be123c", "#6d5d40", "#8a4b7d", "#4f5d44"];
  const input = String(value || "");
  if (!input) return fallback;
  const hash = input.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
};

export const appRouteForSummary = (summary) => {
  if (!summary) return "/app";
  const id = encodeURIComponent(summary.conversationId);
  return summary.type === "room" ? `/app/rooms/${id}` : `/app/chats/${id}`;
};

export const parseConversationRoute = (path = "") => {
  const match = path.match(/^\/app\/(chats|rooms)\/(.+)$/);
  if (!match) return null;
  return {
    type: match[1] === "rooms" ? "room" : "direct",
    conversationId: decodeURIComponent(match[2]),
  };
};

export const getSettingsSectionFromPath = (path = "") => {
  if (path === "/settings" || path === "/settings/") return "";
  const [, section] = path.match(/^\/settings\/?([^/]*)/) || [];
  return SETTINGS_SECTIONS.some((entry) => entry.id === section) ? section : "";
};

export const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export const formatDay = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
};

export const displayError = (err, fallback = "Could not complete that action") => {
  const raw = String(err?.message || err || fallback);
  const lines = raw.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const knownMessage = [
    "Invalid email or password",
    "Email already registered",
    "Username already taken",
    "Password must be at least 8 characters",
    "Enter a valid email",
    "Name must be at least 2 characters",
    "Type a message first",
    "Type a reply first",
    "Only admins can message in this room",
    "Room name must be at least 2 characters",
    "Pick someone else to message",
  ].find((message) => raw.includes(message));
  if (knownMessage) return knownMessage;
  const uncaught = lines.find((line) => line.includes("Uncaught Error:"));
  const chosen = uncaught ? uncaught.replace(/^.*Uncaught Error:\s*/, "") : lines[0];
  const clean = (chosen || fallback).replace(/^Error:\s*/, "");
  if (/\[CONVEX|Request ID|Server Error|Called by client/i.test(clean)) return fallback;
  return clean;
};

export const sortMessages = (messages = []) =>
  [...messages].sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));

export const groupWithDates = (messages = []) => {
  const rows = [];
  let lastDay = "";
  for (const message of sortMessages(messages)) {
    const day = new Date(message.createdAt || 0).toDateString();
    if (day !== lastDay) {
      rows.push({ type: "date", id: `date-${day}`, label: formatDay(message.createdAt) });
      lastDay = day;
    }
    rows.push({ type: "message", id: message._id || message.messageId, message });
  }
  return rows;
};

export const formatFileSize = (bytes = 0) => {
  const size = Number(bytes || 0);
  if (size <= 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export const isUserOnline = (presence) => Boolean(presence?.isOnline);

export const conversationEntity = (summary) => summary?.type === "room" ? summary.room : summary?.user;

export const searchBlob = (...values) => values.filter(Boolean).join(" ").toLowerCase();

const legacyBlueAccents = new Set(["#4f90e6", "#5796f2", "#3d7ae6", "#b45309", "#0f766e"]);
const legacyWallpapers = new Set(["clean", "midnight", "aurora", "grid"]);
const legacyAuthBackgrounds = new Set(["midnight", "aurora"]);

export const resolveAccent = (accent) => {
  const value = String(accent || "").trim().toLowerCase();
  if (!value || legacyBlueAccents.has(value)) return DEFAULT_ACCENT;
  return accent;
};

export const resolveWallpaper = (wallpaper) => {
  const value = String(wallpaper || "").trim();
  if (!value || legacyWallpapers.has(value)) return "doodle";
  return value;
};

export const resolveAuthBackground = (background) => {
  const value = String(background || "").trim();
  if (!value || legacyAuthBackgrounds.has(value)) return "forest";
  return value;
};

export const normalizeVisualSettings = (settings = {}) => ({
  ...settings,
  accent: resolveAccent(settings.accent),
  chatWallpaper: resolveWallpaper(settings.chatWallpaper),
  authBackground: resolveAuthBackground(settings.authBackground),
});
