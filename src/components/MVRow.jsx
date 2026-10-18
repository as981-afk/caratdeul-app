import { memo, useMemo, useState } from "react";
import HeartButton from "./HeartButton";
import MVModal from "./MVModal";
import CategoryPopup from "./CategoryPopup";
import RowControls from "./RowControls";
import CardProgress from "./CardProgress";
import MemberChips from "./MemberChips";
import CardThumb from "./CardThumb";
import { useSession } from "../context/SessionContext.jsx";
import { pressable } from "../utils/format";
import { FAV_VIDEOS, favIdFor, isFav } from "../utils/favorites";
import { applyRowControls, groupValues, videoKeyFor } from "../utils/rowControls";
import { MVS } from "../data/MVS";
import "./rows.css";

// The MV catalogue is imported here (not in App.jsx) so Vite can split it out
// of the main bundle when this row is lazy-loaded.
export function MVRow({ onWatchEnd, items = MVS }) {
  const [active, setActive] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [sort, setSort] = useState("default");
  const [status, setStatus] = useState("all");
  const [group, setGroup] = useState("all");
  const { favs, toggleFav, progressFor, isWatched } = useSession();

  const groupOptions = useMemo(() => groupValues(items, "sub"), [items]);
  const visible = useMemo(
    () => applyRowControls(items, { sort, status, groupKey: "sub", group, isWatched }),
    [items, sort, status, group, isWatched]
  );
  const filtered = visible.length !== items.length;

  return (
    <div className="row" id="mvs">
      <div className="row-head">
        <div className="row-title" {...pressable(() => setShowPopup(true))} style={{ cursor: "pointer" }}>
          MV's{" "}
          <span className="count">
            {filtered ? `${visible.length} of ${items.length}` : items.length} music videos
          </span>
        </div>
        <RowControls
          sort={sort}
          onSortChange={setSort}
          status={status}
          onStatusChange={setStatus}
          group={group}
          onGroupChange={setGroup}
          groupLabel="Member"
          groupOptions={groupOptions}
        />
      </div>
      {visible.length === 0 ? (
        <div className="row-empty">
          <p>No music videos match the current filters.</p>
          <button className="row-empty-btn" onClick={() => { setSort("default"); setStatus("all"); setGroup("all"); }}>
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
                style={{ "--c1": item.c1, "--c2": item.c2 }}
                {...pressable(() => setActive(item))}
              >
                <CardThumb url={item.url} />
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
      <MVModal mv={active} onClose={() => setActive(null)} onWatchEnd={onWatchEnd} />
      {showPopup && (
        <CategoryPopup
          title="MV's"
          items={visible}
          countLabel="music videos"
          onClose={() => setShowPopup(false)}
          onWatchEnd={onWatchEnd}
          type="mv"
        />
      )}
    </div>
  );
}

export default memo(MVRow);
