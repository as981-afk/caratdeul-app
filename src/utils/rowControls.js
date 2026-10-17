// Shared sort/filter helpers for content rows.
//
// Rows keep their control state locally and pass it here so every row sorts
// and filters the same way:  group (member/album/type) -> watch status ->
// order.

import { ytId } from "./format.js";

// Stable identity for a row item, matching how favorites key their videos.
export function videoKeyFor(item) {
  return ytId(item.url) || item.url || item.title;
}

// Distinct values of `groupKey` (e.g. `sub` for MVs, `album` for tracks),
// sorted for a stable dropdown order. Empty when no group key is given.
export function groupValues(items, groupKey) {
  if (!groupKey) return [];
  const seen = new Set();
  for (const item of items) {
    const value = item?.[groupKey];
    if (value != null && value !== "") seen.add(String(value));
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

function yearOf(item) {
  const match = String(item?.year ?? "").match(/\d{4}/);
  return match ? Number(match[0]) : 0;
}

// items  - source array (never mutated)
// opts   - { sort, status, groupKey, group, isWatched }
//   sort   "default" | "title" | "year-desc" | "year-asc"
//   status "all" | "watched" | "unwatched"
//   group  value of `groupKey` to keep, or "all"
export function applyRowControls(items, opts = {}) {
  const { sort = "default", status = "all", groupKey = null, group = "all", isWatched } = opts;

  let list = items;

  if (groupKey && group !== "all") {
    list = list.filter((item) => String(item?.[groupKey] ?? "") === group);
  }

  if (status !== "all" && typeof isWatched === "function") {
    list = list.filter((item) => {
      const watched = isWatched(videoKeyFor(item));
      return status === "watched" ? watched : !watched;
    });
  }

  if (sort === "title") {
    list = [...list].sort((a, b) =>
      String(a?.title ?? a?.name ?? "").localeCompare(String(b?.title ?? b?.name ?? ""), undefined, { sensitivity: "base" })
    );
  } else if (sort === "year-desc" || sort === "year-asc") {
    const dir = sort === "year-desc" ? -1 : 1;
    // Undated items sink to the end; `.slice()` keeps the sort stable enough
    // for equal years to preserve catalogue order.
    list = [...list].sort((a, b) => {
      const ya = yearOf(a);
      const yb = yearOf(b);
      if (!ya && !yb) return 0;
      if (!ya) return 1;
      if (!yb) return -1;
      return (ya - yb) * dir;
    });
  }

  return list;
}
