import { storageGet, storageSet, storageRemove } from "./storage";

// Per-user profile-photo storage. The stored value is a gallery image id under
// `caratflix-avatar-{user}`. This key is independent of the profile record and
// My List, so changing a photo can never reset favorites. Access is wrapped in
// try/catch and falls back to sessionStorage/memory inside utils/storage, just
// like ThemeContext.
const AVATAR_KEY = "caratflix-avatar";

export function loadAvatar(user) {
  try { return storageGet(`${AVATAR_KEY}-${user}`) || null; }
  catch { return null; }
}

export function saveAvatar(user, avatarId) {
  try {
    if (avatarId) storageSet(`${AVATAR_KEY}-${user}`, avatarId);
    else storageRemove(`${AVATAR_KEY}-${user}`);
    return true;
  } catch {
    return false;
  }
}
