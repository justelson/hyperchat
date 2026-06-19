import { Bell, Palette, Shield, User } from "lucide-react";
import { THEME_PACKS } from "./themeCatalog";

export const TOKEN_KEY = "hyperchat:token";

export const REACTION_EMOJIS = ["\u{1F44D}", "\u2764\uFE0F", "\u{1F602}", "\u{1F62E}", "\u{1F622}", "\u{1F64F}"];

export const QUICK_EMOJI_CATEGORIES = [
  {
    id: "recent",
    label: "Recent",
    items: ["\u{1F44D}", "\u2764\uFE0F", "\u{1F602}", "\u{1F62E}", "\u{1F622}", "\u{1F64F}", "\u{1F525}", "\u{1F44F}", "\u{1F60D}", "\u{1F389}", "\u2705", "\u2728"],
  },
  {
    id: "smileys",
    label: "Smileys",
    items: ["\u{1F600}", "\u{1F603}", "\u{1F604}", "\u{1F601}", "\u{1F605}", "\u{1F923}", "\u{1F642}", "\u{1F609}", "\u{1F60A}", "\u{1F970}", "\u{1F618}", "\u{1F914}", "\u{1F60E}", "\u{1F97A}", "\u{1F62D}", "\u{1F634}", "\u{1F92F}", "\u{1F973}", "\u{1F644}", "\u{1F611}"],
  },
  {
    id: "people",
    label: "People",
    items: ["\u{1F44B}", "\u{1F44C}", "\u{1F91D}", "\u{1F64C}", "\u{1F44F}", "\u{1F4AA}", "\u{1F64F}", "\u270D\uFE0F", "\u{1F440}", "\u{1F9E0}", "\u{1FAF6}", "\u{1F4AC}", "\u{1F91E}", "\u{1F91F}", "\u{1F485}", "\u{1F9D1}\u200D\u{1F4BB}"],
  },
  {
    id: "nature",
    label: "Nature",
    items: ["\u{1F331}", "\u{1F33F}", "\u{1F343}", "\u{1F340}", "\u{1F33A}", "\u{1F33B}", "\u{1F319}", "\u2600\uFE0F", "\u26C5", "\u{1F308}", "\u2744\uFE0F", "\u26A1"],
  },
  {
    id: "food",
    label: "Food",
    items: ["\u2615", "\u{1FAD6}", "\u{1F35E}", "\u{1F34E}", "\u{1F34B}", "\u{1F353}", "\u{1F36A}", "\u{1F370}", "\u{1F355}", "\u{1F35C}", "\u{1F37F}", "\u{1F379}"],
  },
  {
    id: "objects",
    label: "Objects",
    items: ["\u{1F4CE}", "\u{1F4CC}", "\u{1F4A1}", "\u{1F512}", "\u{1F511}", "\u{1F4DD}", "\u{1F4C5}", "\u{1F4C8}", "\u{1F4E6}", "\u{1F4F7}", "\u{1F3A7}", "\u{1F50D}"],
  },
  {
    id: "symbols",
    label: "Symbols",
    items: ["\u2728", "\u2B50", "\u{1F4AB}", "\u{1F4AF}", "\u{1F525}", "\u2705", "\u274C", "\u26A0\uFE0F", "\u{1F6AB}", "\u2757", "\u2753", "\u267B\uFE0F", "\u{1F4A4}", "\u{1F195}", "\u{1F51C}", "\u{1F51D}"],
  },
];

export const EMOJI_NAMES = {
  "\u{1F44D}": "thumbs up like yes approve",
  "\u2764\uFE0F": "heart love",
  "\u{1F602}": "joy laugh funny",
  "\u{1F62E}": "wow surprised",
  "\u{1F622}": "sad cry",
  "\u{1F64F}": "pray thanks please",
  "\u{1F525}": "fire hot",
  "\u{1F44F}": "clap applause",
  "\u{1F60D}": "heart eyes love",
  "\u{1F389}": "party celebrate",
  "\u2705": "check done",
  "\u2728": "sparkle magic",
  "\u{1F600}": "grinning smile",
  "\u{1F603}": "smile happy",
  "\u{1F604}": "laugh smile",
  "\u{1F601}": "grin",
  "\u{1F605}": "sweat smile relief",
  "\u{1F923}": "rolling laugh",
  "\u{1F642}": "slight smile",
  "\u{1F609}": "wink",
  "\u{1F60A}": "blush smile",
  "\u{1F970}": "love hearts",
  "\u{1F618}": "kiss",
  "\u{1F914}": "thinking",
  "\u{1F60E}": "cool sunglasses",
  "\u{1F97A}": "pleading",
  "\u{1F62D}": "cry sob",
  "\u{1F634}": "sleep",
  "\u{1F92F}": "mind blown",
  "\u{1F973}": "party face",
  "\u{1F644}": "eye roll",
  "\u{1F611}": "expressionless",
  "\u{1F44B}": "wave hello",
  "\u{1F44C}": "ok",
  "\u{1F91D}": "handshake",
  "\u{1F64C}": "raised hands",
  "\u{1F4AA}": "strong muscle",
  "\u270D\uFE0F": "write",
  "\u{1F440}": "eyes looking",
  "\u{1F9E0}": "brain",
  "\u{1FAF6}": "heart hands",
  "\u{1F4AC}": "speech chat",
  "\u{1F331}": "seedling plant",
  "\u{1F33F}": "herb nature",
  "\u{1F343}": "leaf",
  "\u{1F340}": "clover luck",
  "\u{1F33A}": "flower",
  "\u{1F33B}": "sunflower",
  "\u{1F319}": "moon night",
  "\u2600\uFE0F": "sun",
  "\u26C5": "cloud sun",
  "\u{1F308}": "rainbow",
  "\u2744\uFE0F": "snow",
  "\u26A1": "lightning",
  "\u2615": "coffee",
  "\u{1FAD6}": "bread food",
  "\u{1F355}": "pizza",
  "\u{1F35C}": "noodles",
  "\u{1F4CE}": "attachment clip",
  "\u{1F4CC}": "pin",
  "\u{1F4A1}": "idea lightbulb",
  "\u{1F512}": "lock private",
  "\u{1F511}": "key",
  "\u{1F4DD}": "note memo",
  "\u{1F4C8}": "chart growth",
  "\u{1F4E6}": "package",
  "\u{1F3A7}": "headphones audio",
  "\u{1F50D}": "search",
  "\u2B50": "star favorite",
  "\u{1F4AB}": "dizzy",
  "\u{1F4AF}": "hundred perfect",
  "\u274C": "cross no",
  "\u26A0\uFE0F": "warning",
  "\u{1F6AB}": "blocked prohibited",
  "\u2757": "important",
  "\u2753": "question",
};

export const AVATAR_STYLES = [
  { value: "adventurer-neutral", label: "Adventurer" },
  { value: "avataaars-neutral", label: "Avataaars" },
  { value: "open-peeps", label: "Open Peeps" },
  { value: "thumbs", label: "Thumbs" },
];

export const ACCENTS = [
  ...THEME_PACKS.map((theme) => theme.accent),
  "#116a5b",
  "#6d5d40",
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

export const DEFAULT_ACCENT = "#a85612";
