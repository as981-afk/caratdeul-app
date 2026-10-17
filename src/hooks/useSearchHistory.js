import { useCallback, useEffect, useState } from "react";
import { storageGet, storageSet } from "../utils/storage";

// Per-user recent-search suggestions, persisted so they survive reloads and
// sync across tabs (storage event).
const MAX_ITEMS = 8;

function historyKey(user) {
  return `caratflix-searches-${user}`;
}

function readHistory(user) {
  if (!user) return [];
  try {
    const parsed = JSON.parse(storageGet(historyKey(user)));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s) => typeof s === "string" && s.trim() !== "").slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function useSearchHistory(user) {
  const [history, setHistory] = useState(() => readHistory(user));

  const persist = useCallback(
    (next) => {
      setHistory(next);
      try { storageSet(historyKey(user), JSON.stringify(next)); } catch { /* ignore */ }
    },
    [user]
  );

  // Adds a term to the front of the list (case-insensitive dedupe).
  const record = useCallback(
    (term) => {
      const value = String(term || "").trim();
      if (value.length < 2) return;
      setHistory((prev) => {
        const next = [value, ...prev.filter((s) => s.toLowerCase() !== value.toLowerCase())].slice(0, MAX_ITEMS);
        try { storageSet(historyKey(user), JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    },
    [user]
  );

  const remove = useCallback(
    (term) => {
      persist(history.filter((s) => s !== term));
    },
    [history, persist]
  );

  const clear = useCallback(() => persist([]), [persist]);

  // Cross-tab sync.
  useEffect(() => {
    const key = historyKey(user);
    const onStorage = (e) => {
      if (e.key === null || e.key === key) setHistory(readHistory(user));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [user]);

  return { history, record, remove, clear };
}

export default useSearchHistory;
