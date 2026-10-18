import { useState } from "react";
import { isPlaylistOnly, ytThumb, ytThumbSrcSet } from "../utils/format";

// Artwork for the shared `.card` / `.continue-card` tiles.
//
// These tiles used to paint their still through an inline `background-image`.
// A CSS background cannot be lazy-loaded, cannot be decoded off the main thread,
// and gives the browser no size hints — so every card in every mounted row fired
// its request at once, dozens of images competing with the row chunks and the
// Supabase fetch, which is why the skeletons lingered. Rendering a real <img>
// instead lets the browser defer off-screen art, decode asynchronously, and pick
// the smaller rung of YouTube's ladder for a smaller slot.
//
// The card already carries its gradient (`.card`, plus `.card-overlay`), so a
// still that never loads simply reveals that gradient rather than a broken-image
// icon — and anything with no artwork gets a badge instead: "Unavailable" for a
// missing or dead video id, "Playlist" for a url that only opens on YouTube.
//
// A <picture> offers WebP first with the JPEG rung of the same size as the
// guaranteed fallback. Both advertised rungs (`default` 120w, `mqdefault` 320w)
// exist for every public video, so the srcset can never resolve to a 404.
export default function CardThumb({
  url,
  alt = "",
  sizes = "(max-width: 600px) 230px, 280px",
  loading = "lazy",
  width = 320,
  height = 180,
}) {
  const [broken, setBroken] = useState(false);
  // A playlist-only url has no still to show, but it is not broken — it opens on
  // YouTube. Badge it as such and leave the click alone, so the modal's "Open on
  // YouTube" fallback stays reachable.
  if (isPlaylistOnly(url)) return <span className="card-thumb-playlist">Playlist</span>;

  // No url at all, or the still 404s — which is exactly how a wrong or deleted
  // video id shows up, since i.ytimg.com answers 404 for an id that does not
  // exist. Either way there is no artwork and no playable video (a deleted
  // video's embed renders YouTube's black "Video unavailable" panel), so the
  // card's gradient is the backdrop and this badge explains the empty tile.
  // `data-unavailable` is what `pressable()` (utils/format.js) looks for to drop
  // the click, so an unusable card never opens a dead player, and
  // `pointer-events: none` keeps the badge itself clear of the card's click.
  if (!url || broken)
    return (
      <span className="card-thumb-missing" data-unavailable="1">
        Unavailable
      </span>
    );

  return (
    <picture className="card-thumb">
      <source type="image/webp" srcSet={ytThumbSrcSet(url)} sizes={sizes} />
      <img
        className="card-thumb-img"
        src={ytThumb(url, { format: "jpeg" })}
        srcSet={ytThumbSrcSet(url, { format: "jpeg" })}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        onError={() => {
          // A 404 from i.ytimg.com means the id is dead, but the same event
          // fires for a request that merely failed while offline — don't turn a
          // perfectly good video into an unclickable card just because the
          // network dropped.
          if (navigator.onLine !== false) setBroken(true);
        }}
      />
    </picture>
  );
}
