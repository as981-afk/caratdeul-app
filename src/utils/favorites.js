import { ytId } from "./format.js";

// Shared favorites helpers -----------------------------------------------------
// Favorites are stored per user as `{ videos: [...], members: [...] }`; video
// entries are keyed by YouTube id so the same clip is deduped across sections.

export const FAV_VIDEOS = "videos";
export const FAV_MEMBERS = "members";

export function favIdFor(item) {
  const videoId = ytId(item.url);
  if (videoId) return videoId;
  // Playlist (and other non-video) links are not unique on their own — several
  // episodes of a show can point at the same playlist — so fold in the title
  // to keep each entry's favourite, and any React key derived from it, unique.
  const url = item.url || "";
  const title = item.title || item.name || "";
  return title ? `${url}#${title}` : url;
}

export function isFav(favs, key, id) {
  return Array.isArray(favs?.[key]) && favs[key].includes(id);
}
