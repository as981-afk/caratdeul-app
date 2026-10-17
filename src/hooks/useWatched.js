import { useCallback, useEffect, useMemo, useState } from "react";
import { loadWatched, markVideoWatched, forgetVideo, watchedKeyFor } from "../utils/watched";

// Watch-progress state shared through SessionContext so every thumbnail can
// render its progress bar and "watched" tick.
//
// The in-modal timers write straight to storage (see saveVideoProgress) to
// avoid re-rendering the page every few seconds; this hook re-reads on
// `onWatchEnd`, on explicit mark/unmark, and whenever another tab changes the
// same key (storage event).
export function useWatched(user) {
  const read = useCallback(() => loadWatched(user), [user]);
  const [watched, setWatched] = useState(read);

  const refreshWatched = useCallback(() => setWatched(read()), [read]);

  const markWatched = useCallback(
    (videoId, meta) => {
      setWatched(markVideoWatched(user, videoId, meta) || {});
    },
    [user]
  );

  const unmarkWatched = useCallback((videoId) => {
    setWatched(forgetVideo(user, videoId) || {});
  }, [user]);

  useEffect(() => {
    const key = watchedKeyFor(user);
    const onStorage = (e) => {
      if (e.key === null || e.key === key) refreshWatched();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [user, refreshWatched]);

  const api = useMemo(() => {
    const progressFor = (videoId) => {
      const rec = watched[videoId];
      if (!rec) return 0;
      if (rec.watched) return 100;
      return typeof rec.progress === "number" ? rec.progress : 0;
    };
    const isWatched = (videoId) => watched[videoId]?.watched === true;
    return { watched, refreshWatched, markWatched, unmarkWatched, progressFor, isWatched };
  }, [watched, refreshWatched, markWatched, unmarkWatched]);

  return api;
}

export default useWatched;
