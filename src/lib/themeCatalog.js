export const THEME_PACKS = [
  {
    id: "fieldstone",
    label: "Fieldstone",
    description: "Warm stone, copper, evergreen.",
    accent: "#a85612",
    dark: false,
  },
  {
    id: "mossline",
    label: "Mossline",
    description: "Soft moss, clay, pale stone.",
    accent: "#3f6f4e",
    dark: false,
  },
  {
    id: "clay-rose",
    label: "Clay rose",
    description: "Muted rose with green balance.",
    accent: "#b5484f",
    dark: false,
  },
  {
    id: "ember-night",
    label: "Ember night",
    description: "Olive black, ember, sage.",
    accent: "#c46a2a",
    dark: true,
  },
  {
    id: "graphite",
    label: "Graphite",
    description: "Neutral dark with rust warmth.",
    accent: "#b85b2b",
    dark: true,
  },
];

export const DEFAULT_THEME_PACK = "fieldstone";

export const themePackIds = new Set(THEME_PACKS.map((theme) => theme.id));

export const getThemePack = (id) =>
  THEME_PACKS.find((theme) => theme.id === id) || THEME_PACKS[0];

export const normalizeThemePack = (id) => {
  const value = String(id || "").trim();
  return themePackIds.has(value) ? value : DEFAULT_THEME_PACK;
};

export const normalizeFontSize = (value) => {
  const numeric = Number(value || 14);
  if (!Number.isFinite(numeric)) return 14;
  return Math.max(12, Math.min(18, Math.round(numeric)));
};
