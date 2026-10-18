// A drop-in replacement for React.lazy that survives transient chunk-load
// failures.
//
// `React.lazy` caches a rejected dynamic import forever: once the factory
// rejects, every later render throws the same cached error. That is exactly
// what makes a brief hiccup — a dev-server restart, a flaky network, a redeploy
// that rotated the hashed chunk names — look permanent, and why the
// ErrorBoundary's "Try again" just replays the old rejection instead of trying
// again. See the crash log this was added for: `Failed to fetch dynamically
// imported module: …/MembersPage.jsx` after `[vite] server connection lost`.
//
// `lazyWithRetry` instead:
//   1. retries the import a few times with backoff when the failure looks
//      transient, so a short blip never reaches the user at all, and
//   2. gives every mount its own `React.lazy`, so the ErrorBoundary's "Try
//      again" (which remounts the subtree via a new `key`) genuinely re-imports
//      the chunk instead of replaying the cached rejection.
//
// It renders an inner `React.lazy` rather than throwing the promise itself, so
// React keeps its normal suspension/error semantics — a rejected lazy re-throws
// its error to the ErrorBoundary, whereas a hand-rolled "throw the promise"
// component makes React retry the suspension forever.

import { createElement, lazy, useState } from "react";

// Backoff between attempts of a single import. Deliberately short — long enough
// to ride out a dev-server restart, short enough that a genuine failure still
// surfaces quickly.
export const RETRY_DELAYS = [300, 900, 2500];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// True for the errors that mean "the chunk could not be fetched right now" and
// are worth retrying, across browsers and Vite's dev/build pipelines. A module
// that genuinely throws during evaluation is *not* transient and is re-thrown
// on the first attempt.
export function isTransientLoadError(error) {
  if (!error) return false;
  if (error.name === "ChunkLoadError") return true;
  const message = String(error.message || error);
  return (
    /failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /importing a module script failed/i.test(message) ||
    /failed to fetch/i.test(message) ||
    /networkerror/i.test(message) ||
    /load failed/i.test(message)
  );
}

// Runs `load`, retrying with backoff while the failure is transient.
export async function loadWithRetry(load, delays = RETRY_DELAYS) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await load();
    } catch (error) {
      if (attempt >= delays.length || !isTransientLoadError(error)) throw error;
      await delay(delays[attempt]);
    }
  }
}

export function lazyWithRetry(load, delays = RETRY_DELAYS) {
  function LazyWithRetry(props) {
    // One inner lazy per mount. A remount (ErrorBoundary "Try again") creates a
    // new inner lazy, so the chunk is genuinely re-imported instead of replaying
    // React.lazy's cached rejection.
    const [inner] = useState(() => lazy(() => loadWithRetry(load, delays)));
    return createElement(inner, props);
  }

  LazyWithRetry.displayName = "LazyWithRetry";
  return LazyWithRetry;
}

export default lazyWithRetry;
