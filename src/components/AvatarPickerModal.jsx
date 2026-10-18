import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Modal from "./Modal";
import AvatarCircle from "./AvatarCircle";
import AvatarCrop from "./AvatarCrop";
import { useSession } from "../context/SessionContext.jsx";
import { useProfiles } from "../context/ProfileContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { CARAT_AVATARS, DEFAULT_AVATAR_ID, getCaratAvatar } from "../data/AVATARS";
import {
  customAvatarPath,
  customAvatarUrl,
  isCustomAvatar,
  makeCustomAvatarValue,
} from "../utils/customAvatar";
import { deleteAvatarFile, uploadAvatarBlob, validateAvatarFile } from "../utils/avatarUpload";
import "./AvatarPickerModal.css";

// Carat-themed avatar picker. Choices are emoji glyphs on the Rose Quartz /
// Serenity palette, plus (for a signed-in profile) an "Upload your own" tile
// that crops a photo client-side and stores it in Supabase Storage. Selection
// is only committed on Save; Escape and a backdrop click cancel. The shared
// Modal supplies the dialog semantics, focus trap, focus restore, body-scroll
// lock, and Escape/backdrop handling.
//
// Two modes:
//   - Session mode (default): persists to the active profile via SessionContext.
//     Custom uploads are available here because an account id + profile id exist.
//   - Controlled mode: pass `current` + `onSave(id)` to use it before a profile
//     exists (e.g. picking a starting avatar on the Create Account screen). No
//     upload tile there — there is nothing to scope a storage path to yet.
//
// The stored value is either a preset id or "custom:{path}" (utils/customAvatar);
// AvatarCircle renders both everywhere.

function friendlyAvatarError(err) {
  if (err && err.name === "AbortError") return "Upload cancelled.";
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "You appear to be offline. Your previous avatar is unchanged.";
  }
  return err?.message || "Something went wrong. Your previous avatar is unchanged.";
}

export function AvatarPickerModal({ current, onSave, onClose, subtitle }) {
  const session = useSession();
  const { accountId } = useProfiles();
  const toast = useToast();

  const profileId = session?.profileId || null;
  const canUpload = Boolean(session && accountId && profileId);

  const active = current !== undefined ? current : session ? session.avatar : null;
  // Presets and custom photos are kept; anything else (legacy gallery ids,
  // unknown values) normalises to null, exactly like the icon-only picker did.
  const normalize = useCallback(
    (value) => (isCustomAvatar(value) ? value : getCaratAvatar(value) ? value : null),
    []
  );

  const [selected, setSelected] = useState(() => normalize(active));
  const [pendingBlob, setPendingBlob] = useState(null);
  const [pendingPreview, setPendingPreview] = useState(null);
  const [cropFile, setCropFile] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [closing, setClosing] = useState(false);

  const fileInputRef = useRef(null);
  const gridRef = useRef(null);
  const closingRef = useRef(false);
  // The value active when the picker opened — the grid scrolls it into view, and
  // `changed` compares against it.
  const initialRef = useRef(normalize(active));

  const originalCustomPath = useMemo(() => customAvatarPath(active), [active]);

  // Release the pending preview object URL when it is replaced or on unmount.
  useEffect(() => {
    return () => { if (pendingPreview) URL.revokeObjectURL(pendingPreview); };
  }, [pendingPreview]);

  // Scroll the active choice into view once (the custom tile when selected).
  useEffect(() => {
    const grid = gridRef.current;
    const value = initialRef.current;
    if (!grid || !value) return;
    const attr = isCustomAvatar(value) ? "custom" : value;
    const el = grid.querySelector(`[data-avatar-id="${attr}"]`);
    if (!el) return;
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
    // Never abandon an upload mid-flight — the modal stays until it settles.
    if (uploading) return;
    beginClose(onClose);
  }, [beginClose, onClose, uploading]);

  const choosePreset = useCallback((id) => {
    setError(null);
    setPendingBlob(null);
    setSelected(id);
  }, []);

  const openFilePicker = useCallback(() => {
    setError(null);
    fileInputRef.current?.click();
  }, []);

  const onFileChange = useCallback((event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = ""; // allow re-picking the same file
    if (!file) return;
    const message = validateAvatarFile(file);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setCropFile(file);
  }, []);

  const closeCrop = useCallback(() => setCropFile(null), []);

  const handleCropped = useCallback((blob) => {
    setPendingBlob(blob);
    setPendingPreview(URL.createObjectURL(blob));
    setCropFile(null);
  }, []);

  const removeCustom = useCallback(() => {
    setError(null);
    setPendingBlob(null);
    setSelected(DEFAULT_AVATAR_ID);
  }, []);

  const customActive = Boolean(pendingBlob) || isCustomAvatar(selected);
  const customDisplay =
    pendingPreview || (isCustomAvatar(selected) ? customAvatarUrl(selected) : null);
  const changed = Boolean(pendingBlob) || (selected !== null && selected !== normalize(active));
  const handle = session ? session.profile?.name || session.user : null;

  const handleSave = useCallback(async () => {
    if (uploading || !changed) return;
    setError(null);
    let uploadedPath = null;
    try {
      let value = selected;
      if (pendingBlob) {
        if (!canUpload) throw new Error("Uploading a photo needs a signed-in account.");
        setUploading(true);
        setProgress(0);
        uploadedPath = await uploadAvatarBlob({
          accountId,
          profileId,
          blob: pendingBlob,
          onProgress: setProgress,
        });
        value = makeCustomAvatarValue(uploadedPath);
      }

      const ok = onSave ? onSave(value) : session ? session.setAvatar(value) : false;
      if (!ok) throw new Error("Couldn't save your avatar. Please try again.");

      // Drop the previous file once the profile no longer points at it.
      const nextPath = customAvatarPath(value);
      if (originalCustomPath && originalCustomPath !== nextPath) {
        deleteAvatarFile(originalCustomPath).catch(() => {});
      }

      toast.push({
        emoji: "📸",
        title: "Avatar updated",
        message: pendingBlob ? "Your new photo was uploaded." : "Saved to your profile.",
      });
      beginClose(onClose);
    } catch (err) {
      // If the file uploaded but the profile write failed, remove the orphan.
      if (uploadedPath) deleteAvatarFile(uploadedPath).catch(() => {});
      setError(friendlyAvatarError(err));
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [
    uploading, changed, selected, pendingBlob, canUpload, accountId, profileId,
    onSave, session, originalCustomPath, toast, beginClose, onClose,
  ]);

  const percent = Math.round(progress * 100);

  return (
    <Modal
      label={cropFile ? "Crop your photo" : "Choose an avatar"}
      onClose={cropFile ? closeCrop : handleCancel}
      className={`avatar-picker${closing ? " avatar-picker--closing" : ""}`}
      overlayClassName={closing ? "modal-overlay--closing" : undefined}
    >
      {cropFile ? (
        <AvatarCrop file={cropFile} onCancel={closeCrop} onConfirm={handleCropped} />
      ) : (
        <>
          <div className="avatar-picker-header">
            <h2 className="avatar-picker-title">Choose an avatar</h2>
            <p className="avatar-picker-subtitle">
              {subtitle ||
                `Pick a Carat icon${handle ? ` for ${handle}` : ""}${canUpload ? ", or upload your own." : "."}`}
            </p>
          </div>

          {error && (
            <div className="profile-modal-error" role="alert">
              {error}
            </div>
          )}

          <div className="avatar-picker-grid" role="group" aria-label="Carat avatars" ref={gridRef}>
            {CARAT_AVATARS.map((item) => {
              const isActive = !customActive && selected === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-avatar-id={item.id}
                  aria-pressed={isActive}
                  aria-label={`Use avatar: ${item.label}`}
                  title={item.label}
                  className={`avatar-picker-option${isActive ? " avatar-picker-option--active" : ""}`}
                  onClick={() => choosePreset(item.id)}
                >
                  <AvatarCircle user={item.label} avatar={item.id} className="avatar-picker-icon" />
                  <span className="avatar-picker-check" aria-hidden="true">{isActive ? "✓" : ""}</span>
                </button>
              );
            })}

            {canUpload && (
              <div className="avatar-picker-custom">
                <button
                  type="button"
                  data-avatar-id="custom"
                  aria-pressed={customActive}
                  aria-label="Upload your own photo"
                  title="Upload your own"
                  className={`avatar-picker-option avatar-picker-option--custom${customActive ? " avatar-picker-option--active" : ""}`}
                  onClick={openFilePicker}
                >
                  {customDisplay ? (
                    <img className="avatar-picker-img" src={customDisplay} alt="" />
                  ) : (
                    <span className="avatar-picker-upload" aria-hidden="true">
                      <span className="avatar-picker-upload-plus">＋</span>
                      <span className="avatar-picker-upload-label">Upload</span>
                    </span>
                  )}
                  <span className="avatar-picker-check" aria-hidden="true">{customActive ? "✓" : ""}</span>
                </button>
                {customActive && (
                  <button
                    type="button"
                    className="avatar-picker-remove"
                    onClick={removeCustom}
                    aria-label="Remove photo and use a preset"
                    title="Remove photo"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            className="avatar-picker-file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            tabIndex={-1}
            aria-hidden="true"
            onChange={onFileChange}
          />

          {uploading && (
            <div
              className="avatar-picker-progress"
              role="progressbar"
              aria-label="Uploading avatar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <span className="avatar-picker-progress-bar" style={{ width: `${Math.max(4, percent)}%` }} />
            </div>
          )}

          <div className="avatar-picker-footer">
            <button type="button" className="avatar-picker-btn" onClick={handleCancel} disabled={uploading}>
              Cancel
            </button>
            <button
              type="button"
              className="avatar-picker-btn avatar-picker-btn--primary"
              onClick={handleSave}
              disabled={!changed || uploading}
            >
              {uploading ? `Uploading ${percent}%` : "Save"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

export default AvatarPickerModal;
