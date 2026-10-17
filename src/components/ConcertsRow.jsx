import { memo } from "react";
import VideoRow from "./VideoRow";
import { CONCERTS } from "../data/CONCERTS";

// Below-the-fold row. Owning the catalogue import here (instead of App.jsx)
// lets Vite split the concert data out of the main bundle.
function ConcertsRow({ onWatchEnd }) {
  return (
    <VideoRow
      id="concerts"
      title="Concerts"
      items={CONCERTS}
      countLabel="concerts"
      groupKey="sub"
      groupLabel="Event"
      onWatchEnd={onWatchEnd}
    />
  );
}

export default memo(ConcertsRow);
