// SEVENTEEN's era timeline, one entry per headline album.
//
// Each era carries its own themed accent pair (--c1 / --c2, the same shape the
// cards and member pages already use) plus the album strings that place a
// catalogue item in that era. Matching is by `album` only — see
// `eraForAlbum()` below — so an era page keeps working even when an item's
// `year` field is wrong or missing.
//
// Adding an era: append an entry and list every album string it owns. Album
// matching ignores case and punctuation, so "Love&Letter Repackage" and
// "love & letter  repackage" are the same key.

export const ERAS = [
  {
    id: "17-carat",
    name: "17 CARAT",
    year: "2015",
    c1: "#c23a8a",
    c2: "#4a0e3a",
    blurb: "The debut. Thirteen members, one stage, and the first taste of the performance-first identity that would define the group.",
    albums: ["17 CARAT"],
  },
  {
    id: "boys-be",
    name: "BOYS BE",
    year: "2015",
    blurb: "A second mini-album that traded debut nerves for swagger and sealed the signature synchronized choreography.",
    c1: "#5a3ac2",
    c2: "#1a0e4a",
    albums: ["BOYS BE"],
  },
  {
    id: "love-letter",
    name: "Love&Letter",
    year: "2016",
    c1: "#c2a03a",
    c2: "#4a3a0e",
    blurb: "The breakout. Bright, romantic, and loud — the era that put SEVENTEEN on every summer playlist.",
    albums: ["Love&Letter", "Love&Letter Repackage"],
  },
  {
    id: "going-seventeen",
    name: "Going Seventeen",
    year: "2016",
    c1: "#c23a5a",
    c2: "#4a0e1a",
    blurb: "A sharper, more mature turn that gave the group (and later their variety show) its name.",
    albums: ["GOING SEVENTEEN"],
  },
  {
    id: "al1",
    name: "Al1",
    year: "2017",
    c1: "#3a5ac2",
    c2: "#0e1a4a",
    blurb: "The emotional peak. Contemporary dance, cinematic staging, and one of the group's most beloved title tracks.",
    albums: ["Al1"],
  },
  {
    id: "teen-age",
    name: "TEEN, AGE",
    year: "2017",
    c1: "#c27a3a",
    c2: "#4a2a0e",
    blurb: "The unit era — Hip-Hop, Vocal and Performance each got a headline track on one sprawling, genre-hopping album.",
    albums: ["TEEN, AGE"],
  },
  {
    id: "directors-cut",
    name: "Director's Cut",
    year: "2018",
    c1: "#7b596f",
    c2: "#3b3475",
    blurb: "A repackage built around gratitude — a thank-you letter to the fans who carried them there.",
    albums: ["DIRECTOR'S CUT"],
  },
  {
    id: "you-make-my-day",
    name: "You Make My Day",
    year: "2018",
    c1: "#3ac2c2",
    c2: "#0e4a4a",
    blurb: "Pure summer. Refreshing colours, playful choreography, and the group at their most carefree.",
    albums: ["YOU MAKE MY DAY"],
  },
  {
    id: "you-made-my-dawn",
    name: "You Made My Dawn",
    year: "2019",
    c1: "#5a3a8c",
    c2: "#1a0e3a",
    blurb: "Longing and elegant restraint, with the choreography and staging getting more ambitious by the release.",
    albums: ["YOU MADE MY DAWN"],
  },
  {
    id: "an-ode",
    name: "An Ode",
    year: "2019",
    c1: "#3a0a2a",
    c2: "#1a0010",
    blurb: "The dark, mature chapter: vulnerability, fear, and some of the most sophisticated choreography of their career.",
    albums: ["AN ODE", "Digital Single / An Ode"],
  },
  {
    id: "heng-garae",
    name: "Heng:garæ",
    year: "2020",
    c1: "#8ac23a",
    c2: "#3a4a0e",
    blurb: "A pandemic-era burst of optimism — finding your own path, together.",
    albums: ["Heng:garæ"],
  },
  {
    id: "semicolon",
    name: "Semicolon",
    year: "2020",
    c1: "#a8894f",
    c2: "#3a2c14",
    blurb: "Retro swing, musical-theatre staging, and a pause for breath rather than a full stop.",
    albums: ["SEMICOLON"],
  },
  {
    id: "your-choice",
    name: "Your Choice",
    year: "2021",
    c1: "#5ac2c2",
    c2: "#164a52",
    blurb: "Sleek, modern pop — the leap into love, told with synchronized precision.",
    albums: ["YOUR CHOICE"],
  },
  {
    id: "attacca",
    name: "Attacca",
    year: "2021",
    c1: "#c23a3a",
    c2: "#4a0e0e",
    blurb: "Their loudest chapter yet: pop-punk energy and one of the most punishing choreographies they have ever performed.",
    albums: ["ATTACCA"],
  },
  {
    id: "face-the-sun",
    name: "Face the Sun",
    year: "2022",
    c1: "#e08a1e",
    c2: "#4a2a00",
    blurb: "Facing fear head-on with bold, confident staging — the era that cracked the global chart wide open.",
    albums: ["FACE THE SUN"],
  },
  {
    id: "sector-17",
    name: "Sector 17",
    year: "2022",
    c1: "#0ac2c2",
    c2: "#00404a",
    blurb: "The repackage that built a world of its own, mixing the leaders' swagger with playful, colourful fun.",
    albums: ["SECTOR 17"],
  },
  {
    id: "fml",
    name: "FML",
    year: "2023",
    c1: "#5a5ac2",
    c2: "#1a1a4a",
    blurb: "The record-breaker. Mythology-sized ambition on one side, raw frustration on the other.",
    albums: ["FML"],
  },
  {
    id: "seventeenth-heaven",
    name: "Seventeenth Heaven",
    year: "2023",
    c1: "#d4af7a",
    c2: "#4a3a1a",
    blurb: "A joyful, celebratory victory lap with Greek-mythology styling and a festival-sized chorus.",
    albums: ["SEVENTEENTH HEAVEN"],
  },
  {
    id: "17-is-right-here",
    name: "17 Is Right Here",
    year: "2024",
    c1: "#3a3ac2",
    c2: "#0e0e4a",
    blurb: "A compilation milestone that also handed them a dramatic, orchestral new title track.",
    albums: ["17 IS RIGHT HERE"],
  },
  {
    id: "spill-the-feels",
    name: "Spill the Feels",
    year: "2024",
    c1: "#c23a6a",
    c2: "#4a0e2a",
    blurb: "Confident, hip-hop-leaning, and glossy — ambition and success celebrated under city lights.",
    albums: ["SPILL THE FEELS", "SPILL THE FEELS (12th MINI ALBUM)"],
  },
  {
    id: "right-here",
    name: "Right Here",
    year: "2024",
    c1: "#4c8764",
    c2: "#2a3f2e",
    blurb: "A warm, comforting anthem for the small everyday moments, framed by whimsical nostalgia.",
    albums: ["RIGHT HERE"],
  },
  {
    id: "happy-burstday",
    name: "Happy Burstday",
    year: "2025",
    c1: "#e0b01e",
    c2: "#5a3a00",
    blurb: "The tenth-anniversary explosion — a thunderous, celebratory return to pure performance joy.",
    albums: ["HAPPY BURSTDAY"],
  },
];

// Album key used for matching: case- and punctuation-insensitive, so small
// differences in how an album is spelled in the catalogue never break a match.
export function normAlbum(album) {
  return String(album ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

const BY_ID = new Map(ERAS.map((era) => [era.id, era]));

const BY_ALBUM = new Map();
for (const era of ERAS) {
  for (const album of era.albums) BY_ALBUM.set(normAlbum(album), era);
}

export function eraById(id) {
  return (id && BY_ID.get(id)) || null;
}

// The era an album belongs to, or null for singles, solo mixtapes, Japanese
// releases and anything else the timeline doesn't cover.
export function eraForAlbum(album) {
  const key = normAlbum(album);
  return key ? BY_ALBUM.get(key) || null : null;
}

// The era a catalogue item belongs to (matched on its `album`).
export function eraForItem(item) {
  return eraForAlbum(item?.album);
}

// Every known album key -> era id, for callers that need to group a whole
// catalogue in one pass instead of calling `eraForAlbum` per item.
export function eraIdByAlbum() {
  return BY_ALBUM;
}
