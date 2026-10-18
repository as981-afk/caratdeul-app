import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { BADGES } from "../data/BADGES";
import { evaluateBadges, loadEarnedBadges, loadMvIds } from "../utils/badges";
import { onEngagementChange } from "../utils/engagementEvents";
import { useToast } from "./ToastContext.jsx";

// Badge/achievement state for the active profile.
//
// Owns the earned map plus the derived stats, re-evaluates on mount, when the
// caller's `refreshToken` changes (watched / favourites / history moved), and
// whenever an engagement event fires (comment / reaction / quiz result). New
// unlocks are announced through the toast queue.
const BadgeContext = createContext(null);

export function useBadges() {
  return useContext(BadgeContext);
}

export function BadgeProvider({ profile, refreshToken, children }) {
  const profileId = profile?.id || null;
  const toast = useToast();
  const mvIdsRef = useRef(null);
  const [state, setState] = useState(() => ({
    earned: profileId ? loadEarnedBadges(profileId) : {},
    stats: null,
  }));

  const refresh = useCallback(() => {
    if (!profileId) {
      setState({ earned: {}, stats: null });
      return;
    }
    const { earned, stats, newly } = evaluateBadges(profileId, profile, mvIdsRef.current);
    setState({ earned, stats });
    for (const badge of newly) {
      toast.push({ emoji: badge.icon, title: "Badge unlocked", message: badge.name });
    }
  }, [profileId, profile, toast]);

  // Re-run when the profile changes or the caller signals new activity.
  // Awarding a badge means reading storage and updating state + toasts — a
  // legitimate sync with an external store, not a render-time derivation.
  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    refresh();
  }, [refresh, refreshToken]);

  // Load the MV id set once so "Watched 10 MVs" can be counted. Kept out of the
  // module graph deliberately (see utils/badges.js), so the first pass may run
  // without it and this second pass fills in the MV-based badges.
  useEffect(() => {
    let cancelled = false;
    loadMvIds().then((ids) => {
      if (cancelled) return;
      mvIdsRef.current = ids;
      refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  // Re-run on comment / reaction / quiz writes.
  useEffect(() => onEngagementChange(refresh), [refresh]);

  const value = useMemo(
    () => ({
      earned: state.earned,
      earnedIds: Object.keys(state.earned),
      stats: state.stats,
      defs: BADGES,
      refresh,
    }),
    [state, refresh]
  );

  return <BadgeContext.Provider value={value}>{children}</BadgeContext.Provider>;
}

export default BadgeContext;
