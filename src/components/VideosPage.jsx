import { memo, useMemo, useState } from "react";
import Modal from "./Modal";
import HeartButton from "./HeartButton";
import { useSession } from "../context/SessionContext.jsx";
import { FAV_VIDEOS, favIdFor, isFav } from "../utils/favorites";
import { ytId } from "../utils/format";
import channelData from "../data/youtubeVideos.json";
import "./rows.css";
import "./ContentCard.css";

// The channel's uploads (?view=videos), read from the file the build script
// writes (scripts/sync-youtube.mjs). The browser never calls YouTube for data —
// this is a static JSON import, so the page works offline and with no key.
//
// Playback is a click-to-load facade: the card, then the dialog, both show a
// poster until play is pressed, and only then is the `youtube-nocookie.com`
// iframe mounted. A grid of cards therefore costs a grid of thumbnails.
//
// The title filter and the pager are local scratch state for this visit; only
// the view itself is shareable (see useUrlState).

// How many cards "Load more" reveals at a time.
const PAGE_SIZE = 12;

// The still rungs the sync script stores, smallest first, with the real pixel
// width YouTube serves. Only the rungs the JSON actually carries are advertised
// in a srcset — a video with no maxres then offers a shorter ladder instead of a
// candidate that would 404. `hq`/`sd` are 4:3, so the grid's `object-fit: cover`
// crops their letterbox bars away.
const THUMB_RUNGS = [
  { key: "default", name: "default", width: 120 },
  { key: "medium", name: "mqdefault", width: 320 },
  { key: "high", name: "hqdefault", width: 480 },
  { key: "maxres", name: "maxresdefault", width: 1280 },
];

// The full ladder, largest first — a sensible default when a hand-written entry
// carries no `thumbnails` object at all (these two exist for every video).
const FALLBACK_RUNGS = [THUMB_RUNGS[2], THUMB_RUNGS[1]];

const VIEW_COUNT = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
});

const PLAY_GLYPH = (
  <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
    <path d="M8 5v14l11-7z" />
  </svg>
);

// Accepts the script's `{ channel, videos }` payload and, defensively, a bare
// array or an older `{ videos }` wrapper, so a hand-edited file still renders.
function videoList(payload) {
  const raw = Array.isArray(payload) ? payload : payload?.videos;
  return Array.isArray(raw) ? raw : [];
}

function videoId(video) {
  return video?.id || ytId(video?.url);
}

// The rungs this particular video can actually serve.
function availableRungs(video) {
  const present = THUMB_RUNGS.filter((rung) => video?.thumbnails?.[rung.key]);
  return present.length ? present : FALLBACK_RUNGS;
}

// A `srcset` across the available rungs. Paired with a `sizes` hint on the img,
// this is what stops a 280 kB maxres still being fetched for a 300px grid cell.
function thumbSrcSet(video, format = "webp") {
  const id = videoId(video);
  if (!id) return null;
  const dir = format === "webp" ? "vi_webp" : "vi";
  const ext = format === "webp" ? "webp" : "jpg";
  return availableRungs(video)
    .map((rung) => `https://i.ytimg.com/${dir}/${id}/${rung.name}.${ext} ${rung.width}w`)
    .join(", ");
}

// Single-URL fallback for the `<img src>` (the srcset, when usable, wins).
function thumbFallback(video, format = "jpeg") {
  const id = videoId(video);
  if (!id) return null;
  const { name } = availableRungs(video).at(-1);
  const dir = format === "webp" ? "vi_webp" : "vi";
  const ext = format === "webp" ? "webp" : "jpg";
  return `https://i.ytimg.com/${dir}/${id}/${name}.${ext}`;
}

// Grid artwork: WebP first with the JPEG rung of the same size as the fallback,
// and `sizes` matching the responsive `.videos-grid` so the browser downloads
// the smallest rung that fits.
function GridThumb({ video, loading = "lazy", sizes = "(max-width: 600px) 90vw, (max-width: 1000px) 45vw, 320px" }) {
  const src = thumbFallback(video, "jpeg");
  if (!src) return <div className="videos-thumb-fallback" />;
  return (
    <picture>
      <source type="image/webp" srcSet={thumbSrcSet(video, "webp")} sizes={sizes} />
      <img
        src={src}
        srcSet={thumbSrcSet(video, "jpeg")}
        sizes={sizes}
        alt=""
        width={480}
        height={270}
        loading={loading}
        decoding="async"
      />
    </picture>
  );
}

// 3:07 / 1:02:03. Returns "" when the source had no duration (the RSS
// fallback), so the card simply shows no badge instead of "0:00".
function durationLabel(video) {
  const total = video?.duration?.seconds;
  if (!Number.isFinite(total) || total <= 0) return "";
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = Math.floor(total % 60);
  const mm = hours ? String(minutes).padStart(2, "0") : String(minutes);
  return `${hours ? `${hours}:` : ""}${mm}:${String(seconds).padStart(2, "0")}`;
}

function viewLabel(count) {
  return Number.isFinite(count) ? `${VIEW_COUNT.format(count)} views` : "";
}

function publishedLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// Poster + play until the viewer commits, then the autoplaying embed. Opening
// the dialog on its own loads nothing from YouTube.
function PlayerModal({ video, onClose }) {
  const { favs, toggleFav } = useSession();
  const [playing, setPlaying] = useState(false);

  const date = publishedLabel(video.publishedAt);
  const duration = durationLabel(video);
  const views = viewLabel(video.viewCount);
  const favId = favIdFor(video);

  return (
    <Modal label={video.title} className="videos-modal" onClose={onClose}>
      <div className="videos-embed">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            className="videos-poster"
            onClick={() => setPlaying(true)}
            aria-label={`Play ${video.title}`}
          >
            <GridThumb
              video={video}
              loading="eager"
              sizes="(max-width: 900px) 92vw, 854px"
            />
            <span className="videos-poster-play" aria-hidden="true">
              {PLAY_GLYPH}
            </span>
          </button>
        )}
      </div>

      <h3 className="videos-modal-title">{video.title}</h3>
      <div className="videos-modal-meta">
        {date ? (
          <time dateTime={video.publishedAt || undefined}>{date}</time>
        ) : null}
        {duration ? <span>{duration}</span> : null}
        {views ? <span>{views}</span> : null}
        <a className="videos-modal-link" href={video.url} target="_blank" rel="noopener noreferrer">
          Open on YouTube
        </a>
        <HeartButton checked={isFav(favs, FAV_VIDEOS, favId)} onClick={() => toggleFav(FAV_VIDEOS, favId)} />
      </div>
      {video.description ? <p className="videos-modal-desc">{video.description}</p> : null}
    </Modal>
  );
}

export function VideosPage({ onClose }) {
  const { favs, toggleFav } = useSession();
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [active, setActive] = useState(null);

  const all = useMemo(() => videoList(channelData), []);
  const channel = channelData?.channel;

  // Title-only, case-insensitive — the same rule the browse page's filter uses.
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle
      ? all.filter((video) => String(video.title || "").toLowerCase().includes(needle))
      : all;
  }, [all, query]);

  // Resetting the pager happens here rather than in an effect on `filtered`, so
  // a new query can never render one frame behind the old count.
  const changeQuery = (value) => {
    setQuery(value);
    setShown(PAGE_SIZE);
  };

  const visible = filtered.slice(0, shown);
  const remaining = filtered.length - visible.length;
  const filtering = query.trim().length > 0;
  const latest = publishedLabel(all[0]?.publishedAt);

  return (
    <div className="browse-page" id="latest-videos">
      <div className="browse-page-bar">
        <button type="button" className="browse-page-back" onClick={onClose}>
          ← Back to browse
        </button>
      </div>

      <h2 className="browse-page-title">Latest videos ({all.length})</h2>
      <p className="videos-subtitle">
        The newest uploads from the SEVENTEEN YouTube channel
        {channel?.handle ? ` (${channel.handle})` : ""}, newest first
        {latest ? ` — latest on ${latest}` : ""}.
      </p>

      <div className="browse-filters">
        <div className="browse-filter">
          <label className="browse-filter-label" htmlFor="videos-title-filter">
            Filter by title
          </label>
          <span className="browse-field">
            <input
              id="videos-title-filter"
              type="text"
              value={query}
              onChange={(e) => changeQuery(e.target.value)}
              placeholder="Type a title…"
              autoComplete="off"
            />
            {filtering && (
              <button
                type="button"
                className="browse-field-clear"
                onClick={() => changeQuery("")}
                aria-label="Clear the title filter"
              >
                ✕
              </button>
            )}
          </span>
        </div>
        <span className="browse-match-count" role="status" aria-live="polite">
          {filtering ? `${filtered.length} matching ${filtered.length === 1 ? "video" : "videos"}` : ""}
        </span>
      </div>

      {all.length === 0 ? (
        <div className="browse-empty">
          <p className="browse-empty-title">No videos yet.</p>
          <p className="browse-empty-hint">
            Run <code>npm run sync:youtube</code> to pull the channel's uploads into{" "}
            <code>src/data/youtubeVideos.json</code>.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="browse-empty">
          <p className="browse-empty-title">No videos match "{query.trim()}".</p>
          <p className="browse-empty-hint">The filter looks at titles only — try a shorter word.</p>
          <button type="button" className="browse-empty-btn" onClick={() => changeQuery("")}>
            Clear search
          </button>
        </div>
      ) : (
        <>
          <ul className="videos-grid">
            {visible.map((video) => {
              const date = publishedLabel(video.publishedAt);
              const duration = durationLabel(video);
              const views = viewLabel(video.viewCount);
              const favId = favIdFor(video);
              return (
                <li className="videos-card" key={video.id}>
                  <button
                    type="button"
                    className="videos-thumb"
                    onClick={() => setActive(video)}
                    aria-label={`Play ${video.title}`}
                  >
                    <GridThumb video={video} />
                    <span className="videos-thumb-play" aria-hidden="true">
                      {PLAY_GLYPH}
                    </span>
                    {duration ? <span className="videos-duration">{duration}</span> : null}
                  </button>
                  <HeartButton
                    checked={isFav(favs, FAV_VIDEOS, favId)}
                    onClick={() => toggleFav(FAV_VIDEOS, favId)}
                  />
                  <h3 className="videos-card-title">{video.title}</h3>
                  <div className="videos-card-meta">
                    {date ? (
                      <time dateTime={video.publishedAt || undefined}>{date}</time>
                    ) : null}
                    {views ? <span className="videos-card-views">{views}</span> : null}
                    <a className="videos-card-link" href={video.url} target="_blank" rel="noopener noreferrer">
                      Open on YouTube
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="videos-footer">
            <span className="videos-status" role="status" aria-live="polite">
              Showing {visible.length} of {filtered.length}
            </span>
            {remaining > 0 && (
              <button
                type="button"
                className="videos-more"
                onClick={() => setShown((count) => count + PAGE_SIZE)}
              >
                Load more ({remaining} left)
              </button>
            )}
          </div>
        </>
      )}

      {active && <PlayerModal video={active} onClose={() => setActive(null)} />}
    </div>
  );
}

export default memo(VideosPage);
