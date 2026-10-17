// Per-user watch-history storage (continue watching + recently watched) and
// the per-user favorites localStorage key.
//
// One-off writes used by the watch timers. The generic useLocalStorageList hook
// still owns the React state; these persist straight to storage and the UI
// refreshes via the hook's `refresh` (called on watch end).

import { loadList, saveList } from "../hooks/useLocalStorageList";

export const CW_KEY = "caratflix-continue-watching";
export const RECENT_KEY = "caratflix-recent";
export const FAV_KEY = "caratflix-favorites";

// A video is treated as finished — and dropped from Continue Watching — once it
// reaches 95% (the last few percent are credits/menu, not worth resuming into).
export const CW_FINISHED_PERCENT = 95;

// The demo player advances ~2% per second, so a full pass runs for roughly 50
// seconds. Resume timing (`currentTime`/`duration`, in seconds) is stored
// against this nominal duration.
export const CW_NOMINAL_SECONDS = 50;

function cwKeyFor(user) {
  // Standard separator is "-"; the pre-existing ":" keys are migrated by
  // useLocalStorageList via the `legacyKey` option on first read (App.jsx).
  return `${CW_KEY}-${user}`;
}

function recentKeyFor(user) {
  return `${RECENT_KEY}-${user}`;
}

// Pairs a 0–100 progress value with the `{ currentTime, duration }` seconds
// stored on every Continue Watching entry so a card can resume exactly where it
// left off.
export function cwTiming(progress = 0) {
  const pct = Math.max(0, Math.min(100, progress));
  return { currentTime: Math.round((pct / 100) * CW_NOMINAL_SECONDS), duration: CW_NOMINAL_SECONDS };
}

// Upserts a Continue Watching entry by videoId. Entries that have reached
// CW_FINISHED_PERCENT never persist here — the save filter drops them, so
// finishing a video is enough to take it out of the list.
export function addOrUpdateCW(user, entry) {
  const key = cwKeyFor(user);
  const list = loadList(key, () => []);
  const idx = list.findIndex((e) => e.videoId === entry.videoId);
  const now = Date.now();
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...entry, updatedAt: now, lastWatched: now };
  } else {
    list.unshift({ ...entry, updatedAt: now, lastWatched: now });
  }
  saveList(key, list.filter((e) => e.progress < CW_FINISHED_PERCENT).slice(0, 20));
}

// Explicitly removes a video from Continue Watching (used when it is finished:
// done, not "in progress" anymore). Safe to call for ids that are not present.
export function removeFromCW(user, videoId) {
  const key = cwKeyFor(user);
  const list = loadList(key, () => []).filter((e) => e.videoId !== videoId);
  saveList(key, list.slice(0, 20));
}

// Re-inserts a video at the front of Recently Watched. Any existing entry for
// the same videoId is removed first, so there are never duplicates and the
// order stays most-recent-first.
export function addRecent(user, entry) {
  const key = recentKeyFor(user);
  const list = loadList(key, () => []).filter((e) => e.videoId !== entry.videoId);
  list.unshift({ ...entry, lastWatched: Date.now() });
  saveList(key, list.slice(0, 24));
}
