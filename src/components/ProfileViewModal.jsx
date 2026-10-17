import { useMemo } from "react";
import Modal from "./Modal";
import { useSession } from "../context/SessionContext.jsx";
import { useProfiles } from "../context/ProfileContext.jsx";
import { useBadges } from "../context/BadgeContext.jsx";
import AvatarCircle from "./AvatarCircle";
import { formatJoinedAt } from "../utils/format";
import { MEMBERS } from "../data/MEMBERS";
import { BADGES, BADGE_TIERS } from "../data/BADGES";
import { UNIT_LABELS, UNIT_STYLES } from "./ProfileModal";
import "./Modal.css";
import "./ProfileModal.css";

// Read-only profile display opened by the navbar's "View Profile" entry.
//
// Deliberately contains NO input/textarea/select elements — every field is
// rendered as plain text, chips, or labels. Editing lives exclusively in
// ProfileModal (the "Edit Profile" form).
//
// Data source: the active profile from ProfileContext (`caratflix-profiles-*`)
// plus the session's avatar / bias members — the same records the editor writes.
export function ProfileViewModal({ user, onClose, onEdit, onChangePhoto }) {
  const { favs, avatar } = useSession();
  const { activeProfile } = useProfiles();
  const badges = useBadges();
  const profile = activeProfile || {};

  const earnedMap = badges?.earned || {};
  const earnedBadges = BADGES.filter((badge) => earnedMap[badge.id]);
  const earnedCount = earnedBadges.length;

  const name = profile.name || user;
  const unitKey = profile.favoriteUnit || "All";
  const unitLabel = UNIT_LABELS[unitKey] || unitKey;
  const unitStyle = UNIT_STYLES[unitKey];
  const biases = Array.isArray(favs?.members) ? favs.members : [];
  const wrecker = profile.biasWrecker || "";
  const status = profile.status || "";
  // Same fallback chain the editor's draft uses: explicit value first, then
  // the joined date recorded on first save.
  const since = profile.memberSince || (profile.joinedAt ? formatJoinedAt(profile.joinedAt) : "");
  const joined = formatJoinedAt(profile.joinedAt);

  // Member colors for the bias chips, same lookup the editor performs.
  const memberByKey = useMemo(() => new Map(MEMBERS.map((m) => [m.name, m])), []);

  return (
    <Modal label={`${name} profile`} onClose={onClose} className="profile-modal">
      <div className="profile-modal-header">
        <div className="profile-modal-avatar-wrap">
          <AvatarCircle user={user} avatar={avatar} className="profile-modal-avatar" />
          <span className="profile-modal-status" aria-hidden="true" title="Signed in" />
        </div>
        <div className="profile-modal-user">
          <div className="profile-modal-name-row">
            <h2 className="profile-modal-name">{name}</h2>
            {status && <span className="profile-modal-flair">{status}</span>}
          </div>
          <p className="profile-modal-handle">@{user}</p>
          <span className="profile-modal-badge">CARAT</span>
        </div>
        <button
          className="profile-modal-exit"
          type="button"
          onClick={onClose}
          aria-label="Close profile"
          title="Close (Esc)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="14" height="14" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="profile-modal-body">
        <section className="profile-modal-section">
          <span className="profile-modal-section-title">Bio</span>
          <p className={`profile-view-value${profile.bio ? "" : " profile-view-empty"}`}>
            {profile.bio || "No bio yet."}
          </p>
        </section>

        <section className="profile-modal-section">
          <span className="profile-modal-section-title">Favorite unit</span>
          {unitKey !== "All" ? (
            <div className="profile-modal-biases">
              <span className="profile-modal-bias" style={unitStyle ? { "--c1": unitStyle.c1, "--c2": unitStyle.c2 } : undefined}>
                <span
                  className="profile-modal-bias-avatar"
                  style={unitStyle ? { background: `linear-gradient(135deg, ${unitStyle.c1}, ${unitStyle.c2})` } : undefined}
                  aria-hidden="true"
                >
                  {unitLabel.charAt(0)}
                </span>
                <span className="profile-modal-bias-name">{unitLabel}</span>
              </span>
            </div>
          ) : (
            <p className="profile-view-value profile-view-empty">No preference — no favorite unit picked yet.</p>
          )}
        </section>

        <section className="profile-modal-section">
          <span className="profile-modal-section-title">Bias members</span>
          {biases.length > 0 ? (
            <div className="profile-modal-biases">
              {biases.map((biasName) => {
                const member = memberByKey.get(biasName);
                return (
                  <span
                    className="profile-modal-bias"
                    key={biasName}
                    style={member?.c1 ? { "--c1": member.c1, "--c2": member.c2 } : undefined}
                  >
                    <span
                      className="profile-modal-bias-avatar"
                      style={member?.c1 ? { background: `linear-gradient(135deg, ${member.c1}, ${member.c2})` } : undefined}
                      aria-hidden="true"
                    >
                      {biasName.charAt(0)}
                    </span>
                    <span className="profile-modal-bias-name">{biasName}</span>
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="profile-view-value profile-view-empty">No biases added yet.</p>
          )}
        </section>

        <section className="profile-modal-section">
          <span className="profile-modal-section-title">Bias wrecker</span>
          {wrecker ? (
            <div className="profile-modal-biases">
              {(() => {
                const member = memberByKey.get(wrecker);
                return (
                  <span
                    className="profile-modal-bias"
                    style={member?.c1 ? { "--c1": member.c1, "--c2": member.c2 } : undefined}
                  >
                    <span
                      className="profile-modal-bias-avatar"
                      style={member?.c1 ? { background: `linear-gradient(135deg, ${member.c1}, ${member.c2})` } : undefined}
                      aria-hidden="true"
                    >
                      {wrecker.charAt(0)}
                    </span>
                    <span className="profile-modal-bias-name">{wrecker}</span>
                  </span>
                );
              })()}
            </div>
          ) : (
            <p className="profile-view-value profile-view-empty">Not set.</p>
          )}
        </section>

        <section className="profile-modal-section">
          <span className="profile-modal-section-title">Status flair</span>
          <p className={`profile-view-value${status ? "" : " profile-view-empty"}`}>
            {status || "No status set."}
          </p>
        </section>

        <section className="profile-modal-section">
          <span className="profile-modal-section-title">Member since</span>
          <p className={`profile-view-value${since ? "" : " profile-view-empty"}`}>
            {since || "Not set."}
          </p>
          {joined && <p className="profile-modal-field-hint">Joined CaratFlix on {joined}.</p>}
        </section>

        <section className="profile-modal-section">
          <span className="profile-modal-section-title">
            Badges · {earnedCount} of {BADGES.length}
          </span>
          {earnedCount > 0 ? (
            <div className="profile-modal-biases">
              {earnedBadges.map((badge) => {
                const tier = BADGE_TIERS[badge.tier];
                return (
                  <span className="profile-modal-bias" key={badge.id} title={badge.desc}>
                    <span
                      className="profile-modal-bias-avatar"
                      style={tier ? { background: `linear-gradient(135deg, ${tier.c1}, ${tier.c2})` } : undefined}
                      aria-hidden="true"
                    >
                      {badge.icon}
                    </span>
                    <span className="profile-modal-bias-name">{badge.name}</span>
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="profile-view-value profile-view-empty">No badges earned yet.</p>
          )}
        </section>
      </div>

      <div className="profile-modal-footer">
        <div className="profile-modal-footer-actions">
          <button type="button" className="profile-modal-secondary" onClick={onChangePhoto}>
            Change Photo
          </button>
          <button type="button" className="profile-modal-done" onClick={onEdit}>
            Edit Profile
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ProfileViewModal;
