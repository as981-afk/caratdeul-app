import { memo, useState } from "react";
import SafeImg from "./SafeImg";
import HeartButton from "./HeartButton";
import MemberModal from "./MemberModal";
import { useSession } from "../context/SessionContext.jsx";
import { pressable } from "../utils/format";
import { FAV_MEMBERS, isFav } from "../utils/favorites";
import "./rows.css";

export function MyBiasRow({ members, onOpenMembers }) {
  const [active, setActive] = useState(null);
  const { favs, toggleFav } = useSession();
  return (
    <div className="row" id="my-bias">
      <div className="row-title">
        MEMBERS <span className="count">tap a member to view profile</span>
        {onOpenMembers && (
          <button type="button" className="row-viewall" onClick={onOpenMembers}>
            View all →
          </button>
        )}
      </div>
      <div className="row-scroll">
        {members.map((m) => (
          <div
            className="bias-card"
            key={m.name}
            style={{ "--c1": m.c1, "--c2": m.c2 }}
            {...pressable(() => setActive(m))}
          >
            <span className="unit">{m.unit}</span>
            <HeartButton checked={isFav(favs, FAV_MEMBERS, m.name)} onClick={() => toggleFav(FAV_MEMBERS, m.name)} />
            {m.weverse && (
              <a
                className="bias-card-weverse"
                href={m.weverse}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${m.name} on Weverse`}
                title={`${m.name} on Weverse`}
                onClick={(e) => e.stopPropagation()}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M11.996 3.545c-1.08 0-2.16.415-2.98 1.235l-5.24 5.24a4.2 4.2 0 0 0 0 5.94l5.24 5.24a4.2 4.2 0 0 0 5.96 0l5.24-5.24a4.2 4.2 0 0 0 0-5.94l-5.24-5.24A4.19 4.19 0 0 0 11.996 3.545Zm0 1.68a2.52 2.52 0 0 1 1.79.74l5.24 5.24a2.52 2.52 0 0 1 0 3.58l-5.24 5.24a2.52 2.52 0 0 1-3.58 0l-5.24-5.24a2.52 2.52 0 0 1 0-3.58l5.24-5.24a2.52 2.52 0 0 1 1.79-.74ZM8.52 9.96a.84.84 0 0 0-.84.84v2.4a.84.84 0 0 0 1.68 0v-2.4a.84.84 0 0 0-.84-.84Zm6.96 0a.84.84 0 0 0-.84.84v2.4a.84.84 0 0 0 1.68 0v-2.4a.84.84 0 0 0-.84-.84Z" />
                </svg>
              </a>
            )}
            <SafeImg className="bias-img" src={m.img} alt={m.name} loading="lazy" width={300} height={440} />
            <div className="name">{m.name}</div>
            <div className="position">{m.position}</div>
          </div>
        ))}
      </div>
      <MemberModal member={active} onClose={() => setActive(null)} />
    </div>
  );
}

export default memo(MyBiasRow);
