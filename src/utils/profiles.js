// Netflix-style profiles: several identities per account, each with its own
// name, avatar, My List, watch history, theme, accent colour, and notification
// preferences.
//
// An account (see utils/auth.js) is the login identity; a profile is the
// "who's watching" identity. Every per-profile storage key is suffixed with the
// profile *id* (not the username), so two profiles — even across accounts —
// never share favourites, history, or settings.
//
// Data written by pre-profile builds was keyed by username; ensureProfiles()
// migrates it into the account's first profile exactly once.

import { storageGet, storageSet, storageRemove } from "./storage.js";
import { THEME_KEY, systemTheme, normalizeTheme } from "./theme.js";
import { DEFAULT_ACCENT_ID } from "../data/AVATARS.js";

export const PROFILES_PREFIX = "caratflix-profiles";
export const ACTIVE_PROFILE_KEY = "caratflix-active-profile";
export const LEGACY_PROFILE_PREFIX = "caratflix-profile";

// Hard cap on profiles per account (Netflix-style).
export const MAX_PROFILES = 5;
export const MAX_PROFILE_NAME = 24;

export const DEFAULT_ACCENT = DEFAULT_ACCENT_ID;

// Storage-key prefixes that used to be scoped to the account username and now
// belong to a profile id. Kept in one place so migration and delete agree.
// (The avatar is not in this list: it lives on the profile record itself so the
// picker can edit any profile, not just the active one.)
const SCOPED_KEYS = [
  "caratflix-favorites",
  "caratflix-continue-watching",
  "caratflix-recent",
  "caratflix-watched",
  "caratflix-searches",
  // Engagement features (local-only): comments, timeline reactions, quiz
  // history and earned badges all live per profile.
  "caratflix-comments",
  "caratflix-reactions",
  "caratflix-quiz",
  "caratflix-badges",
];

// Legacy per-account avatar key (pre-profile builds stored the avatar in its own
// record; new builds keep `avatar` on the profile).
const LEGACY_AVATAR_PREFIX = "caratflix-avatar";

// Globally-unique profile id. Ids must not collide across accounts because the
// storage keys are only namespaced by id, not by account.
export function newProfileId() {
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultNotifications() {
  return { uploads: true, comebacks: true, birthdays: true };
}

function cleanName(name, fallback) {
  const value = String(name ?? "").trim().slice(0, MAX_PROFILE_NAME);
  return value || fallback;
}

// Builds a complete profile record from partial input, applying defaults so a
// record is always safe to render. `id` and timestamps are preserved if given.
export function makeProfile(data = {}) {
  return {
    id: data.id || newProfileId(),
    name: cleanName(data.name, "Carat"),
    accent: data.accent || DEFAULT_ACCENT,
    theme: normalizeTheme(data.theme || systemTheme()),
    notifications: { ...defaultNotifications(), ...(data.notifications || {}) },
    // Carat avatar icon id (see data/AVATARS.js). Stored on the record so the
    // gate can edit any profile's avatar, not just the active one.
    avatar: data.avatar || "",
    // Legacy account-profile fields, carried onto the profile so the existing
    // bio / biases / status editor keeps working per profile.
    bio: data.bio ?? "",
    favoriteUnit: data.favoriteUnit ?? "All",
    biasWrecker: data.biasWrecker ?? "",
    status: data.status ?? "",
    memberSince: data.memberSince ?? "",
    joinedAt: data.joinedAt ?? Date.now(),
    createdAt: data.createdAt ?? Date.now(),
  };
}

export function loadProfiles(account) {
  if (!account) return [];
  try {
    const parsed = JSON.parse(storageGet(`${PROFILES_PREFIX}-${account}`));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p) => p && typeof p === "object" && typeof p.id === "string");
  } catch {
    return [];
  }
}

export function saveProfiles(account, list) {
  if (!account) return;
  storageSet(`${PROFILES_PREFIX}-${account}`, JSON.stringify(list));
}

export function loadActiveProfileId() {
  return storageGet(ACTIVE_PROFILE_KEY) || null;
}

export function setActiveProfileId(id) {
  if (id) storageSet(ACTIVE_PROFILE_KEY, id);
  else storageRemove(ACTIVE_PROFILE_KEY);
}

function readLegacyRecord(account) {
  try {
    return JSON.parse(storageGet(`${LEGACY_PROFILE_PREFIX}-${account}`)) || null;
  } catch {
    return null;
  }
}

// Copies the account-scoped data of pre-profile builds onto the first profile.
// Never overwrites a profile key that already has a value. The shared
// (un-suffixed) legacy keys are deliberately left in place rather than removed —
// they may still be readable for other accounts, and are never read again once
// every account has migrated.
function migrateAccountData(account, profileId) {
  for (const base of SCOPED_KEYS) {
    const dest = `${base}-${profileId}`;
    if (storageGet(dest) != null) continue;
    for (const src of [`${base}-${account}`, `${base}:${account}`]) {
      const value = storageGet(src);
      if (value != null && value !== "") {
        storageSet(dest, value);
        break;
      }
    }
  }
}

// Ensures an account has at least one profile, migrating existing account-level
// data into it the first time. Idempotent, so it is safe to call on every mount
// (and under StrictMode's double-invoked initialisers).
export function ensureProfiles(account) {
  if (!account) return [];
  const existing = loadProfiles(account);
  if (existing.length) return existing;

  const legacy = readLegacyRecord(account);
  let theme = storageGet(THEME_KEY);
  theme = theme === "light" || theme === "dark" ? theme : systemTheme();
  const legacyAvatar = storageGet(`${LEGACY_AVATAR_PREFIX}-${account}`) || "";

  const profile = makeProfile({
    name: legacy?.displayName || account,
    theme,
    avatar: legacyAvatar,
    bio: legacy?.bio,
    favoriteUnit: legacy?.favoriteUnit,
    biasWrecker: legacy?.biasWrecker,
    status: legacy?.status,
    memberSince: legacy?.memberSince,
    joinedAt: legacy?.joinedAt,
  });

  const list = [profile];
  saveProfiles(account, list);
  migrateAccountData(account, profile.id);
  return list;
}

// Removes every per-profile storage key when a profile is deleted.
export function purgeProfileData(profileId) {
  if (!profileId) return;
  for (const base of SCOPED_KEYS) storageRemove(`${base}-${profileId}`);
  // Supabase sync markers (see context/SyncContext.jsx).
  storageRemove(`caratflix-synced-fav-${profileId}`);
  storageRemove(`caratflix-synced-wp-${profileId}`);
}
