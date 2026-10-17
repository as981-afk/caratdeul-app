import { useState, useEffect, useCallback, useMemo, memo } from "react";
import SafeImg from "./SafeImg";
import HeartButton from "./HeartButton";
import MemberModal from "./MemberModal";
import MVModal from "./MVModal";
import GoSeModal from "./GoSeModal";
import VideoModal from "./VideoModal";
import { useSession } from "../context/SessionContext.jsx";
import { ytThumb } from "../utils/format";
import { FAV_VIDEOS, FAV_MEMBERS, favIdFor, isFav } from "../utils/favorites";
import { matchesQuery, QUICK_PICKS } from "../utils/searchMatch";
import { MEMBERS } from "../data/MEMBERS";
import { memberId, memberUnits, MEMBER_UNITS } from "../utils/memberMatch";
import { CONTENT_TYPES, contentCatalog, yearOptions } from "../utils/content";
import "./SearchResults.css";

const EMPTY_FILTERS = { member: "", unit: "", type: "", year: "" };

// Applies the text query AND every active filter, then groups the survivors by
// category (Members first, then each content type in display order).
function buildSearchResults(query, filters) {
  const q = query.trim();
  const { member, unit, type, year } = filters;
  const groups = [];

  // Members are hidden once a content-type or year filter is set — those only
  // make sense for catalogue items, not profiles.
  if (!type && !year) {
    const members = MEMBERS.filter((m) => {
      if (member && memberId(m) !== member) return false;
      if (unit && !memberUnits(m).includes(unit)) return false;
      if (q && !matchesQuery(m, q)) return false;
      return true;
    });
    if (members.length) groups.push({ label: "Members", badge: "Member", type: "member", items: members });
  }

  for (const t of CONTENT_TYPES) {
    if (type && t.value !== type) continue;
    const items = contentCatalog()
      .filter((e) => {
        if (e.type !== t.value) return false;
        if (member && !e.members.some((m) => memberId(m) === member)) return false;
        if (unit && !e.units.includes(unit)) return false;
        if (year && e.year !== year) return false;
        if (q && !matchesQuery(e.item, q)) return false;
        return true;
      })
      .map((e) => e.item);
    if (items.length) groups.push({ label: t.group, badge: t.badge, type: t.modal, items });
  }

  return groups;
}

const SearchResultCard = memo(function SearchResultCard({ result, index, isActive, onOpen, favs, toggleFav }) {
  const { item, badge, type } = result;
  const isMember = type === "member";
  const thumb = isMember ? item.img : ytThumb(item.url);
  const favKey = isMember ? FAV_MEMBERS : FAV_VIDEOS;
  const favId = isMember ? item.name : favIdFor(item);

  const metaParts = [];
  if (item.year) metaParts.push(item.year);
  if (item.album) metaParts.push(item.album);
  if (isMember && item.position) metaParts.push(item.position);
  if (isMember && item.birthday) metaParts.push(`Born ${item.birthday}`);
  if (!isMember && item.sub) metaParts.push(item.sub);

  const open = () => onOpen(result);

  return (
    <div
      className={`search-result${isActive ? " search-result--active" : ""}`}
      data-search-idx={index}
      onClick={open}
      role="button"
      tabIndex={0}
      aria-selected={isActive}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      style={{ "--c1": item.c1, "--c2": item.c2 }}
    >
      <div className="search-result-thumb">
        {thumb ? <SafeImg src={thumb} alt="" loading="lazy" width={320} height={180} /> : <div className="search-result-thumb-fallback" />}
        <span className="search-result-badge">{badge}</span>
      </div>
      <div className="search-result-info">
        <h3 className="search-result-title">{item.name || item.title}</h3>
        <p className="search-result-meta">{metaParts.join(" · ")}</p>
      </div>
      <div className="search-result-actions">
        <HeartButton checked={isFav(favs, favKey, favId)} onClick={() => toggleFav(favKey, favId)} />
      </div>
    </div>
  );
});

// Filter bar: every control writes straight through to the URL query string
// (owned by App) so a filtered search is shareable.
function SearchFilters({ filters, onFilter, onClearFilters }) {
  const years = useMemo(() => yearOptions(), []);
  const active = Object.values(filters).some(Boolean);

  return (
    <div className="search-filters" role="group" aria-label="Filter results">
      <label className="search-filter">
        <span className="search-filter-label">Member</span>
        <select value={filters.member} onChange={(e) => onFilter("member", e.target.value)}>
          <option value="">All members</option>
          {MEMBERS.map((m) => (
            <option key={m.name} value={memberId(m)}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <label className="search-filter">
        <span className="search-filter-label">Unit</span>
        <select value={filters.unit} onChange={(e) => onFilter("unit", e.target.value)}>
          <option value="">All units</option>
          {MEMBER_UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </label>
      <label className="search-filter">
        <span className="search-filter-label">Type</span>
        <select value={filters.type} onChange={(e) => onFilter("type", e.target.value)}>
          <option value="">All types</option>
          {CONTENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="search-filter">
        <span className="search-filter-label">Year</span>
        <select value={filters.year} onChange={(e) => onFilter("year", e.target.value)}>
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
      {active && (
        <button type="button" className="search-filters-clear" onClick={onClearFilters}>
          Clear all
        </button>
      )}
    </div>
  );
}

const tabSlug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export function SearchResults({ query, rawQuery, filters = EMPTY_FILTERS, onFilter, onClearFilters, onWatchEnd, onQuery }) {
  const { favs, toggleFav } = useSession();
  const [opened, setOpened] = useState(null);
  const [idx, setIdx] = useState(0);
  const [tab, setTab] = useState("All");
  const shownQuery = rawQuery || query;
  const filtersActive = Object.values(filters).some(Boolean);

  const openResult = useCallback((f) => setOpened({ item: f.item, type: f.type }), []);

  const groups = useMemo(
    () => buildSearchResults(query, filters),
    [query, filters]
  );
  const tabs = useMemo(() => (groups.length > 1 ? ["All", ...groups.map((g) => g.label)] : []), [groups]);
  // The tab may not survive a new query — fall back to "All" instead of
  // resetting it from an effect. The cursor clamps the same way.
  const activeTab = tabs.includes(tab) ? tab : "All";

  const visibleGroups = useMemo(() => (activeTab === "All" ? groups : groups.filter((g) => g.label === activeTab)), [groups, activeTab]);
  // Group offsets into the flattened, keyboard-navigable result list.
  const groupsWithStart = useMemo(() => {
    const starts = visibleGroups.map((_, i) => visibleGroups.slice(0, i).reduce((n, g) => n + g.items.length, 0));
    return visibleGroups.map((g, i) => ({ ...g, start: starts[i] }));
  }, [visibleGroups]);
  const visible = useMemo(() => groupsWithStart.flatMap((g) => g.items.map((item) => ({ item, type: g.type, badge: g.badge, label: g.label }))), [groupsWithStart]);
  const safeIdx = visible.length ? Math.min(idx, visible.length - 1) : 0;

  // Arrow Up/Down navigate results, Enter opens the highlighted one, Escape
  // clears the text query. All of it steps aside while the suggestion dropdown
  // is open (it owns those keys) or while a modal has focus.
  useEffect(() => {
    const onKey = (e) => {
      if (opened) return;
      if (document.getElementById("search-suggestions")) return;
      if (e.key === "Escape") { e.preventDefault(); onQuery(""); return; }
      if (!visible.length) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => (i + 1) % visible.length); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => (i - 1 + visible.length) % visible.length); }
      else if (e.key === "Home") { e.preventDefault(); setIdx(0); }
      else if (e.key === "End") { e.preventDefault(); setIdx(visible.length - 1); }
      else if (e.key === "Enter") { e.preventDefault(); const f = visible[safeIdx]; if (f) openResult(f); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, safeIdx, opened, onQuery, openResult]);

  // Keep the highlighted item in view while navigating.
  useEffect(() => {
    document.querySelector(`[data-search-idx="${safeIdx}"]`)?.scrollIntoView({ block: "nearest" });
  }, [safeIdx]);

  const tabCount = useCallback(
    (t) => (t === "All" ? groups.reduce((n, g) => n + g.items.length, 0) : groups.find((g) => g.label === t)?.items.length || 0),
    [groups]
  );
  const onTabKeyDown = (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const i = tabs.indexOf(activeTab);
    let next;
    if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else next = (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    setTab(tabs[next]);
    document.getElementById(`search-tab-${tabSlug(tabs[next])}`)?.focus();
  };

  // "for “dino”" when there is text, "matching your filters" when there is not.
  const heading = shownQuery ? `for “${shownQuery}”` : filtersActive ? "matching your filters" : "";

  if (visible.length === 0) {
    return (
      <div className="search-results" id="search-results">
        <div className="search-results-header">
          <h2 className="search-results-title">Search Results</h2>
          <span className="search-results-count" role="status" aria-live="polite">0 results{heading ? ` ${heading}` : ""}</span>
        </div>
        <SearchFilters filters={filters} onFilter={onFilter} onClearFilters={onClearFilters} />
        <div className="search-no-results">
          <div className="search-no-results-icon">🔎</div>
          <p className="search-no-results-title">No matches{heading ? ` ${heading}` : ""}.</p>
          <p className="search-no-results-hint">
            {filtersActive
              ? "Try removing a filter, or clear them all to start over."
              : "Check the spelling or try a different keyword — e.g. a member name, song, album, or unit."}
          </p>
          <div className="search-quickpicks">
            <span className="search-quickpicks-label">Try:</span>
            {QUICK_PICKS.map((name) => (
              <button key={name} className="search-quickpick" onClick={() => onQuery(name)}>{name}</button>
            ))}
          </div>
          <div className="search-no-results-actions">
            {filtersActive && (
              <button className="search-no-results-clear" onClick={onClearFilters}>Clear filters</button>
            )}
            <button className="search-no-results-clear" onClick={() => onQuery("")}>Clear search</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="search-results" id="search-results">
      <div className="search-results-header">
        <h2 className="search-results-title">Search Results</h2>
        <span className="search-results-count" role="status" aria-live="polite">
          {visible.length} result{visible.length === 1 ? "" : "s"}{heading ? ` ${heading}` : ""}
        </span>
        <span className="search-hint">↑↓ navigate · Enter open · Esc clear</span>
      </div>
      <SearchFilters filters={filters} onFilter={onFilter} onClearFilters={onClearFilters} />
      {tabs.length > 1 && (
        <div className="search-tabs" role="tablist" aria-label="Filter results by type">
          {tabs.map((t) => (
            <button
              key={t}
              id={`search-tab-${tabSlug(t)}`}
              type="button"
              role="tab"
              className={`search-tab${activeTab === t ? " search-tab--active" : ""}`}
              aria-selected={activeTab === t}
              aria-controls="search-tabpanel"
              tabIndex={activeTab === t ? 0 : -1}
              onClick={() => setTab(t)}
              onKeyDown={onTabKeyDown}
            >
              {t}
              <span className="search-tab-count">{tabCount(t)}</span>
            </button>
          ))}
        </div>
      )}
      <div
        className="search-tabpanels"
        id="search-tabpanel"
        role="tabpanel"
        aria-labelledby={tabs.length > 1 ? `search-tab-${tabSlug(activeTab)}` : undefined}
      >
        {groupsWithStart.map((group) => (
          <section className="search-category" key={group.label}>
            <div className="search-category-header">
              <span>{group.label}</span>
              <span className="search-category-count">
                {group.items.length}
              </span>
            </div>
            <div className="search-list">
              {group.items.map((item, gi) => {
                const index = group.start + gi;
                return (
                  <SearchResultCard
                    key={index}
                    result={visible[index]}
                    index={index}
                    isActive={index === safeIdx}
                    onOpen={openResult}
                    favs={favs}
                    toggleFav={toggleFav}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>
      {opened?.type === "member" && <MemberModal member={opened.item} onClose={() => setOpened(null)} />}
      {opened?.type === "mv" && <MVModal mv={opened.item} onClose={() => setOpened(null)} onWatchEnd={onWatchEnd} />}
      {opened?.type === "gose" && <GoSeModal ep={opened.item} onClose={() => setOpened(null)} onWatchEnd={onWatchEnd} />}
      {opened?.type === "video" && <VideoModal item={opened.item} onClose={() => setOpened(null)} onWatchEnd={onWatchEnd} />}
    </div>
  );
}

export default memo(SearchResults);
