import { useBadges } from "../context/BadgeContext.jsx";
import { BADGE_TIERS, badgeProgress } from "../data/BADGES";
import "./BadgesPage.css";

// Full-page achievements view (`?view=badges`), opened from the profile menu.
//
// Reads the earned map + live stats from BadgeContext (which is what awards the
// badges in the first place), so the page can show both what is unlocked and how
// far away each locked badge is.
export function BadgesPage({ onClose }) {
  const badges = useBadges();
  const defs = badges?.defs || [];
  const earned = badges?.earned || {};
  const stats = badges?.stats || {};

  const earnedList = [];
  const lockedList = [];
  for (const badge of defs) {
    (earned[badge.id] ? earnedList : lockedList).push(badge);
  }
  const percent = defs.length ? Math.round((earnedList.length / defs.length) * 100) : 0;

  return (
    <div className="badges-page">
      <div className="badges-head">
        <div className="badges-head-text">
          <span className="badges-eyebrow">Achievements</span>
          <h1 className="badges-title">Your badge shelf</h1>
          <p className="badges-sub">
            {earnedList.length} of {defs.length} unlocked — kept per profile on this device.
          </p>
        </div>
        <button type="button" className="badges-back" onClick={onClose}>
          ← Back to home
        </button>
      </div>

      <div className="badges-meter">
        <span className="badges-meter-track">
          <span className="badges-meter-fill" style={{ width: `${percent}%` }} />
        </span>
        <span className="badges-meter-label">{percent}% complete</span>
      </div>

      <section className="badges-section">
        <h2 className="badges-section-title">Earned</h2>
        {earnedList.length ? (
          <ul className="badges-grid">
            {earnedList.map((badge) => (
              <li key={badge.id} className="badge-card badge-card--earned" style={tierStyle(badge)}>
                <span className="badge-icon" aria-hidden="true">{badge.icon}</span>
                <span className="badge-name">{badge.name}</span>
                <span className="badge-desc">{badge.desc}</span>
                {earned[badge.id] && (
                  <span className="badge-date">
                    Unlocked {new Date(earned[badge.id]).toLocaleDateString()}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="badges-empty">Nothing earned yet — start watching!</p>
        )}
      </section>

      <section className="badges-section">
        <h2 className="badges-section-title">Locked</h2>
        {lockedList.length ? (
          <ul className="badges-grid">
            {lockedList.map((badge) => {
              const { value, goal, percent: p } = badgeProgress(badge, stats);
              return (
                <li key={badge.id} className="badge-card badge-card--locked">
                  <span className="badge-icon badge-icon--locked" aria-hidden="true">🔒</span>
                  <span className="badge-name">{badge.name}</span>
                  <span className="badge-desc">{badge.desc}</span>
                  <span className="badge-progress">
                    <span className="badge-progress-track">
                      <span className="badge-progress-fill" style={{ width: `${p}%` }} />
                    </span>
                    <span className="badge-progress-label">
                      {value} / {goal}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="badges-empty">Every badge unlocked. Certified Carat! 💎</p>
        )}
      </section>
    </div>
  );
}

function tierStyle(badge) {
  const tier = BADGE_TIERS[badge.tier];
  if (!tier) return undefined;
  return { "--c1": tier.c1, "--c2": tier.c2 };
}

export default BadgesPage;
