import { useSession } from "../context/SessionContext.jsx";
import { memberId, membersInSub } from "../utils/memberMatch";
import "./MemberChips.css";

// Renders the performer label that sits on every video card. When the label
// names member(s) ("DINO", "DK AND SEUNGKWAN") each name becomes a chip that
// links to that member's page; otherwise it falls back to the plain tag.
export function MemberChips({ sub }) {
  const { openMember } = useSession();
  const members = membersInSub(sub);

  if (!members.length) return <span className="tag">{sub}</span>;

  return (
    <span className="member-chips">
      {members.map((member) => (
        <button
          key={member.name}
          type="button"
          className="member-chip"
          title={`View ${member.name}`}
          onClick={(event) => {
            event.stopPropagation();
            openMember?.(memberId(member));
          }}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {member.name}
        </button>
      ))}
    </span>
  );
}

export default MemberChips;
