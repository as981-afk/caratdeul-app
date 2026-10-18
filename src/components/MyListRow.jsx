import { memo, useState } from "react";
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
import { choreoTypeLabel } from "../utils/choreography";
import { CHANNEL_VIDEOS } from "../utils/channelVideos";
import "./rows.css";
import "./MyListRow.css";

export function MyListRow({ onWatchEnd, onOpenList }) {
  const { favs, toggleFav, progressFor, isWatched } = useSession();
  const [active, setActive] = useState(null);

  const favMembers = MEMBERS.filter((m) => isFav(favs, FAV_MEMBERS, m.name));
  const favMVs = MVS.filter((m) => isFav(favs, FAV_VIDEOS, favIdFor(m)));
  const favGoSe = GOING_SEVENTEEN.filter((g) => isFav(favs, FAV_VIDEOS, favIdFor(g)));
  const favSongs = SIDE_TRACKS.filter((s) => isFav(favs, FAV_VIDEOS, favIdFor(s)));
  const favChoreo = CHOREO_VIDEOS.filter((c) => isFav(favs, FAV_VIDEOS, favIdFor(c)));
  const favChannel = CHANNEL_VIDEOS.filter((v) => isFav(favs, FAV_VIDEOS, favIdFor(v)));
  const favOthers = [...NANA_TOUR, ...CONCERTS].filter((c) => isFav(favs, FAV_VIDEOS, favIdFor(c)));

  const sections = [
    { label: "Favorite Members", items: favMembers, type: "member" },
    { label: "Favorite MVs", items: favMVs, type: "mv" },
    { label: "Favorite Going Seventeen", items: favGoSe, type: "gose" },
    { label: "Favorite Songs", items: favSongs, type: "song" },
    { label: "Favorite Choreography", items: favChoreo, type: "choreo" },
    { label: "Favorite Uploads", items: favChannel, type: "video" },
    { label: "Other Favorites", items: favOthers, type: "video" },
  ].filter((s) => s.items.length > 0);

  const total = sections.reduce((n, s) => n + s.items.length, 0);

  const openItem = (item, type) => setActive({ item, type });

  if (total === 0) {
    return (
      <div className="row" id="my-list">
        <div className="row-title">
          MY LIST <span className="count">tap the ♡ on any card to save it here</span>
        </div>
        <div className="my-list-empty">
          <p>Nothing saved yet.</p>
          <p>Add favorite MVs, members, Going Seventeen episodes, songs, choreography clips, and channel uploads to build your own My List.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="row" id="my-list">
      <div className="row-title">
        MY LIST <span className="count">{total} saved</span>
        {onOpenList && (
          <button type="button" className="my-list-viewall" onClick={onOpenList}>
            View all →
          </button>
        )}
      </div>
      {sections.map((sec) => (
        <div className="my-list-section" key={sec.label}>
          <div className="row-title my-list-section-title">{sec.label}</div>
          <div className="row-scroll">
            {sec.items.map((item) => (
              <div
                className={sec.type === "member" ? "bias-card" : "card"}
                key={sec.type === "member" ? item.name : favIdFor(item)}
                style={{ "--c1": item.c1, "--c2": item.c2, backgroundImage: item.url && ytThumb(item.url) ? `url(${ytThumb(item.url)})` : item.img ? `url(${item.img})` : undefined }}
                {...pressable(() => openItem(item, sec.type))}
              >
                <div className="card-overlay"></div>
                {sec.type === "member" ? (
                  <span className="unit">{item.unit}</span>
                ) : (
                  <MemberChips sub={item.sub} />
                )}
                {sec.type === "member" ? (
                  <HeartButton checked={isFav(favs, FAV_MEMBERS, item.name)} onClick={() => toggleFav(FAV_MEMBERS, item.name)} />
                ) : (
                  <HeartButton checked={isFav(favs, FAV_VIDEOS, favIdFor(item))} onClick={() => toggleFav(FAV_VIDEOS, favIdFor(item))} />
                )}
                {sec.type === "member" && <SafeImg className="bias-img" src={item.img} alt={item.name} loading="lazy" width={300} height={440} />}
                <div className={sec.type === "member" ? "name" : "title"}>{item.name || item.title}</div>
                {sec.type === "member" && <div className="position">{item.position}</div>}
                {sec.type === "song" && <div className="sub">{item.sub}</div>}
                {sec.type === "choreo" && <div className="sub">{choreoTypeLabel(item.type)}</div>}
                {sec.type !== "member" && (
                  <CardProgress
                    progress={progressFor ? progressFor(videoKeyFor(item)) : 0}
                    watched={isWatched ? isWatched(videoKeyFor(item)) : false}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      {active?.type === "member" && <MemberModal member={active.item} onClose={() => setActive(null)} />}
      {active?.type === "mv" && <MVModal mv={active.item} onClose={() => setActive(null)} onWatchEnd={onWatchEnd} />}
      {active?.type === "gose" && <GoSeModal ep={active.item} onClose={() => setActive(null)} onWatchEnd={onWatchEnd} />}
      {(active?.type === "song" || active?.type === "video" || active?.type === "choreo") && (
        <VideoModal item={active.item} onClose={() => setActive(null)} onWatchEnd={onWatchEnd} />
      )}
    </div>
  );
}

export default memo(MyListRow);
