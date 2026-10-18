// Badge engine: derive a profile's stats from local storage, then unlock any
// achievements whose threshold has been met.
//
// Stats are recomputed from storage (not React state) so the engine is
// independent of which component happens to hold the latest list in memory —
// it is re-run on mount, whenever the caller's refresh token changes, and on
// every engagement event (see utils/engagementEvents.js).

import { BADGES } from "../data/BADGES";
import { loadList, saveList } from "../hooks/useLocalStorageList";
import { CW_KEY, RECENT_KEY, FAV_KEY } from "./watchHistory";
import { loadWatched } from "./watched";
import { loadComments, countComments } from "./comments";
import { loadReactions, countReactions } from "./reactions";
import { loadQuizResults } from "./quizStore";
import { ytId } from "./format";

export const BADGES_KEY = "caratflix-badges";

export function badgesKeyFor(profileId) {
  return `${BADGES_KEY}-${profileId}`;
}

export function loadEarnedBadges(profileId) {
  if (!profileId) return {};
  const value = loadList(badgesKeyFor(profileId), () => ({}));
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function saveEarnedBadges(profileId, earned) {
  if (!profileId) return;
  saveList(badgesKeyFor(profileId), earned);
}

// The MV catalogue is loaded on demand (not imported at module scope) so this
// eager module does not drag the whole MVS dataset into the startup bundle —
// the same reason utils/surprise.js imports it dynamically.
const EMPTY_IDS = new Set();
let mvIdsCache = null;

export async function loadMvIds() {
  if (mvIdsCache) return mvIdsCache;
  try {
    const { MVS } = await import("../data/MVS");
    mvIdsCache = new Set(MVS.map((mv) => ytId(mv.url)).filter(Boolean));
  } catch {
    mvIdsCache = EMPTY_IDS;
  }
  return mvIdsCache;
}

const EMPTY_STATS = {
  joined: 0, watched: 0, watchedMvs: 0, history: 0, continueWatching: 0,
  list: 0, biases: 0, comments: 0, reactions: 0, quizzes: 0, songPerfect: 0,
};

export function computeStats(profileId, profile, mvIds = EMPTY_IDS) {
  if (!profileId) return { ...EMPTY_STATS };

  // A default parameter only covers `undefined`, but the badge provider passes
  // the MV-id ref's initial `null` for its first pass (data/MVS loads async), so
  // normalise here rather than trusting every caller to pass a Set.
  const ids = mvIds instanceof Set ? mvIds : EMPTY_IDS;

  const watched = loadWatched(profileId);
  let watchedCount = 0;
  let watchedMvs = 0;
  for (const [id, rec] of Object.entries(watched)) {
    if (rec?.watched !== true) continue;
    watchedCount += 1;
    if (ids.has(id)) watchedMvs += 1;
  }

  const favs = loadList(`${FAV_KEY}-${profileId}`, () => ({ videos: [], members: [] }));
  const cw = loadList(`${CW_KEY}-${profileId}`, () => []);
  const recent = loadList(`${RECENT_KEY}-${profileId}`, () => []);
  const quizzes = loadQuizResults(profileId);
  const song = quizzes.song;

  return {
    // The welcome badge: a profile always exists by the time this runs.
    joined: profile ? 1 : 0,
    watched: watchedCount,
    watchedMvs,
    history: Array.isArray(recent) ? recent.length : 0,
    continueWatching: Array.isArray(cw) ? cw.length : 0,
    list: (favs?.videos?.length || 0) + (favs?.members?.length || 0),
    biases: Array.isArray(favs?.members) ? favs.members.length : 0,
    comments: countComments(loadComments(profileId)),
    reactions: countReactions(loadReactions(profileId)),
    quizzes: Object.keys(quizzes).length,
    songPerfect: song && song.total > 0 && song.score === song.total ? 1 : 0,
  };
}

// Returns { earned, stats, newly } after persisting any freshly-unlocked
// badges. `newly` is the list of badge definitions unlocked by this call
// (usually []) — the caller shows a toast for each.
export function evaluateBadges(profileId, profile, mvIds) {
  const earned = loadEarnedBadges(profileId);
  const stats = computeStats(profileId, profile, mvIds);
  const newly = [];
  const next = { ...earned };

  for (const badge of BADGES) {
    if (next[badge.id]) continue;
    const value = stats[badge.metric] || 0;
    if (value >= (badge.goal || 1)) {
      next[badge.id] = Date.now();
      newly.push(badge);
    }
  }

  if (newly.length) saveEarnedBadges(profileId, next);
  return { earned: next, stats, newly };
}
