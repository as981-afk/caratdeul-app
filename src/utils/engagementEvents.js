// Tiny pub/sub for engagement changes (a comment, reaction or quiz result was
// written). The badge engine listens for this so achievements unlock no matter
// which part of the UI produced the activity, without every writer needing a
// reference to the badge context.

export const ENGAGEMENT_EVENT = "caratflix:engagement";

export function notifyEngagement() {
  try {
    window.dispatchEvent(new Event(ENGAGEMENT_EVENT));
  } catch {
    /* no window (tests/SSR) — nothing to notify */
  }
}

export function onEngagementChange(handler) {
  window.addEventListener(ENGAGEMENT_EVENT, handler);
  return () => window.removeEventListener(ENGAGEMENT_EVENT, handler);
}
