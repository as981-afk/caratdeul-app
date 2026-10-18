// Badge / achievement catalogue.
//
// Each badge is declarative: a `metric` (a key in the stats object produced by
// utils/badges.js::computeStats) and a `goal` threshold. A badge unlocks when
// `stats[metric] >= goal`. `day-one` is the welcome badge: its metric is always
// 1, so a fresh profile earns it on first evaluation.
//
// `tier` only drives the colour treatment on the badge page.
export const BADGES = [
  {
    id: "day-one",
    name: "Day-1 Carat",
    desc: "You were here from the first chorus.",
    icon: "💎",
    tier: "bronze",
    metric: "joined",
    goal: 1,
  },
  {
    id: "first-watch",
    name: "First Step",
    desc: "Watch your first video.",
    icon: "▶",
    tier: "bronze",
    metric: "watched",
    goal: 1,
  },
  {
    id: "reactor",
    name: "Mood Ring",
    desc: "Drop your first reaction on the timeline.",
    icon: "🔥",
    tier: "bronze",
    metric: "reactions",
    goal: 1,
  },
  {
    id: "commenter",
    name: "Chit-Chat Carat",
    desc: "Leave your first comment.",
    icon: "💬",
    tier: "bronze",
    metric: "comments",
    goal: 1,
  },
  {
    id: "mv-10",
    name: "Watched 10 MVs",
    desc: "Ten music videos down. Certified.",
    icon: "🎬",
    tier: "silver",
    metric: "watchedMvs",
    goal: 10,
  },
  {
    id: "binge",
    name: "Binge Mode",
    desc: "Watch 20 videos from start to finish.",
    icon: "🍿",
    tier: "silver",
    metric: "watched",
    goal: 20,
  },
  {
    id: "collector",
    name: "List Collector",
    desc: "Save 10 items to My List.",
    icon: "▤",
    tier: "silver",
    metric: "list",
    goal: 10,
  },
  {
    id: "chatty",
    name: "Chatterbox",
    desc: "Post 5 comments across the catalogue.",
    icon: "🗨",
    tier: "silver",
    metric: "comments",
    goal: 5,
  },
  {
    id: "stan",
    name: "OT13 Stan",
    desc: "Pick all 13 members as biases.",
    icon: "♡",
    tier: "gold",
    metric: "biases",
    goal: 13,
  },
  {
    id: "quiz-master",
    name: "Quiz Master",
    desc: "Finish both CaratFlix quizzes.",
    icon: "🧠",
    tier: "gold",
    metric: "quizzes",
    goal: 2,
  },
  {
    id: "song-genius",
    name: "Song Genius",
    desc: "Ace the 'Guess the song' quiz.",
    icon: "🎵",
    tier: "gold",
    metric: "songPerfect",
    goal: 1,
  },
];

export const BADGE_TIERS = {
  bronze: { label: "Bronze", c1: "#d9a05b", c2: "#8a5a2a" },
  silver: { label: "Silver", c1: "#cfd6e4", c2: "#7d8698" },
  gold: { label: "Gold", c1: "#f2d17a", c2: "#b8862f" },
};

export function getBadge(id) {
  return BADGES.find((badge) => badge.id === id) || null;
}

export function badgeProgress(badge, stats) {
  const goal = badge.goal || 1;
  const value = Math.max(0, Math.min(goal, stats?.[badge.metric] || 0));
  return { value, goal, percent: Math.round((value / goal) * 100) };
}
