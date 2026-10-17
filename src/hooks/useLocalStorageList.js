import { useState, useCallback, useEffect, useMemo } from "react";
import { storageGet, storageSet, storageRemove } from "../utils/storage";

// Standard storage key layout: `${prefix}-${user}`. The separator is "-"
// everywhere — Continue Watching used ":" in older builds, so those keys are
// passed in as `legacyKey` and migrated below on first read (see App.jsx).
function resolveKey(prefix, user, separator) {
  return `${prefix}${separator}${user}`;
}

// Normalises the `legacyKey` option into a flat array of storage keys.
// Accepts: null | string | (user) => string | string[] | (user) => string[].
export function toLegacyList(legacyKeys, user) {
  if (!legacyKeys) return [];
  const resolved = typeof legacyKeys === "function" ? legacyKeys(user) : legacyKeys;
  const list = Array.isArray(resolved) ? resolved : [resolved];
  return list.filter(Boolean);
}

// Read a list from storage, applying the targeted default and migrating from
// legacy key(s) when the current key is not yet populated. Always returns a
// fresh instance (never the shared default object) so React state updates
// re-render. `legacyKeys` may be a string, a (user) => string function, or an
// array of either; they are tried in order and removed once migrated.
function loadStored(key, makeDefault, legacyKeys, user) {
  let raw = null;
  try { raw = storageGet(key); } catch { raw = null; }
  if (raw != null && raw !== "") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed != null) return parsed;
    } catch { /* fall through */ }
  }
  const candidates = toLegacyList(legacyKeys, user);
  for (const legacy of candidates) {
    if (!legacy) continue;
    let legacyRaw = null;
    try { legacyRaw = storageGet(legacy); } catch { legacyRaw = null; }
    if (legacyRaw == null || legacyRaw === "") continue;
    try {
      const parsed = JSON.parse(legacyRaw);
      if (parsed != null) {
        try { storageSet(key, JSON.stringify(parsed)); storageRemove(legacy); }
        catch { /* ignore */ }
        return parsed;
      }
    } catch { /* ignore */ }
  }
  return makeDefault();
}

// Read a raw (non-stateful) list for one-off writes such as progress timers.
export function loadList(key, fallback) {
  const makeDefault = typeof fallback === "function" ? fallback : () => fallback;
  return loadStored(key, makeDefault, null, null);
}

export function saveList(key, value) {
  try {
    storageSet(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// Generic per-user localStorage list hook.
//
// Returns [items, refresh, mutate] where:
//   - items   is the current list state for rendering.
//   - refresh re-reads storage into state.
//   - mutate  applies a mutator `(current) => next`, persists `next`, and
//             updates state in one synchronous pass. The mutator must be
//             pure: React may invoke it twice under StrictMode.
//
// State also re-reads whenever another tab writes the same key (the browser's
// `storage` event), so lists stay in sync across tabs.
//
// Options:
//   user      - owner of the data; combined with `key`/`separator` to form the
//               storage key.
//   key       - storage key prefix (no user).
//   separator - separator inserted between prefix and user (default "-").
//   value     - default value. Pass a function so each read gets a fresh
//               instance; wrap it in useCallback for stable identity if the
//               default is an object/array.
//   legacyKey - legacy key(s) to migrate from (string, (user) => string, or an
//               array of either). Migration happens once, when the current key
//               is empty.
export function useLocalStorageList({ user, key, separator = "-", value = () => [], legacyKey = null }) {
  const storageKey = useMemo(() => resolveKey(key, user, separator), [key, user, separator]);
  const makeDefault = useMemo(() => (typeof value === "function" ? value : () => value), [value]);
  const resolveLegacy = useMemo(() => (typeof legacyKey === "function" ? legacyKey : () => legacyKey), [legacyKey]);

  const read = useCallback(
    () => loadStored(storageKey, makeDefault, resolveLegacy, user),
    [storageKey, makeDefault, resolveLegacy, user]
  );

  const [items, setItems] = useState(read);

  const refresh = useCallback(() => setItems(read()), [read]);

  // Functional update: React passes the *current committed state* as `prev`, so
  // rapid successive toggles compose instead of racing against each other. The
  // mutator must be pure — React may invoke it twice under StrictMode — and
  // returning the same reference (`prev`) bails out without re-rendering.
  const mutate = useCallback(
    (mutator) => {
      setItems((prev) => {
        const next = mutator(prev);
        saveList(storageKey, next);
        return next;
      });
    },
    [storageKey]
  );

  // Cross-tab sync: the `storage` event only fires in *other* tabs, so this
  // never fights with our own writes. `key === null` means storage.clear().
  useEffect(() => {
    const watched = new Set([storageKey, ...toLegacyList(resolveLegacy, user)]);
    const onStorage = (e) => {
      if (e.key === null || watched.has(e.key)) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [storageKey, resolveLegacy, user, refresh]);

  // The Supabase sync layer just replaced this key with data pulled from the
  // server (same tab, so no `storage` event). Re-read it.
  useEffect(() => {
    const onApplied = (e) => {
      const keys = e.detail?.keys;
      if (!keys || keys.includes(storageKey)) refresh();
    };
    window.addEventListener("caratflix:sync-applied", onApplied);
    return () => window.removeEventListener("caratflix:sync-applied", onApplied);
  }, [storageKey, refresh]);

  return [items, refresh, mutate];
}
