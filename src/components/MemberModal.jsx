import Modal from "./Modal";
import SafeImg from "./SafeImg";
import HeartButton from "./HeartButton";
import { useSession } from "../context/SessionContext.jsx";
import { FAV_MEMBERS, isFav } from "../utils/favorites";
import "./MemberModal.css";

export function MemberModal({ member, onClose }) {
  const { favs, toggleFav } = useSession();
  if (!member) return null;
  return (
    <Modal label={`${member.name} profile`} onClose={onClose} className="member-modal" style={{ "--c1": member.c1, "--c2": member.c2 }}>
      <div className="member-modal-content">
          <div className="member-modal-img-wrap">
            <SafeImg className="member-modal-img" src={member.img} alt={member.name} loading="lazy" width={460} height={600} />
          </div>
          <div className="member-modal-info">
            <div className="member-modal-top">
              <span className="member-modal-unit">{member.unit}</span>
              <div className="member-modal-top-actions">
                {member.instagramHandle && (
                  <a
                    className="member-modal-instagram"
                    href={`https://instagram.com/${member.instagramHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${member.name} on Instagram`}
                    title={`@${member.instagramHandle}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect x="2" y="2" width="20" height="20" rx="5" />
                      <circle cx="12" cy="12" r="4.5" />
                      <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
                    </svg>
                  </a>
                )}
                {member.weverse && (
                  <a
                    className="member-modal-weverse"
                    href={member.weverse}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${member.name} on Weverse`}
                    title={`${member.name} on Weverse`}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M11.996 3.545c-1.08 0-2.16.415-2.98 1.235l-5.24 5.24a4.2 4.2 0 0 0 0 5.94l5.24 5.24a4.2 4.2 0 0 0 5.96 0l5.24-5.24a4.2 4.2 0 0 0 0-5.94l-5.24-5.24A4.19 4.19 0 0 0 11.996 3.545Zm0 1.68a2.52 2.52 0 0 1 1.79.74l5.24 5.24a2.52 2.52 0 0 1 0 3.58l-5.24 5.24a2.52 2.52 0 0 1-3.58 0l-5.24-5.24a2.52 2.52 0 0 1 0-3.58l5.24-5.24a2.52 2.52 0 0 1 1.79-.74ZM8.52 9.96a.84.84 0 0 0-.84.84v2.4a.84.84 0 0 0 1.68 0v-2.4a.84.84 0 0 0-.84-.84Zm6.96 0a.84.84 0 0 0-.84.84v2.4a.84.84 0 0 0 1.68 0v-2.4a.84.84 0 0 0-.84-.84Z" />
                    </svg>
                  </a>
                )}
                <HeartButton checked={isFav(favs, FAV_MEMBERS, member.name)} onClick={() => toggleFav(FAV_MEMBERS, member.name)} />
              </div>
            </div>
            <h2 className="member-modal-name">{member.name}</h2>
            <p className="member-modal-position">{member.position}</p>
            <div className="member-modal-details">
              <div className="member-detail-row">
                <span className="member-detail-label">Birthday</span>
                <span className="member-detail-value">{member.birthday}</span>
              </div>
              <div className="member-detail-row">
                <span className="member-detail-label">Height</span>
                <span className="member-detail-value">{member.height}</span>
              </div>
              <div className="member-detail-row">
                <span className="member-detail-label">Unit</span>
                <span className="member-detail-value">{member.unit}</span>
              </div>
              {member.bloodType && (
                <div className="member-detail-row">
                  <span className="member-detail-label">Blood Type</span>
                  <span className="member-detail-value">{member.bloodType}</span>
                </div>
              )}
              {member.mbti && (
                <div className="member-detail-row">
                  <span className="member-detail-label">MBTI</span>
                  <span className="member-detail-value">{member.mbti}</span>
                </div>
              )}
              {member.hometown && (
                <div className="member-detail-row">
                  <span className="member-detail-label">Hometown</span>
                  <span className="member-detail-value">{member.hometown}</span>
                </div>
              )}
            </div>
            <p className="member-modal-bio">{member.bio}</p>
            {member.funFact && (
              <blockquote className="member-modal-funfact">{member.funFact}</blockquote>
            )}
          </div>
        </div>
    </Modal>
  );
}

export default MemberModal;
