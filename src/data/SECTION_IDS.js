// Single source of truth for the page sections: App.jsx feeds this list to
// useScrollSpy, and Navbar.jsx derives its nav links from it, so the links and
// what scroll-spy tracks can never drift apart. Order matches page layout
// (scroll order): Members → My List → Nana Tour → Going Seventeen → Concerts →
// Side Tracks → MVs; every id must have a matching element id in the DOM.
export const SECTION_IDS = [
  "my-bias",
  "continue-watching",
  "recently-watched",
  "my-list",
  "nana-tour",
  "going-seventeen",
  "concerts",
  "side-tracks",
  "mvs",
];

// Human-readable display label for each section id. Keep this in sync with
// SECTION_IDS — every id needs an entry (Navbar falls back to the raw id if a
// label is ever missing).
export const SECTION_LABELS = {
  "mvs": "MVs",
  "nana-tour": "Nana Tour",
  "going-seventeen": "Going Seventeen",
  "concerts": "Concerts",
  "side-tracks": "Side Tracks",
  "my-list": "My List",
  "my-bias": "Members",
  "continue-watching": "Continue Watching",
  "recently-watched": "Recently Watched",
};
