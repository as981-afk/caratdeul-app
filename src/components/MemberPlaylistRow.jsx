import { memo, useEffect, useMemo, useState } from "react";
import ContentCard from "./ContentCard";
import EntryModal from "./EntryModal";
import { useSession } from "../context/SessionContext.jsx";
import { MEMBERS } from "../data/MEMBERS";
import { getMemberById, memberId, memberSlug } from "../utils/memberMatch";
import { membersByContentCount, performancesForMember } from "../utils/content";
import "./rows.css";
import "./MemberPlaylistRow.css";

// "All of <member>'s performances" — an auto-generated playlist.
//
// Nothing here is curated: the entries come from `performancesForMember()`, which
// is just the catalogue filtered by the member tags already on each item. The
// row opens on the viewer's first bias when they have one (falling back to
// whoever the tags credit most) so it is never empty on first view.
export function MemberPlaylistRow({ selectedMemberId = null, onMemberChange, onWatchEnd }) {
  const { favs } = useSession();
  const [active, setActive] = useState(null);
  const options = useMemo(() => membersByContentCount(), []);

  const fallbackId = useMemo(() => {
    const bias = (favs.members || []).find((name) => MEMBERS.some((m) => m.name === name));
    if (bias) return memberSlug(bias);
    return memberId(options[0]);
  }, [favs.members, options]);

  const id = selectedMemberId || fallbackId;
  const member = useMemo(() => getMemberById(id), [id]);
  const entries = useMemo(() => (member ? performancesForMember(member) : []), [member]);

  // Publish the resolved default so the focus chips above highlight whoever the
  // playlist actually opened on.
  useEffect(() => {
    if (!selectedMemberId) onMemberChange?.(fallbackId);
  }, [selectedMemberId, fallbackId, onMemberChange]);

  if (!member) return null;

  return (
    <div className="row member-playlist" id="member-playlist">
      <div className="row-head">
        <div className="row-title">
          All of {member.name}&rsquo;s performances
          <span className="count">{entries.length} tagged</span>
        </div>
        <div className="row-controls">
          <label className="row-control">
            <span className="sr-only">Choose a member for this playlist</span>
            <select
              value={id}
              onChange={(e) => onMemberChange?.(e.target.value)}
              aria-label="Choose a member for the generated playlist"
            >
              {options.map((m) => (
                <option key={m.name} value={memberId(m)}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {entries.length ? (
        <div className="row-scroll">
          {entries.map((entry, i) => (
            <ContentCard key={`${entry.type}-${i}`} entry={entry} onOpen={setActive} />
          ))}
        </div>
      ) : (
        <div className="row-empty">No catalogue videos credit {member.name} yet.</div>
      )}

      <EntryModal entry={active} onClose={() => setActive(null)} onWatchEnd={onWatchEnd} />
    </div>
  );
}

export default memo(MemberPlaylistRow);
