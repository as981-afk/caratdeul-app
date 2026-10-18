import { memo } from "react";

// Sort/filter controls shown on the right of a row header.
// Kept out of the (clickable) row title so nested controls stay accessible.
export function RowControls({
  sort = "default",
  onSortChange,
  status = "all",
  onStatusChange,
  group = "all",
  onGroupChange,
  groupLabel = "Filter",
  groupOptions = [],
}) {
  return (
    <div className="row-controls" onClick={(e) => e.stopPropagation()}>
      {groupOptions.length > 1 && (
        <label className="row-control">
          <span className="sr-only">{groupLabel}</span>
          <select value={group} onChange={(e) => onGroupChange(e.target.value)} aria-label={`${groupLabel} (this row)`}>
            <option value="all">{groupLabel}: All</option>
            {groupOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="row-control">
        <span className="sr-only">Sort this row</span>
        <select value={sort} onChange={(e) => onSortChange(e.target.value)} aria-label="Sort this row">
          <option value="default">Sort: Default</option>
          <option value="title">Sort: Title A–Z</option>
          <option value="year-desc">Sort: Newest</option>
          <option value="year-asc">Sort: Oldest</option>
        </select>
      </label>
      <label className="row-control">
        <span className="sr-only">Filter this row by watch status</span>
        <select value={status} onChange={(e) => onStatusChange(e.target.value)} aria-label="Filter this row by watch status">
          <option value="all">Show: All</option>
          <option value="unwatched">Show: Unwatched</option>
          <option value="watched">Show: Watched</option>
        </select>
      </label>
    </div>
  );
}

export default memo(RowControls);
