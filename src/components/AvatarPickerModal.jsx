import { useCallback, useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import AvatarCircle from "./AvatarCircle";
import { useSession } from "../context/SessionContext.jsx";
import { CARAT_AVATARS, getCaratAvatar } from "../data/AVATARS";
import "./AvatarPickerModal.css";

// Carat-themed avatar picker. Choices are emoji glyphs on the Rose Quartz /
// Serenity palette — no copyrighted artwork. Selection is only committed on
// Save; Escape and a backdrop click cancel. The shared Modal supplies the dialog
// semantics, focus trap, focus restore, body-scroll lock, and Escape/backdrop
// handling.
//
// Two modes:
//   - Session mode (default): persists to the active profile via SessionContext.
//   - Controlled mode: pass `current` + `onSave(id)` to use it before a profile
//     exists (e.g. picking a starting avatar on the Create Account screen).
export function AvatarPickerModal({ current, onSave, onClose, onSaved, subtitle }) {
  const session = useSession();
  const active = current !== undefined ? current : session ? session.avatar : null;
  const [selected, setSelected] = useState(() => (getCaratAvatar(active) ? active : null));
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState(null);
  const closingRef = useRef(false);
  const gridRef = useRef(null);
  // The icon active when the picker opened — the grid scrolls it into view so a
  // selection far down the list is visible immediately.
  const initialSelectedRef = useRef(selected);

  useEffect(() => {
    const grid = gridRef.current;
    const id = initialSelectedRef.current;
    if (!grid || !id) return;
    const el = grid.querySelector(`[data-avatar-id="${id}"]`);
    if (!el) return;
    // `block: "nearest"` only scrolls if the item is off-screen, and the jump
    // is instant (not smooth) for users who prefer reduced motion.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, []);

  const beginClose = useCallback((done) => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    window.setTimeout(done, 200);
  }, []);

  const handleCancel = useCallback(() => {
    beginClose(onClose);
  }, [beginClose, onClose]);

  const handleSave = useCallback(() => {
    if (!selected) return;
    setError(null);
    const ok = onSave ? onSave(selected) : session ? session.setAvatar(selected) : false;
    if (!ok) {
      setError("Couldn't save your avatar. Please try again.");
      return;
    }
    onSaved?.("Avatar updated");
    beginClose(onClose);
  }, [selected, onSave, session, onSaved, beginClose, onClose]);

  const changed = selected !== null && selected !== (getCaratAvatar(active) ? active : null);
  const handle = session ? session.profile?.name || session.user : null;

  return (
    <Modal
      label="Choose an avatar"
      onClose={handleCancel}
      className={`avatar-picker${closing ? " avatar-picker--closing" : ""}`}
      overlayClassName={closing ? "modal-overlay--closing" : undefined}
    >
      <div className="avatar-picker-header">
        <h2 className="avatar-picker-title">Choose an avatar</h2>
        <p className="avatar-picker-subtitle">
          {subtitle || `Pick a Carat icon${handle ? ` for ${handle}` : ""}.`}
        </p>
      </div>

      {error && (
        <div className="profile-modal-error" role="alert">
          {error}
        </div>
      )}

      <div className="avatar-picker-grid" role="group" aria-label="Carat avatars" ref={gridRef}>
        {CARAT_AVATARS.map((item) => {
          const isActive = selected === item.id;
          return (
            <button
              key={item.id}
              type="button"
              data-avatar-id={item.id}
              aria-pressed={isActive}
              aria-label={`Use avatar: ${item.label}`}
              title={item.label}
              className={`avatar-picker-option${isActive ? " avatar-picker-option--active" : ""}`}
              onClick={() => setSelected(item.id)}
            >
              <AvatarCircle user={item.label} avatar={item.id} className="avatar-picker-icon" />
              <span className="avatar-picker-check" aria-hidden="true">{isActive ? "✓" : ""}</span>
            </button>
          );
        })}
      </div>

      <div className="avatar-picker-footer">
        <button type="button" className="avatar-picker-btn" onClick={handleCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="avatar-picker-btn avatar-picker-btn--primary"
          onClick={handleSave}
          disabled={!changed}
        >
          Save
        </button>
      </div>
    </Modal>
  );
}

export default AvatarPickerModal;
