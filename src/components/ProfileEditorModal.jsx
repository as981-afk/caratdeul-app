import { useState } from "react";
import Modal from "./Modal";
import AvatarCircle from "./AvatarCircle";
import { CARAT_AVATARS } from "../data/AVATARS";
import { MAX_PROFILE_NAME, defaultNotifications } from "../utils/profiles";
import { AccentPicker, NotificationToggles, ThemePicker } from "./ProfileSettingsControls";
import { systemTheme } from "../utils/theme";
import "./ProfileEditor.css";

// Add / edit a single profile: name, Carat avatar, theme, accent, and
// notification preferences — every per-profile setting in one place.
//
// Purely controlled by its caller: it collects a draft and hands it back through
// onSave (the gate then creates or updates). Deletion is delegated to onDelete so
// the "keep at least one profile" rule lives with the data.
export function ProfileEditorModal({ profile, onSave, onDelete, onClose, canDelete = false, canAdd = true, closing }) {
  const isNew = !profile;
  const [name, setName] = useState(profile?.name || "");
  const [avatar, setAvatar] = useState(profile?.avatar || CARAT_AVATARS[0].id);
  const [accent, setAccent] = useState(profile?.accent || "quartz");
  const [theme, setTheme] = useState(profile?.theme || systemTheme());
  const [notifications, setNotifications] = useState(() => ({
    ...defaultNotifications(),
    ...(profile?.notifications || {}),
  }));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  const trimmed = name.trim();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!trimmed) {
      setError("Please give this profile a name.");
      return;
    }
    if (isNew && !canAdd) {
      setError("You've reached the maximum number of profiles.");
      return;
    }
    onSave({ name: trimmed, avatar, accent, theme, notifications });
  };

  return (
    <Modal
      label={isNew ? "Add profile" : `Edit ${profile.name} profile`}
      onClose={onClose}
      className={`profile-editor${closing ? " profile-editor--closing" : ""}`}
      overlayClassName={`modal-overlay--editor${closing ? " modal-overlay--closing" : ""}`}
    >
      <form className="pe-form" onSubmit={handleSubmit}>
        <div className="pe-header">
          <AvatarCircle user={trimmed || "New"} avatar={avatar} className="pe-preview" />
          <div className="pe-header-text">
            <h2 className="pe-title">{isNew ? "Add a profile" : "Edit profile"}</h2>
            <p className="pe-subtitle">
              {isNew ? "Everyone gets their own lists, history and look." : `@${profile.name}`}
            </p>
          </div>
        </div>

        <div className="pe-body">
          {error && <div className="pe-error" role="alert">{error}</div>}

          <section className="pe-section">
            <label className="pe-label" htmlFor="pe-name">
              <span>Profile name</span>
              <span className="pe-count">{trimmed.length}/{MAX_PROFILE_NAME}</span>
            </label>
            <input
              id="pe-name"
              className="pe-input"
              type="text"
              maxLength={MAX_PROFILE_NAME}
              placeholder="e.g. Carat, Hoshi-biased, Movie night"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              autoFocus
            />
          </section>

          <section className="pe-section">
            <span className="pe-section-title">Avatar</span>
            <div className="pe-avatar-grid" role="radiogroup" aria-label="Profile avatar">
              {CARAT_AVATARS.map((item) => {
                const active = avatar === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={item.label}
                    title={item.label}
                    className={`pe-avatar${active ? " pe-avatar--active" : ""}`}
                    onClick={() => setAvatar(item.id)}
                  >
                    <AvatarCircle user={item.label} avatar={item.id} className="pe-avatar-icon" />
                  </button>
                );
              })}
            </div>
          </section>

          <section className="pe-section">
            <span className="pe-section-title">Theme</span>
            <ThemePicker value={theme} onChange={setTheme} />
          </section>

          <section className="pe-section">
            <span className="pe-section-title">Accent colour</span>
            <AccentPicker value={accent} onChange={setAccent} />
          </section>

          <section className="pe-section">
            <span className="pe-section-title">Notifications</span>
            <NotificationToggles
              value={notifications}
              onChange={(key, checked) => setNotifications((cur) => ({ ...cur, [key]: checked }))}
            />
          </section>
        </div>

        <div className="pe-footer">
          {!isNew && canDelete && (
            <div className="pe-footer-left">
              {confirmDelete ? (
                <>
                  <span className="pe-confirm-text">Delete this profile?</span>
                  <button type="button" className="pe-btn pe-btn--danger" onClick={onDelete}>
                    Delete
                  </button>
                  <button type="button" className="pe-btn" onClick={() => setConfirmDelete(false)}>
                    Keep
                  </button>
                </>
              ) : (
                <button type="button" className="pe-btn pe-btn--danger-ghost" onClick={() => setConfirmDelete(true)}>
                  Delete profile
                </button>
              )}
            </div>
          )}
          <div className="pe-footer-right">
            <button type="button" className="pe-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="pe-btn pe-btn--primary" disabled={!trimmed}>
              {isNew ? "Create profile" : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default ProfileEditorModal;
