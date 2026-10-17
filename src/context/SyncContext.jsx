import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { isSupabaseConfigured } from "../lib/supabase.js";
import {
  fetchMyList,
  fetchWatchProgress,
  replaceMyList,
  replaceWatchProgress,
} from "../lib/supabaseSync.js";
import { subscribeStorage, storageGet, storageSet } from "../utils/storage.js";
import { loadList, saveList } from "../hooks/useLocalStorageList.js";
import { CW_KEY, FAV_KEY } from "../utils/watchHistory.js";
import { watchedKeyFor } from "../utils/watched.js";

// Mirrors the app's local content stores to Supabase and back.
//
// The rest of the app is unchanged: it keeps reading/writing localStorage, so
// the first paint is instant and everything still works offline. This provider
// sits next to it and:
//   1. on profile load, pulls the account's rows down (remote wins, except on
//      the very first sync where local data is migrated up);
//   2. debounces local writes and pushes them up.
//
// A per-profile "already synced" flag makes remote authoritative after the
// first successful sync — otherwise an empty remote list (after deleting every
// item on another device) would be re-seeded from this device's cache.
const SyncContext = createContext(null);

export function useSync() {
  return useContext(SyncContext);
}

export function SyncProvider({ accountId, profileId, children }) {
  const [syncing, setSyncing] = useState(false);

  const favKey = profileId ? `${FAV_KEY}-${profileId}` : null;
  const watchedKey = profileId ? watchedKeyFor(profileId) : null;
  const cwKey = profileId ? `${CW_KEY}-${profileId}` : null;
  const favSyncedKey = profileId ? `caratflix-synced-fav-${profileId}` : null;
  const wpSyncedKey = profileId ? `caratflix-synced-wp-${profileId}` : null;

  // Local writes made while applying remote data must not bounce straight back
  // up, so pushes are suppressed for a short window after each pull.
  const suppressUntilRef = useRef(0);

  const applyRemote = useCallback(async () => {
    if (!isSupabaseConfigured || !accountId || !profileId) return;
    try {
      setSyncing(true);
      const [remoteFavs, remoteProgress] = await Promise.all([
        fetchMyList(accountId, profileId),
        fetchWatchProgress(accountId, profileId),
      ]);
      suppressUntilRef.current = Date.now() + 1500;

      const touched = [];

      // ---- My List ---------------------------------------------------------
      const localFavs = loadList(favKey, () => ({ videos: [], members: [] }));
      const hasLocalFavs =
        (localFavs.videos?.length || 0) + (localFavs.members?.length || 0) > 0;
      const hasRemoteFavs =
        remoteFavs.videos.length + remoteFavs.members.length > 0;
      if (hasRemoteFavs || storageGet(favSyncedKey) === "1") {
        saveList(favKey, remoteFavs);
        touched.push(favKey);
      } else if (hasLocalFavs) {
        // First sync on this profile: publish what this device already has.
        await replaceMyList(accountId, profileId, localFavs);
      }
      storageSet(favSyncedKey, "1");

      // ---- Watch progress + Continue Watching ------------------------------
      const localWatched = loadList(watchedKey, () => ({}));
      const localCw = loadList(cwKey, () => []);
      const hasLocalProgress =
        Object.keys(localWatched || {}).length > 0 || (localCw?.length || 0) > 0;
      const hasRemoteProgress =
        Object.keys(remoteProgress.watched).length > 0 || remoteProgress.cw.length > 0;
      if (hasRemoteProgress || storageGet(wpSyncedKey) === "1") {
        saveList(watchedKey, remoteProgress.watched);
        saveList(cwKey, remoteProgress.cw);
        touched.push(watchedKey, cwKey);
      } else if (hasLocalProgress) {
        await replaceWatchProgress(accountId, profileId, localWatched, localCw);
      }
      storageSet(wpSyncedKey, "1");

      // Tell the hooks that read these keys to re-read their state.
      if (touched.length) {
        window.dispatchEvent(
          new CustomEvent("caratflix:sync-applied", { detail: { keys: touched } })
        );
      }
    } catch (error) {
      // Offline / backend not migrated yet: keep the local cache and move on.
      console.warn("[CaratFlix] Could not sync from Supabase; using local cache.", error);
    } finally {
      setSyncing(false);
    }
  }, [
    accountId,
    profileId,
    favKey,
    watchedKey,
    cwKey,
    favSyncedKey,
    wpSyncedKey,
  ]);

  // Pull on profile load and whenever the tab regains focus (cheap polling for
  // changes made on another device).
  useEffect(() => {
    if (!isSupabaseConfigured || !accountId || !profileId) return undefined;
    void applyRemote();
    const onFocus = () => { void applyRemote(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [applyRemote, accountId, profileId]);

  // Push local writes up, debounced so the watch timer's frequent saves collapse
  // into one round-trip.
  useEffect(() => {
    if (!isSupabaseConfigured || !accountId || !profileId) return undefined;

    let timer = null;
    const push = () => {
      if (Date.now() < suppressUntilRef.current) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          setSyncing(true);
          const favs = loadList(favKey, () => ({ videos: [], members: [] }));
          const watched = loadList(watchedKey, () => ({}));
          const cw = loadList(cwKey, () => []);
          await Promise.all([
            replaceMyList(accountId, profileId, favs),
            replaceWatchProgress(accountId, profileId, watched, cw),
          ]);
          storageSet(favSyncedKey, "1");
          storageSet(wpSyncedKey, "1");
        } catch (error) {
          console.warn("[CaratFlix] Could not push to Supabase; changes stay local.", error);
        } finally {
          setSyncing(false);
        }
      }, 900);
    };

    const unsubscribe = subscribeStorage((key) => {
      if (key === favKey || key === watchedKey || key === cwKey) push();
    });
    const onOnline = () => push();
    window.addEventListener("online", onOnline);

    return () => {
      unsubscribe();
      window.removeEventListener("online", onOnline);
      if (timer) clearTimeout(timer);
    };
  }, [
    accountId,
    profileId,
    favKey,
    watchedKey,
    cwKey,
    favSyncedKey,
    wpSyncedKey,
  ]);

  const value = useMemo(
    () => ({ syncing, syncNow: applyRemote }),
    [syncing, applyRemote]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export default SyncContext;
