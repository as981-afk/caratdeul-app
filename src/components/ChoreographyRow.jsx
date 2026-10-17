import { memo, useMemo, useState } from "react";
import HeartButton from "./HeartButton";
import VideoModal from "./VideoModal";
import RowControls from "./RowControls";
import CardProgress from "./CardProgress";
import MemberChips from "./MemberChips";
import { useSession } from "../context/SessionContext.jsx";
import { pressable, ytThumb } from "../utils/format";
import { FAV_VIDEOS, favIdFor, isFav } from "../utils/favorites";
import { applyRowControls, groupValues, videoKeyFor } from "../utils/rowControls";
import { choreoTypeLabel } from "../utils/choreography";
import { CHOREOGRAPHY } from "../data/CHOREOGRAPHY";
import "./rows.css";

// Home row for the choreography catalogue. Same card, favourite, progress and
// watch plumbing as the other rows, plus a "See all" control that opens the
// full Choreography page (where the type/member/era filters live).
//
// The catalogue is imported here (not in App.jsx) so Vite can split it out of
// the main bundle when this row is lazy-loaded.
export function ChoreographyRow({ onWatchEnd, onOpenAll, onWatchStart, items = CHOREOGRAPHY }) {
  const [active, setActive] = useState(null);
  const [sort, setSort] = useState("default");
  const [status, setStatus] = useState("all");
  const [group, setGroup] = useState("all");
  const { favs, toggleFav, progressFor, isWatched } = useSession();

  // Clip kinds are stored as slugs ("dance-version"); the row's group dropdown
  // shows their display labels instead, so the filter reads like the page chips.
  const labelled = useMemo(() => items.map((item) => ({ ...item, typeLabel: choreoTypeLabel(item.type) })), [items]);

  const groupOptions = useMemo(() => groupValues(labelled, "typeLabel"), [labelled]);
  const visible = useMemo(
    () => applyRowControls(labelled, { sort, status, groupKey: "typeLabel", group, isWatched }),
    [labelled, sort, status, group, isWatched]
  );
  const filtered = visible.length !== labelled.length;

  return (
    <div className="row" id="choreography">
      <div className="row-head">
        <div className="row-title">
          Choreography{" "}
          <span className="count">
            {filtered ? `${visible.length} of ${labelled.length}` : labelled.length} clips
          </span>
        </div>
        {onOpenAll && (
          <button type="button" className="row-viewall" onClick={onOpenAll}>
            See all →
          </button>
        )}
        <RowControls
          sort={sort}
          onSortChange={setSort}
          status={status}
          onStatusChange={setStatus}
          group={group}
          onGroupChange={setGroup}
          groupLabel="Type"
          groupOptions={groupOptions}
        />
      </div>
      {visible.length === 0 ? (
        <div className="row-empty">
          <p>No choreography clips match the current filters.</p>
          <button
            className="row-empty-btn"
            onClick={() => {
              setSort("default");
              setStatus("all");
              setGroup("all");
            }}
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="row-scroll">
          {visible.map((item) => {
            const key = videoKeyFor(item);
            const progress = progressFor ? progressFor(key) : 0;
            return (
              <div
                className="card"
                key={favIdFor(item)}
                style={{ "--c1": item.c1, "--c2": item.c2, backgroundImage: ytThumb(item.url) ? `url(${ytThumb(item.url)})` : undefined }}
                {...pressable(() => setActive(item))}
              >
                <div className="card-overlay"></div>
                <MemberChips sub={item.sub} />
                <HeartButton checked={isFav(favs, FAV_VIDEOS, favIdFor(item))} onClick={() => toggleFav(FAV_VIDEOS, favIdFor(item))} />
                <div className="title">{item.title}</div>
                <div className="sub">{item.typeLabel}</div>
                <CardProgress progress={progress} watched={isWatched ? isWatched(key) : false} />
              </div>
            );
          })}
        </div>
      )}
      <VideoModal item={active} onClose={() => setActive(null)} onWatchStart={onWatchStart} onWatchEnd={onWatchEnd} />
    </div>
  );
}

export default memo(ChoreographyRow);
