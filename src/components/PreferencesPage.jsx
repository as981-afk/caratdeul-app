import { memo, useState } from "react";
import AvatarCircle from "./AvatarCircle";
import ProfileEditorModal from "./ProfileEditorModal";
import { useProfiles } from "../context/ProfileContext.jsx";
import { useTheme } from "../ThemeContext";
import { AccentPicker, AccentPreview, NotificationToggles, ThemePicker } from "./ProfileSettingsControls";
import { getAccent } from "../data/AVATARS";
import "./PreferencesPage.css";

// Full-page profile preferences: the appearance (theme + accent) and the
// notification toggles, saved on the active profile. Opened from the profile
// menu and mirrored onto the URL (`?view=preferences`) like the other views.
export function PreferencesPage({ onClose }) {
  const { account, activeProfile, profiles, updateProfile, deleteProfile, clearProfile } = useProfiles();
  const { theme, setTheme, accent, setAccent } = useTheme();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState("");

  if (!activeProfile) return null;

  const notifications = activeProfile.notifications || {};
  const accentInfo = getAccent(accent);

  const flash = (message) => {
    setSaved(message);
    window.setTimeout(() => setSaved((cur) => (cur === message ? "" : cur)), 1800);
  };

  const setNotifications = (key, checked) => {
    updateProfile(activeProfile.id, { notifications: { ...notifications, [key]: checked } });
  };

  return (
    <div className="preferences-page" id="preferences-page">
      <div className="preferences-head">
        <h2 className="preferences-title">Preferences</h2>
        <span className="preferences-saved" role="status" aria-live="polite">{saved}</span>
        <button type="button" className="preferences-back" onClick={onClose}>
          ← Back to browse
        </button>
      </div>

      <section className="preferences-card preferences-profile">
        <AvatarCircle user={activeProfile.name} avatar={activeProfile.avatar} className="preferences-avatar" />
        <div className="preferences-profile-text">
          <span className="preferences-profile-name">{activeProfile.name}</span>
          <span className="preferences-profile-sub">{account ? `Signed in as @${account}` : "Local profile"}</span>
        </div>
        <div className="preferences-profile-actions">
          <button type="button" className="preferences-btn" onClick={() => setEditing(true)}>
            Edit profile
          </button>
          <button type="button" className="preferences-btn" onClick={clearProfile}>
            Switch profile
          </button>
        </div>
      </section>

      <section className="preferences-card">
        <div className="preferences-card-head">
          <h3 className="preferences-card-title">Appearance</h3>
          <AccentPreview value={accent} />
        </div>
        <div className="preferences-row">
          <div className="preferences-row-text">
            <span className="preferences-row-label">Theme</span>
            <span className="preferences-row-hint">Dark or light — saved to this profile.</span>
          </div>
          <ThemePicker value={theme} onChange={(value) => { setTheme(value); flash("Saved"); }} />
        </div>
        <div className="preferences-row preferences-row--stack">
          <div className="preferences-row-text">
            <span className="preferences-row-label">Accent colour</span>
            <span className="preferences-row-hint">Currently {accentInfo.label}.</span>
          </div>
          <AccentPicker value={accent} onChange={(value) => { setAccent(value); flash("Saved"); }} />
        </div>
      </section>

      <section className="preferences-card">
        <div className="preferences-card-head">
          <h3 className="preferences-card-title">Notifications</h3>
        </div>
        <NotificationToggles
          value={notifications}
          onChange={(key, checked) => { setNotifications(key, checked); flash("Saved"); }}
        />
      </section>

      {editing && (
        <ProfileEditorModal
          profile={activeProfile}
          canDelete={profiles.length > 1}
          onSave={(draft) => { updateProfile(activeProfile.id, draft); setEditing(false); flash("Profile updated"); }}
          onDelete={() => { deleteProfile(activeProfile.id); setEditing(false); }}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}

export default memo(PreferencesPage);
