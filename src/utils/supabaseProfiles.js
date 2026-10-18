// Supabase-backed profile store.
//
// A profile is the "who's watching" identity under an account. Profiles live in
// `public.profiles` (see supabase/migrations/0001_init.sql) with explicit
// columns mirroring the record built by utils/profiles.js makeProfile():
//
//   id, name, avatar, theme, accent, notifications, bio, favorite_unit,
//   bias_wrecker, status, member_since, joined_at, created_at, updated_at
//
// Row Level Security restricts every row to its owner, so the publishable key
// can be used in the browser safely.
//
// The theme and accent live on the profile record, so syncing profiles syncs
// appearance across devices too. My List / Continue Watching are separate
// tables (see lib/supabaseSync.js).

import { supabase } from "../lib/supabase.js";
import { loadProfiles, makeProfile } from "./profiles.js";

const PROFILE_COLUMNS =
  "id, name, avatar, theme, accent, notifications, bio, favorite_unit, " +
  "bias_wrecker, status, member_since, joined_at, created_at";

function rowToProfile(row) {
  if (!row) return null;
  return makeProfile({
    id: row.id,
    name: row.name,
    avatar: row.avatar || "",
    theme: row.theme,
    accent: row.accent,
    notifications: row.notifications || undefined,
    bio: row.bio ?? "",
    favoriteUnit: row.favorite_unit ?? "All",
    biasWrecker: row.bias_wrecker ?? "",
    status: row.status ?? "",
    memberSince: row.member_since ?? "",
    joinedAt: row.joined_at ?? undefined,
    createdAt: row.created_at ? Date.parse(row.created_at) : undefined,
  });
}

function profileToRow(userId, profile) {
  return {
    id: profile.id,
    user_id: userId,
    name: profile.name,
    avatar: profile.avatar || "",
    theme: profile.theme,
    accent: profile.accent,
    notifications: profile.notifications || {},
    bio: profile.bio || "",
    favorite_unit: profile.favoriteUnit || "All",
    bias_wrecker: profile.biasWrecker || "",
    status: profile.status || "",
    member_since: profile.memberSince || "",
    joined_at: profile.joinedAt ?? Date.now(),
    created_at: new Date(profile.createdAt || Date.now()).toISOString(),
  };
}

export async function listProfiles(userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToProfile).filter(Boolean);
}

export async function saveProfile(userId, profile) {
  if (!supabase || !userId || !profile?.id) return null;
  const { data, error } = await supabase
    .from("profiles")
    .upsert(profileToRow(userId, profile), { onConflict: "id" })
    .select(PROFILE_COLUMNS)
    .single();
  if (error) throw error;
  return rowToProfile(data);
}

export async function deleteProfile(rowId, userId) {
  if (!supabase || !userId || !rowId) return;
  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", rowId)
    .eq("user_id", userId);
  if (error) throw error;
}

// Loads the account's profiles, seeding them on first use. If this device still
// has profiles keyed by the account username (the pre-Supabase local store),
// they are migrated up — preserving their ids, and therefore the locally stored
// My List / Continue Watching that is keyed by those ids. Otherwise a single
// default profile is created from the account handle.
export async function bootstrapProfiles(userId, accountName) {
  const existing = await listProfiles(userId);
  if (existing.length) return existing;

  const local = accountName ? loadProfiles(accountName) : [];
  const seed = local.length ? local : [makeProfile({ name: accountName || "Carat" })];

  const saved = [];
  for (const profile of seed) {
    const row = await saveProfile(userId, profile);
    if (row) saved.push(row);
  }
  return saved;
}
