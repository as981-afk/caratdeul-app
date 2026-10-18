// Channel uploads, exposed as catalogue-shaped card items.
//
// src/data/youtubeVideos.json is the sync script's output: `{ channel, videos }`
// using YouTube's own field names. The rows, the My List page and the watch
// modal all expect the shape the curated catalogues use — a `url` carrying the
// video id (the card background, the favourite key and the player all read it),
// a `title`, and a `sub` line. This module is that adapter, plus the gradient
// pair each card needs: channel videos have no c1/c2 of their own, so one is
// picked from the Carat palette by id — stable per video, and varied across a
// grid instead of one flat tint.
//
// Deliberately NOT folded into utils/content.js: these uploads carry no member
// or era attribution, so adding them to the shared catalogue would drop them
// into the member pages and the global search with metadata they do not have.

import { CARAT_PALETTE } from "../data/AVATARS";
import payload from "../data/youtubeVideos.json";

const PALETTE = Object.values(CARAT_PALETTE);

// Shared with utils/choreoVideos.js, which tints channel-derived clips the same
// way so a video keeps one gradient wherever it appears.
export function tint(id) {
  let hash = 0;
  for (const char of String(id ?? "")) hash = (hash * 31 + char.codePointAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

function uploadDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const raw = Array.isArray(payload) ? payload : payload?.videos;

export const CHANNEL_VIDEOS = (Array.isArray(raw) ? raw : []).map((video) => ({
  url: video.url,
  title: video.title,
  // Channel uploads credit no members, so `sub` carries the upload date instead
  // — the plain tag on the card and the meta line in the modal. It never
  // matches a member name, so it renders as text rather than chips.
  sub: uploadDate(video.publishedAt),
  publishedAt: video.publishedAt,
  ...tint(video.id),
}));

export default CHANNEL_VIDEOS;
