import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  MAX_PROFILES,
  loadActiveProfileId,
  loadProfiles,
  makeProfile,
  purgeProfileData,
  saveProfiles,
  setActiveProfileId,
} from "../utils/profiles.js";
import { bootstrapProfiles, deleteProfile as deleteProfileRemote, saveProfile } from "../utils/supabaseProfiles.js";

// Profile context: the account's profiles plus the currently selected one, and
// the CRUD used by the "Who's watching?" gate, the profile editor, and the
// preferences page.
//
// This is the gate between "logged in" and "in the app": AppContent only renders
// once `activeProfile` is non-null, so every per-profile hook downstream can
// assume a profile id exists.
//
// Supabase is the source of truth: profiles are rows in Postgres, scoped to the
// account, so every device sees the same profiles. The browser copy is only a
// cache for an instant first paint / offline read — never the authority.
//
// `accountId` scopes the data; `accountName` is the display handle.
const ProfileContext = createContext(null);

export function useProfiles() {
  return useContext(ProfileContext);
}

export function ProfileProvider({ accountId, accountName, children }) {
  // Start from the local cache so a reload straight into a chosen profile does
  // not flash the picker; the effect below refreshes from Supabase.
  const [profiles, setProfiles] = useState(() => (accountId ? loadProfiles(accountId) : []));
  const [profilesLoading, setProfilesLoading] = useState(
    () => !!accountId && loadProfiles(accountId).length === 0
  );
  const [activeId, setActiveId] = useState(() => {
    if (!accountId) return null;
    const stored = loadActiveProfileId();
    return stored && loadProfiles(accountId).some((p) => p.id === stored) ? stored : null;
  });

  // Load the account's profiles once (seeding/migrating on first use).
  useEffect(() => {
    if (!accountId) {
      setProfiles([]);
      setProfilesLoading(false);
      return undefined;
    }
    let alive = true;
    // Deliberately NOT setting profilesLoading back to true here. The state
    // starts true only when there is no cached profile list to show; flipping it
    // on every mount swapped the already-rendered app for <BootSplash/>, which
    // tore down and remounted the whole tree (and restarted the sync pull) on
    // every single boot. With a cache we render straight away and refresh this
    // list in the background instead.
    bootstrapProfiles(accountId, accountName)
      .then((list) => {
        if (!alive) return;
        setProfiles(list);
        // Cache for the next boot / offline use.
        saveProfiles(accountId, list);
      })
      .catch(() => {
        // Offline or the migration has not been run yet: keep the local cache.
      })
      .finally(() => { if (alive) setProfilesLoading(false); });
    return () => { alive = false; };
  }, [accountId, accountName]);

  // Keep the selected profile only while it still exists in the loaded list.
  // (Local mode already computed it synchronously above; this also covers the
  // async remote load and profile deletion.)
  useEffect(() => {
    if (!accountId) {
      setActiveId(null);
      return;
    }
    const stored = loadActiveProfileId();
    setActiveId((current) => {
      const wanted = stored || current;
      return wanted && profiles.some((p) => p.id === wanted) ? wanted : null;
    });
  }, [accountId, profiles]);

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeId) || null,
    [profiles, activeId]
  );

  const selectProfile = useCallback((id) => {
    setActiveProfileId(id);
    setActiveId(id);
  }, []);

  const clearProfile = useCallback(() => {
    setActiveProfileId(null);
    setActiveId(null);
  }, []);

  // Persists one profile to Supabase. Writes are fire-and-forget: the UI has
  // already updated optimistically, and the row is the shared source of truth.
  const persistProfile = useCallback(
    (profile) => {
      saveProfile(accountId, profile).catch(() => {});
      return undefined;
    },
    [accountId]
  );

  // Returns the created profile, or null when the account is already at the cap.
  const createProfile = useCallback(
    (data) => {
      if (!accountId || profiles.length >= MAX_PROFILES) return null;
      const created = makeProfile(data);
      setProfiles((current) => {
        if (current.length >= MAX_PROFILES) return current;
        const next = [...current, created];
        saveProfiles(accountId, next);
        persistProfile(created);
        return next;
      });
      return created;
    },
    [accountId, profiles, persistProfile]
  );

  // Functional update so two profile changes in the same React batch (e.g. theme
  // + accent applied together) compose instead of the second clobbering the
  // first with a stale list.
  const updateProfile = useCallback(
    (id, patch) => {
      setProfiles((current) => {
        const next = current.map((p) => (p.id === id ? { ...p, ...patch } : p));
        saveProfiles(accountId, next);
        const updated = next.find((p) => p.id === id);
        if (updated) persistProfile(updated);
        return next;
      });
    },
    [accountId, persistProfile]
  );

  // Deletes a profile and its per-profile data. The last profile can't be
  // removed (an account must always have at least one). Deleting the active
  // profile returns the user to the picker.
  const deleteProfile = useCallback(
    (id) => {
      if (activeId === id) {
        setActiveProfileId(null);
        setActiveId(null);
      }
      setProfiles((current) => {
        if (current.length <= 1) return current;
        const next = current.filter((p) => p.id !== id);
        saveProfiles(accountId, next);
        deleteProfileRemote(id, accountId).catch(() => {});
        purgeProfileData(id);
        return next;
      });
    },
    [accountId, activeId]
  );

  const value = useMemo(
    () => ({
      // Display handle used by the picker / preferences ("Signed in as @…").
      account: accountName || accountId || null,
      accountId,
      profiles,
      profilesLoading,
      activeProfile,
      activeProfileId: activeId,
      maxProfiles: MAX_PROFILES,
      selectProfile,
      clearProfile,
      createProfile,
      updateProfile,
      deleteProfile,
    }),
    [
      accountName,
      accountId,
      profiles,
      profilesLoading,
      activeProfile,
      activeId,
      selectProfile,
      clearProfile,
      createProfile,
      updateProfile,
      deleteProfile,
    ]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export default ProfileContext;
