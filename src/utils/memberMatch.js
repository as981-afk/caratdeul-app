// Member identity + label matching, shared by the member chips on video cards
// and the member pages.
//
// The catalogues credit performers as free text on each item's `sub` field
// ("DINO", "DK AND SEUNGKWAN", "V8", "VOCAL UNIT"), so this module normalises
// those labels and resolves the members (and units) they name.
//
// It deliberately imports only the member list (not the catalogues) so it stays
// small enough for the eagerly-loaded video cards.

import { MEMBERS } from "../data/MEMBERS";

// Canonical unit labels used by the unit filter and member pages.
export const MEMBER_UNITS = ["Hip-Hop", "Vocal", "Performance"];

// Display `unit` field -> canonical unit. Every member has exactly one unit.
const UNIT_BY_NAME = {
  "S.Coups": "Hip-Hop",
  Jeonghan: "Vocal",
  Joshua: "Vocal",
  Jun: "Performance",
  Hoshi: "Performance",
  Wonwoo: "Hip-Hop",
  Woozi: "Vocal",
  DK: "Vocal",
  Mingyu: "Hip-Hop",
  Minghao: "Performance",
  Seungkwan: "Vocal",
  Vernon: "Hip-Hop",
  Dino: "Performance",
};

// URL-safe id derived from the stage name ("S.Coups" -> "s-coups").
export function memberSlug(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function memberId(member) {
  return memberSlug(member?.name);
}

export function memberUnits(member) {
  const unit = UNIT_BY_NAME[member?.name];
  return unit ? [unit] : [];
}

export function getMemberById(id) {
  const wanted = memberSlug(id);
  return MEMBERS.find((m) => memberSlug(m.name) === wanted) || null;
}

// Per-member spellings that appear in `sub`. Normalised (uppercased, punctuation
// stripped to spaces) before matching, so "S.Coups" and "SCOUPS" both hit.
const SUB_ALIASES = {
  "S.Coups": ["SCOUPS", "S COUPS", "COUPS"],
  Jeonghan: ["JEONGHAN"],
  Joshua: ["JOSHUA"],
  Jun: ["JUN"],
  Hoshi: ["HOSHI", "HOSHU"], // "HOSHU" is a recurring typo in the catalogue
  Wonwoo: ["WONWOO"],
  Woozi: ["WOOZI"],
  DK: ["DK"],
  Mingyu: ["MINGYU"],
  Minghao: ["MINGHAO", "THE8", "THE 8", "V8"],
  Seungkwan: ["SEUNGKWAN"],
  Vernon: ["VERNON", "V8"],
  Dino: ["DINO"],
};

// Unit-level performer labels -> the units they represent (content that credits
// a unit instead of naming every member).
const UNIT_LABELS = [
  { re: /\bHIP ?HOP UNIT\b/, units: ["Hip-Hop"] },
  { re: /\bVOCAL UNIT\b/, units: ["Vocal"] },
  { re: /\bPERFORMANCE UNIT\b/, units: ["Performance"] },
  { re: /\bBSS\b/, units: ["Vocal", "Performance"] }, // BooSeokSoon
  { re: /\bSVT ?LEADERS\b/, units: ["Hip-Hop", "Vocal", "Performance"] },
];

export function normLabel(text) {
  return String(text ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9&]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function hasToken(label, alias) {
  const a = normLabel(alias);
  return a ? new RegExp(`(^| )${escapeRe(a)}( |$)`).test(label) : false;
}

// Units explicitly credited by a performer label ("VOCAL UNIT", "BSS", ...).
export function unitLabelUnits(sub) {
  const label = normLabel(sub);
  const units = new Set();
  for (const { re, units: us } of UNIT_LABELS) {
    if (re.test(label)) us.forEach((u) => units.add(u));
  }
  return MEMBER_UNITS.filter((u) => units.has(u));
}

// All members named by a performer label (empty for group / unit credits).
export function membersInSub(sub) {
  const label = normLabel(sub);
  if (!label) return [];
  return MEMBERS.filter((m) => (SUB_ALIASES[m.name] || [m.name]).some((a) => hasToken(label, a)));
}

// Units an item belongs to: the union of the named members' units and any
// explicit unit credit.
export function unitsForSub(sub) {
  const units = new Set();
  for (const m of membersInSub(sub)) for (const u of memberUnits(m)) units.add(u);
  for (const u of unitLabelUnits(sub)) units.add(u);
  return MEMBER_UNITS.filter((u) => units.has(u));
}
