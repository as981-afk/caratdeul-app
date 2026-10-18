// Community streaming-goal tracker.
//
// ── DEMO DATA ────────────────────────────────────────────────────────────────
// The `current` values below are fabricated sample numbers so the progress bars
// have something to show. Nothing is fetched or reported anywhere — CaratFlix
// has no backend. The goals page labels the whole section "Demo data" so this is
// never mistaken for a real fandom counter.
// ─────────────────────────────────────────────────────────────────────────────
//
// `metric` on the personal goals maps to a key in the stats object built by
// utils/badges.js::computeStats, so personal progress is derived from the
// profile's real local activity (even though the community totals are demo).

export const COMMUNITY_GOALS = [
  {
    id: "thunder-streams",
    emoji: "⚡",
    title: "Stream 'THUNDER' to 200M",
    subtitle: "10th-anniversary title track",
    current: 142_300_000,
    target: 200_000_000,
    unit: "streams",
    deadline: "2026-12-31",
  },
  {
    id: "anniversary-chant",
    emoji: "📣",
    title: "Anniversary fan-chant",
    subtitle: "HAPPY BURSTDAY chorus, all together",
    current: 8_420,
    target: 10_000,
    unit: "Carats",
    deadline: "2026-11-15",
  },
  {
    id: "gose-marathon",
    emoji: "🎬",
    title: "Going Seventeen marathon",
    subtitle: "Every episode, every Carat",
    current: 61,
    target: 100,
    unit: "episodes",
    deadline: "2026-10-31",
  },
  {
    id: "fanart-wall",
    emoji: "🎨",
    title: "Carat fan-art wall",
    subtitle: "Draw your bias, fill the wall",
    current: 3_240,
    target: 5_000,
    unit: "drawings",
    deadline: "2026-12-01",
  },
];

export const PERSONAL_GOALS = [
  { id: "p-watch", emoji: "▶", title: "Watch 20 videos", metric: "watched", goal: 20 },
  { id: "p-mv", emoji: "🎬", title: "Finish 10 MVs", metric: "watchedMvs", goal: 10 },
  { id: "p-list", emoji: "▤", title: "Save 10 to My List", metric: "list", goal: 10 },
  { id: "p-quiz", emoji: "🧠", title: "Complete both quizzes", metric: "quizzes", goal: 2 },
];

// Whole-number percentage of a goal, clamped to 0–100.
export function goalPercent(current, target) {
  if (!target) return 0;
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}

// Compact label for large demo counters, e.g. 142_300_000 -> "142.3M".
export function formatCount(value) {
  const n = Number(value) || 0;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
