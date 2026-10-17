import { memo, useMemo, useState } from "react";
import SafeImg from "./SafeImg";
import HeartButton from "./HeartButton";
import CardProgress from "./CardProgress";
import MemberChips from "./MemberChips";
import MemberModal from "./MemberModal";
import MVModal from "./MVModal";
import GoSeModal from "./GoSeModal";
import VideoModal from "./VideoModal";
import { useSession } from "../context/SessionContext.jsx";
import { pressable, ytThumb } from "../utils/format";
import { FAV_VIDEOS, FAV_MEMBERS, favIdFor, isFav } from "../utils/favorites";
import { videoKeyFor } from "../utils/rowControls";
import { MEMBERS } from "../data/MEMBERS";
import { NANA_TOUR } from "../data/NANA_TOUR";
import { MVS } from "../data/MVS";
import { GOING_SEVENTEEN } from "../data/GOING_SEVENTEEN";
import { CONCERTS } from "../data/CONCERTS";
import { SIDE_TRACKS } from "../data/SIDE_TRACKS";
import { CHOREO_VIDEOS } from "../utils/choreoVideos";
import { CHANNEL_VIDEOS } from "../utils/channelVideos";
import "./rows.css";
import "./MyListRow.css";
import "./MyListPage.css";

// Flattens every saved item into one list for the grid: saved members first,
// then saved videos (Music Videos, Going Seventeen, Nana Tour, Concerts, songs,
// choreography, channel uploads).
function collectSaved(favs) {
  const videoSections = [
    { type: "mv", items: MVS },
    { type: "gose", items: GOING_SEVENTEEN },
    { type: "video", items: NANA_TOUR },
    { type: "video", items: CONCERTS },
    { type: "video", items: SIDE_TRACKS },
    { type: "choreo", items: CHOREO_VIDEOS },
    { type: "video", items: CHANNEL_VIDEOS },
  ];
  const videos = videoSections.flatMap(({ type, items }) =>
    items.filter((it) => isFav(favs, FAV_VIDEOS, favIdFor(it))).map((item) => ({ type, item }))
  );
  const members = MEMBERS.filter((m) => isFav(favs, FAV_MEMBERS, m.name)).map((item) => ({ type: "member", item }));
  return [...members, ...videos];
}

// Full-page "My List": everything the user has saved, in one responsive grid,
// with an empty state. Opened from the My List row's "View all" control.
export function MyListPage({ onClose, onWatchEnd }) {
  const { favs, toggleFav, progressFor, isWatched } = useSession();
  const [active, setActive] = useState(null);

  const saved = useMemo(() => collectSaved(favs), [favs]);

  return (
    <div className="my-list-page" id="my-list-page">
      <div className="my-list-page-head">
        <h2 className="my-list-page-title">My List</h2>
        <span className="my-list-page-count" role="status" aria-live="polite">
          {saved.length} saved
        </span>
        <button type="button" className="my-list-page-back" onClick={onClose}>
          ← Back to browse
        </button>
      </div>

      {saved.length === 0 ? (
        <div className="my-list-empty">
          <p>Nothing saved yet.</p>
          <p>Tap the ♡ on any card to add it here — favorite MVs, members, Going Seventeen episodes, songs, choreography clips, and channel uploads all show up in this grid.</p>
        </div>
      ) : (
        <div className="my-list-grid">
          {saved.map(({ type, item }) => {
            const isMember = type === "member";
            const favKey = isMember ? FAV_MEMBERS : FAV_VIDEOS;
            const favId = isMember ? item.name : favIdFor(item);
            return (
              <div
                className={isMember ? "bias-card" : "card"}
                key={isMember ? `member-${item.name}` : favId}
                style={{
                  "--c1": item.c1,
                  "--c2": item.c2,
                  backgroundImage: !isMember && ytThumb(item.url) ? `url(${ytThumb(item.url)})` : undefined,
                }}
                {...pressable(() => setActive({ type, item }))}
              >
                <div className="card-overlay"></div>
                {isMember ? <span className="unit">{item.unit}</span> : <MemberChips sub={item.sub} />}
                <HeartButton checked={isFav(favs, favKey, favId)} onClick={() => toggleFav(favKey, favId)} />
                {isMember && <SafeImg className="bias-img" src={item.img} alt={item.name} loading="lazy" width={300} height={440} />}
                <div className={isMember ? "name" : "title"}>{item.name || item.title}</div>
                {isMember && <div className="position">{item.position}</div>}
                {!isMember && (
                  <CardProgress
                    progress={progressFor ? progressFor(videoKeyFor(item)) : 0}
                    watched={isWatched ? isWatched(videoKeyFor(item)) : false}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {active?.type === "member" && <MemberModal member={active.item} onClose={() => setActive(null)} />}
      {active?.type === "mv" && <MVModal mv={active.item} onClose={() => setActive(null)} onWatchEnd={onWatchEnd} />}
      {active?.type === "gose" && <GoSeModal ep={active.item} onClose={() => setActive(null)} onWatchEnd={onWatchEnd} />}
      {(active?.type === "video" || active?.type === "choreo") && (
        <VideoModal item={active.item} onClose={() => setActive(null)} onWatchEnd={onWatchEnd} />
      )}
    </div>
  );
}

export default memo(MyListPage);
