import { memo } from "react";
import { pressable, ytThumb } from "../utils/format";
import MemberChips from "./MemberChips";
import "./ContinueWatching.css";

// "m:ss left" derived from the stored seconds; falls back to the percentage
// estimate for older entries that predate currentTime/duration.
function formatTimeLeft(item) {
  if (typeof item.duration === "number" && item.duration > 0) {
    const left = Math.max(0, item.duration - (item.currentTime || 0));
    const m = Math.floor(left / 60);
    const s = left % 60;
    return `${m}:${String(s).padStart(2, "0")} left`;
  }
  if (item.progress <= 0) return "just started";
  const totalSec = Math.round((100 - item.progress) * 1.8);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")} left`;
}

export function ContinueWatching({ items, onOpen, onRemove }) {
  if (!items.length) return null;
  return (
    <div className="continue-watching" id="continue-watching">
      <div className="continue-watching-header">
        <span className="continue-watching-badge">Resume</span>
        <h2 className="continue-watching-label">CONTINUE WATCHING</h2>
      </div>
      <div className="continue-watching-scroll">
        {items.map((item) => (
          <div
            className="continue-card"
            key={item.videoId}
            style={{ "--c1": item.c1, "--c2": item.c2, backgroundImage: ytThumb(item.url) ? `url(${ytThumb(item.url)})` : undefined }}
            {...pressable(() => onOpen?.(item))}
          >
            <div className="card-overlay"></div>
            <MemberChips sub={item.sub} />
            {onRemove && (
              <button
                type="button"
                className="continue-remove"
                title="Remove from row"
                aria-label={`Remove ${item.title} from Continue Watching`}
                onClick={(e) => { e.stopPropagation(); onRemove(item.videoId); }}
                onKeyDown={(e) => e.stopPropagation()}
              >
                ✕
              </button>
            )}
            <div className="title">{item.title}</div>
            <div className="continue-progress-wrap">
              <div className="continue-progress-bar">
                <div className="continue-progress-fill" style={{ width: `${item.progress}%` }}></div>
              </div>
              <div className="continue-progress-time">{formatTimeLeft(item)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(ContinueWatching);
