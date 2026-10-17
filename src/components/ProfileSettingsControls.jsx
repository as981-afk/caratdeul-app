import { ACCENTS, getAccent } from "../data/AVATARS";
import "./ProfileSettingsControls.css";

// Presentational controls shared by the profile editor (draft state) and the
// preferences page (writes straight to the active profile). They are fully
// controlled: each takes a value and an onChange, and nothing else.

const THEME_OPTIONS = [
  { value: "dark", label: "Dark", icon: "☾" },
  { value: "light", label: "Light", icon: "☀" },
];

export function ThemePicker({ value, onChange }) {
  return (
    <div className="pf-theme" role="radiogroup" aria-label="Theme">
      {THEME_OPTIONS.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={`pf-theme-option${active ? " pf-theme-option--active" : ""}`}
            onClick={() => onChange(option.value)}
          >
            <span className="pf-theme-icon" aria-hidden="true">{option.icon}</span>
            <span className="pf-theme-label">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function AccentPicker({ value, onChange }) {
  return (
    <div className="pf-accents" role="radiogroup" aria-label="Accent colour">
      {ACCENTS.map((accent) => {
        const active = value === accent.id;
        return (
          <button
            key={accent.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={accent.label}
            title={accent.label}
            className={`pf-accent${active ? " pf-accent--active" : ""}`}
            style={{ "--c1": accent.c1, "--c2": accent.c2 }}
            onClick={() => onChange(accent.id)}
          >
            <span className="pf-accent-dot" aria-hidden="true" />
            <span className="pf-accent-check" aria-hidden="true">{active ? "✓" : ""}</span>
          </button>
        );
      })}
    </div>
  );
}

const NOTIFICATION_OPTIONS = [
  { key: "uploads", label: "New uploads", hint: "Fresh MVs, performances and Going Seventeen episodes." },
  { key: "comebacks", label: "Comebacks", hint: "Countdowns for announced releases and albums." },
  { key: "birthdays", label: "Birthdays", hint: "A nudge on every member's birthday." },
];

export function NotificationToggles({ value, onChange }) {
  return (
    <ul className="pf-notifs">
      {NOTIFICATION_OPTIONS.map((option) => {
        const active = value?.[option.key] !== false;
        return (
          <li className="pf-notif" key={option.key}>
            <span className="pf-notif-text">
              <span className="pf-notif-label">{option.label}</span>
              <span className="pf-notif-hint">{option.hint}</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={active}
              aria-label={option.label}
              className={`pf-switch${active ? " pf-switch--on" : ""}`}
              onClick={() => onChange(option.key, !active)}
            >
              <span className="pf-switch-thumb" aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// Small preview of the gradient two accents combine into, used as a section
// hint. Kept here so both call sites render the same swatch.
export function AccentPreview({ value }) {
  const accent = getAccent(value);
  return (
    <span
      className="pf-accent-preview"
      aria-hidden="true"
      style={{ background: `linear-gradient(90deg, ${accent.c1}, ${accent.c2})` }}
    />
  );
}
