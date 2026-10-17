import { memo, useMemo } from "react";
import SafeImg from "./SafeImg";
import { memberId } from "../utils/memberMatch";
import { contentCountByMember, membersByContentCount } from "../utils/content";
import "./FancamFocus.css";

// "Fancam-style" member focus: one chip per member, ordered by how much
// catalogue content credits them and labelled with that count, so it is obvious
// the list is generated from the content tags rather than hand-maintained.
//
// Controlled on purpose — the parent owns the focused member and decides what
// focusing means (on the home page it jumps to, and filters, the generated
// playlist below).
export function FancamFocus({ value = null, onFocus, label = "Fancam focus", hint }) {
  // Defensive: a bad catalogue must not blank the page — fall back to an empty
  // list/object so `.map(...)` and the per-member lookups below always have
  // something to work with.
  const members = useMemo(() => membersByContentCount() || [], []);
  const counts = useMemo(() => contentCountByMember() || {}, []);

  return (
    <section className="fancam-focus" aria-label={label}>
      <div className="fancam-focus-head">
        <h2 className="fancam-focus-title">{label}</h2>
        {hint ? <span className="fancam-focus-hint">{hint}</span> : null}
      </div>
      <div className="fancam-focus-chips">
        {members.map((member) => {
          const id = memberId(member);
          const active = id === value;
          return (
            <button
              key={id}
              type="button"
              className={`fancam-chip${active ? " is-active" : ""}`}
              style={{ "--c1": member.c1, "--c2": member.c2 }}
              aria-pressed={active}
              title={`Focus on ${member.name}`}
              onClick={() => onFocus?.(id)}
            >
              <span className="fancam-chip-avatar">
                {member.img ? (
                  <SafeImg src={member.img} alt="" width={44} height={44} />
                ) : (
                  <span aria-hidden="true">{member.name.charAt(0)}</span>
                )}
              </span>
              <span className="fancam-chip-name">{member.name}</span>
              <span className="fancam-chip-count">{counts[member.name] || 0}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default memo(FancamFocus);
