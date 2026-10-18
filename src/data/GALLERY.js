import { MEMBERS } from "./MEMBERS";

// The built-in CaratFlix image gallery: artwork that already ships with the app
// (the group billboard plus every member portrait). A user's profile photo is
// picked from here and stored as an image id, so the choice lives in its own
// storage key and is completely independent of the profile record and My List.
export const GROUP_PHOTO_SRC =
  "https://i.pinimg.com/originals/96/67/4c/96674c9df12af81f2640dbfdddc8d473.jpg";

// Stable, URL-safe id for a gallery entry (member ids never change even if the
// underlying image URL does).
function memberImageId(name) {
  return `member-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
}

export const GALLERY = [
  { id: "group-seventeen", src: GROUP_PHOTO_SRC, alt: "SEVENTEEN group photo" },
  ...MEMBERS.map((m) => ({
    id: memberImageId(m.name),
    src: m.img,
    alt: `${m.name} (${m.fullName})`,
  })),
];

const GALLERY_BY_ID = new Map(GALLERY.map((item) => [item.id, item]));

// Resolve a stored avatar id to a gallery entry, or null when it is unknown
// (never picked, a legacy palette id, or an image removed from the gallery).
export function getGalleryItem(id) {
  if (!id) return null;
  return GALLERY_BY_ID.get(id) || null;
}
