import { memo, useMemo, useState } from "react";
import ContentCard from "./ContentCard";
import EntryModal from "./EntryModal";
import { CHOREOGRAPHY } from "../data/CHOREOGRAPHY";
import { CHOREO_TYPE_OPTIONS, choreoTypeLabel } from "../utils/choreography";
import { ERAS } from "../data/ERAS";
import { MEMBERS } from "../data/MEMBERS";
import { memberId } from "../utils/memberMatch";
import { contentCatalog } from "../utils/content";
import "./rows.css";

// Sort keys used by the URL (`chsort`); newest is the default when unset.
const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "song", label: "Song A–Z" },
];

const TYPE_CHIPS = [{ value: "", label: "All" }, ...CHOREO_TYPE_OPTIONS];

const chipId = (value) => `choreo-type-${value || "all"}`;

// Single-select type chips. Radio-group semantics with a roving tab stop so the
// whole row costs one Tab stop and the arrows move between kinds.
function TypeChips({ value, onChange }) {
  const index = Math.max(
    TYPE_CHIPS.findIndex((chip) => chip.value === value),
    0
  );

  const onKeyDown = (e) => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    let next = index;
    if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TYPE_CHIPS.length - 1;
    else next = (index + (e.key === "ArrowRight" ? 1 : -1) + TYPE_CHIPS.length) % TYPE_CHIPS.length;
    onChange(TYPE_CHIPS[next].value);
    document.getElementById(chipId(TYPE_CHIPS[next].value))?.focus();
  };

  return (
    <div className="choreo-chips" role="radiogroup" aria-label="Clip type">
      {TYPE_CHIPS.map((chip) => {
        const checked = chip.value === value;
        return (
          <button
            key={chip.value || "all"}
            id={chipId(chip.value)}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            className={`choreo-chip${checked ? " choreo-chip--on" : ""}`}
            onClick={() => onChange(chip.value)}
            onKeyDown={onKeyDown}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}

// Full-page choreography index: every dance practice / dance version /
// performance clip / fancam in one grid, with type, member, era and sort
// filters. Every filter is written to the URL by App, so a filtered view is
// shareable and survives a reload (see `chtype` / `chmember` / `chera` /
// `chsort` in hooks/useUrlState.js).
export function ChoreographyPage({ filters, onFilter, onClearFilters, onClose, onWatchEnd }) {
  const [active, setActive] = useState(null);
  const { type, member, era, sort } = filters;

  // Catalogue entries (so the shared ContentCard gets its badge/year/modal) with
  // the clip kind as the card badge instead of the generic "Choreo" tag.
  const entries = useMemo(
    () =>
      contentCatalog()
        .filter((entry) => entry.type === "choreo")
        .map((entry) => ({ ...entry, badge: choreoTypeLabel(entry.item.type) })),
    []
  );

  const visible = useMemo(() => {
    const list = entries.filter((entry) => {
      if (type && entry.item.type !== type) return false;
      if (member && !entry.members.some((m) => memberId(m) === member)) return false;
      if (era && entry.item.era !== era) return false;
      return true;
    });
    const year = (entry) => Number(entry.year) || 0;
    if (sort === "oldest") return [...list].sort((a, b) => (year(a) || 9999) - (year(b) || 9999));
    if (sort === "song") return [...list].sort((a, b) => String(a.item.song).localeCompare(String(b.item.song), undefined, { sensitivity: "base" }));
    return [...list].sort((a, b) => year(b) - year(a));
  }, [entries, type, member, era, sort]);

  // Only the chapters the catalogue actually covers, kept in timeline order.
  const eraOptions = useMemo(() => {
    const present = new Set(CHOREOGRAPHY.map((clip) => clip.era));
    return ERAS.filter((item) => present.has(item.id));
  }, []);

  const filtersActive = Boolean(type || member || era || sort);

  return (
    <div className="choreo-page" id="choreography-page">
      <div className="choreo-page-bar">
        <button type="button" className="choreo-page-back" onClick={onClose}>
          ← Back to browse
        </button>
      </div>

      <div className="choreo-page-head">
        <h2 className="choreo-page-title">Choreography</h2>
        <span className="choreo-page-count" role="status" aria-live="polite">
          {visible.length} of {entries.length} clip{entries.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="choreo-filters" role="group" aria-label="Filter choreography">
        <TypeChips value={type} onChange={(value) => onFilter("type", value)} />

        <label className="choreo-filter">
          <span className="choreo-filter-label">Member</span>
          <select value={member} onChange={(e) => onFilter("member", e.target.value)}>
            <option value="">All members</option>
            {MEMBERS.map((m) => (
              <option key={m.name} value={memberId(m)}>
                {m.name}
              </option>
            ))}
          </select>
        </label>

        <label className="choreo-filter">
          <span className="choreo-filter-label">Era</span>
          <select value={era} onChange={(e) => onFilter("era", e.target.value)}>
            <option value="">All eras</option>
            {eraOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.year})
              </option>
            ))}
          </select>
        </label>

        <label className="choreo-filter">
          <span className="choreo-filter-label">Sort</span>
          <select value={sort || "newest"} onChange={(e) => onFilter("sort", e.target.value === "newest" ? "" : e.target.value)}>
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {filtersActive && (
          <button type="button" className="choreo-filters-clear" onClick={onClearFilters}>
            Clear filters
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="choreo-empty">
          <p className="choreo-empty-title">No choreography clips match these filters.</p>
          <p className="choreo-empty-hint">Try a different clip type, member or era.</p>
          <button type="button" className="choreo-empty-btn" onClick={onClearFilters}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="card-grid">
          {visible.map((entry, i) => (
            <ContentCard key={`${entry.item.id}-${i}`} entry={entry} onOpen={setActive} />
          ))}
        </div>
      )}

      <EntryModal entry={active} onClose={() => setActive(null)} onWatchEnd={onWatchEnd} />
    </div>
  );
}

export default memo(ChoreographyPage);
