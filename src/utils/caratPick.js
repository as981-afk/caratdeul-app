// "Carat Pick" — one highlighted title per calendar day.
//
// The pick depends only on the local calendar date and the size of the pool, so
// it is identical for everyone on the same day and changes at local midnight.
// Nothing user-specific (favourites, history) feeds into it on purpose.

import { dayKey } from "./time";

// FNV-1a, 32-bit. Small, dependency-free, and well spread — enough to make
// consecutive days land on unrelated pool entries.
export function hashString(str) {
  let hash = 2166136261;
  const value = String(str);
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// Index into a pool of `length` for the given day (-1 when the pool is empty).
export function dailyIndex(date, length) {
  if (!length) return -1;
  return hashString(dayKey(date)) % length;
}

// The entry picked for `date`. Returns null for an empty pool.
export function pickOfTheDay(entries, date = new Date()) {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  return entries[dailyIndex(date, entries.length)] ?? null;
}
