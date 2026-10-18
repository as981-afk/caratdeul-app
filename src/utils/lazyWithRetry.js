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
//   2. resets its inner `React.lazy` when the import finally rejects, so the
//      next mount genuinely re-imports the chunk instead of replaying the
//      cached rejection.
//
// IMPORTANT — the inner `React.lazy` is created in a closure variable, *not* in
// `useState`/`useRef`/`useMemo`. A component that suspends during its own first
// render never commits, so a hook initializer runs again on every retry: each
// retry built a brand-new, still-pending `React.lazy`, the suspense promise was
// thrown again, and the boundary stayed on its fallback forever. That is the
// "every row is a skeleton, nothing loads, no console errors" bug. A closure
// variable is created once per `lazyWithRetry()` call and survives suspension,
// so the lazy resolves normally.

import { createElement, lazy } from "react";

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
  const startedAt = Date.now();
  for (let attempt = 0; ; attempt += 1) {
    try {
      const module = await load();
      console.log(
        `[CaratFlix] lazy chunk loaded (attempt ${attempt + 1}, ${Date.now() - startedAt}ms)`
      );
      return module;
    } catch (error) {
      const transient = isTransientLoadError(error);
      const last = attempt >= delays.length || !transient;
      console.error(
        `[CaratFlix] lazy chunk import failed (attempt ${attempt + 1}${last ? ", giving up" : ", retrying"}):`,
        error
      );
      if (last) throw error;
      await delay(delays[attempt]);
    } finally {
      // Runs on every outcome, so the terminal/console always shows that the
      // fetch attempt settled (this is the line that proves a skeleton is not
      // just a stuck loading state).
      console.log(
        `[CaratFlix] lazy import attempt ${attempt + 1} settled after ${Date.now() - startedAt}ms`
      );
    }
  }
}

export function lazyWithRetry(load, delays = RETRY_DELAYS) {
  // One inner lazy per `lazyWithRetry()` call (i.e. per import site), created
  // on first render from a closure — see the note at the top of this file for
  // why it must NOT live in React state. Reset it when the import rejects so a
  // later mount starts over instead of replaying the cached rejection.
  let inner = null;
  function LazyWithRetry(props) {
    if (!inner) {
      inner = lazy(() =>
        loadWithRetry(load, delays).catch((error) => {
          inner = null;
          throw error;
        })
      );
    }
    return createElement(inner, props);
  }

  LazyWithRetry.displayName = "LazyWithRetry";
  return LazyWithRetry;
}

export default lazyWithRetry;
