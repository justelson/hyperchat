import { Bell, Palette, Shield, User } from "lucide-react";

export const TOKEN_KEY = "hyperchat:token";

export const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export const QUICK_EMOJI_CATEGORIES = [
  {
    id: "recent",
    label: "Recent",
    items: ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "👏", "😍", "🎉", "✅", "✨"],
  },
  {
    id: "smileys",
    label: "Smileys",
    items: ["😀", "😃", "😄", "😁", "😅", "🤣", "🙂", "😉", "😊", "🥰", "😘", "🤔", "😎", "🥺", "😭", "😴"],
  },
  {
    id: "people",
    label: "People",
    items: ["👋", "👌", "🤝", "🙌", "👏", "💪", "🙏", "✍️", "👀", "🧠", "🫶", "💬"],
  },
  {
    id: "symbols",
    label: "Symbols",
    items: ["✨", "⭐", "💫", "💯", "🔥", "✅", "❌", "⚠️", "📌", "🔒", "📎", "💡"],
  },
];

export const AVATAR_STYLES = [
  { value: "adventurer-neutral", label: "Adventurer" },
  { value: "avataaars-neutral", label: "Avataaars" },
  { value: "open-peeps", label: "Open Peeps" },
  { value: "thumbs", label: "Thumbs" },
];

export const ACCENTS = [
  "#b45309",
  "#0f766e",
  "#be123c",
  "#6d5d40",
  "#7c3aed",
  "#475569",
];

export const WALLPAPERS = [
  {
    id: "doodle",
    label: "Doodle",
    description: "Monax-style line texture.",
    url: "/wallpapers/monax-doodle-desktop.svg",
    thumbUrl: "/wallpapers/monax-doodle-mobile.svg",
  },
  {
    id: "mist",
    label: "Misty Pines",
    description: "Quiet forest depth.",
    url: "/wallpapers/optimized/pexels-jplenio-1114891-1920w.webp",
    thumbUrl: "/wallpapers/optimized/pexels-jplenio-1114891-thumb.webp",
  },
  {
    id: "valley",
    label: "Green Valley",
    description: "Soft natural contrast.",
    url: "/wallpapers/optimized/pexels-jplenio-1642770-1920w.webp",
    thumbUrl: "/wallpapers/optimized/pexels-jplenio-1642770-thumb.webp",
  },
  {
    id: "woods",
    label: "Deep Woods",
    description: "Darker room focus.",
    url: "/wallpapers/optimized/pexels-jplenio-1146708-1920w.webp",
    thumbUrl: "/wallpapers/optimized/pexels-jplenio-1146708-thumb.webp",
  },
  {
    id: "graphite",
    label: "Graphite",
    description: "Plain dark surface.",
    url: "",
    thumbUrl: "",
  },
];

export const AUTH_BACKGROUNDS = [
  { id: "forest", label: "Forest", value: "forest" },
  { id: "doodle", label: "Doodle", value: "doodle" },
  { id: "graphite", label: "Graphite", value: "graphite" },
];

export const SETTINGS_SECTIONS = [
  {
    id: "profile",
    label: "Account",
    icon: User,
    description: "Profile, avatar, bio, and status.",
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: Palette,
    description: "Theme, color, density, and chat backgrounds.",
  },
  {
    id: "privacy",
    label: "Privacy",
    icon: Shield,
    description: "Read receipts, typing, and visibility.",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    description: "Message and thread notification behavior.",
  },
];

export const DEFAULT_ACCENT = "#b45309";
