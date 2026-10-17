#!/usr/bin/env node
// Channel sync: pull SEVENTEEN's uploads into src/data/youtubeVideos.json.
//
// Two data sources, one output shape:
//
//   1. YouTube Data API v3 (preferred) — needs YOUTUBE_API_KEY in the
//      environment. Lists the channel's *entire* uploads playlist and fills in
//      duration, view count and every thumbnail size.
//   2. The channel's public RSS/Atom feed (fallback) — no key, no quota, but it
//      only ever carries the ~15 most recent videos and no duration/statistics.
//
// Either way the run is incremental: the file already on disk is read first,
// entries it holds are kept, and incoming entries are merged on top (a video the
// API re-reports simply gets refreshed). That is what lets the RSS fallback
// still produce a growing archive across runs, and what stops a temporarily
// missing video from vanishing from the site.
//
// The API key stays in this process: the script runs at build time under Node
// and writes a static JSON file, so nothing key-shaped ever reaches the bundle
// or the browser. The browser never talks to YouTube for data.
//
// Usage:
//   node scripts/sync-youtube.mjs              # API when a key is set, else RSS
//   node scripts/sync-youtube.mjs --resolve    # print the channel id for the handle
//   node scripts/sync-youtube.mjs --offline    # don't fetch; report the existing file
//   node scripts/sync-youtube.mjs --quiet      # only warnings (used by prebuild)
//
// The key is read from `process.env.YOUTUBE_API_KEY`; a local `.env` file (see
// `.env.example`) is loaded into the environment first for convenience, and CI
// supplies the same variable as a secret.
//
// On any failure the existing JSON is left alone and the process still exits 0,
// so `npm run build` can never break because YouTube is unreachable or the key
// expired. It only exits non-zero when there is no usable file to fall back on.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_FILE = resolve(ROOT, "src/data/youtubeVideos.json");

// The channel this site follows. `CHANNEL_ID` was resolved once with
// `--resolve` and then pinned here, so a normal run needs a single API call
// (or none at all when it falls back to the RSS feed).
const HANDLE = "@pledis17";
const CHANNEL_ID = "UCfkXDY7vwkcJ8ddFGz8KusA";
const CHANNEL_URL = `https://www.youtube.com/${HANDLE}`;

const API_BASE = "https://www.googleapis.com/youtube/v3";
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

// API batch size: `playlistItems` and `videos` both accept at most 50 ids.
const PAGE_SIZE = 50;

// Descriptions are trimmed before they are stored — the modal shows an excerpt,
// and a multi-kilobyte description per video just bloats the bundle.
const DESCRIPTION_LIMIT = 400;

const args = new Set(process.argv.slice(2).map((arg) => arg.replace(/^--?/, "")));
const resolveOnly = args.has("resolve");
const offline = args.has("offline");
const quiet = args.has("quiet");

const log = (...parts) => {
  if (!quiet) console.log(...parts);
};

// --- small helpers -----------------------------------------------------------

// Reads `.env` (gitignored) into the process environment, without overriding
// anything the shell already set. Keeps `process.env.YOUTUBE_API_KEY` as the one
// place the key is read from, whether it arrives from the environment or from
// the local `.env` file — and saves the build needing Node's `--env-file`,
// which errors when the file is absent.
async function loadDotEnv() {
  let text;
  try {
    text = await readFile(resolve(ROOT, ".env"), "utf8");
  } catch {
    return; // no .env — rely on the real environment (CI sets it as a secret)
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const name = line.slice(0, eq).trim();
    if (!name || process.env[name] != null) continue;
    const quoted = /^(['"])([\s\S]*)\1$/.exec(line.slice(eq + 1).trim());
    process.env[name] = quoted ? quoted[2] : line.slice(eq + 1).trim();
  }
}

// "PT1H2M3S" -> 3723. Returns null for anything that isn't a duration we
// recognise, so an odd value is stored as unknown rather than as 0:00.
function durationSeconds(iso) {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(String(iso || ""));
  if (!match) return null;
  const [, d, h, m, s] = match;
  const total =
    Number(d || 0) * 86400 + Number(h || 0) * 3600 + Number(m || 0) * 60 + Number(s || 0);
  return Number.isFinite(total) ? Math.round(total) : null;
}

function decodeEntities(value) {
  return String(value ?? "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#0?38;|&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function trimDescription(value) {
  const text = decodeEntities(value ?? "").trim();
  return text.length > DESCRIPTION_LIMIT ? `${text.slice(0, DESCRIPTION_LIMIT).trimEnd()}…` : text;
}

// The thumbnail sizes we store, largest first — the same preference order the UI
// reads them in, so a video with no maxres still resolves to high, then medium.
const THUMB_KEYS = ["maxres", "high", "medium", "default"];

function normalizeThumbnails(snippetThumbs, videoId) {
  const out = {};
  for (const size of THUMB_KEYS) {
    out[size] = snippetThumbs?.[size]?.url || null;
  }
  // RSS entries carry no thumbnails at all, and not every video has a maxres.
  // `hqdefault` exists for every public video, so it is the safety net.
  if (!out.high && videoId) out.high = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  if (!out.medium && !out.default && videoId) {
    out.medium = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
    out.default = `https://i.ytimg.com/vi/${videoId}/default.jpg`;
  }
  return out;
}

function publishedStamp(video) {
  const time = Date.parse(video?.publishedAt || "");
  return Number.isNaN(time) ? 0 : time;
}

// ---- reading / writing the data file ---------------------------------------

// Accepts the current `{ channel, videos }` shape and, defensively, a bare array
// or an older `{ videos }` wrapper, so a hand-edited file still merges cleanly.
function readVideos(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.videos)) return payload.videos;
  return [];
}

async function readExisting() {
  try {
    const payload = JSON.parse(await readFile(OUT_FILE, "utf8"));
    return { channel: payload?.channel ?? null, videos: readVideos(payload) };
  } catch {
    return { channel: null, videos: [] };
  }
}

// Existing entries are kept, incoming entries win when both name the same id
// (they are the fresher copy), and the result is newest-first.
function mergeVideos(existing, incoming) {
  const byId = new Map();
  for (const video of existing) if (video?.id) byId.set(video.id, video);
  for (const video of incoming) if (video?.id) byId.set(video.id, video);
  return [...byId.values()].sort((a, b) => publishedStamp(b) - publishedStamp(a));
}

async function writeJSON(channel, videos) {
  const payload = { channel, videos };
  const next = `${JSON.stringify(payload, null, 2)}\n`;
  // Skip a no-op write so a run that changed nothing (the common case for the
  // RSS fallback) leaves the working tree clean.
  const current = await readFile(OUT_FILE, "utf8").catch(() => null);
  if (current === next) {
    log(`No changes — ${videos.length} videos already up to date.`);
    return;
  }
  await writeFile(OUT_FILE, next, "utf8");
  log(`Wrote ${videos.length} videos to src/data/youtubeVideos.json`);
}

// ---- source 1: the Data API ------------------------------------------------

function requireKey() {
  const key = process.env.YOUTUBE_API_KEY?.trim();
  if (!key) return null;
  return key;
}

async function apiGet(path, params) {
  const key = requireKey();
  const query = new URLSearchParams({ ...params, key });
  const res = await fetch(`${API_BASE}/${path}?${query}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // Squeeze the JSON error body onto one line so the warning stays readable.
    const detail = body ? ` ${body.replace(/\s+/g, " ").slice(0, 200)}` : "";
    throw new Error(`YouTube API ${path} failed: HTTP ${res.status}.${detail}`);
  }
  return res.json();
}

// Handle (@pledis17) -> channel id, used by `--resolve` and printed once so the
// pinned constant above can be refreshed when the channel ever changes.
async function resolveChannelId() {
  const data = await apiGet("channels", { part: "id,snippet", forHandle: HANDLE });
  const channel = data?.items?.[0];
  if (!channel?.id) throw new Error(`No channel found for ${HANDLE}.`);
  return { id: channel.id, title: channel.snippet?.title || HANDLE };
}

async function channelViaApi() {
  const data = await apiGet("channels", { part: "snippet,contentDetails", id: CHANNEL_ID });
  const channel = data?.items?.[0];
  if (!channel) throw new Error(`No channel found for id ${CHANNEL_ID}.`);
  return {
    // Only these four keys are stored, so build-side details like the uploads
    // playlist id never leak into the data file.
    channel: {
      id: channel.id,
      title: channel.snippet?.title || "SEVENTEEN",
      handle: HANDLE,
      url: CHANNEL_URL,
    },
    uploadsPlaylist: channel.contentDetails?.relatedPlaylists?.uploads || null,
  };
}

// Every page of the uploads playlist -> every video id on the channel.
async function uploadsPlaylistVideoIds(playlistId) {
  const ids = [];
  let pageToken;
  do {
    const data = await apiGet("playlistItems", {
      part: "contentDetails",
      playlistId,
      maxResults: String(PAGE_SIZE),
      ...(pageToken ? { pageToken } : {}),
    });
    for (const item of data?.items ?? []) {
      const id = item?.contentDetails?.videoId;
      if (id) ids.push(id);
    }
    pageToken = data?.nextPageToken;
  } while (pageToken);
  return ids;
}

function videoFromApi(item) {
  const snippet = item?.snippet ?? {};
  const videoId = item?.id;
  // Removed/private uploads surface as placeholder titles; skipping them keeps
  // them out of the file entirely.
  if (!videoId || snippet.title === "Private video" || snippet.title === "Deleted video") return null;
  const iso = item?.contentDetails?.duration || null;
  return {
    id: videoId,
    title: decodeEntities(snippet.title || ""),
    description: trimDescription(snippet.description),
    publishedAt: snippet.publishedAt || null,
    duration: { iso, seconds: durationSeconds(iso) },
    thumbnails: normalizeThumbnails(snippet.thumbnails, videoId),
    viewCount: Number.isFinite(Number(item?.statistics?.viewCount))
      ? Number(item.statistics.viewCount)
      : null,
    url: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

async function fetchViaApi() {
  const { channel, uploadsPlaylist } = await channelViaApi();
  if (!uploadsPlaylist) throw new Error("Channel has no uploads playlist.");
  const ids = await uploadsPlaylistVideoIds(uploadsPlaylist);
  log(`Found ${ids.length} uploads — fetching details…`);
  const videos = [];
  for (let i = 0; i < ids.length; i += PAGE_SIZE) {
    const batch = ids.slice(i, i + PAGE_SIZE);
    const data = await apiGet("videos", {
      part: "snippet,contentDetails,statistics",
      id: batch.join(","),
      maxResults: String(PAGE_SIZE),
    });
    for (const item of data?.items ?? []) {
      const video = videoFromApi(item);
      if (video) videos.push(video);
    }
  }
  return { channel, videos };
}

// ---- source 2: the public RSS feed -----------------------------------------

function tag(xml, name) {
  const match = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`).exec(xml);
  return match ? match[1] : "";
}

function rssEntries(xml) {
  // The feed is small and well-formed; matching <entry> blocks keeps this free
  // of an XML dependency (the brief's "built-in fetch only" constraint).
  return xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
}

async function fetchViaRss() {
  const res = await fetch(RSS_URL, {
    headers: { accept: "application/atom+xml, application/xml, text/xml" },
  });
  if (!res.ok) throw new Error(`Channel feed failed: HTTP ${res.status}.`);
  const xml = await res.text();
  const channelTitle = decodeEntities(tag(tag(xml, "author"), "name") || "SEVENTEEN");
  const videos = [];
  for (const entry of rssEntries(xml)) {
    const id = tag(entry, "yt:videoId");
    if (!id) continue;
    videos.push({
      id,
      title: decodeEntities(tag(entry, "title")),
      // The feed carries no description; the card and modal only need a title.
      description: "",
      publishedAt: tag(entry, "published") || null,
      duration: { iso: null, seconds: null },
      thumbnails: normalizeThumbnails(null, id),
      viewCount: null,
      url: `https://www.youtube.com/watch?v=${id}`,
    });
  }
  return {
    channel: { id: CHANNEL_ID, title: channelTitle, handle: HANDLE, url: CHANNEL_URL },
    videos,
  };
}

// ---- main -------------------------------------------------------------------

function staticChannel() {
  return { id: CHANNEL_ID, title: "SEVENTEEN", handle: HANDLE, url: CHANNEL_URL };
}

async function main() {
  await loadDotEnv();
  const apiKey = requireKey();

  if (resolveOnly) {
    if (!apiKey) throw new Error("--resolve needs YOUTUBE_API_KEY (it calls the Data API).");
    const channel = await resolveChannelId();
    log(`${HANDLE} -> ${channel.id} (${channel.title})`);
    return;
  }

  const existing = await readExisting();

  if (offline) {
    log(`Offline: keeping the existing ${existing.videos.length} videos.`);
    return;
  }

  const source = apiKey ? "api" : "rss";
  log(
    apiKey
      ? "Using the YouTube Data API (YOUTUBE_API_KEY is set)…"
      : "No YOUTUBE_API_KEY — falling back to the channel's RSS feed (latest ~15 videos)."
  );

  let fetched;
  try {
    fetched = source === "api" ? await fetchViaApi() : await fetchViaRss();
  } catch (error) {
    if (source === "api") {
      // A bad/expired key or exhausted quota should not cost us the update: the
      // RSS feed still works, keyless.
      console.warn(`API sync failed (${error.message}) — trying the RSS feed instead.`);
      try {
        fetched = await fetchViaRss();
      } catch (rssError) {
        return failOrKeep(existing, rssError);
      }
    } else {
      return failOrKeep(existing, error);
    }
  }

  if (!fetched.videos.length) return failOrKeep(existing, new Error("The source returned no videos."));

  const videos = mergeVideos(existing.videos, fetched.videos);
  const channel = fetched.channel || existing.channel || staticChannel();
  await writeJSON(channel, videos);
  log(`Newest: ${videos[0]?.title} (${videos[0]?.publishedAt})`);
}

// The one dead end: nothing came back and there is nothing on disk. With an
// existing file the run is a no-op success, because the committed data is
// already good and a build should never fail over a flaky YouTube.
function failOrKeep(existing, error) {
  if (existing.videos.length) {
    console.warn(
      `Could not refresh videos (${error.message}) Keeping the existing ${existing.videos.length} videos in src/data/youtubeVideos.json.`
    );
    return;
  }
  console.error(`Could not fetch videos and there is no existing youtubeVideos.json: ${error.message}`);
  process.exitCode = 1;
}

main().catch((error) => {
  if (process.exitCode !== 1) {
    console.error(`sync-youtube failed: ${error.message}`);
    process.exitCode = 1;
  }
});
