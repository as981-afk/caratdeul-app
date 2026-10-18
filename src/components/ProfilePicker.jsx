import { useState } from "react";
import AvatarCircle from "./AvatarCircle";
import ProfileEditorModal from "./ProfileEditorModal";
import { useProfiles } from "../context/ProfileContext.jsx";
import "./LoginPage.css";
import "./ProfileGate.css";

// "Who's watching?" — the screen between logging in and the app.
//
// A signed-in account must pick a profile before any content renders, so this
// doubles as the profile manager: "Manage profiles" turns the tiles into edit
// targets, and the add tile opens the same editor for a brand-new profile.
export function ProfilePicker({ onLogout }) {
  const { account, profiles, maxProfiles, selectProfile, createProfile, updateProfile, deleteProfile } = useProfiles();
  const [managing, setManaging] = useState(false);
  // null | "new" | profile object being edited
  const [editing, setEditing] = useState(null);

  const canAdd = profiles.length < maxProfiles;

  const openNew = () => {
    if (!canAdd) return;
    setEditing("new");
  };

  const handleTile = (profile) => {
    if (managing) setEditing(profile);
    else selectProfile(profile.id);
  };

  const closeEditor = () => setEditing(null);

  const handleSave = (draft) => {
    if (editing === "new") createProfile(draft);
    else if (editing) updateProfile(editing.id, draft);
    closeEditor();
  };

  const handleDelete = () => {
    if (editing && editing !== "new") deleteProfile(editing.id);
    closeEditor();
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-glow login-glow--rose"></div>
        <div className="login-glow login-glow--serenity"></div>
      </div>
      <div className="login-card login-card--picker">
        <div className="login-logo">CARATFLIX</div>
        <p className="login-subtitle">{managing ? "Manage profiles" : "Who's watching?"}</p>

        <div className="profile-picker-grid">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              className="profile-picker-tile"
              type="button"
              onClick={() => handleTile(profile)}
              aria-label={managing ? `Edit ${profile.name}` : `Continue as ${profile.name}`}
            >
              <span className="profile-tile-avatar-wrap">
                <AvatarCircle user={profile.name} avatar={profile.avatar} className="profile-picker-avatar" />
                {managing && <span className="profile-tile-edit" aria-hidden="true">✎</span>}
              </span>
              <span className="profile-picker-name">{profile.name}</span>
            </button>
          ))}

          {canAdd && (
            <button
              className="profile-picker-tile profile-picker-tile--add"
              type="button"
              onClick={openNew}
              aria-label="Add a profile"
            >
              <span className="profile-picker-plus">+</span>
              <span className="profile-picker-name">Add profile</span>
            </button>
          )}
        </div>

        {profiles.length >= maxProfiles && (
          <p className="profile-gate-hint">{maxProfiles} profiles is the maximum for one account.</p>
        )}

        <div className="profile-gate-actions">
          <button className="login-alt-btn profile-gate-manage" type="button" onClick={() => setManaging((m) => !m)}>
            {managing ? "Done" : "Manage profiles"}
          </button>
          <button className="login-alt-btn" type="button" onClick={onLogout}>
            {account ? `Log out @${account}` : "Log out"}
          </button>
        </div>
      </div>

      {editing && (
        <ProfileEditorModal
          profile={editing === "new" ? null : editing}
          canAdd={canAdd}
          canDelete={profiles.length > 1}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={closeEditor}
        />
      )}
    </div>
  );
}

export default ProfilePicker;
