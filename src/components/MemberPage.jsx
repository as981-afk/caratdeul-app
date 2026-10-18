import { memo, useMemo, useState } from "react";
import SafeImg from "./SafeImg";
import HeartButton from "./HeartButton";
import CardProgress from "./CardProgress";
import MemberChips from "./MemberChips";
import CardThumb from "./CardThumb";
import MVModal from "./MVModal";
import GoSeModal from "./GoSeModal";
import VideoModal from "./VideoModal";
import { useSession } from "../context/SessionContext.jsx";
import { pressable } from "../utils/format";
import { FAV_MEMBERS, FAV_VIDEOS, favIdFor, isFav } from "../utils/favorites";
import { videoKeyFor } from "../utils/rowControls";
import { getMemberById } from "../utils/memberMatch";
import { contentForMember } from "../utils/content";
import "./rows.css";
import "./MemberPage.css";

// One horizontal strip of the member's videos. Reuses the shared `.card` look so
// the profile feels like the rest of the catalogue, and opens the matching modal
// (MV / Going Seventeen / generic video) for each entry.
function MemberSection({ title, entries, onOpen }) {
  const { favs, toggleFav, progressFor, isWatched } = useSession();
  if (!entries.length) return null;

  return (
    <section className="row member-section">
      <div className="row-title">
        {title} <span className="count">{entries.length}</span>
      </div>
      <div className="row-scroll">
        {entries.map((entry, i) => (
          <div
            className="card"
            key={`${entry.type}-${i}`}
            style={{
              "--c1": entry.item.c1,
              "--c2": entry.item.c2,
            }}
            {...pressable(() => onOpen(entry))}
          >
            <CardThumb url={entry.item.url} />
            <div className="card-overlay"></div>
            <MemberChips sub={entry.item.sub} />
            <HeartButton
              checked={isFav(favs, FAV_VIDEOS, favIdFor(entry.item))}
              onClick={() => toggleFav(FAV_VIDEOS, favIdFor(entry.item))}
            />
            <div className="title">{entry.item.title}</div>
            <CardProgress
              progress={progressFor ? progressFor(videoKeyFor(entry.item)) : 0}
              watched={isWatched ? isWatched(videoKeyFor(entry.item)) : false}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

// Member profile: hero (photo, bio, facts) plus the member's solo work, unit
// appearances, and other related videos. Rendered as a full-page view driven by
// the `view=member&id=<slug>` URL params.
export function MemberPage({ id, onClose, onWatchEnd }) {
  const { favs, toggleFav } = useSession();
  const member = useMemo(() => getMemberById(id), [id]);
  const content = useMemo(() => (member ? contentForMember(member) : null), [member]);
  const [active, setActive] = useState(null);

  if (!member) {
    return (
      <div className="member-page" id="member-page">
        <div className="member-page-bar">
          <button type="button" className="member-page-back" onClick={onClose}>← Back to browse</button>
        </div>
        <div className="member-empty">
          <p>We couldn&rsquo;t find that member.</p>
        </div>
      </div>
    );
  }

  const hasContent =
    content &&
    (content.solo.length || content.unitAppearances.length || content.related.length || content.choreography.length);

  return (
    <div className="member-page" id="member-page">
      <div className="member-page-bar">
        <button type="button" className="member-page-back" onClick={onClose}>← Back to browse</button>
      </div>

      <header className="member-hero" style={{ "--c1": member.c1, "--c2": member.c2 }}>
        <div className="member-hero-img-wrap">
          <SafeImg className="member-hero-img" src={member.img} alt={member.name} loading="eager" width={460} height={600} />
        </div>
        <div className="member-hero-info">
          <span className="member-hero-unit">{member.unit}</span>
          <h2 className="member-hero-name">{member.name}</h2>
          <p className="member-hero-full">{member.fullName}</p>
          <dl className="member-hero-facts">
            <div><dt>Birthday</dt><dd>{member.birthday}</dd></div>
            <div><dt>Position</dt><dd>{member.position}</dd></div>
            {member.height && <div><dt>Height</dt><dd>{member.height}</dd></div>}
            {member.mbti && <div><dt>MBTI</dt><dd>{member.mbti}</dd></div>}
            {member.hometown && <div><dt>Hometown</dt><dd>{member.hometown}</dd></div>}
          </dl>
          <p className="member-hero-bio">{member.bio}</p>
          {member.funFact && <p className="member-hero-fun">💡 {member.funFact}</p>}
          <div className="member-hero-actions">
            <HeartButton
              checked={isFav(favs, FAV_MEMBERS, member.name)}
              onClick={() => toggleFav(FAV_MEMBERS, member.name)}
            />
            {member.instagramHandle && (
              <a
                className="member-hero-instagram"
                href={`https://instagram.com/${member.instagramHandle}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                @{member.instagramHandle}
              </a>
            )}
          </div>
        </div>
      </header>

      {hasContent ? (
        <>
          <MemberSection title="Solo content" entries={content.solo} onOpen={setActive} />
          <MemberSection title="Unit appearances" entries={content.unitAppearances} onOpen={setActive} />
          <MemberSection title="Choreography" entries={content.choreography} onOpen={setActive} />
          <MemberSection title="Related videos" entries={content.related} onOpen={setActive} />
        </>
      ) : (
        <div className="member-empty">
          <p>No catalogue videos credit {member.name} yet.</p>
        </div>
      )}

      {active?.modal === "mv" && <MVModal mv={active.item} onClose={() => setActive(null)} onWatchEnd={onWatchEnd} />}
      {active?.modal === "gose" && <GoSeModal ep={active.item} onClose={() => setActive(null)} onWatchEnd={onWatchEnd} />}
      {active?.modal === "video" && <VideoModal item={active.item} onClose={() => setActive(null)} onWatchEnd={onWatchEnd} />}
    </div>
  );
}

export default memo(MemberPage);
