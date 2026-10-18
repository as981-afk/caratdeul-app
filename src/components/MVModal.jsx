import { useCallback, useRef } from "react";
import Modal from "./Modal";
import SafeImg from "./SafeImg";
import VideoPlayer from "./VideoPlayer";
import HeartButton from "./HeartButton";
import { useSession } from "../context/SessionContext.jsx";
import { ytThumb, ytId } from "../utils/format";
import { FAV_VIDEOS, favIdFor, isFav } from "../utils/favorites";
import { addOrUpdateCW, addRecent, removeFromCW, cwTiming, CW_FINISHED_PERCENT } from "../utils/watchHistory";
import { saveVideoProgress } from "../utils/watched";
import { videoKeyFor } from "../utils/rowControls";
import "./MVModal.css";

export function MVModal({ mv, onClose, onWatchEnd }) {
  const progressRef = useRef(0);
  // `profileId` (aliased to `user`) owns the watch-history writes; per-profile
  // storage is keyed by profile id now, not the account name.
  const { profileId: user, favs, toggleFav, isWatched, markWatched, unmarkWatched } = useSession();

  // Writes the current position to Continue Watching and to the watched store.
  // Called on the ~5s throttle, on finish, on explicit close and on unmount.
  const persist = useCallback(
    (progress) => {
      const vid = ytId(mv?.url);
      if (!vid || !user) return;
      const meta = { title: mv.title, sub: mv.sub, c1: mv.c1, c2: mv.c2, url: mv.url };
      // Reaching the finish threshold takes the entry out of Continue Watching.
      if (progress >= CW_FINISHED_PERCENT) removeFromCW(user, vid);
      else addOrUpdateCW(user, { videoId: vid, ...meta, progress, ...cwTiming(progress) });
      saveVideoProgress(user, vid, progress, meta);
    },
    [mv, user]
  );

  // Player → storage wiring: `onTick` mirrors the live position into a ref for
  // the explicit-close write; `onSave` is the throttled/finish/unmount write.
  const handleStart = useCallback(
    (progress) => {
      progressRef.current = progress;
      const vid = ytId(mv?.url);
      if (!vid || !user) return;
      const meta = { videoId: vid, title: mv.title, sub: mv.sub, c1: mv.c1, c2: mv.c2, url: mv.url };
      persist(progress);
      addRecent(user, { ...meta, progress });
    },
    [mv, user, persist]
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
    const vid = ytId(mv?.url);
    if (!vid || !user) return;
    addRecent(user, { videoId: vid, title: mv.title, sub: mv.sub, c1: mv.c1, c2: mv.c2, url: mv.url, progress: 100 });
  }, [mv, user]);

  const handleClose = () => {
    const vid = ytId(mv?.url);
    if (vid && user) {
      persist(progressRef.current);
      onWatchEnd?.();
    }
    onClose();
  };

  const videoIdForState = mv ? videoKeyFor(mv) : null;
  const watchedNow = !!(videoIdForState && isWatched?.(videoIdForState));
  const toggleWatched = useCallback(() => {
    if (!videoIdForState || !user) return;
    if (isWatched?.(videoIdForState)) unmarkWatched(videoIdForState);
    else markWatched(videoIdForState, { title: mv.title, sub: mv.sub, c1: mv.c1, c2: mv.c2, url: mv.url });
    onWatchEnd?.();
  }, [videoIdForState, user, isWatched, markWatched, unmarkWatched, mv, onWatchEnd]);

  if (!mv) return null;
  const videoId = ytId(mv.url);
  return (
    <Modal label={mv.title} onClose={handleClose} className="mv-modal" style={{ "--c1": mv.c1, "--c2": mv.c2 }}>
      {videoId ? (
        <VideoPlayer
          videoId={videoId}
          title={mv.title}
          thumb={ytThumb(mv.url)}
          autoplay
          onStart={handleStart}
          onTick={handleTick}
          onSave={handleSave}
          onFinish={handleFinish}
        />
      ) : (
        // No playable id (a playlist-only url, or a missing one): show the poster
        // and say so, instead of an empty modal body. Same shape as VideoModal.
        <div className="mv-modal-fallback">
          {ytThumb(mv.url) ? (
            <SafeImg className="mv-modal-fallback-img" src={ytThumb(mv.url)} alt="" width={1280} height={720} />
          ) : null}
          <p className="mv-modal-fallback-note">
            This music video has no playable video id yet, so it can’t play inside the app.
          </p>
          <a className="mv-modal-link" href={mv.url} target="_blank" rel="noopener noreferrer">
            Open on YouTube
          </a>
        </div>
      )}
      <div className="mv-modal-info">
        <div className="mv-modal-meta">
          <span className="mv-modal-year">{mv.year}</span>
          <span className="mv-modal-album">{mv.album}</span>
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
            <HeartButton checked={isFav(favs, FAV_VIDEOS, favIdFor(mv))} onClick={() => toggleFav(FAV_VIDEOS, favIdFor(mv))} />
          </div>
        </div>
        <h2 className="mv-modal-title">{mv.title}</h2>
        <p className="mv-modal-desc">{mv.desc}</p>
        <a
          className="mv-modal-link"
          href={mv.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          ▶ Watch on YouTube
        </a>
      </div>
    </Modal>
  );
}

export default MVModal;
