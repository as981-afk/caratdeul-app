// Formatting + small DOM helpers shared across components.

// True when the user asked the OS to reduce motion. Shared by the smooth-scroll
// helper below and by components that animate their own scrolling.
export function prefersReducedMotion() {
  try {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch {
    return false;
  }
}

// `behavior: "smooth"` is skipped for users who asked for reduced motion.
function scrollBehavior() {
  return prefersReducedMotion() ? "auto" : "smooth";
}

export function scrollToId(id) {
  if (id == null) {
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
    return;
  }
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
}

// Scrolls to an element that may not be mounted yet — lazy rows mount behind a
// Suspense boundary, so a jump triggered from elsewhere on the page has to wait
// for the target to appear. Retries on animation frames (cheap, and it stops as
// soon as the element exists), then nudges once more for late layout.
export function scrollToIdWhenReady(id, { tries = 120 } = {}) {
  if (id == null) {
    scrollToId(null);
    return;
  }
  let attempts = 0;
  const attempt = () => {
    if (document.getElementById(id)) {
      scrollToId(id);
      if (attempts > 0) window.setTimeout(() => scrollToId(id), 280);
      return;
    }
    attempts += 1;
    if (attempts > tries) return;
    window.requestAnimationFrame(attempt);
  };
  attempt();
}

export function ytThumb(url) {
  const id = url?.match(/(?:v=|\.be\/)([^&?/]+)/)?.[1];
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}

export function ytId(url) {
  return url?.match(/(?:v=|\.be\/)([^&?/]+)/)?.[1] || null;
}

// Makes clickable non-button elements keyboard accessible (Enter / Space).
export function pressable(onClick) {
  return {
    role: "button",
    tabIndex: 0,
    onClick,
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick();
      }
    },
  };
}

export function timeAgo(ts) {
  if (!ts) return "";
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  return new Date(ts).toLocaleDateString();
}

export function formatJoinedAt(joinedAt) {
  if (!joinedAt) return null;
  const d = new Date(joinedAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}
