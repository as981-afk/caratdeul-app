// Choreography vocabulary shared by the row, the full page and the player.
//
// This module deliberately does not import the catalogue (the same way
// memberMatch.js stays catalogue-free), so the watch modal can ask "is this a
// choreography clip?" without pulling the whole choreography chunk into every
// row that can open a video.

// Clip kinds, in display order. `label` drives the filter chips and the card
// badge; `value` is what an item's `type` field stores (and what the URL keeps).
export const CHOREO_TYPE_OPTIONS = [
  { value: "practice", label: "Practice" },
  { value: "dance-version", label: "Dance version" },
  { value: "performance", label: "Performance" },
  { value: "fancam", label: "Fancam" },
];

export const CHOREO_TYPES = CHOREO_TYPE_OPTIONS.map((t) => t.value);

const TYPE_LABELS = new Map(CHOREO_TYPE_OPTIONS.map((t) => [t.value, t.label]));

// Human label for a clip kind ("dance-version" -> "Dance version").
export function choreoTypeLabel(value) {
  return TYPE_LABELS.get(value) || value || "";
}

// True for a choreography catalogue item — including the copies stored in
// Continue Watching / Recently Watched, which keep the item's `type` field.
// This is what switches on the choreography player controls.
export function isChoreographyItem(item) {
  return !!item && CHOREO_TYPES.includes(item.type);
}
