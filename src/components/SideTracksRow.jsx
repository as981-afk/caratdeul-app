import { memo } from "react";
import VideoRow from "./VideoRow";
import { SIDE_TRACKS } from "../data/SIDE_TRACKS";

// Below-the-fold row. Owning the catalogue import here (instead of App.jsx)
// lets Vite split the side-track data out of the main bundle.
function SideTracksRow({ onWatchEnd }) {
  return (
    <VideoRow
      id="side-tracks"
      title="Side Tracks"
      items={SIDE_TRACKS}
      countLabel="tracks"
      type="video"
      groupKey="album"
      groupLabel="Album"
      onWatchEnd={onWatchEnd}
    />
  );
}

export default memo(SideTracksRow);
