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

// Video id from every url shape the catalogues use: `watch?v=`, `youtu.be/`,
// `/live/`, `/embed/` and `/shorts/`. A playlist url carries only a list id, so
// it deliberately resolves to null: a playlist cannot be played in the
// single-video embed, so those entries degrade (gradient + badge + link) instead
// of opening a player that can never load.
const YT_ID_RE = /(?:v=|\/live\/|\/embed\/|\/shorts\/|\.be\/)([^&?/]+)/;

export function ytId(url) {
  return url?.match(YT_ID_RE)?.[1] || null;
}

// A playlist-only url: a real, openable YouTube link that the single-video
// embed can never play. It is not "unavailable" — it simply has no in-app
// player — so its card keeps its click and opens the modal's "Open on YouTube"
// fallback rather than losing the interaction.
const YT_LIST_RE = /[?&]list=/;

export function isPlaylistOnly(url) {
  return !ytId(url) && YT_LIST_RE.test(url || "");
}

// YouTube publishes a fixed ladder of stills for every video. Painting cards
// from one hard-coded size is what makes thumbnails feel slow: the browser
// downloads the same image at the same moment as every other card, with no way
// to pick a smaller rung for a smaller slot. These are the real pixel widths, so
// a `srcset` can let the browser choose per slot and DPR.
//
//   default 120w · mqdefault 320w · hqdefault 480w · sddefault 640w
//   maxresdefault 1280w
//
// The first two always exist and are 16:9 (no letterbox bars). `hqdefault` is
// 4:3, and `sddefault`/`maxresdefault` are missing for some older uploads — so
// only the two safe rungs are advertised on a card, and the wider rungs are used
// only where the synced JSON proves the still exists.
const YT_THUMB_WIDTH = {
  default: 120,
  mqdefault: 320,
  hqdefault: 480,
  sddefault: 640,
  maxresdefault: 1280,
};

// The rungs a card can always ask for without risking a 404 (which would show as
// a broken image). Shared with CardThumb.
export const YT_CARD_SIZES = ["default", "mqdefault"];

function ytThumbBase(format) {
  return format === "jpeg"
    ? { dir: "vi", ext: "jpg" }
    : { dir: "vi_webp", ext: "webp" };
}

// One rung of the ladder, as WebP by default. WebP is a clear win at the large
// sizes (a maxres still drops from ~270 kB to ~150 kB); at card size the two
// formats are within a few hundred bytes of each other, so the srcset and the
// lazy loading are the levers there, not the format.
export function ytThumb(url, { size = "mqdefault", format = "webp" } = {}) {
  const id = ytId(url);
  if (!id) return null;
  const { dir, ext } = ytThumbBase(format);
  return `https://i.ytimg.com/${dir}/${id}/${size}.${ext}`;
}

// A `srcset` across `sizes`, so the browser downloads only the rung the slot
// actually needs. Defaults to the two rungs that exist for every video.
export function ytThumbSrcSet(url, { sizes = YT_CARD_SIZES, format = "webp" } = {}) {
  const id = ytId(url);
  if (!id) return null;
  const { dir, ext } = ytThumbBase(format);
  return sizes
    .map((size) => `https://i.ytimg.com/${dir}/${id}/${size}.${ext} ${YT_THUMB_WIDTH[size]}w`)
    .join(", ");
}

// Makes clickable non-button elements keyboard accessible (Enter / Space).
//
// A card that has nothing to play is marked by CardThumb with
// `data-unavailable` (no artwork = no playable video: a deleted id, an
// unparseable url, or a playlist that the single-video embed cannot open). Those
// cards keep their badge and their gradient but lose the click, so they can
// never open a player that shows nothing but YouTube's black "Video unavailable"
// panel. `aria-disabled` is honoured the same way for callers that set it.
export function pressable(onClick) {
  const run = (el) => {
    if (el?.getAttribute?.("aria-disabled") === "true") return;
    if (el?.querySelector?.('[data-unavailable="1"]')) return;
    onClick();
  };
  return {
    role: "button",
    tabIndex: 0,
    onClick: (e) => run(e.currentTarget),
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        run(e.currentTarget);
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
