// Per-profile emoji reactions pinned to moments on a video's timeline.
//
// Storage shape (key `caratflix-reactions-<profileId>`):
//
//     { "<videoId>": [ { id, emoji, t, at }, ... ] }
//
//   t  moment in seconds into the (nominal) clip — the same clock the player
//      and the lyrics panel use (see CW_NOMINAL_SECONDS in utils/watchHistory).
//
// Only emojis from REACTION_EMOJIS are accepted, so the stored set can't be
// polluted by arbitrary input. A per-video cap keeps storage bounded.

import { loadList, saveList } from "../hooks/useLocalStorageList";
import { localId } from "./sanitize";
import { notifyEngagement } from "./engagementEvents";

export const REACTIONS_KEY = "caratflix-reactions";
export const MAX_REACTIONS_PER_VIDEO = 60;

// The palette offered in the UI. Kept here (not in the component) so the stored
// data can always be validated against the same list.
export const REACTION_EMOJIS = ["💗", "🔥", "😂", "🥹", "✨", "🎉", "💎", "🐯"];

export function reactionsKeyFor(profileId) {
  return `${REACTIONS_KEY}-${profileId}`;
}

function asMap(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function loadReactions(profileId) {
  if (!profileId) return {};
  return asMap(loadList(reactionsKeyFor(profileId), () => ({})));
}

export function reactionsFor(profileId, videoId) {
  const list = loadReactions(profileId)[videoId];
  return Array.isArray(list) ? list : [];
}

// Pins `emoji` at second `t` for this video. Returns the new reaction, or null
// when the emoji is not allowed / the target is invalid.
export function addReaction(profileId, videoId, emoji, t) {
  if (!profileId || !videoId) return null;
  if (!REACTION_EMOJIS.includes(emoji)) return null;

  const map = loadReactions(profileId);
  const list = Array.isArray(map[videoId]) ? map[videoId] : [];
  const reaction = {
    id: localId("r"),
    emoji,
    t: Math.max(0, Math.round(t || 0)),
    at: Date.now(),
  };
  const next = [reaction, ...list].slice(0, MAX_REACTIONS_PER_VIDEO);
  saveList(reactionsKeyFor(profileId), { ...map, [videoId]: next });
  notifyEngagement();
  return reaction;
}

export function removeReaction(profileId, videoId, reactionId) {
  if (!profileId || !videoId) return;
  const map = loadReactions(profileId);
  const list = Array.isArray(map[videoId]) ? map[videoId] : [];
  saveList(reactionsKeyFor(profileId), { ...map, [videoId]: list.filter((r) => r.id !== reactionId) });
}

export function countReactions(map) {
  if (!map || typeof map !== "object") return 0;
  return Object.values(map).reduce((n, list) => n + (Array.isArray(list) ? list.length : 0), 0);
}
