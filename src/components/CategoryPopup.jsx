import { useState } from "react";
import Modal from "./Modal";
import HeartButton from "./HeartButton";
import { useSession } from "../context/SessionContext.jsx";
import { pressable } from "../utils/format";
import { FAV_VIDEOS, favIdFor, isFav } from "../utils/favorites";
import MVModal from "./MVModal";
import GoSeModal from "./GoSeModal";
import VideoModal from "./VideoModal";
import MemberChips from "./MemberChips";
import CardThumb from "./CardThumb";
import "./rows.css";
import "./CategoryPopup.css";

export function CategoryPopup({ title, items, countLabel, onClose, onWatchEnd, type }) {
  const [active, setActive] = useState(null);
  const { favs, toggleFav } = useSession();
  return (
    <Modal label={title} onClose={onClose} className="category-popup">
      <div className="category-popup-header">
        <h2 className="category-popup-title">{title}</h2>
        <span className="category-popup-count">{items.length} {countLabel || "titles"}</span>
      </div>
      <div className="category-popup-grid">
{items.map((item) => (
          <div
            className="card"
            key={favIdFor(item)}
            style={{ "--c1": item.c1, "--c2": item.c2 }}
            {...pressable(() => setActive(item))}
          >
              <CardThumb url={item.url} />
              <div className="card-overlay"></div>
              <MemberChips sub={item.sub} />
              <HeartButton checked={isFav(favs, FAV_VIDEOS, favIdFor(item))} onClick={() => toggleFav(FAV_VIDEOS, favIdFor(item))} />
              <div className="title">{item.title}</div>
            </div>
          ))}
        </div>
      {type === "mv" && <MVModal mv={active} onClose={() => setActive(null)} onWatchEnd={onWatchEnd} />}
      {type === "gose" && <GoSeModal ep={active} onClose={() => setActive(null)} onWatchEnd={onWatchEnd} />}
      {type === "video" && <VideoModal item={active} onClose={() => setActive(null)} onWatchEnd={onWatchEnd} />}
    </Modal>
  );
}

export default CategoryPopup;
