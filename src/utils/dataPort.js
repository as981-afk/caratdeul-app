// Export / import of a profile's My List, favorites, watch history and
// settings as a single JSON file, so demo data can be moved between browsers or
// kept as a backup. Only the profile's own storage keys are read or written;
// the profile's identity fields (name, avatar, theme, accent, notifications,
// bio, ...) ride along in the `profile` section.

import { loadList, saveList } from "../hooks/useLocalStorageList";
import { CW_KEY, RECENT_KEY, FAV_KEY } from "./watchHistory";
import { loadWatched, replaceWatched } from "./watched";
import { COMMENTS_KEY } from "./comments";
import { REACTIONS_KEY } from "./reactions";
import { QUIZ_KEY } from "./quizStore";
import { BADGES_KEY } from "./badges";

export const BACKUP_FORMAT = "caratflix-backup";
// v3 adds the engagement sections (comments, reactions, quiz results, badges).
const BACKUP_VERSION = 3;

const emptyFavs = () => ({ videos: [], members: [] });
const emptyList = () => [];
const emptyMap = () => ({});

function keysFor(profileId) {
  return {
    favorites: `${FAV_KEY}-${profileId}`,
    continueWatching: `${CW_KEY}-${profileId}`,
    recentlyWatched: `${RECENT_KEY}-${profileId}`,
    comments: `${COMMENTS_KEY}-${profileId}`,
    reactions: `${REACTIONS_KEY}-${profileId}`,
    quiz: `${QUIZ_KEY}-${profileId}`,
    badges: `${BADGES_KEY}-${profileId}`,
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asMap(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

// The profile fields that make sense to move between browsers. `id` is
// deliberately excluded — an imported profile keeps the importing profile's id.
function profileSettings(profile) {
  if (!profile || typeof profile !== "object") return null;
  const {
    name, avatar, accent, theme, notifications,
    bio, favoriteUnit, biasWrecker, status, memberSince,
  } = profile;
  return { name, avatar, accent, theme, notifications, bio, favoriteUnit, biasWrecker, status, memberSince };
}

export function collectUserData(profileId, profile) {
  const keys = keysFor(profileId);
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    profileId,
    favorites: loadList(keys.favorites, emptyFavs),
    continueWatching: loadList(keys.continueWatching, emptyList),
    recentlyWatched: loadList(keys.recentlyWatched, emptyList),
    watched: loadWatched(profileId),
    comments: loadList(keys.comments, emptyMap),
    reactions: loadList(keys.reactions, emptyMap),
    quiz: loadList(keys.quiz, emptyMap),
    badges: loadList(keys.badges, emptyMap),
    profile: profileSettings(profile),
  };
}

// Serialises the profile's data and triggers a download. Returns the payload.
export function downloadUserData(profileId, profile) {
  const payload = collectUserData(profileId, profile);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `caratflix-${(profile?.name || profileId || "profile").replace(/\s+/g, "-").toLowerCase()}-backup.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return payload;
}

// Writes a parsed backup into this browser's storage for `profileId`.
// Throws with a human-readable message on anything that doesn't look right —
// never partially applies a malformed file.
export function applyUserData(profileId, updateProfile, data) {
  if (!data || typeof data !== "object" || data.format !== BACKUP_FORMAT) {
    throw new Error("That file is not a CARATFLIX backup.");
  }
  const keys = keysFor(profileId);

  if (data.favorites != null) {
    if (typeof data.favorites !== "object" || Array.isArray(data.favorites)) {
      throw new Error("The backup's favorites section is malformed.");
    }
    saveList(keys.favorites, {
      videos: asArray(data.favorites.videos),
      members: asArray(data.favorites.members),
    });
  }
  if (data.continueWatching != null) saveList(keys.continueWatching, asArray(data.continueWatching));
  if (data.recentlyWatched != null) saveList(keys.recentlyWatched, asArray(data.recentlyWatched));
  if (data.watched != null) replaceWatched(profileId, data.watched);
  if (data.comments != null) saveList(keys.comments, asMap(data.comments));
  if (data.reactions != null) saveList(keys.reactions, asMap(data.reactions));
  if (data.quiz != null) saveList(keys.quiz, asMap(data.quiz));
  if (data.badges != null) saveList(keys.badges, asMap(data.badges));
  if (data.profile && typeof data.profile === "object" && typeof updateProfile === "function") {
    updateProfile(profileId, profileSettings(data.profile));
  }

  return true;
}

export async function importUserDataFromFile(profileId, updateProfile, file) {
  if (!file) throw new Error("No file selected.");
  let parsed;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  applyUserData(profileId, updateProfile, parsed);
}
