// Supabase sync for the two content stores:
//
//   my_list         — My List ({ videos, members }) per profile
//   watch_progress  — watched state + Continue Watching, per profile/video
//
// The app keeps writing to localStorage as before (fast first paint + offline).
// The SyncProvider (src/context/SyncContext.jsx) mirrors those local writes up
// to these tables and pulls remote changes down when a profile loads.
//
// Every helper takes the account user id explicitly and every statement is
// additionally scoped by user_id, so a bug in a caller can never read or write
// another account's rows. Row Level Security enforces the same rule server-side.

import { supabase } from "./supabase.js";
import { loggedFetch } from "../utils/fetchLogger.js";

function requireClient() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

// ---------------------------------------------------------------- My List ----

export async function fetchMyList(userId, profileId) {
  const client = requireClient();
  return loggedFetch("my_list select", { userId, profileId }, async () => {
    const { data, error } = await client
      .from("my_list")
      .select("kind, item_id")
      .eq("user_id", userId)
      .eq("profile_id", profileId);
    if (error) throw error;

    const favs = { videos: [], members: [] };
    for (const row of data || []) {
      if (row.kind === "members") favs.members.push(row.item_id);
      else favs.videos.push(row.item_id);
    }
    return favs;
  });
}

const listKey = (kind, itemId) => `${kind}:${itemId}`;

export async function replaceMyList(userId, profileId, favs) {
  const client = requireClient();
  const videos = Array.isArray(favs?.videos) ? favs.videos : [];
  const members = Array.isArray(favs?.members) ? favs.members : [];

  return loggedFetch(
    "my_list replace",
    { userId, profileId, videos: videos.length, members: members.length },
    async () => {
      const { data: existing, error } = await client
        .from("my_list")
        .select("kind, item_id")
        .eq("user_id", userId)
        .eq("profile_id", profileId);
      if (error) throw error;

      const current = new Set((existing || []).map((r) => listKey(r.kind, r.item_id)));
      const desiredRows = [
        ...videos.map((itemId) => ({
          user_id: userId,
          profile_id: profileId,
          kind: "videos",
          item_id: itemId,
        })),
        ...members.map((itemId) => ({
          user_id: userId,
          profile_id: profileId,
          kind: "members",
          item_id: itemId,
        })),
      ];
      const desired = new Set(desiredRows.map((r) => listKey(r.kind, r.item_id)));

      const inserts = desiredRows.filter((r) => !current.has(listKey(r.kind, r.item_id)));
      const removals = (existing || []).filter((r) => !desired.has(listKey(r.kind, r.item_id)));

      if (inserts.length) {
        const { error: insertError } = await client.from("my_list").insert(inserts);
        if (insertError) throw insertError;
      }
      // Delete per kind so a video id that happens to match a member id can never
      // remove the wrong row.
      for (const kind of ["videos", "members"]) {
        const ids = removals.filter((r) => r.kind === kind).map((r) => r.item_id);
        if (!ids.length) continue;
        const { error: deleteError } = await client
          .from("my_list")
          .delete()
          .eq("user_id", userId)
          .eq("profile_id", profileId)
          .eq("kind", kind)
          .in("item_id", ids);
        if (deleteError) throw deleteError;
      }
    }
  );
}

// ---------------------------------------------------------- watch progress ---

// Reads both stores back in the shapes the app already uses:
//   { watched: { [videoId]: record }, cw: [continue-watching entry, ...] }
export async function fetchWatchProgress(userId, profileId) {
  const client = requireClient();
  return loggedFetch("watch_progress select", { userId, profileId }, async () => {
    const { data, error } = await client
      .from("watch_progress")
      .select("video_id, progress, watched, in_continue_watching, position, data, updated_at")
      .eq("user_id", userId)
      .eq("profile_id", profileId);
    if (error) throw error;

    const watched = {};
    const cw = [];
    for (const row of data || []) {
      const meta = row.data && typeof row.data === "object" ? row.data : {};
      const updatedAt = row.updated_at ? Date.parse(row.updated_at) : meta.updatedAt || Date.now();
      const record = {
        ...meta,
        videoId: row.video_id,
        progress: row.progress ?? 0,
        watched: !!row.watched,
        updatedAt,
      };
      watched[row.video_id] = record;
      if (row.in_continue_watching) {
        cw.push({ ...record, position: row.position ?? 0 });
      }
    }
    cw.sort((a, b) => a.position - b.position);
    for (const entry of cw) delete entry.position;
    return { watched, cw };
  });
}

export async function replaceWatchProgress(userId, profileId, watchedMap, cwList) {
  const client = requireClient();
  return loggedFetch(
    "watch_progress replace",
    { userId, profileId, watched: Object.keys(watchedMap || {}).length, continueWatching: (cwList || []).length },
    async () => {
      const rows = new Map();

      for (const [videoId, record] of Object.entries(watchedMap || {})) {
        if (!record) continue;
        rows.set(videoId, {
          user_id: userId,
          profile_id: profileId,
          video_id: videoId,
          progress: record.progress ?? 0,
          watched: record.watched === true,
          in_continue_watching: false,
          position: null,
          data: record,
          updated_at: new Date(record.updatedAt || Date.now()).toISOString(),
        });
      }

      (cwList || []).forEach((entry, index) => {
        if (!entry?.videoId) return;
        const existing = rows.get(entry.videoId);
        if (existing) {
          rows.set(entry.videoId, {
            ...existing,
            in_continue_watching: true,
            position: index,
            progress: Math.max(existing.progress ?? 0, entry.progress ?? 0),
            data: { ...existing.data, ...entry },
          });
        } else {
          rows.set(entry.videoId, {
            user_id: userId,
            profile_id: profileId,
            video_id: entry.videoId,
            progress: entry.progress ?? 0,
            watched: false,
            in_continue_watching: true,
            position: index,
            data: entry,
            updated_at: new Date(entry.updatedAt || Date.now()).toISOString(),
          });
        }
      });

      const desiredIds = new Set(rows.keys());
      const { data: existing, error } = await client
        .from("watch_progress")
        .select("video_id")
        .eq("user_id", userId)
        .eq("profile_id", profileId);
      if (error) throw error;

      const stale = (existing || [])
        .map((r) => r.video_id)
        .filter((id) => !desiredIds.has(id));
      if (stale.length) {
        const { error: deleteError } = await client
          .from("watch_progress")
          .delete()
          .eq("user_id", userId)
          .eq("profile_id", profileId)
          .in("video_id", stale);
        if (deleteError) throw deleteError;
      }

      if (rows.size) {
        const { error: upsertError } = await client
          .from("watch_progress")
          .upsert([...rows.values()], { onConflict: "profile_id,video_id" });
        if (upsertError) throw upsertError;
      }
    }
  );
}
