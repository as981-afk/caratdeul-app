import { useCallback, useRef } from "react";
import Modal from "./Modal";
import SafeImg from "./SafeImg";
import VideoPlayer from "./VideoPlayer";
import HeartButton from "./HeartButton";
import { useSession } from "../context/SessionContext.jsx";
import { ytThumb, ytId } from "../utils/format";
import { FAV_VIDEOS, favIdFor, isFav } from "../utils/favorites";
import { isChoreographyItem } from "../utils/choreography";
import { addOrUpdateCW, addRecent, removeFromCW, cwTiming, CW_FINISHED_PERCENT } from "../utils/watchHistory";
import { saveVideoProgress } from "../utils/watched";
import { videoKeyFor } from "../utils/rowControls";
import "./MVModal.css";

export function VideoModal({ item, onClose, onWatchStart, onWatchEnd, startTime = 0 }) {
  const progressRef = useRef(0);
  // `profileId` (aliased to `user`) owns the watch-history writes; per-profile
  // storage is keyed by profile id now, not the account name.
  const { profileId: user, favs, toggleFav, isWatched, markWatched, unmarkWatched } = useSession();
  // Choreography clips get the extra learning controls (speed / mirror / A–B).
  const choreography = isChoreographyItem(item);

  // Writes the current position to Continue Watching and to the watched store.
  // Called on the ~5s throttle, on finish, on explicit close and on unmount.
  const persist = useCallback(
    (progress) => {
      const vid = ytId(item?.url);
      if (!vid || !user) return;
      const meta = { title: item.title, sub: item.sub, c1: item.c1, c2: item.c2, url: item.url, type: item.type };
      // Reaching the finish threshold takes the entry out of Continue Watching.
      if (progress >= CW_FINISHED_PERCENT) removeFromCW(user, vid);
      else addOrUpdateCW(user, { videoId: vid, ...meta, progress, ...cwTiming(progress) });
      // Progress bar + watched tick data (no React re-render; storage only).
      saveVideoProgress(user, vid, progress, meta);
    },
    [item, user]
  );

  // Player → storage wiring. `onTick` only mirrors the live position into a ref
  // so an explicit close can persist the exact final value; `onSave` is the
  // throttled/finish/unmount write.
  const handleStart = useCallback(
    (progress) => {
      progressRef.current = progress;
      const vid = ytId(item?.url);
      if (!vid || !user) return;
      const meta = { videoId: vid, title: item.title, sub: item.sub, c1: item.c1, c2: item.c2, url: item.url, type: item.type };
      onWatchStart?.({ ...meta, progress });
      persist(progress);
      addRecent(user, { ...meta, progress });
    },
    [item, user, persist, onWatchStart]
  );
  const handleTick = useCallback((progress) => {
    progressRef.current = progress;
  }, []);
  const handleSave = useCallback(
    (progress) => {
      progressRef.current = progress;
      persist(progress);
    },
    [persist]
  );
  const handleFinish = useCallback(() => {
    const vid = ytId(item?.url);
    if (!vid || !user) return;
    addRecent(user, { videoId: vid, title: item.title, sub: item.sub, c1: item.c1, c2: item.c2, url: item.url, type: item.type, progress: 100 });
  }, [item, user]);

  const handleClose = () => {
    const vid = ytId(item?.url);
    if (vid && user) {
      persist(progressRef.current);
      onWatchEnd?.();
    }
    onClose();
  };

  // Explicit "watched" toggle: cards show a tick + full bar regardless of how
  // far the timer got. Clearing it also clears stored progress.
  // Same key the cards use for progress/ticks, so playlist links (no watch id)
  // are still markable and match what the row renders.
  const videoIdForState = item ? videoKeyFor(item) : null;
  const watchedNow = !!(videoIdForState && isWatched?.(videoIdForState));
  const toggleWatched = useCallback(() => {
    if (!videoIdForState || !user) return;
    if (isWatched?.(videoIdForState)) unmarkWatched(videoIdForState);
    else markWatched(videoIdForState, { title: item.title, sub: item.sub, c1: item.c1, c2: item.c2, url: item.url, type: item.type });
    onWatchEnd?.();
  }, [videoIdForState, user, isWatched, markWatched, unmarkWatched, item, onWatchEnd]);

  if (!item) return null;
  const videoId = ytId(item.url);
  return (
    <Modal label={item.title} onClose={handleClose} className="mv-modal" style={{ "--c1": item.c1, "--c2": item.c2 }}>
      {videoId ? (
        <VideoPlayer
          videoId={videoId}
          title={item.title}
          thumb={ytThumb(item.url)}
          autoplay
          startTime={startTime}
          choreography={choreography}
          onStart={handleStart}
          onTick={handleTick}
          onSave={handleSave}
          onFinish={handleFinish}
        />
      ) : (
        // No usable video id (a placeholder/missing url): show the poster plus a
        // link instead of an empty modal, so the clip degrades gracefully.
        <div className="mv-modal-fallback">
          {ytThumb(item.url) ? (
            <SafeImg className="mv-modal-fallback-img" src={ytThumb(item.url)} alt="" width={1280} height={720} />
          ) : null}
          <p className="mv-modal-fallback-note">This clip can’t be played inside the app.</p>
          <a className="mv-modal-link" href={item.url} target="_blank" rel="noopener noreferrer">
            Open on YouTube
          </a>
        </div>
      )}
      <div className="mv-modal-info">
        <div className="mv-modal-meta">
          <span className="mv-modal-year">{item.sub}</span>
          <div className="mv-modal-actions">
            <button
              type="button"
              className={`watched-btn${watchedNow ? " watched-btn--on" : ""}`}
              onClick={toggleWatched}
              aria-pressed={watchedNow}
              title={watchedNow ? "Remove the watched mark" : "Mark as watched"}
            >
              {watchedNow ? "✓ Watched" : "Mark as watched"}
            </button>
            <HeartButton checked={isFav(favs, FAV_VIDEOS, favIdFor(item))} onClick={() => toggleFav(FAV_VIDEOS, favIdFor(item))} />
          </div>
        </div>
        <h2 className="mv-modal-title">{item.title}</h2>
        <a
          className="mv-modal-link"
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          ▶ Watch on YouTube
        </a>
      </div>
    </Modal>
  );
}

export default VideoModal;
