// Annotated, flattened view of every content catalogue, shared by the search
// page, the member pages, the era timeline and the generated playlists.
//
// Each entry pairs a raw item with the metadata those views filter on: its
// content type, the members/units it credits (an explicit `members` array of
// member ids, else derived from `sub`), its year (an explicit `year` field, else
// a 4-digit year found in the title/sub/album) and its album.

import { MVS } from "../data/MVS";
import { GOING_SEVENTEEN } from "../data/GOING_SEVENTEEN";
import { NANA_TOUR } from "../data/NANA_TOUR";
import { CONCERTS } from "../data/CONCERTS";
import { SIDE_TRACKS } from "../data/SIDE_TRACKS";
import { CHOREOGRAPHY } from "../data/CHOREOGRAPHY";
import { MEMBERS } from "../data/MEMBERS";
import { ytId } from "./format.js";
import {
  memberId,
  memberUnits,
  membersInSub,
  unitLabelUnits,
  unitsForSub,
  MEMBER_UNITS,
} from "./memberMatch";

// Content types, in display order. `label` drives the filter, `group` the
// results heading, `badge` the card tag, and `modal` the watch modal to open.
export const CONTENT_TYPES = [
  { value: "mv", label: "MV", group: "Music Videos", badge: "MV", modal: "mv", items: MVS },
  { value: "gose", label: "Go! Seventeen", group: "Going Seventeen", badge: "EP", modal: "gose", items: GOING_SEVENTEEN },
  { value: "nana", label: "Nana Tour", group: "Nana Tour", badge: "Episode", modal: "video", items: NANA_TOUR },
  { value: "concert", label: "Concert", group: "Concerts", badge: "Concert", modal: "video", items: CONCERTS },
  { value: "song", label: "Song", group: "Songs", badge: "Song", modal: "mv", items: SIDE_TRACKS },
  { value: "choreo", label: "Choreography", group: "Choreography", badge: "Choreo", modal: "video", items: CHOREOGRAPHY },
];

// Members credited by an item. Catalogues normally name their performers as
// free text on `sub`; choreography items instead carry explicit member ids, so
// those win when present (an empty array means "the whole group").
function entryMembers(item) {
  if (!Array.isArray(item?.members)) return membersInSub(item?.sub);
  return MEMBERS.filter((m) => item.members.includes(memberId(m)));
}

// Units an item belongs to: the named members' units (or the explicit unit
// credit on `sub` for the catalogues that credit a unit by name).
function entryUnits(item) {
  if (!Array.isArray(item?.members)) return unitsForSub(item?.sub);
  const units = new Set();
  for (const m of entryMembers(item)) for (const u of memberUnits(m)) units.add(u);
  return MEMBER_UNITS.filter((u) => units.has(u));
}

const YEAR_RE = /\b(19|20)\d{2}\b/;

export function yearOf(item) {
  if (!item) return "";
  const direct = String(item.year || "").match(YEAR_RE);
  if (direct) return direct[0];
  const guess = `${item.title || ""} ${item.sub || ""} ${item.album || ""}`.match(YEAR_RE);
  return guess ? guess[0] : "";
}

let catalog = null;

// One entry per catalogue item: { item, type, group, badge, modal, members,
// units, year, album }. Built once and reused (the member pages, the era
// timeline and search all scan the whole catalog).
export function contentCatalog() {
  if (!catalog) {
    catalog = CONTENT_TYPES.flatMap((t) =>
      t.items.map((item) => ({
        item,
        type: t.value,
        group: t.group,
        badge: t.badge,
        modal: t.modal,
        members: entryMembers(item),
        units: entryUnits(item),
        year: yearOf(item),
        album: item.album || "",
      }))
    );
  }
  return catalog;
}

// Distinct years present in the catalog, newest first.
export function yearOptions() {
  const years = new Set();
  for (const e of contentCatalog()) if (e.year) years.add(e.year);
  return [...years].sort((a, b) => Number(b) - Number(a));
}

// True when every named member shares `unit` and there are at least two of them
// (a unit collaboration such as "DK AND SEUNGKWAN").
function isUnitCollaboration(members, unit) {
  return members.length >= 2 && members.every((m) => memberUnits(m).includes(unit));
}

// Splits a member's content into the profile sections:
//   solo  - the member is the only performer named
//   unit  - the item credits the member's unit (explicit label or unit collab)
//   related - anything else that names the member (mixed collaborations, ...)
//   choreography - the member's dance practices / dance versions / performances
//                  / fancams, kept apart so the profile can give them their own
//                  row instead of burying them in the general buckets
export function contentForMember(member) {
  const id = memberId(member);
  const [unit] = memberUnits(member);
  const solo = [];
  const unitAppearances = [];
  const related = [];
  const choreography = [];

  for (const entry of contentCatalog()) {
    if (entry.type === "choreo") {
      if (entry.members.some((m) => memberId(m) === id)) choreography.push(entry);
      continue;
    }
    const isSolo = entry.members.length === 1 && memberId(entry.members[0]) === id;
    if (isSolo) {
      solo.push(entry);
      continue;
    }
    const creditsUnit =
      unit && (unitLabelUnits(entry.item.sub).includes(unit) || isUnitCollaboration(entry.members, unit));
    if (creditsUnit) {
      unitAppearances.push(entry);
      continue;
    }
    if (entry.members.some((m) => memberId(m) === id)) related.push(entry);
  }

  return { solo, unitAppearances, related, choreography };
}

// Oldest first, undated items last — the same ordering `rowControls` uses for
// its "newest / oldest" sorts.
function byChronology(a, b) {
  const ya = Number(a.year) || 0;
  const yb = Number(b.year) || 0;
  if (!ya && !yb) return 0;
  if (!ya) return 1;
  if (!yb) return -1;
  return ya - yb;
}

// Everything that credits `member`, in chronological order — the running order
// for the generated "All of <member>'s performances" playlist. Unlike
// `contentForMember` this makes no solo/unit/related distinction: it is the
// member's complete, tag-derived filmography.
export function performancesForMember(member) {
  const id = memberId(member);
  if (!id) return [];
  return contentCatalog()
    .filter((entry) => entry.members.some((m) => memberId(m) === id))
    .sort(byChronology);
}

// Members ordered by how much catalogue content credits them (most first).
// Used to default the generated playlist to whoever actually has a set worth
// watching, and to order the focus chips.
export function membersByContentCount() {
  const counts = new Map();
  for (const entry of contentCatalog()) {
    for (const m of entry.members) counts.set(m.name, (counts.get(m.name) || 0) + 1);
  }
  return [...MEMBERS].sort((a, b) => (counts.get(b.name) || 0) - (counts.get(a.name) || 0));
}

// How many catalogue items credit each member, keyed by member name.
export function contentCountByMember() {
  const counts = {};
  for (const entry of contentCatalog()) {
    for (const m of entry.members) counts[m.name] = (counts[m.name] || 0) + 1;
  }
  return counts;
}

// Pool for the daily Carat Pick: every catalogue entry with a resolvable video
// id, in catalogue order. Stable and user-independent by construction, which is
// what keeps the pick the same for everyone on a given day.
export function pickPool() {
  return contentCatalog().filter((entry) => ytId(entry.item?.url));
}
