import { memo } from "react";

// Thin progress indicator layered over a card thumbnail.
// `progress` is 0–100; `watched` renders the completion tick.
export function CardProgress({ progress = 0, watched = false }) {
  if (!progress && !watched) return null;
  return (
    <>
      <div className="card-progress" aria-hidden="true">
        <div className="card-progress-fill" style={{ width: `${Math.max(progress, watched ? 100 : 0)}%` }} />
      </div>
      {watched && (
        <span className="card-watched" title="Watched">
          <span aria-hidden="true">✓</span>
          <span className="sr-only">Watched</span>
        </span>
      )}
    </>
  );
}

export default memo(CardProgress);
