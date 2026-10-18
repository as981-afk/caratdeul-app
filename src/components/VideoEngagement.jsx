import { useCallback, useMemo, useState } from "react";
import { useSessionIdentity } from "../context/SessionContext.jsx";
import {
  REACTION_EMOJIS,
  reactionsFor,
  addReaction,
  removeReaction,
} from "../utils/reactions";
import { commentsFor, addComment, removeComment, COMMENT_MAX } from "../utils/comments";
import { sanitizeText } from "../utils/sanitize";
import { CW_NOMINAL_SECONDS } from "../utils/watchHistory";
import "./VideoEngagement.css";

// Reactions + comments panel, rendered under the player by VideoPlayer.
//
// Both are stored per profile and per video, entirely on-device:
//   reactions → utils/reactions.js   (emoji pinned to a moment on the timeline)
//   comments  → utils/comments.js    (sanitised, length-capped text)
//
// `currentTime` (seconds) is the moment a new reaction is pinned to; `onSeek`
// jumps playback to a stored reaction's moment.

function fmtTime(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  const m = Math.floor(s / 60);
  const rest = String(s % 60).padStart(2, "0");
  return `${m}:${rest}`;
}

export function VideoEngagement({ videoId, currentTime = 0, onSeek }) {
  const { profileId } = useSessionIdentity();
  const [tab, setTab] = useState("reactions");
  // Seeded from storage on mount; VideoPlayer keys this component by videoId, so
  // a different video gets a fresh mount rather than a state reset.
  const [reactions, setReactions] = useState(() => reactionsFor(profileId, videoId));
  const [comments, setComments] = useState(() => commentsFor(profileId, videoId));
  const [draft, setDraft] = useState("");

  const reloadReactions = useCallback(() => {
    setReactions(reactionsFor(profileId, videoId));
  }, [profileId, videoId]);

  const reloadComments = useCallback(() => {
    setComments(commentsFor(profileId, videoId));
  }, [profileId, videoId]);

  const reactionCounts = useMemo(() => {
    const counts = new Map();
    for (const r of reactions) counts.set(r.emoji, (counts.get(r.emoji) || 0) + 1);
    return counts;
  }, [reactions]);

  const handleReact = useCallback(
    (emoji) => {
      addReaction(profileId, videoId, emoji, currentTime);
      reloadReactions();
    },
    [profileId, videoId, currentTime, reloadReactions]
  );

  const handleRemoveReaction = useCallback(
    (id) => {
      removeReaction(profileId, videoId, id);
      reloadReactions();
    },
    [profileId, videoId, reloadReactions]
  );

  const handleComment = useCallback(
    (e) => {
      e.preventDefault();
      const clean = sanitizeText(draft);
      if (!clean) return;
      addComment(profileId, videoId, clean);
      setDraft("");
      reloadComments();
    },
    [draft, profileId, videoId, reloadComments]
  );

  const handleRemoveComment = useCallback(
    (id) => {
      removeComment(profileId, videoId, id);
      reloadComments();
    },
    [profileId, videoId, reloadComments]
  );

  const remaining = COMMENT_MAX - sanitizeText(draft).length;

  return (
    <div className="video-engagement">
      <div className="engagement-tabs" role="tablist" aria-label="Engagement">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "reactions"}
          className={`engagement-tab${tab === "reactions" ? " engagement-tab--active" : ""}`}
          onClick={() => setTab("reactions")}
        >
          Moments{reactions.length ? ` (${reactions.length})` : ""}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "comments"}
          className={`engagement-tab${tab === "comments" ? " engagement-tab--active" : ""}`}
          onClick={() => setTab("comments")}
        >
          Comments{comments.length ? ` (${comments.length})` : ""}
        </button>
      </div>

      {tab === "reactions" ? (
        <div className="engagement-panel" role="tabpanel" aria-label="Reactions">
          <div className="reaction-picker">
            <span className="reaction-hint">
              React at <strong>{fmtTime(currentTime)}</strong>
            </span>
            <div className="reaction-buttons">
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="reaction-btn"
                  onClick={() => handleReact(emoji)}
                  title={`React ${emoji} at ${fmtTime(currentTime)}`}
                  aria-label={`React with ${emoji}`}
                >
                  <span aria-hidden="true">{emoji}</span>
                  {reactionCounts.has(emoji) && (
                    <span className="reaction-btn-count">{reactionCounts.get(emoji)}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="reaction-timeline" aria-label="Reaction moments">
            <span className="reaction-timeline-track" />
            {reactions.map((r) => (
              <button
                key={r.id}
                type="button"
                className="reaction-marker"
                style={{ left: `${Math.min(100, (r.t / CW_NOMINAL_SECONDS) * 100)}%` }}
                onClick={() => onSeek?.(r.t)}
                title={`${r.emoji} at ${fmtTime(r.t)} — jump`}
                aria-label={`Jump to reaction ${r.emoji} at ${fmtTime(r.t)}`}
              >
                {r.emoji}
              </button>
            ))}
          </div>

          {reactions.length ? (
            <ul className="reaction-list">
              {reactions.map((r) => (
                <li key={r.id} className="reaction-row">
                  <button type="button" className="reaction-row-jump" onClick={() => onSeek?.(r.t)}>
                    <span className="reaction-row-emoji" aria-hidden="true">{r.emoji}</span>
                    <span className="reaction-row-time">{fmtTime(r.t)}</span>
                  </button>
                  <button
                    type="button"
                    className="reaction-row-remove"
                    onClick={() => handleRemoveReaction(r.id)}
                    aria-label={`Remove reaction at ${fmtTime(r.t)}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="engagement-empty">No moments yet — tap an emoji to pin one here.</p>
          )}
        </div>
      ) : (
        <div className="engagement-panel" role="tabpanel" aria-label="Comments">
          <form className="comment-form" onSubmit={handleComment}>
            <textarea
              className="comment-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, COMMENT_MAX))}
              placeholder="Add a comment…"
              rows={2}
              maxLength={COMMENT_MAX}
              aria-label="Write a comment"
            />
            <div className="comment-form-row">
              <span className={`comment-count${remaining < 20 ? " comment-count--low" : ""}`}>
                {remaining}
              </span>
              <button type="submit" className="comment-submit" disabled={!sanitizeText(draft)}>
                Post
              </button>
            </div>
          </form>

          {comments.length ? (
            <ul className="comment-list">
              {comments
                .slice()
                .reverse()
                .map((c) => (
                  <li key={c.id} className="comment-row">
                    <div className="comment-body">
                      <span className="comment-text">{c.text}</span>
                      <span className="comment-meta">{new Date(c.at).toLocaleString()}</span>
                    </div>
                    <button
                      type="button"
                      className="comment-remove"
                      onClick={() => handleRemoveComment(c.id)}
                      aria-label="Delete comment"
                    >
                      ✕
                    </button>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="engagement-empty">No comments yet — be the first Carat.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default VideoEngagement;
