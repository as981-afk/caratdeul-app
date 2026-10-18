#!/usr/bin/env node
// Catalogue video-id check: does every hand-curated entry point at a real
// YouTube video?
//
// The catalogues in src/data are written by hand, so a mistyped `url` stays
// invisible until the card renders. The card builds its still from the id
// (`ytThumb`) and i.ytimg.com answers 404 for an id that does not exist, so a
// bad id shows up as an empty gradient tile; the watch modal then opens the
// embed on "Video unavailable". This script walks the same shared catalogue the
// app uses (`utils/content.js`), resolves each url to a video id, and asks
// i.ytimg.com for the still, so a broken entry is reported by name, url and id.
//
// It only reads: fixing an id means finding the real video, which stays a human
// decision. Nothing is ever rewritten, and no id is guessed.
//
// Usage:
//   npm run check:videos
//
// Needs the network (i.ytimg.com, one request per entry). Exits 1 when anything
// is broken so it can gate a release, 0 when every entry resolves.
//
// The data modules are loaded *through Vite* (ssrLoadModule) rather than imported
// directly: they use extensionless internal imports (`../data/MEMBERS`), which
// Node's resolver rejects but Vite resolves exactly as the browser does.

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// The rung CardThumb advertises for the smallest card slot; it 404s for an id
// that exists nowhere, which is the signal we want.
const still = (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

// Concurrency cap: one request per entry, a few at a time.
const BATCH = 8;

async function loadCatalog() {
  const server = await createServer({
    root: ROOT,
    appType: "custom",
    logLevel: "error",
    server: { middlewareMode: true, hmr: false, watch: null },
  });
  try {
    const { ytId } = await server.ssrLoadModule("/src/utils/format.js");
    const { contentCatalog } = await server.ssrLoadModule("/src/utils/content.js");
    return { ytId, entries: contentCatalog() };
  } finally {
    await server.close();
  }
}

async function check(entry, ytId) {
  const url = entry.item?.url;
  const id = ytId(url);
  if (!id) return { entry, id: null, reason: "url has no video id" };
  try {
    const res = await fetch(still(id));
    return res.status === 200 ? null : { entry, id, reason: `still HTTP ${res.status}` };
  } catch (error) {
    return { entry, id, reason: `request failed: ${error.message}` };
  }
}

async function main() {
  const { ytId, entries } = await loadCatalog();
  const broken = [];

  const queue = [...entries];
  while (queue.length) {
    const batch = queue.splice(0, BATCH);
    const results = await Promise.all(batch.map((entry) => check(entry, ytId)));
    for (const result of results) if (result) broken.push(result);
  }

  if (!broken.length) {
    console.log(`✓ all ${entries.length} catalogue entries resolve to a real YouTube video`);
    return;
  }

  const byType = new Map();
  for (const item of broken) {
    if (!byType.has(item.entry.type)) byType.set(item.entry.type, []);
    byType.get(item.entry.type).push(item);
  }

  console.log(`${broken.length} of ${entries.length} catalogue entries need a real video id:\n`);
  for (const [type, list] of byType) {
    console.log(`${type} — ${list.length}`);
    for (const item of list) {
      console.log(`  · ${item.entry.item.title}`);
      console.log(`      url  ${item.entry.item.url}`);
      console.log(`      id   ${item.id ?? "(none)"}  (${item.reason})`);
    }
    console.log("");
  }

  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
