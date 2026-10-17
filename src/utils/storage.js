// Resilient browser storage.
//
// Tries localStorage first, then sessionStorage, then an in-memory map. Some
// browsers (private mode, sandboxed preview iframes, strict privacy settings)
// throw on localStorage access; this keeps reads/writes working so saves still
// take effect for the session instead of failing. Data persists across reloads
// wherever the browser allows storage at all.
//
// IMPORTANT: When localStorage is unavailable, data only lives in
// sessionStorage (tab-scoped) or an in-memory Map (page-load-scoped).
// Favorites, watch history, and profiles will NOT survive a page reload or
// new tab. A one-time console warning is shown so developers and users know.

const memory = new Map();

try {
  const testKey = "__caratflix storage test__";
  localStorage.setItem(testKey, "1");
  localStorage.removeItem(testKey);
} catch {
  console.warn(
    "[CaratFlix] localStorage is unavailable in this browser context. " +
    "Per-user data (favorites, watch history, profiles) will not persist " +
    "across page reloads. If you are in private/incognito mode, try a " +
    "regular browser window."
  );
}

export function storageGet(key) {
  try {
    const value = localStorage.getItem(key);
    if (value != null) return value;
  } catch { /* blocked */ }
  try {
    const value = sessionStorage.getItem(key);
    if (value != null) return value;
  } catch { /* blocked */ }
  return memory.get(key) ?? null;
}

export function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return;
  } catch { /* blocked */ }
  try {
    sessionStorage.setItem(key, value);
    return;
  } catch { /* blocked */ }
  memory.set(key, value);
}

export function storageRemove(key) {
  try { localStorage.removeItem(key); } catch { /* blocked */ }
  try { sessionStorage.removeItem(key); } catch { /* blocked */ }
  memory.delete(key);
}