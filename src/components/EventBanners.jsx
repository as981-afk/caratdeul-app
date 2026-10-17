import { memo, useMemo } from "react";
import { useNow } from "../hooks/useNow";
import { upcomingEvents } from "../utils/events";
import { countdownParts } from "../utils/time";
import "./EventBanners.css";

const KIND_LABEL = {
  anniversary: "Anniversary",
  birthday: "Birthday",
  comeback: "Comeback",
};

// Live countdown to a single event. Renders "Today" on the day itself, and never
// announces itself to screen readers on every tick (no aria-live).
function Countdown({ at, now }) {
  if (now >= at) {
    return <span className="event-banner-today">🎉 Today</span>;
  }
  const { days, hours, minutes, seconds } = countdownParts(at - now);
  const units = [
    [days, "d"],
    [hours, "h"],
    [minutes, "m"],
    [seconds, "s"],
  ];
  return (
    <span className="event-banner-countdown">
      {units.map(([value, suffix]) => (
        <span className="event-banner-unit" key={suffix}>
          <span className="event-banner-value">{String(value).padStart(2, "0")}</span>
          <span className="event-banner-suffix">{suffix}</span>
        </span>
      ))}
    </span>
  );
}

// Banners for the upcoming dated events (debut / fandom anniversary, member
// birthdays, and announced comebacks), soonest first, each on a live countdown.
//
// The schedule is derived from the same ticking clock, so the list rolls over on
// its own at midnight (and drops a comeback as it passes) without a reload.
//
// `notifications` comes from the active profile: muting birthdays or comebacks
// removes those banners for that profile only.
export function EventBanners({ limit = 3, notifications }) {
  const now = useNow(1000);
  const hiddenKinds = useMemo(() => {
    const hidden = [];
    if (notifications?.birthdays === false) hidden.push("birthday");
    if (notifications?.comebacks === false) hidden.push("comeback");
    return hidden;
  }, [notifications]);
  const events = useMemo(() => upcomingEvents(new Date(now), { limit, hiddenKinds }), [now, limit, hiddenKinds]);

  if (!events.length) return null;

  return (
    <section className="event-banners" aria-label="Upcoming SEVENTEEN dates">
      <ul className="event-banner-list">
        {events.map((event) => (
          <li key={event.id} className={`event-banner event-banner--${event.kind}`}>
            <span className="event-banner-kind">{KIND_LABEL[event.kind] || event.kind}</span>
            <div className="event-banner-body">
              <span className="event-banner-title">{event.title}</span>
              <span className="event-banner-sub">
                {event.dateLabel}
                {event.detail ? ` · ${event.detail}` : ""}
              </span>
            </div>
            <Countdown at={event.at} now={now} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default memo(EventBanners);
