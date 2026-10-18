// Every dated event the app can put a countdown on.
//
// This is the only file that needs editing to add or change one: anniversaries
// and comebacks are listed literally, and member birthdays are derived from the
// profiles so a member's birthday exists in exactly one place.
//
// Recurring entries (anniversaries, birthdays) roll over automatically — they
// are matched on month + day and resolved to their next occurrence, so the
// banners keep working year after year. Comebacks use a fixed date and simply
// drop out of the list once they are in the past.

import { MEMBERS } from "./MEMBERS";

// SEVENTEEN debuted on 26 May 2015.
export const ANNIVERSARIES = [
  { id: "debut", title: "Debut Anniversary", month: 5, day: 26, since: 2015 },
];

// Upcoming releases. `date` is an ISO day (local midnight) and the entry drops
// out of the banner list once it has passed.
export const COMEBACKS = [
  {
    id: "cb-winter-letters",
    title: "Winter Letters",
    kind: "Mini album",
    date: "2026-11-27",
    blurb: "A cold-season mini-album announced with a hand-written letter teaser.",
  },
  {
    id: "cb-together",
    title: "Together",
    kind: "Special album",
    date: "2027-01-16",
    blurb: "A special album built around the fan-dedicated track teased at the encore shows.",
  },
  {
    id: "cb-japan-single",
    title: "Hikari",
    kind: "Japan single",
    date: "2027-04-01",
    blurb: "The next Japanese single, with a spring-themed performance video.",
  },
];

// Member birthdays, derived from the profiles ("1995.08.05") so updating a
// member's birthday in MEMBERS.js is all it takes.
export const BIRTHDAYS = MEMBERS.filter((m) => m.birthday).map((m) => ({
  id: `birthday-${m.name}`,
  name: m.name,
  birthday: m.birthday,
}));
