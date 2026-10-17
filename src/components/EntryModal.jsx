import MVModal from "./MVModal";
import GoSeModal from "./GoSeModal";
import VideoModal from "./VideoModal";

// Opens the right viewer for a catalogue entry (`{ item, modal }` as built by
// `contentCatalog()`). The era timeline, the generated member playlist and the
// daily pick all render entries generically, so the modal wiring lives here
// instead of being repeated in each of them.
export function EntryModal({ entry, onClose, onWatchEnd }) {
  if (!entry?.item) return null;
  const { item, modal } = entry;
  if (modal === "mv") return <MVModal mv={item} onClose={onClose} onWatchEnd={onWatchEnd} />;
  if (modal === "gose") return <GoSeModal ep={item} onClose={onClose} onWatchEnd={onWatchEnd} />;
  return <VideoModal item={item} onClose={onClose} onWatchEnd={onWatchEnd} />;
}

export default EntryModal;
