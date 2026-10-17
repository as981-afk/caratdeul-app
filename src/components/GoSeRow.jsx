import { memo, useMemo, useState } from "react";
import HeartButton from "./HeartButton";
import GoSeModal from "./GoSeModal";
import CategoryPopup from "./CategoryPopup";
import RowControls from "./RowControls";
import CardProgress from "./CardProgress";
import MemberChips from "./MemberChips";
import { useSession } from "../context/SessionContext.jsx";
import { pressable, ytThumb } from "../utils/format";
import { FAV_VIDEOS, favIdFor, isFav } from "../utils/favorites";
import { applyRowControls, videoKeyFor } from "../utils/rowControls";
import { GOING_SEVENTEEN } from "../data/GOING_SEVENTEEN";
import "./rows.css";

// The Going Seventeen catalogue is imported here (not in App.jsx) so Vite can
// split it out of the main bundle when this row is lazy-loaded.
export function GoSeRow({ onWatchEnd, items = GOING_SEVENTEEN }) {
  const [active, setActive] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [sort, setSort] = useState("default");
  const [status, setStatus] = useState("all");
  const { favs, toggleFav, progressFor, isWatched } = useSession();

  const visible = useMemo(
    () => applyRowControls(items, { sort, status, isWatched }),
    [items, sort, status, isWatched]
  );
  const filtered = visible.length !== items.length;

  return (
    <div className="row" id="going-seventeen">
      <div className="row-head">
        <div className="row-title" {...pressable(() => setShowPopup(true))} style={{ cursor: "pointer" }}>
          Going Seventeen{" "}
          <span className="count">
            {filtered ? `${visible.length} of ${items.length}` : items.length} episodes
          </span>
        </div>
        <RowControls
          sort={sort}
          onSortChange={setSort}
          status={status}
          onStatusChange={setStatus}
        />
      </div>
      {visible.length === 0 ? (
        <div className="row-empty">
          <p>No episodes match the current filters.</p>
          <button className="row-empty-btn" onClick={() => { setSort("default"); setStatus("all"); }}>
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
                <CardProgress progress={progress} watched={isWatched ? isWatched(key) : false} />
              </div>
            );
          })}
        </div>
      )}
      <GoSeModal ep={active} onClose={() => setActive(null)} onWatchEnd={onWatchEnd} />
      {showPopup && (
        <CategoryPopup
          title="Going Seventeen"
          items={visible}
          countLabel="episodes"
          onClose={() => setShowPopup(false)}
          onWatchEnd={onWatchEnd}
          type="gose"
        />
      )}
    </div>
  );
}

export default memo(GoSeRow);
