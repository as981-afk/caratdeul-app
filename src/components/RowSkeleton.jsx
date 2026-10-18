import { memo } from "react";
import "./RowSkeleton.css";

// Placeholder shown while a lazy row chunk downloads. Keeps the page layout
// stable (same header + card strip geometry as a real row) instead of popping
// content in when it arrives.
export function RowSkeleton({ id, title = "Loading", cards = 5 }) {
  return (
    <div className="row row-skeleton" id={id} role="status" aria-label={`Loading ${title}`}>
      <div className="row-head">
        <div className="row-title row-skeleton-title">
          <span className="skeleton-block">{title}</span>
        </div>
      </div>
      <div className="row-scroll">
        {Array.from({ length: cards }, (_, i) => (
          <div className="skeleton-card" key={i} />
        ))}
      </div>
      <span className="sr-only">Loading {title}…</span>
    </div>
  );
}

export default memo(RowSkeleton);
