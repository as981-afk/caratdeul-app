import { useState, useMemo, useRef, useCallback } from "react";
import Modal from "./Modal";
import { useSession } from "../context/SessionContext.jsx";
import { useProfiles } from "../context/ProfileContext.jsx";
import AvatarCircle from "./AvatarCircle";
import { formatJoinedAt } from "../utils/format";
import { MEMBERS } from "../data/MEMBERS";
import "./Modal.css";
import "./ProfileModal.css";

// "All" is the stored default meaning "no specific preference"; the UI labels
// it clearly instead of forcing users to guess.
const UNIT_OPTIONS = [
  { value: "All", label: "No preference" },
  { value: "Vocal Team", label: "Vocal Team" },
  { value: "Hip-Hop Team", label: "Hip-Hop Team" },
  { value: "Performance Team", label: "Performance Team" },
];

// Stored value -> display label. Exported so the read-only ProfileViewModal
// renders exactly what the editor shows without duplicating the mapping.
export const UNIT_LABELS = Object.fromEntries(UNIT_OPTIONS.map((o) => [o.value, o.label]));

const BIO_MAX = 150;

// Gradients used for the favorite-unit chips and suggestions in the profile
// editor, matching the member color coding. Exported for ProfileViewModal.
export const UNIT_STYLES = {
  All: { c1: "#b083f0", c2: "#6d4bb8" },
  "Vocal Team": { c1: "#9FC3E8", c2: "#4f6f96" },
  "Hip-Hop Team": { c1: "#caa15a", c2: "#7a5a2a" },
  "Performance Team": { c1: "#F2A9C1", c2: "#a4577a" },
};

// Searchable chip picker shared by the Bias members, Favorite unit, and Bias
// wrecker fields. Mirrors the bias-member UI: selected chips, an "+ Add"
// trigger, and a search input with an inline suggestion list.
function SearchChipPicker({
  value,          // string[] (multi-select) or string (single-select)
  items,          // { key, label, c1?, c2?, sublabel? }[]
  onPick,         // (key) => void
  onRemove,       // (key) => void
  single = false,
  noneKey = "",
  addLabel,
  placeholder,
  emptyText = "No matches.",
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);

  const selected = useMemo(() => new Set(single ? [value] : value), [single, value]);
  const chipKeys = useMemo(
    () => (single ? (value && value !== noneKey ? [value] : []) : value),
    [single, value, noneKey]
  );

  const matches = useMemo(
    () => items.filter((it) => it.label.toLowerCase().includes(query.trim().toLowerCase())),
    [items, query]
  );

  return (
    <>
      <div className="profile-modal-biases">
        {chipKeys.map((key) => {
          const item = items.find((it) => it.key === key);
          if (!item) return null;
          return (
            <span className="profile-modal-bias" key={key} style={item.c1 ? { "--c1": item.c1, "--c2": item.c2 } : undefined}>
              <span
                className="profile-modal-bias-avatar"
                style={item.c1 ? { background: `linear-gradient(135deg, ${item.c1}, ${item.c2})` } : undefined}
                aria-hidden="true"
              >
                {item.label.charAt(0)}
              </span>
              <span className="profile-modal-bias-name">{item.label}</span>
              <button
                type="button"
                className="profile-modal-bias-remove"
                aria-label={`Remove ${item.label}`}
                onClick={() => onRemove(key)}
              >
                ✕
              </button>
            </span>
          );
        })}
      </div>
      <button
        type="button"
        className="profile-modal-bias-add"
        onClick={() => {
          inputRef.current?.focus();
          setOpen(true);
        }}
      >
        {addLabel}
      </button>
      <div
        className="profile-modal-biaspicker"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
        }}
      >
        <input
          ref={inputRef}
          type="text"
          className="profile-modal-input profile-modal-bias-input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && matches.length > 0) {
              e.preventDefault();
              onPick(matches[0].key);
              setQuery("");
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {open && (
          <div className="profile-modal-suggest" role="listbox">
            {matches.map((it) => {
              const isSelected = selected.has(it.key);
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  key={it.key}
                  className={`profile-modal-suggest-item${isSelected ? " profile-modal-suggest-item--selected" : ""}`}
                  onClick={() => {
                    onPick(it.key);
                    setQuery("");
                    setOpen(true);
                  }}
                >
                  <span
                    className="profile-modal-suggest-avatar"
                    style={it.c1 ? { background: `linear-gradient(135deg, ${it.c1}, ${it.c2})` } : undefined}
                    aria-hidden="true"
                  >
                    {it.label.charAt(0)}
                  </span>
                  <span className="profile-modal-suggest-name">{it.label}</span>
                  {it.sublabel && <span className="profile-modal-suggest-unit">{it.sublabel}</span>}
                  <span className="profile-modal-suggest-check" aria-hidden="true">{isSelected ? "✓" : ""}</span>
                </button>
              );
            })}
            {matches.length === 0 && <p className="profile-modal-suggest-empty">{emptyText}</p>}
          </div>
        )}
      </div>
    </>
  );
}

export function ProfileModal({ user, displayName, onClose, onSaved, onChangePhoto }) {
  const { favs, setFavMembers, avatar } = useSession();
  const { activeProfile, updateProfile } = useProfiles();
  const profile = useMemo(() => activeProfile || {}, [activeProfile]);
  const [closing, setClosing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [error, setError] = useState(null);

  // Editable draft state — initialized from the stored profile + favorites and
  // only persisted when the user presses Save Changes. X/Escape/backdrop prompt
  // for confirmation when there are unsaved edits instead of silently losing
  // them.
  const [draftBio, setDraftBio] = useState(profile.bio || "");
  const [draftUnit, setDraftUnit] = useState(profile.favoriteUnit || "All");
  const [draftWrecker, setDraftWrecker] = useState(profile.biasWrecker || "");
  const [draftStatus, setDraftStatus] = useState(profile.status || "");
  const [draftSince, setDraftSince] = useState(
    () => profile.memberSince || (profile.joinedAt ? formatJoinedAt(profile.joinedAt) : "")
  );
  const [draftBias, setDraftBias] = useState(() => (Array.isArray(favs?.members) ? [...favs.members] : []));
  // Ref guard (not just state) so a rapid double-click can never double-save.
  const savingRef = useRef(false);

  const toggleBias = useCallback((name) => {
    setDraftBias((cur) => (cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name]));
  }, []);

  // True when the drafts differ from what is stored, i.e. there is something to
  // lose on dismissal.
  const isDirty = useMemo(() => {
    const baselineSince = profile.memberSince || (profile.joinedAt ? formatJoinedAt(profile.joinedAt) : "");
    const baselineBias = Array.isArray(favs?.members) ? [...favs.members].sort() : [];
    const draftBiasSorted = [...draftBias].sort();
    return (
      draftBio.trim() !== (profile.bio || "") ||
      draftUnit !== (profile.favoriteUnit || "All") ||
      draftWrecker.trim() !== (profile.biasWrecker || "") ||
      draftStatus.trim() !== (profile.status || "") ||
      draftSince.trim() !== baselineSince ||
      JSON.stringify(baselineBias) !== JSON.stringify(draftBiasSorted)
    );
  }, [profile, favs, draftBio, draftUnit, draftWrecker, draftStatus, draftSince, draftBias]);

  const beginClose = useCallback(
    (done) => {
      if (closing) return;
      setClosing(true);
      window.setTimeout(done, 200);
    },
    [closing]
  );

  // X button, Escape, and a backdrop click all route here. With unsaved edits we
  // ask first; while a save is in flight we ignore dismissal entirely.
  const handleCancel = useCallback(() => {
    if (closing || savingRef.current) return;
    if (confirmDiscard) {
      setConfirmDiscard(false);
      return;
    }
    if (isDirty) {
      setConfirmDiscard(true);
      return;
    }
    beginClose(onClose);
  }, [closing, confirmDiscard, isDirty, beginClose, onClose]);

  // Save Changes persists everything, then closes and confirms with a toast.
  // A short async round-trip is simulated so the "Saving..." state is visible.
  // On a real write failure the modal stays open with the user's values intact
  // and a clear error, and no fake success is shown. savingRef guards against
  // double submissions while the save is in flight.
  const handleSave = useCallback(async () => {
    if (closing || savingRef.current) return;
    savingRef.current = true;
    setError(null);
    setSaving(true);
    let failed = false;
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      if (!activeProfile) throw new Error("no profile");
      updateProfile(activeProfile.id, {
        bio: draftBio.trim(),
        favoriteUnit: draftUnit,
        biasWrecker: draftWrecker.trim(),
        status: draftStatus.trim(),
        memberSince: draftSince.trim(),
      });
    } catch {
      failed = true;
    }
    savingRef.current = false;
    setSaving(false);
    if (failed) {
      setError("Couldn't save your profile. Please try again.");
      return;
    }
    setFavMembers(draftBias);
    onSaved("Profile updated");
    beginClose(onClose);
  }, [closing, activeProfile, updateProfile, draftBio, draftUnit, draftWrecker, draftStatus, draftSince, draftBias, setFavMembers, onSaved, onClose, beginClose]);

  const handleDiscard = useCallback(() => {
    setConfirmDiscard(false);
    beginClose(onClose);
  }, [beginClose, onClose]);

  return (
    <Modal
      label={`${displayName || user} profile`}
      onClose={handleCancel}
      className={`profile-modal${closing ? " profile-modal--closing" : ""}`}
      overlayClassName={closing ? "modal-overlay--closing" : undefined}
    >
      <div className="profile-modal-header">
        <div className="profile-modal-avatar-wrap">
          <AvatarCircle user={user} avatar={avatar} className="profile-modal-avatar" />
          <span className="profile-modal-status" aria-hidden="true" title="Signed in" />
        </div>
        <div className="profile-modal-user">
          <div className="profile-modal-name-row">
            <h2 className="profile-modal-name">{displayName || user}</h2>
            {draftStatus && <span className="profile-modal-flair">{draftStatus}</span>}
          </div>
          <p className="profile-modal-handle">@{user}</p>
          <span className="profile-modal-badge">CARAT</span>
        </div>
        <button
          className="profile-modal-exit"
          type="button"
          onClick={handleCancel}
          aria-label="Close profile"
          title="Close (Esc)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="14" height="14" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {confirmDiscard ? (
        <div className="profile-discard">
          <h3 className="profile-discard-title">Discard changes?</h3>
          <p className="profile-discard-text">You have unsaved changes.</p>
          <div className="profile-discard-actions">
            <button type="button" className="profile-discard-btn profile-discard-btn--primary" onClick={() => setConfirmDiscard(false)}>
              Keep Editing
            </button>
            <button type="button" className="profile-discard-btn" onClick={handleDiscard}>
              Discard
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="profile-modal-body">
            {error && (
              <div className="profile-modal-error" role="alert">
                {error}
              </div>
            )}
            <form
              className="profile-modal-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
            >
              <section className="profile-modal-section">
                <label className="profile-modal-field" htmlFor="profile-bio">
                  <span className="profile-modal-field-top">
                    <span className="profile-modal-section-title">Bio</span>
                    <span className={`profile-modal-char-count${draftBio.length > BIO_MAX ? " profile-modal-char-count--over" : ""}`}>
                      {draftBio.length}/{BIO_MAX}
                    </span>
                  </span>
                  <textarea
                    id="profile-bio"
                    className="profile-modal-input profile-modal-textarea"
                    rows={3}
                    maxLength={BIO_MAX}
                    placeholder="Tell Carats a little about yourself..."
                    value={draftBio}
                    onChange={(e) => setDraftBio(e.target.value)}
                  />
                </label>
              </section>

              <section className="profile-modal-section">
                <span className="profile-modal-section-title">Favorite unit</span>
                <SearchChipPicker
                  single
                  value={draftUnit}
                  noneKey="All"
                  items={UNIT_OPTIONS.map((o) => ({
                    key: o.value,
                    label: o.label,
                    ...(UNIT_STYLES[o.value] || {}),
                  }))}
                  onPick={setDraftUnit}
                  onRemove={() => setDraftUnit("All")}
                  addLabel="+ Add unit"
                  placeholder="Search and pick a unit..."
                  emptyText="No units match."
                />
                {draftUnit === "All" && (
                  <span className="profile-modal-field-hint">No preference — you haven’t picked a favorite unit.</span>
                )}
              </section>

              <section className="profile-modal-section">
                <span className="profile-modal-section-title">Bias members</span>
                <SearchChipPicker
                  value={draftBias}
                  items={MEMBERS.map((m) => ({
                    key: m.name,
                    label: m.name,
                    c1: m.c1,
                    c2: m.c2,
                    sublabel: m.unit,
                  }))}
                  onPick={toggleBias}
                  onRemove={toggleBias}
                  addLabel="+ Add member"
                  placeholder={draftBias.length > 0 ? "Add another member..." : "Search and add members..."}
                  emptyText="No members match."
                />
              </section>

              <section className="profile-modal-section">
                <span className="profile-modal-section-title">Bias wrecker</span>
                <SearchChipPicker
                  single
                  value={draftWrecker}
                  items={MEMBERS.map((m) => ({
                    key: m.name,
                    label: m.name,
                    c1: m.c1,
                    c2: m.c2,
                    sublabel: m.unit,
                  }))}
                  onPick={setDraftWrecker}
                  onRemove={() => setDraftWrecker("")}
                  addLabel="+ Add wrecker"
                  placeholder="Search and add members..."
                  emptyText="No members match."
                />
                {draftWrecker === "" && (
                  <span className="profile-modal-field-hint">Your secondary favorite member.</span>
                )}
              </section>

              <section className="profile-modal-section">
                <label className="profile-modal-field" htmlFor="profile-status">
                  <span className="profile-modal-section-title">Status flair</span>
                  <input
                    id="profile-status"
                    type="text"
                    className="profile-modal-input"
                    maxLength={40}
                    placeholder="e.g. Streaming new release"
                    value={draftStatus}
                    onChange={(e) => setDraftStatus(e.target.value)}
                  />
                  <span className="profile-modal-field-hint">Shown next to your name. {draftStatus.length}/40</span>
                </label>
              </section>

              <section className="profile-modal-section">
                <label className="profile-modal-field" htmlFor="profile-since">
                  <span className="profile-modal-section-title">Member since</span>
                  <input
                    id="profile-since"
                    type="text"
                    className="profile-modal-input"
                    placeholder="e.g. Since 2021 or May 2020"
                    value={draftSince}
                    onChange={(e) => setDraftSince(e.target.value)}
                  />
                  <span className="profile-modal-field-hint">Letters and numbers welcome — e.g. “Since 2021” or “May 2020”.</span>
                </label>
              </section>

              <section className="profile-modal-section">
                <span className="profile-modal-section-title">Avatar</span>
                <div className="profile-photo-row">
                  <AvatarCircle user={user} avatar={avatar} className="profile-photo-preview" />
                  <button
                    type="button"
                    className="profile-photo-change"
                    onClick={onChangePhoto}
                    aria-label="Change avatar"
                  >
                    Change avatar
                  </button>
                </div>
                <span className="profile-modal-field-hint">
                  Pick a Carat icon — it is saved to this profile and never touches My List.
                </span>
              </section>
            </form>
          </div>

          <div className="profile-modal-footer">
            <button type="button" className="profile-modal-done" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

export default ProfileModal;
