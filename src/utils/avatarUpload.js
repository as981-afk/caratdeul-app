// Upload / delete of custom avatar photos in Supabase Storage.
//
// The bucket ("avatars", see supabase/migrations/0002_avatars.sql) is public to
// read and write-restricted to each user's own {accountId}/ folder via Row
// Level Security. Objects are named "{accountId}/{profileId}-{timestamp}.webp"
// so every upload gets a fresh URL — which is what keeps a replaced photo from
// being served from a stale cache.
//
// Uploads go through XMLHttpRequest rather than supabase.storage.upload()
// because only XHR reports upload progress (the Supabase JS client uses fetch).
// The request is the same Storage REST call the SDK makes: a POST to
// /storage/v1/object/{bucket}/{path} with the user's session token, the
// publishable key, and the file body. Deletes use the SDK, where progress does
// not matter.

import {
  SUPABASE_URL,
  SUPABASE_PUBLIC_KEY,
  isSupabaseConfigured,
  supabase,
} from "../lib/supabase.js";
import { AVATAR_BUCKET, customAvatarPath } from "./customAvatar.js";

// Matches the bucket's server-side file_size_limit; enforced here first so the
// user gets a friendly message instead of an HTTP 413.
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

// Only these may be uploaded. SVG and GIF are rejected on purpose: SVG can
// carry script, and a GIF avatar would animate inside the UI.
export const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];
const BLOCKED_AVATAR_TYPES = ["image/svg+xml", "image/gif"];
const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];
const BLOCKED_EXTENSIONS = ["svg", "gif"];

function extensionOf(name) {
  const match = /\.([a-z0-9]+)$/i.exec(name || "");
  return match ? match[1].toLowerCase() : "";
}

// Returns a friendly message when a file may not be used, or null when it is
// acceptable. Checks the declared MIME type *and* the extension, because some
// browsers leave `file.type` empty.
export function validateAvatarFile(file) {
  if (!file) return "No file selected.";
  if (file.size > MAX_AVATAR_BYTES) {
    return "That image is larger than 5 MB. Please pick a smaller photo.";
  }
  const type = (file.type || "").toLowerCase();
  const ext = extensionOf(file.name);
  if (BLOCKED_AVATAR_TYPES.includes(type) || BLOCKED_EXTENSIONS.includes(ext)) {
    return "SVG and GIF images aren't supported. Please choose a PNG, JPEG or WebP.";
  }
  const okType = ALLOWED_AVATAR_TYPES.includes(type);
  const okExt = ALLOWED_EXTENSIONS.includes(ext);
  if (!okType && !okExt) {
    return "Please choose a PNG, JPEG or WebP image.";
  }
  return null;
}

// File extension for the encoded blob. WebP is preferred; the JPEG fallback in
// AvatarCrop produces image/jpeg on browsers that can't encode WebP.
export function extensionForType(type) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  return "webp";
}

export function avatarStoragePath(accountId, profileId, type) {
  return `${accountId}/${profileId}-${Date.now()}.${extensionForType(type)}`;
}

function uploadErrorMessage(status) {
  if (status === 413) return "That image is too large to upload.";
  if (status === 401 || status === 403) {
    return "You don't have permission to upload there. Try signing in again.";
  }
  if (status === 400) return "The upload was rejected. Try a different image.";
  return `Upload failed (error ${status}). Please try again.`;
}

// Uploads `blob` and resolves with the stored object path. `onProgress` gets a
// 0..1 fraction as the body is sent.
export async function uploadAvatarBlob({ accountId, profileId, blob, onProgress, signal }) {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error("Cloud storage isn't configured, so photos can't be uploaded.");
  }
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error("Couldn't verify your session. Please sign in again.");
  const token = data?.session?.access_token;
  if (!token) throw new Error("You need to be signed in to upload a photo.");

  const path = avatarStoragePath(accountId, profileId, blob.type);

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/${AVATAR_BUCKET}/${path}`);
    xhr.setRequestHeader("authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", SUPABASE_PUBLIC_KEY);
    xhr.setRequestHeader("content-type", blob.type || "application/octet-stream");
    xhr.setRequestHeader("cache-control", "31536000");
    xhr.setRequestHeader("x-upsert", "false");

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total) onProgress(event.loaded / event.total);
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(uploadErrorMessage(xhr.status)));
    };
    xhr.onerror = () => reject(new Error("Upload failed — check your connection and try again."));
    xhr.onabort = () => reject(new DOMException("Upload cancelled.", "AbortError"));

    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return;
      }
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }
    xhr.send(blob);
  });

  return path;
}

// Removes a stored avatar file. Accepts either a raw storage path or a full
// "custom:..." value. Best-effort: callers ignore failures (an orphaned file
// wastes a little space but never breaks the UI).
export async function deleteAvatarFile(value) {
  const path = customAvatarPath(value) || value;
  if (!supabase || !path) return false;
  const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([path]);
  if (error) throw error;
  return true;
}
