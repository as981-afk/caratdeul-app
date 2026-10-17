// Per-profile, per-video comments — local only, no backend.
//
// Storage shape (key `caratflix-comments-<profileId>`):
//
//     { "<videoId>": [ { id, text, at }, ... ] }   newest last
//
// Text is sanitised + length-capped on the way in (utils/sanitize.js), and the
// total number of comments per profile is capped so a demo can't grow storage
// without bound. Every mutation dispatches the engagement event so the badge
// engine re-evaluates ("first comment", "chatterbox").

import { loadList, saveList } from "../hooks/useLocalStorageList";
import { sanitizeText, localId, COMMENT_MAX } from "./sanitize";
import { notifyEngagement } from "./engagementEvents";

export const COMMENTS_KEY = "caratflix-comments";
export const MAX_COMMENTS_PER_PROFILE = 300;
export { COMMENT_MAX };

export function commentsKeyFor(profileId) {
  return `${COMMENTS_KEY}-${profileId}`;
}

function asMap(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function loadComments(profileId) {
  if (!profileId) return {};
  return asMap(loadList(commentsKeyFor(profileId), () => ({})));
}

// Comments for one video, oldest first.
export function commentsFor(profileId, videoId) {
  const list = loadComments(profileId)[videoId];
  return Array.isArray(list) ? list : [];
}

// Adds a comment and persists. Returns the new comment (or null when the text
// sanitises to nothing / the target is invalid).
export function addComment(profileId, videoId, text) {
  if (!profileId || !videoId) return null;
  const clean = sanitizeText(text);
  if (!clean) return null;

  const map = loadComments(profileId);
  const list = Array.isArray(map[videoId]) ? map[videoId] : [];
  const comment = { id: localId("c"), text: clean, at: Date.now() };
  const next = { ...map, [videoId]: [...list, comment] };
  saveList(commentsKeyFor(profileId), prune(next));
  notifyEngagement();
  return comment;
}

export function removeComment(profileId, videoId, commentId) {
  if (!profileId || !videoId) return;
  const map = loadComments(profileId);
  const list = Array.isArray(map[videoId]) ? map[videoId] : [];
  const next = { ...map, [videoId]: list.filter((c) => c.id !== commentId) };
  saveList(commentsKeyFor(profileId), next);
}

// Total comments across every video for this profile.
export function countComments(map) {
  if (!map || typeof map !== "object") return 0;
  return Object.values(map).reduce((n, list) => n + (Array.isArray(list) ? list.length : 0), 0);
}

// Drops the oldest comments once the per-profile cap is exceeded so storage
// stays bounded. Newest comments (highest `at`) are kept.
function prune(map) {
  const flat = [];
  for (const [videoId, list] of Object.entries(map)) {
    for (const comment of Array.isArray(list) ? list : []) {
      flat.push({ videoId, comment });
    }
  }
  if (flat.length <= MAX_COMMENTS_PER_PROFILE) return map;
  flat.sort((a, b) => (a.comment.at || 0) - (b.comment.at || 0));
  const keep = new Set(flat.slice(flat.length - MAX_COMMENTS_PER_PROFILE).map((x) => x.comment.id));
  const next = {};
  for (const [videoId, list] of Object.entries(map)) {
    const filtered = (Array.isArray(list) ? list : []).filter((c) => keep.has(c.id));
    if (filtered.length) next[videoId] = filtered;
  }
  return next;
}
