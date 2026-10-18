import { useMemo } from "react";
import { useBadges } from "../context/BadgeContext.jsx";
import { COMMUNITY_GOALS, PERSONAL_GOALS, goalPercent, formatCount } from "../data/GOALS";
import "./GoalsPage.css";

// Community streaming-goals page (`?view=goals`).
//
// The community numbers come from data/GOALS.js and are clearly DEMO DATA — this
// app has no backend, so nothing here is a real counter. The personal goals at
// the bottom are the one honest part: they are computed from the profile's own
// local activity (the same stats the badge engine uses).
export function GoalsPage({ onClose }) {
  const badges = useBadges();
  const stats = badges?.stats || {};

  const community = useMemo(
    () =>
      COMMUNITY_GOALS.map((goal) => ({
        ...goal,
        percent: goalPercent(goal.current, goal.target),
      })),
    []
  );

  const personal = PERSONAL_GOALS.map((goal) => {
    const value = Math.min(stats[goal.metric] || 0, goal.goal);
    return { ...goal, value, percent: goalPercent(value, goal.goal) };
  });

  return (
    <div className="goals-page">
      <div className="goals-head">
        <div className="goals-head-text">
          <span className="goals-eyebrow">Community</span>
          <h1 className="goals-title">Carat goals</h1>
          <p className="goals-sub">Milestones the fandom is (pretending to be) working toward.</p>
        </div>
        <button type="button" className="goals-back" onClick={onClose}>
          ← Back to home
        </button>
      </div>

      <p className="goals-demo">
        <span className="goals-demo-tag">Demo data</span>
        These counters are made-up sample numbers baked into the app. CaratFlix has
        no backend and reports nothing anywhere.
      </p>

      <section className="goals-section">
        <h2 className="goals-section-title">Streaming goals</h2>
        <ul className="goals-list">
          {community.map((goal) => (
            <li key={goal.id} className="goal-card">
              <span className="goal-emoji" aria-hidden="true">{goal.emoji}</span>
              <div className="goal-body">
                <div className="goal-top">
                  <span className="goal-name">{goal.title}</span>
                  <span className="goal-percent">{goal.percent}%</span>
                </div>
                <span className="goal-sub">{goal.subtitle}</span>
                <span className="goal-track">
                  <span className="goal-fill" style={{ width: `${goal.percent}%` }} />
                </span>
                <div className="goal-meta">
                  <span>
                    {formatCount(goal.current)} / {formatCount(goal.target)} {goal.unit}
                  </span>
                  <span>Ends {new Date(goal.deadline).toLocaleDateString()}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="goals-section">
        <h2 className="goals-section-title">Your goals</h2>
        <p className="goals-sub">Side quests tracked from your own activity on this device.</p>
        <ul className="goals-list goals-list--personal">
          {personal.map((goal) => (
            <li key={goal.id} className="goal-card goal-card--personal">
              <span className="goal-emoji" aria-hidden="true">{goal.emoji}</span>
              <div className="goal-body">
                <div className="goal-top">
                  <span className="goal-name">{goal.title}</span>
                  <span className="goal-percent">{goal.value} / {goal.goal}</span>
                </div>
                <span className="goal-track">
                  <span className="goal-fill" style={{ width: `${goal.percent}%` }} />
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default GoalsPage;
