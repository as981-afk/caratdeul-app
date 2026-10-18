// Turns the raw dates in data/DATES.js into the next few things worth counting
// down to: the debut and fandom anniversaries, member birthdays, and upcoming
// comebacks — soonest first.

import { ANNIVERSARIES, BIRTHDAYS, COMEBACKS } from "../data/DATES";
import { MS_PER_DAY, dateInYear, parseDateParts, startOfDay } from "./time";

// Next occurrence of a recurring month/day, counting today as an occurrence so
// the banner can say "Today" instead of counting down a whole year.
function nextRecurring(month, day, now) {
  let at = dateInYear(now.getFullYear(), month, day);
  if (at.getTime() + MS_PER_DAY <= now.getTime()) {
    at = dateInYear(now.getFullYear() + 1, month, day);
  }
  return at;
}

// "Nov 7" — and "Feb 14, 2027" when the occurrence falls in a later year.
function dateLabel(at, now) {
  const sameYear = at.getFullYear() === now.getFullYear();
  return at.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

// Upcoming events, soonest first.
//
// Each event is:
//   { id, kind, title, detail, blurb, at, isToday, dateLabel }
// where `at` is a ms timestamp (local midnight of the event day), `kind` is
// "anniversary" | "birthday" | "comeback", and `detail` is the short right-hand
// line ("#12", "turns 29", "Mini album").
//
// `limit` caps how many banners come back, and the selection takes the nearest
// event of *each kind* first — otherwise a cluster of upcoming birthdays would
// push the debut anniversary and the next comeback off the strip entirely.
// `hiddenKinds` (an array of kind names) drops event kinds the viewer has muted
// in their profile notification preferences.
export function upcomingEvents(now = new Date(), { limit = 3, hiddenKinds = [] } = {}) {
  const nowTs = now.getTime();
  const todayTs = startOfDay(now).getTime();
  const muted = hiddenKinds instanceof Set ? hiddenKinds : new Set(hiddenKinds);
  const events = [];

  for (const a of ANNIVERSARIES) {
    const at = nextRecurring(a.month, a.day, now);
    events.push({
      id: `anniversary-${a.id}`,
      kind: "anniversary",
      title: a.title,
      detail: `#${at.getFullYear() - a.since}`,
      at: at.getTime(),
    });
  }

  for (const b of BIRTHDAYS) {
    const parts = parseDateParts(b.birthday);
    if (!parts) continue;
    const at = nextRecurring(parts.month, parts.day, now);
    events.push({
      id: b.id,
      kind: "birthday",
      title: `${b.name}'s Birthday`,
      detail: `turns ${at.getFullYear() - parts.year}`,
      at: at.getTime(),
    });
  }

  for (const c of COMEBACKS) {
    const parts = parseDateParts(c.date);
    if (!parts) continue;
    const at = dateInYear(parts.year, parts.month, parts.day);
    events.push({
      id: c.id,
      kind: "comeback",
      title: c.title,
      detail: c.kind,
      blurb: c.blurb,
      at: at.getTime(),
    });
  }

  const sorted = events
    .filter((e) => e.at >= todayTs && !muted.has(e.kind))
    .map((e) => ({
      ...e,
      isToday: e.at <= nowTs && nowTs < e.at + MS_PER_DAY,
      dateLabel: dateLabel(new Date(e.at), now),
    }))
    .sort((a, b) => a.at - b.at);

  // Nearest event of each kind first (the loop runs in date order, so the result
  // stays sorted), then anything else up to the limit.
  const seenKinds = new Set();
  const picked = [];
  for (const event of sorted) {
    if (seenKinds.has(event.kind)) continue;
    seenKinds.add(event.kind);
    picked.push(event);
    if (picked.length >= limit) break;
  }
  for (const event of sorted) {
    if (picked.length >= limit) break;
    if (!picked.includes(event)) picked.push(event);
  }
  return picked.slice(0, limit).sort((a, b) => a.at - b.at);
}
