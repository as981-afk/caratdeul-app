import { memo } from "react";
import SafeImg from "./SafeImg";
import HeartButton from "./HeartButton";
import { useSession } from "../context/SessionContext.jsx";
import { pressable } from "../utils/format";
import { FAV_MEMBERS, isFav } from "../utils/favorites";
import { memberId, MEMBER_UNITS } from "../utils/memberMatch";
import { MEMBERS } from "../data/MEMBERS";
import "./rows.css";
import "./MembersPage.css";

// Full-page grid of all 13 members. Opened from the header nav, the profile
// menu, or the "View all" control on the home member strip.
export function MembersPage({ onClose }) {
  const { favs, toggleFav, openMember } = useSession();

  return (
    <div className="members-page" id="members-page">
      <div className="members-page-head">
        <h2 className="members-page-title">Members</h2>
        <span className="members-page-count">{MEMBERS.length} members · {MEMBER_UNITS.join(" · ")}</span>
        <button type="button" className="members-page-back" onClick={onClose}>
          ← Back to browse
        </button>
      </div>
      <div className="members-grid">
        {MEMBERS.map((m) => (
          <div
            className="bias-card"
            key={m.name}
            style={{ "--c1": m.c1, "--c2": m.c2 }}
            {...pressable(() => openMember(memberId(m)))}
          >
            <span className="unit">{m.unit}</span>
            <HeartButton checked={isFav(favs, FAV_MEMBERS, m.name)} onClick={() => toggleFav(FAV_MEMBERS, m.name)} />
            <SafeImg className="bias-img" src={m.img} alt={m.name} loading="lazy" width={300} height={440} />
            <div className="name">{m.name}</div>
            <div className="position">{m.fullName}</div>
            <div className="position">Born {m.birthday}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(MembersPage);
