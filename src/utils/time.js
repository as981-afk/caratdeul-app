// Date primitives shared by the countdown banners and the daily pick.
//
// Everything here works in the viewer's local time on purpose: "today" means
// today where the user is, so a banner flips over at their midnight, and the
// daily pick changes on their calendar day (everyone whose local date matches
// sees the same pick).

// Local calendar day key, "2026-10-17". The unit the daily pick is built from.
export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Local midnight at the start of `date`'s calendar day.
export function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export const MS_PER_DAY = 86400000;

// Parses the two date shapes used in the data files — "1995.08.05" (birthdays)
// and "2026-11-27" (fixed dates) — into { year, month, day } (month is 1-based),
// or null when the value isn't a usable date.
export function parseDateParts(value) {
  const match = String(value ?? "").match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

// `month`/`day` in `year`, clamped to the last real day of that month so a
// 29 Feb birthday lands on the 28th in a non-leap year instead of rolling into
// March.
export function dateInYear(year, month, day) {
  const lastDay = new Date(year, month, 0).getDate();
  return new Date(year, month - 1, Math.min(day, lastDay));
}

// Countdown segments for a millisecond duration. Never negative, so a banner
// sitting on its event simply shows all zeros.
export function countdownParts(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}
