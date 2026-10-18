import { useCallback } from "react";
import { useLocalStorageList } from "./useLocalStorageList";
import { FAV_KEY } from "../utils/watchHistory";

// Per-user favorites state (`{ videos: [], members: [] }`) kept out of
// AppContent so the storage/mutation logic lives in one place.
//
// All mutators return *new* objects — they never mutate `current` — so React
// always sees a fresh reference, components re-render, and double-invoked
// updaters stay safe under StrictMode.
export function useFavorites(user) {
  const favDefault = useCallback(() => ({ videos: [], members: [] }), []);

  // `user` is now the profile id. Legacy account-keyed data was migrated onto
  // the account's first profile in utils/profiles.js, so there is no per-hook
  // legacy key to fall back to here (a shared fallback would leak one profile's
  // list into another).
  const [favs, refreshFavs, mutateFavs] = useLocalStorageList({
    user,
    key: FAV_KEY,
    separator: "-",
    value: favDefault,
  });

  const toggleFav = useCallback(
    (key, id) => {
      mutateFavs((current) => {
        const list = Array.isArray(current[key]) ? current[key] : [];
        const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
        return { ...current, [key]: next };
      });
    },
    [mutateFavs]
  );

  // Atomically replaces the full bias-member list (used by the profile modal).
  // Guarded so an unchanged save is a no-op: profile edits that don't touch the
  // bias members never write to the favorites record, so a profile update can
  // never silently reset hearts. Returning `current` unchanged also lets React
  // bail out of the re-render.
  const setFavMembers = useCallback(
    (members) => {
      mutateFavs((current) => {
        const currentMembers = Array.isArray(current?.members) ? current.members : [];
        const nextMembers = [...members];
        if (
          currentMembers.length === nextMembers.length &&
          currentMembers.every((m, i) => m === nextMembers[i])
        ) {
          return current;
        }
        return { ...current, members: nextMembers };
      });
    },
    [mutateFavs]
  );

  // Replaces the whole favorites record — used by JSON imports.
  const replaceFavs = useCallback(
    (next) => {
      mutateFavs(() => ({
        videos: Array.isArray(next?.videos) ? [...next.videos] : [],
        members: Array.isArray(next?.members) ? [...next.members] : [],
      }));
    },
    [mutateFavs]
  );

  return { favs, refreshFavs, toggleFav, setFavMembers, replaceFavs };
}

export default useFavorites;
