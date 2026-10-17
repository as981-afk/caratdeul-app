import { memo, useEffect, useMemo, useRef, useState } from "react";
import ContentCard from "./ContentCard";
import EntryModal from "./EntryModal";
import { ERAS, eraById, eraIdByAlbum, normAlbum } from "../data/ERAS";
import { contentCatalog } from "../utils/content";
import { prefersReducedMotion } from "../utils/format";
import "./EraPage.css";

// The catalogue grouped by era, built once per session. Items whose album isn't
// on the timeline (singles, solo work, Japanese releases) belong to no era and
// are simply absent here — they still show up in rows, search and member pages.
function useErasByContent() {
  return useMemo(() => {
    const byAlbum = eraIdByAlbum();
    const map = new Map(ERAS.map((era) => [era.id, []]));
    for (const entry of contentCatalog()) {
      const era = byAlbum.get(normAlbum(entry.album));
      if (era) map.get(era.id).push(entry);
    }
    return map;
  }, []);
}

// Where the timeline opens when no era is in the URL: the chapter with the most
// catalogued titles, so the first grid a visitor sees is a full one (a tie is
// won by the newer era).
function richestEraId(byEra) {
  let best = ERAS[0]?.id || null;
  let bestCount = -1;
  for (const era of ERAS) {
    const count = (byEra.get(era.id) || []).length;
    if (count >= bestCount) {
      best = era.id;
      bestCount = count;
    }
  }
  return best;
}

// Era/album timeline: pick a chapter, see everything in it. The selected era
// lives in the URL (`view=eras&id=<eraId>`) so a chapter is linkable, and each
// era's own accent colour themes the detail panel below the timeline.
export function EraPage({ id, onSelectEra, onClose, onWatchEnd }) {
  const byEra = useErasByContent();
  const defaultId = useMemo(() => richestEraId(byEra), [byEra]);
  const era = eraById(id) || eraById(defaultId);
  const [active, setActive] = useState(null);
  const timelineRef = useRef(null);

  const all = useMemo(() => (era ? byEra.get(era.id) || [] : []), [byEra, era]);

  // Keep the selected chapter visible: the timeline scrolls horizontally, so the
  // chapter named in the URL (or the default one) can sit off-screen. Scrolls the
  // strip itself by `scrollLeft` rather than with `scrollIntoView`, so the page
  // never moves.
  useEffect(() => {
    const nav = timelineRef.current;
    const chip = nav?.querySelector(".era-slot.is-active");
    if (!nav || !chip) return;
    const left = chip.offsetLeft - (nav.clientWidth - chip.offsetWidth) / 2;
    nav.scrollTo({ left: Math.max(0, left), behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [era]);

  if (!era) {
    return (
      <div className="era-page" id="era-page">
        <div className="era-page-bar">
          <button type="button" className="era-page-back" onClick={onClose}>← Back to browse</button>
        </div>
        <div className="era-empty">No eras have been listed yet.</div>
      </div>
    );
  }

  return (
    <div className="era-page" id="era-page">
      <div className="era-page-bar">
        <button type="button" className="era-page-back" onClick={onClose}>← Back to browse</button>
      </div>

      <div className="era-page-head">
        <h1 className="era-page-title">Eras</h1>
        <span className="era-page-count">{ERAS.length} chapters · 2015 &rarr; today</span>
      </div>

      {/* Timeline: one chip per era, themed with that era's accent. */}
      <nav className="era-timeline" aria-label="Era timeline" ref={timelineRef}>
        <ol className="era-timeline-list">
          {ERAS.map((item) => {
            const count = (byEra.get(item.id) || []).length;
            const current = item.id === era.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`era-slot${current ? " is-active" : ""}`}
                  style={{ "--c1": item.c1, "--c2": item.c2 }}
                  aria-current={current ? "true" : undefined}
                  onClick={() => onSelectEra?.(item.id)}
                >
                  <span className="era-slot-bar" aria-hidden="true" />
                  <span className="era-slot-year">{item.year}</span>
                  <span className="era-slot-name">{item.name}</span>
                  <span className="era-slot-count">{count}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <section className="era-detail" style={{ "--c1": era.c1, "--c2": era.c2 }} aria-labelledby="era-detail-title">
        <div className="era-detail-body">
          <span className="era-detail-year">{era.year}</span>
          <h2 className="era-detail-title" id="era-detail-title">{era.name}</h2>
          <p className="era-detail-blurb">{era.blurb}</p>
        </div>
        <span className="era-detail-count">
          {all.length} title{all.length === 1 ? "" : "s"}
        </span>
      </section>

      {all.length ? (
        <div className="card-grid era-grid">
          {all.map((entry, i) => (
            <ContentCard key={`${entry.type}-${i}`} entry={entry} onOpen={setActive} />
          ))}
        </div>
      ) : (
        <div className="era-empty">No titles catalogued for this era yet.</div>
      )}

      <EntryModal entry={active} onClose={() => setActive(null)} onWatchEnd={onWatchEnd} />
    </div>
  );
}

export default memo(EraPage);
