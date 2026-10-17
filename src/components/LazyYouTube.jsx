import { useState } from "react";
import SafeImg from "./SafeImg";
import "./LazyYouTube.css";

// Poster + play button until playback starts, then the autoplaying YouTube
// iframe (with `enablejsapi=1` so a parent player can command it).
//
// Controlled when `started` is supplied, so VideoPlayer can own play state and
// forward an `iframeRef`; uncontrolled (manages its own state) everywhere else.
export function LazyYouTube({ videoId, title, thumb, autoplay, start = 0, started, onStart, iframeRef }) {
  const [uncontrolledPlay, setUncontrolledPlay] = useState(false);
  const play = started === undefined ? uncontrolledPlay : started;

  const begin = () => {
    if (started === undefined) setUncontrolledPlay(true);
    onStart?.();
  };

  if (play) {
    // `start` (seconds) resumes a partially-watched video from its saved time.
    const seek = start > 0 ? `&start=${Math.round(start)}` : "";
    return (
      <iframe
        ref={iframeRef}
        src={`https://www.youtube.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}&enablejsapi=1${seek}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return (
    <button
      className="lazy-youtube"
      type="button"
      onClick={begin}
      aria-label={`Play ${title}`}
    >
      {thumb ? (
        <SafeImg src={thumb} alt="" width={480} height={270} loading="lazy" />
      ) : (
        <div className="search-result-thumb-fallback" style={{ width: "100%", height: "100%" }} />
      )}
      <span className="lazy-youtube-play">
        <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
    </button>
  );
}

export default LazyYouTube;
