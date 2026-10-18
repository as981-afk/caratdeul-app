import { memo } from "react";
import { pressable, timeAgo } from "../utils/format";
import MemberChips from "./MemberChips";
import CardThumb from "./CardThumb";
import "./ContinueWatching.css";

export function RecentlyWatchedRow({ items }) {
  if (!items.length) return null;
  const openVideo = (url) => url && window.open(url, "_blank", "noopener,noreferrer");
  return (
    <div className="continue-watching" id="recently-watched">
      <div className="continue-watching-header">
        <span className="continue-watching-badge recent-badge">History</span>
        <h2 className="continue-watching-label">RECENTLY WATCHED</h2>
      </div>
      <div className="continue-watching-scroll">
        {items.map((item) => (
          <div
            className="continue-card"
            key={item.videoId}
            style={{ "--c1": item.c1, "--c2": item.c2 }}
            {...pressable(() => openVideo(item.url))}
          >
            <CardThumb url={item.url} sizes="(max-width: 600px) 230px, 280px" />
            <div className="card-overlay"></div>
            <MemberChips sub={item.sub} />
            <div className="title">{item.title}</div>
            <div className="continue-progress-wrap">
              <span className="recent-time">{timeAgo(item.lastWatched)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(RecentlyWatchedRow);
