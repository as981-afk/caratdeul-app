// Custom (uploaded) profile photos.
//
// A profile's `avatar` field stays a single string; the value now has two
// kinds, distinguished by prefix:
//
//   "quartz-heart"                     a preset Carat icon id (data/AVATARS.js)
//   "custom:{accountId}/{profileId}-{ts}.webp"   an uploaded photo in the
//                                      Supabase Storage "avatars" bucket
//
// Keeping both kinds in the one field means the profile record, the JSON
// backup/import (utils/dataPort.js) and the Supabase `profiles.avatar` column
// all keep working unchanged — only the *renderer* (components/AvatarCircle)
// has to branch on the prefix.
//
// This module deliberately reads the Supabase URL from the Vite env directly
// instead of importing lib/supabase.js: AvatarCircle is used across the whole
// shell, and importing the client (and the SDK) just to build a URL string
// would be wasteful. Uploads/deletes — which genuinely need the client — live
// in utils/avatarUpload.js.

export const AVATAR_BUCKET = "avatars";
export const CUSTOM_AVATAR_PREFIX = "custom:";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";

// Wraps a storage object path into the value stored on the profile.
export function makeCustomAvatarValue(path) {
  return path ? `${CUSTOM_AVATAR_PREFIX}${path}` : "";
}

// True when a stored avatar value points at an uploaded photo.
export function isCustomAvatar(value) {
  return typeof value === "string" && value.startsWith(CUSTOM_AVATAR_PREFIX);
}

// The Supabase Storage object path ("{accountId}/{profileId}-{ts}.webp") inside
// a custom avatar value, or null for presets / empty values.
export function customAvatarPath(value) {
  return isCustomAvatar(value) ? value.slice(CUSTOM_AVATAR_PREFIX.length) : null;
}

// Public URL for a custom avatar, or null when there is nothing to show (no
// value, a preset, or Supabase not configured). The bucket is public, so no
// signed URL is needed.
export function customAvatarUrl(value) {
  const path = customAvatarPath(value);
  if (!path || !SUPABASE_URL) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${AVATAR_BUCKET}/${path}`;
}
