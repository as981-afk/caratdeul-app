// "Surprise me": pick a random playable title.
//
// Every catalogue is imported dynamically, so none of this data lands in the
// main bundle — it is only fetched the first time the button is used.
// (NANA_TOUR is already part of the main bundle via App.jsx, so it is a plain
// import here; a dynamic one would not split anything out.)

import { NANA_TOUR } from "../data/NANA_TOUR";

export async function pickRandomVideo() {
  const [gose, concerts, mvs, tracks] = await Promise.all([
    import("../data/GOING_SEVENTEEN"),
    import("../data/CONCERTS"),
    import("../data/MVS"),
    import("../data/SIDE_TRACKS"),
  ]);

  const pool = [
    ...gose.GOING_SEVENTEEN,
    ...concerts.CONCERTS,
    ...mvs.MVS,
    ...tracks.SIDE_TRACKS,
    ...NANA_TOUR,
  ].filter((item) => item && item.url);

  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
