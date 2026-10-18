// Per-user "watched" store: videoId -> { progress, watched, updatedAt, ...meta }.
//
// Progress/watch state is separate from Continue Watching (which is a queue of
// unfinished videos) so a card can show a progress bar and a "watched" tick no
// matter how the video was opened. Records also keep enough metadata (title,
// url, colours) to render without the source data.

import { loadList, saveList } from "../hooks/useLocalStorageList";

const WATCHED_KEY = "caratflix-watched";

export function watchedKeyFor(user) {
  return `${WATCHED_KEY}-${user}`;
}

export function loadWatched(user) {
  if (!user) return {};
  const map = loadList(watchedKeyFor(user), () => ({}));
  return map && typeof map === "object" && !Array.isArray(map) ? map : {};
}

function write(user, updater) {
  if (!user) return {};
  const map = loadWatched(user);
  const next = updater(map) || map;
  saveList(watchedKeyFor(user), next);
  return next;
}

// Storage-only write used by the in-modal watch timers: cheap, no React state.
export function saveVideoProgress(user, videoId, progress, meta = {}) {
  if (!user || !videoId) return;
  write(user, (map) => {
    const prev = map[videoId] || {};
    const clamped = Math.max(0, Math.min(100, Math.round(progress)));
    return {
      ...map,
      [videoId]: {
        ...prev,
        ...meta,
        videoId,
        progress: clamped,
        // "watched" is sticky: reaching 100% marks it, and it only clears
        // when the user explicitly marks it unwatched.
        watched: prev.watched === true || clamped >= 100,
        updatedAt: Date.now(),
      },
    };
  });
}

export function setWatchedFlag(user, videoId, watched) {
  if (!user || !videoId) return {};
  return write(user, (map) => {
    const prev = map[videoId] || {};
    return {
      ...map,
      [videoId]: {
        ...prev,
        videoId,
        watched: !!watched,
        progress: watched ? 100 : 0,
        updatedAt: Date.now(),
      },
    };
  });
}

// Marks a video as watched in one pass, keeping any metadata (title, url,
// colours) so the record can be rendered without the source data list.
export function markVideoWatched(user, videoId, meta = {}) {
  if (!user || !videoId) return {};
  return write(user, (map) => ({
    ...map,
    [videoId]: {
      ...(map[videoId] || {}),
      ...meta,
      videoId,
      watched: true,
      progress: 100,
      updatedAt: Date.now(),
    },
  }));
}

export function forgetVideo(user, videoId) {
  if (!user || !videoId) return {};
  return write(user, (map) => {
    if (!(videoId in map)) return map;
    const next = { ...map };
    delete next[videoId];
    return next;
  });
}

export function replaceWatched(user, map) {
  if (!user) return {};
  const clean = map && typeof map === "object" && !Array.isArray(map) ? map : {};
  saveList(watchedKeyFor(user), clean);
  return clean;
}
