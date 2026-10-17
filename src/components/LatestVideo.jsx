import { memo } from "react";
import LazyYouTube from "./LazyYouTube";
import { ytThumb } from "../utils/format";
import { MVS } from "../data/MVS";
import "./LatestVideo.css";

export function LatestVideo() {
  const video = MVS[MVS.length - 1];
  const videoId = video.url?.match(/(?:v=|\.be\/)([^&?/]+)/)?.[1];
  return (
    <div className="latest-video" id="latest-video">
      <div className="latest-video-header">
        <span className="latest-video-badge">Latest</span>
        <h2 className="latest-video-label">LATEST VIDEO</h2>
      </div>
      <div className="latest-video-container">
        <div className="latest-video-player">
          {videoId && <LazyYouTube videoId={videoId} title={video.title} thumb={ytThumb(video.url)} />}
        </div>
        <div className="latest-video-info">
          <span className="latest-video-tag">{video.sub}</span>
          <h3 className="latest-video-title">{video.title}</h3>
          <p className="latest-video-desc">{video.desc}</p>
          <div className="latest-video-meta">
            <span>{video.year}</span>
            <span className="latest-video-dot"></span>
            <span>{video.album}</span>
          </div>
          <a
            className="latest-video-link"
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M8 5v14l11-7z" />
            </svg>
            Watch on YouTube
          </a>
        </div>
      </div>
    </div>
  );
}

export default memo(LatestVideo);
