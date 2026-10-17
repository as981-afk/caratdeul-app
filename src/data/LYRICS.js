// Synced lyrics, keyed by YouTube video id.
//
// Each entry is a per-song array of lines shaped:
//
//     { start, end, ko, rom, en, fil }
//
//   start / end  seconds into the clip; `end` is exclusive. Timings follow the
//                player's clock (see CW_NOMINAL_SECONDS in utils/watchHistory).
//   ko           Korean
//   rom          Romanization
//   en           English
//   fil          Filipino
//
// A language may be missing/empty on a line, and it simply isn't rendered when
// that language is toggled on.
//
// ── READ ME BEFORE SHIPPING ──────────────────────────────────────────────────
// Every line below is a deliberately short PLACEHOLDER — none of it is real
// lyrics and none of it is copyrighted. To publish real content, replace a
// song's array (or add a new `"<videoId>": [...]` entry) with licensed lines.
// Nothing else has to change: the highlight timing, auto-scroll, language
// toggles and click-to-seek all read whatever this map contains.
// `getLyrics()` is the single entry point the UI uses.
// ─────────────────────────────────────────────────────────────────────────────

export const LYRICS = {
  // Adore U — SEVENTEEN (2015)
  "9rUFQJrCT7M": [
    { start: 4, end: 12, ko: "샘플 가사 A1", rom: "saempeul gasa A1", en: "Sample lyric A1", fil: "Sample na liriko A1" },
    { start: 12, end: 20, ko: "샘플 가사 A2", rom: "saempeul gasa A2", en: "Sample lyric A2", fil: "Sample na liriko A2" },
    { start: 20, end: 28, ko: "샘플 가사 A3", rom: "saempeul gasa A3", en: "Sample lyric A3", fil: "Sample na liriko A3" },
    { start: 28, end: 36, ko: "샘플 가사 A4", rom: "saempeul gasa A4", en: "Sample lyric A4", fil: "Sample na liriko A4" },
    { start: 36, end: 44, ko: "샘플 가사 A5", rom: "saempeul gasa A5", en: "Sample lyric A5", fil: "Sample na liriko A5" },
    { start: 44, end: 50, ko: "샘플 가사 A6", rom: "saempeul gasa A6", en: "Sample lyric A6", fil: "Sample na liriko A6" },
  ],

  // Very Nice — SEVENTEEN (2016)
  "J-wFp43XOrA": [
    { start: 4, end: 12, ko: "샘플 가사 B1", rom: "saempeul gasa B1", en: "Sample lyric B1", fil: "Sample na liriko B1" },
    { start: 12, end: 20, ko: "샘플 가사 B2", rom: "saempeul gasa B2", en: "Sample lyric B2", fil: "Sample na liriko B2" },
    { start: 20, end: 28, ko: "샘플 가사 B3", rom: "saempeul gasa B3", en: "Sample lyric B3", fil: "Sample na liriko B3" },
    { start: 28, end: 36, ko: "샘플 가사 B4", rom: "saempeul gasa B4", en: "Sample lyric B4", fil: "Sample na liriko B4" },
    { start: 36, end: 44, ko: "샘플 가사 B5", rom: "saempeul gasa B5", en: "Sample lyric B5", fil: "Sample na liriko B5" },
    { start: 44, end: 50, ko: "샘플 가사 B6", rom: "saempeul gasa B6", en: "Sample lyric B6", fil: "Sample na liriko B6" },
  ],

  // HOT — SEVENTEEN (2022)
  "gRnuFC4Ualw": [
    { start: 4, end: 12, ko: "샘플 가사 C1", rom: "saempeul gasa C1", en: "Sample lyric C1", fil: "Sample na liriko C1" },
    { start: 12, end: 20, ko: "샘플 가사 C2", rom: "saempeul gasa C2", en: "Sample lyric C2", fil: "Sample na liriko C2" },
    { start: 20, end: 28, ko: "샘플 가사 C3", rom: "saempeul gasa C3", en: "Sample lyric C3", fil: "Sample na liriko C3" },
    { start: 28, end: 36, ko: "샘플 가사 C4", rom: "saempeul gasa C4", en: "Sample lyric C4", fil: "Sample na liriko C4" },
    { start: 36, end: 44, ko: "샘플 가사 C5", rom: "saempeul gasa C5", en: "Sample lyric C5", fil: "Sample na liriko C5" },
    { start: 44, end: 50, ko: "샘플 가사 C6", rom: "saempeul gasa C6", en: "Sample lyric C6", fil: "Sample na liriko C6" },
  ],
};

// The lines for a video, or null when there are none to show. Components use
// this instead of touching LYRICS directly so the storage/shape stays swappable.
export function getLyrics(videoId) {
  if (!videoId) return null;
  const lines = LYRICS[videoId];
  return Array.isArray(lines) && lines.length ? lines : null;
}

// Index of the line that should be highlighted at `t` seconds.
// Returns -1 before the first line and once past the last line's end; inside a
// gap between two lines the most recent line stays highlighted.
export function activeLineIndex(lines, t) {
  const n = lines?.length ?? 0;
  if (!n || t < lines[0].start) return -1;
  const lastEnd = lines[n - 1].end;
  if (lastEnd != null && t >= lastEnd) return -1;
  let found = -1;
  for (let i = 0; i < n; i += 1) {
    if (t >= lines[i].start) found = i;
    else break;
  }
  return found;
}
