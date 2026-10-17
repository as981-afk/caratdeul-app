import { memo } from "react";
import HeartButton from "./HeartButton";
import CardProgress from "./CardProgress";
import MemberChips from "./MemberChips";
import { useSession } from "../context/SessionContext.jsx";
import { pressable, ytThumb } from "../utils/format";
import { FAV_VIDEOS, favIdFor, isFav } from "../utils/favorites";
import { videoKeyFor } from "../utils/rowControls";
import "./ContentCard.css";

// The catalogue card shared by the era timeline and the generated member
// playlist. Same markup and hooks as the row cards (member chips, favourite
// heart, watch progress) plus a meta line, so these newer views look and behave
// like the rest of the catalogue.
//
// It takes a catalogue entry — `{ item, badge, year, album, modal }` as built by
// `contentCatalog()` — and hands that same entry back to `onOpen(entry)`, which
// is what the watch modals expect (see `MemberSection`). Sizing is left to the
// container: `.row-scroll` keeps the row min-width, `.card-grid` lets the cell
// size the card.
export function ContentCard({ entry, onOpen }) {
  const { favs, toggleFav, progressFor, isWatched } = useSession();
  const { item } = entry;
  const key = videoKeyFor(item);
  const thumb = ytThumb(item.url);
  const label = [entry.badge, entry.year, item.sub || entry.album].filter(Boolean).join(" · ");

  return (
    <div
      className="card"
      style={{ "--c1": item.c1, "--c2": item.c2, backgroundImage: thumb ? `url(${thumb})` : undefined }}
      {...pressable(() => onOpen(entry))}
    >
      <div className="card-overlay"></div>
      <MemberChips sub={item.sub} />
      <HeartButton checked={isFav(favs, FAV_VIDEOS, favIdFor(item))} onClick={() => toggleFav(FAV_VIDEOS, favIdFor(item))} />
      <div className="title">{item.title}</div>
      {label ? <div className="card-meta">{label}</div> : null}
      <CardProgress progress={progressFor ? progressFor(key) : 0} watched={isWatched ? isWatched(key) : false} />
    </div>
  );
}

export default memo(ContentCard);
