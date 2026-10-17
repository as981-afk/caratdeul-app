// Profile avatars + accent palettes for CARATFLIX.
//
// Everything here is emoji/gradient based on purpose: no copyrighted images,
// just Carat-themed glyphs (Rose Quartz / Serenity palette) rendered on the
// profile's own gradient. A profile stores only an id (see utils/profiles.js);
// the glyph and colours are looked up from these tables, so a future tweak to
// the artwork never invalidates saved profiles.

// Gradient pairs used by the avatar icons and the accent picker. `c1` is the
// warm (rose) end of the brand gradient and `c2` the cool (serenity) end.
export const CARAT_PALETTE = {
  quartz: { c1: "#f2a9c1", c2: "#a4577a" },
  serenity: { c1: "#9fc3e8", c2: "#4f6f96" },
  lavender: { c1: "#c3a9f2", c2: "#6d4bb8" },
  mint: { c1: "#9fe8d3", c2: "#3f8a72" },
  gold: { c1: "#d4af7a", c2: "#7a5a2a" },
  peach: { c1: "#f2c1a9", c2: "#a45f7a" },
  sky: { c1: "#a9d5f2", c2: "#3f6f9a" },
  coral: { c1: "#f2a9a9", c2: "#a44a4a" },
  lilac: { c1: "#e0b3f2", c2: "#7a4bb8" },
  bubblegum: { c1: "#f2a9d5", c2: "#a44a8f" },
  teal: { c1: "#a9f2e0", c2: "#3f8a86" },
  ice: { c1: "#cfe0f2", c2: "#4f6f96" },
};

// Carat-themed avatar icons: a glyph plus a palette key.
export const CARAT_AVATARS = [
  { id: "quartz-heart", emoji: "💗", label: "Rose Quartz heart", palette: "quartz" },
  { id: "serenity-heart", emoji: "💙", label: "Serenity heart", palette: "serenity" },
  { id: "diamond", emoji: "💎", label: "Carat diamond", palette: "sky" },
  { id: "sparkle", emoji: "✨", label: "Sparkle", palette: "lavender" },
  { id: "star", emoji: "⭐", label: "Star", palette: "gold" },
  { id: "moon", emoji: "🌙", label: "Moon", palette: "lilac" },
  { id: "sun", emoji: "🌞", label: "Sunshine", palette: "peach" },
  { id: "blossom", emoji: "🌸", label: "Blossom", palette: "bubblegum" },
  { id: "ribbon", emoji: "🎀", label: "Ribbon", palette: "coral" },
  { id: "crown", emoji: "👑", label: "Crown", palette: "gold" },
  { id: "crystal", emoji: "🔮", label: "Crystal ball", palette: "lilac" },
  { id: "cherry", emoji: "🍒", label: "Cherry", palette: "coral" },
  { id: "clover", emoji: "🍀", label: "Lucky clover", palette: "mint" },
  { id: "tiger", emoji: "🐯", label: "Tiger", palette: "peach" },
  { id: "cat", emoji: "🐱", label: "Cat", palette: "bubblegum" },
  { id: "dove", emoji: "🕊️", label: "Dove", palette: "ice" },
  { id: "bubbles", emoji: "🫧", label: "Bubbles", palette: "teal" },
  { id: "gem-blue", emoji: "🔷", label: "Blue gem", palette: "sky" },
];

const AVATAR_BY_ID = new Map(CARAT_AVATARS.map((a) => [a.id, a]));

// Resolve a stored avatar id to its icon + gradient, or null when unknown (a
// legacy gallery-photo id, a removed icon, or nothing picked yet).
export function getCaratAvatar(id) {
  if (!id) return null;
  const item = AVATAR_BY_ID.get(id);
  if (!item) return null;
  const palette = CARAT_PALETTE[item.palette] || CARAT_PALETTE.quartz;
  return { ...item, c1: palette.c1, c2: palette.c2 };
}

// Accent palettes: each sets both ends of the app-wide brand gradient
// (--rose -> --serenity). "Rose Quartz" is the default CARATFLIX look.
export const ACCENTS = [
  { id: "quartz", label: "Rose Quartz", c1: "#f2a9c1", c2: "#9fc3e8" },
  { id: "serenity", label: "Serenity", c1: "#9fc3e8", c2: "#6fa8d8" },
  { id: "lavender", label: "Lavender", c1: "#c3a9f2", c2: "#9fc3e8" },
  { id: "mint", label: "Mint", c1: "#9fe8d3", c2: "#9fc3e8" },
  { id: "gold", label: "Carat Gold", c1: "#d4af7a", c2: "#f2a9c1" },
  { id: "coral", label: "Coral", c1: "#f2a9a9", c2: "#f2a9c1" },
  { id: "bubblegum", label: "Bubblegum", c1: "#f2a9d5", c2: "#c3a9f2" },
  { id: "ice", label: "Ice", c1: "#a9d5f2", c2: "#cfe0f2" },
];

export const DEFAULT_ACCENT_ID = "quartz";

const ACCENT_BY_ID = new Map(ACCENTS.map((a) => [a.id, a]));

// Resolve an accent id, falling back to the default look for unknown values.
export function getAccent(id) {
  return ACCENT_BY_ID.get(id) || ACCENT_BY_ID.get(DEFAULT_ACCENT_ID);
}
