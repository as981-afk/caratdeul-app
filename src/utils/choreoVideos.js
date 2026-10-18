// Choreography clips, sourced from the official SEVENTEEN channel.
//
// The Choreography page used to be driven only by data/CHOREOGRAPHY.js, whose
// entries all carried placeholder video ids (TODO_CHOREO_*). A placeholder id is
// not a real video, so every card had a broken poster and the player had nothing
// to embed — the page could never play. This module blends two real sources into
// one catalogue-shaped list:
//
//   1. The channel uploads the build script writes to data/youtubeVideos.json
//      (scripts/sync-youtube.mjs), filtered to choreography-ish clips with the
//      editable CHOREO_KEYWORDS list below. Playback is the same lazy
//      youtube-nocookie.com embed the rest of the app uses.
//   2. The hand-curated data/CHOREOGRAPHY.js entries — but only the ones whose
//      `url` carries a real 11-character video id. The placeholders are skipped
//      so an unfinished entry can never blank out a card or a player.
//
// Duplicates (the same YouTube id in both sources) collapse to one card: the
// channel copy supplies the title/date, and any member / era / song metadata on
// the curated copy is folded in. Identity everywhere (the card key, My List, the
// favourite, Continue Watching and the watched tick) is the YouTube id pulled
// from `url`, so these clips behave exactly like the curated catalogue.

import { ytId } from "./format.js";
import { tint } from "./channelVideos.js";
import payload from "../data/youtubeVideos.json";
import { CHOREOGRAPHY } from "../data/CHOREOGRAPHY";

// Edit this list to change what counts as a choreography clip. Matching is a
// case-insensitive substring test against the upload's title + description, so
// adding a term here is all it takes to widen (or narrow) the page.
export const CHOREO_KEYWORDS = [
  "choreography",
  "choreo",
  "dance practice",
  "dance version",
  "dance ver",
  "performance video",
  "performance ver",
  "dance break",
  "dance performance",
  "fancam",
  // Korean terms that show up in official titles.
  "안무",
  "연습",
  "댄스",
  "무대",
  "직캠",
  "퍼포먼스",
];

// Ordered — first match wins. Maps a title to one of the clip kinds the page
// filters on (see utils/choreography.js). Kept separate from CHOREO_KEYWORDS so
// "is this choreography?" and "what kind of choreography?" stay independent.
const TYPE_RULES = [
  { type: "fancam", re: /fancam|직캠|face ?cam|focus ?cam/i },
  { type: "dance-version", re: /dance\s*ver(?:sion)?|댄스\s*버전|performance\s*ver/i },
  { type: "practice", re: /dance\s*practice|practice\s*video|안무\s*연습|연습\s*영상/i },
  { type: "performance", re: /performance\s*(?:video|ver|practice)|dance\s*break|무대|stage\s*mix/i },
  { type: "choreography", re: /choreography|choreo|안무/i },
];

function textOf(video) {
  return `${video?.title || ""} ${video?.description || ""}`.toLowerCase();
}

// True when an upload looks like a choreography / dance clip.
export function isChoreographyVideo(video) {
  const text = textOf(video);
  return CHOREO_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()));
}

function deriveType(video) {
  const text = textOf(video);
  for (const rule of TYPE_RULES) if (rule.re.test(text)) return rule.type;
  return "choreography";
}

function yearOf(publishedAt) {
  const date = new Date(publishedAt || "");
  return Number.isNaN(date.getTime()) ? "" : String(date.getUTCFullYear());
}

// A real YouTube id is exactly 11 URL-safe characters. The catalogue's
// TODO_CHOREO_* placeholders are longer and contain underscores, so they fail
// this test and are skipped rather than rendered as broken cards.
const REAL_ID = /^[A-Za-z0-9_-]{11}$/;
export function isRealVideoId(id) {
  return typeof id === "string" && REAL_ID.test(id);
}

// One channel upload -> one catalogue item (the same shape data/CHOREOGRAPHY.js
// uses: title / sub / c1 / c2 / url, plus type / song / members / era / year).
function fromChannel(video) {
  return {
    id: `choreo-${video.id}`,
    title: video.title || "",
    sub: "SEVENTEEN",
    song: "",
    type: deriveType(video),
    members: [],
    era: "",
    year: yearOf(video.publishedAt),
    publishedAt: video.publishedAt || null,
    description: video.description || "",
    url: video.url || `https://www.youtube.com/watch?v=${video.id}`,
    ...tint(video.id),
  };
}

const rawChannel = Array.isArray(payload) ? payload : payload?.videos;
const channelClips = (Array.isArray(rawChannel) ? rawChannel : [])
  .filter(isChoreographyVideo)
  .map(fromChannel);

// Curated entries that carry a real id. The data file leaves `c1`/`c2` off and
// lets this adapter pick the same stable gradient the channel clips use.
const curatedClips = CHOREOGRAPHY.filter((item) => isRealVideoId(ytId(item.url))).map(
  (item) => (item.c1 && item.c2 ? item : { ...item, ...tint(ytId(item.url)) })
);

function mergeClips(channelItems, curated) {
  const byId = new Map();
  for (const item of channelItems) byId.set(ytId(item.url), item);
  for (const item of curated) {
    const id = ytId(item.url);
    if (!id) continue;
    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, item);
      continue;
    }
    // Fold the curated member/era/song metadata onto the channel copy.
    byId.set(id, {
      ...existing,
      members: existing.members?.length ? existing.members : item.members || [],
      era: existing.era || item.era || "",
      song: existing.song || item.song || "",
      type: existing.type || item.type,
    });
  }
  return [...byId.values()];
}

// The merged list the Choreography page, the home row, search and My List read.
export const CHOREO_VIDEOS = mergeClips(channelClips, curatedClips);

export default CHOREO_VIDEOS;
