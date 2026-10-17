import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  MAX_PROFILES,
  ensureProfiles,
  loadActiveProfileId,
  loadProfiles,
  makeProfile,
  purgeProfileData,
  saveProfiles,
  setActiveProfileId,
} from "../utils/profiles.js";

// Profile context: the account's profiles plus the currently selected one, and
// the CRUD used by the "Who's watching?" gate, the profile editor, and the
// preferences page.
//
// This is the gate between "logged in" and "in the app": AppContent only renders
// once `activeProfile` is non-null, so every per-profile hook downstream can
// assume a profile id exists. `account` may be null (logged out) — then there
// are no profiles and every mutator is a no-op.
const ProfileContext = createContext(null);

export function useProfiles() {
  return useContext(ProfileContext);
}

export function ProfileProvider({ account, children }) {
  // ensureProfiles() seeds/migrates synchronously on first mount; it is
  // idempotent, so the StrictMode double-invoke is harmless.
  const [profiles, setProfiles] = useState(() => (account ? ensureProfiles(account) : []));
  const [activeId, setActiveId] = useState(() => {
    if (!account) return null;
    const stored = loadActiveProfileId();
    return stored && loadProfiles(account).some((p) => p.id === stored) ? stored : null;
  });

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

  // Returns the created profile, or null when the account is already at the cap.
  const createProfile = useCallback(
    (data) => {
      if (!account || profiles.length >= MAX_PROFILES) return null;
      const created = makeProfile(data);
      setProfiles((current) => {
        if (current.length >= MAX_PROFILES) return current;
        const next = [...current, created];
        saveProfiles(account, next);
        return next;
      });
      return created;
    },
    [account, profiles]
  );

  // Functional update so two profile changes in the same React batch (e.g. theme
  // + accent applied together) compose instead of the second clobbering the
  // first with a stale list.
  const updateProfile = useCallback(
    (id, patch) => {
      setProfiles((current) => {
        const next = current.map((p) => (p.id === id ? { ...p, ...patch } : p));
        saveProfiles(account, next);
        return next;
      });
    },
    [account]
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
        saveProfiles(account, next);
        purgeProfileData(id);
        return next;
      });
    },
    [account, activeId]
  );

  const value = useMemo(
    () => ({
      account,
      profiles,
      activeProfile,
      activeProfileId: activeId,
      maxProfiles: MAX_PROFILES,
      selectProfile,
      clearProfile,
      createProfile,
      updateProfile,
      deleteProfile,
    }),
    [account, profiles, activeProfile, activeId, selectProfile, clearProfile, createProfile, updateProfile, deleteProfile]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export default ProfileContext;
