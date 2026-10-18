import { useCallback, useEffect, useState } from "react";
import { storageGet, storageSet } from "../utils/storage";

// Persisted single JSON value (not per-user), for lightweight preferences like
// the lyrics language toggles. Same resilience as useLocalStorageList: falls
// back through the storage layers and re-reads when another tab writes the key.
//
// `defaultValue` should be a module-level constant (or otherwise stable) — it is
// part of the read callback's identity.
export function useStoredValue(key, defaultValue) {
  const read = useCallback(() => {
    try {
      const raw = storageGet(key);
      if (raw == null || raw === "") return defaultValue;
      const parsed = JSON.parse(raw);
      return parsed == null ? defaultValue : parsed;
    } catch {
      return defaultValue;
    }
  }, [key, defaultValue]);

  const [value, setValue] = useState(read);

  const update = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        try {
          storageSet(key, JSON.stringify(resolved));
        } catch {
          /* storage unavailable — keep the in-memory value */
        }
        return resolved;
      });
    },
    [key]
  );

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === null || e.key === key) setValue(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key, read]);

  return [value, update];
}
