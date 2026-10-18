import { memo, useMemo, useState } from "react";
import SafeImg from "./SafeImg";
import EntryModal from "./EntryModal";
import { pickPool } from "../utils/content";
import { pickOfTheDay } from "../utils/caratPick";
import { useNow } from "../hooks/useNow";
import { ytThumb } from "../utils/format";
import "./CaratPick.css";

// "Carat Pick" — the one title everyone is pointed at today.
//
// The pool is the whole catalogue in a fixed order and the index comes from the
// local calendar date alone, so the pick is identical for every user on the
// same day and rolls over at their local midnight (the minute-granularity clock
// exists just to catch that rollover in a long-lived tab).
export function CaratPick({ onWatchEnd }) {
  const [open, setOpen] = useState(false);
  const now = useNow(60000);

  const pool = useMemo(() => pickPool(), []);
  const pick = useMemo(() => pickOfTheDay(pool, new Date(now)), [pool, now]);

  if (!pick) return null;
  const { item, badge, year, album, group } = pick;

  // "MV · 2023 · FML · DINO" — the performer tag is dropped when it would just
  // repeat the badge (an episode's sub is already "EP. 150").
  const metaParts = [badge, year, album || group];
  if (item.sub && !item.sub.startsWith(badge)) metaParts.push(item.sub);
  const meta = metaParts.filter(Boolean).join(" · ");
  const thumb = ytThumb(item.url);

  return (
    <section
      className="carat-pick"
      id="carat-pick"
      aria-labelledby="carat-pick-title"
      style={{ "--c1": item.c1, "--c2": item.c2 }}
    >
      <div className="carat-pick-media">
        {thumb ? (
          <SafeImg src={thumb} alt="" width={480} height={270} />
        ) : (
          <div className="carat-pick-media-fallback" />
        )}
        <span className="carat-pick-badge">{badge}</span>
      </div>

      <div className="carat-pick-body">
        <span className="carat-pick-kicker">
          <span className="carat-pick-star" aria-hidden="true">★</span> Carat Pick
          <span className="carat-pick-date">
            {new Date(now).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        </span>
        <h2 className="carat-pick-title" id="carat-pick-title">{item.title}</h2>
        <p className="carat-pick-meta">{meta}</p>
        {item.desc ? <p className="carat-pick-desc">{item.desc}</p> : null}
        <div className="carat-pick-actions">
          <button type="button" className="carat-pick-play" onClick={() => setOpen(true)}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
              <path d="M6 4l15 8-15 8V4z" />
            </svg>
            Play today&rsquo;s pick
          </button>
          <span className="carat-pick-note">One pick a day, the same for every Carat.</span>
        </div>
      </div>

      {open && <EntryModal entry={pick} onClose={() => setOpen(false)} onWatchEnd={onWatchEnd} />}
    </section>
  );
}

export default memo(CaratPick);
