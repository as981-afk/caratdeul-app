import { memo, useEffect, useMemo, useState } from "react";
import ContentCard from "./ContentCard";
import EntryModal from "./EntryModal";
import { contentCatalog } from "../utils/content";
import "./rows.css";
import "./ContentCard.css";

// Full-page index of the whole catalogue: every music video, Going Seventeen
// episode, Nana Tour episode, concert, side track and choreography clip in one
// grid, with a title filter. Unlike search this is a view of its own
// (`?view=browse`), so it can be linked to and reloaded.
//
// The filter is local state on purpose: it is a scratchpad for this visit, not
// part of a shareable view (unlike the choreography page's filters).
export function BrowseVideosPage({ onClose, onWatchEnd }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(null);

  const all = useMemo(() => contentCatalog(), []);

  // Title-only, case-insensitive. A new array identity whenever the query
  // changes, which is what the scroll effect below watches.
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return all;
    return all.filter((entry) => String(entry.item?.title || "").toLowerCase().includes(needle));
  }, [all, query]);

  // Back to the top whenever the visible list changes. The timeout defers the
  // scroll into a fresh task so the browser has already laid out (and painted)
  // the shorter grid — scrolling from inside the effect would start the glide
  // against the old, taller page. Cancelled on the next keystroke so a fast
  // typist only ever gets the last glide.
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const id = setTimeout(() => window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }), 0);
    return () => clearTimeout(id);
  }, [filtered]);

  const filtering = query.trim().length > 0;

  return (
    <div className="browse-page" id="browse-videos">
      <div className="browse-page-bar">
        <button type="button" className="browse-page-back" onClick={onClose}>
          ← Back to browse
        </button>
      </div>

      <h2 className="browse-page-title">Browse all videos ({all.length})</h2>

      <div className="browse-filters">
        <div className="browse-filter">
          <label className="browse-filter-label" htmlFor="browse-title-filter">
            Filter by title
          </label>
          <span className="browse-field">
            <input
              id="browse-title-filter"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a title…"
              autoComplete="off"
            />
            {filtering && (
              <button
                type="button"
                className="browse-field-clear"
                onClick={() => setQuery("")}
                aria-label="Clear the title filter"
              >
                ✕
              </button>
            )}
          </span>
        </div>
        <span className="browse-match-count" role="status" aria-live="polite">
          {filtering ? `${filtered.length} matching ${filtered.length === 1 ? "video" : "videos"}` : ""}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="browse-empty">
          <p className="browse-empty-title">No videos match "{query.trim()}".</p>
          <p className="browse-empty-hint">The filter looks at titles only — try a shorter word.</p>
          <button type="button" className="browse-empty-btn" onClick={() => setQuery("")}>
            Clear search
          </button>
        </div>
      ) : (
        <div className="card-grid">
          {/* No catalogue item outside choreography carries an `id`, so the
              position in the (order-preserving) filtered list is the key. */}
          {filtered.map((entry, i) => (
            <ContentCard key={`${entry.type}-${i}`} entry={entry} onOpen={setActive} />
          ))}
        </div>
      )}

      <EntryModal entry={active} onClose={() => setActive(null)} onWatchEnd={onWatchEnd} />
    </div>
  );
}

export default memo(BrowseVideosPage);
