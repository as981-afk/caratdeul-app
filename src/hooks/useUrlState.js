import { useCallback, useEffect, useState } from "react";

// Keys this app mirrors onto the URL. Search filters + the members "route" all
// live in the query string so a view is shareable and survives a reload.
//
// The choreography filters are deliberately separate (`ch*`) from the search
// filters above them: writing `type=practice` would otherwise switch the whole
// page into the search takeover, since App treats an active search filter as a
// search view.
export const URL_KEYS = ["q", "member", "unit", "type", "year", "view", "id", "chtype", "chmember", "chera", "chsort"];

export function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  const state = {};
  for (const key of URL_KEYS) state[key] = params.get(key) || "";
  return state;
}

// Minimal replacement for react-router's search-param hook. The app has no
// router, so this keeps a plain object in sync with `window.location.search`
// using `replaceState` (no history spam while typing) and re-reads on back /
// forward via `popstate`.
export function useUrlState() {
  const [state, setState] = useState(readUrlState);

  const update = useCallback((patch) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      const url = new URL(window.location.href);
      for (const key of URL_KEYS) {
        const value = String(next[key] ?? "").trim();
        if (value) url.searchParams.set(key, value);
        else url.searchParams.delete(key);
      }
      window.history.replaceState(null, "", url);
      return next;
    });
  }, []);

  useEffect(() => {
    const onPop = () => setState(readUrlState());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return [state, update];
}
