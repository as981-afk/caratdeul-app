import { useState } from "react";
import SafeImg from "./SafeImg";
import { getCaratAvatar, DEFAULT_AVATAR_ID } from "../data/AVATARS";
import { getGalleryItem } from "../data/GALLERY";
import { isCustomAvatar, customAvatarUrl } from "../utils/customAvatar";
import "./AvatarCircle.css";

// Deterministic 0-359 hue from a string so the default circle is consistent
// for the same display name.
function hueFor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % 360;
}

// Default avatar: a name-derived gradient with the initial. Used whenever there
// is no valid icon, uploaded photo, or gallery photo selected.
function defaultAvatarStyle(name) {
  const hue = hueFor(name);
  return {
    background: `linear-gradient(135deg, hsl(${hue}, 72%, 55%), hsl(${(hue + 40) % 360}, 72%, 45%))`,
    color: "#fff",
  };
}

// The circle shown anywhere an avatar appears. Renders, in order of preference:
//   1. a custom uploaded photo ("custom:{path}" — see utils/customAvatar.js),
//   2. a Carat-themed icon (the current picker; Rose Quartz / Serenity palette),
//   3. a legacy gallery photo id from pre-icon builds,
//   4. the coloured initial fallback.
//
// A custom photo that fails to load (deleted file, offline, unconfigured
// storage) falls back to the default Carat preset rather than a broken image.
// The failed URL is remembered rather than a bare boolean, so switching to a
// different photo retries the load.
export function AvatarCircle({ user, avatar, className = "" }) {
  const name = (user || "?").toString();
  const customUrl = isCustomAvatar(avatar) ? customAvatarUrl(avatar) : null;
  const [failedUrl, setFailedUrl] = useState(null);

  if (customUrl && failedUrl !== customUrl) {
    return (
      <span className={`avatar-circle avatar-circle--photo${className ? ` ${className}` : ""}`}>
        <img
          className="avatar-circle-img"
          src={customUrl}
          alt=""
          loading="lazy"
          decoding="async"
          width={64}
          height={64}
          onError={() => setFailedUrl(customUrl)}
        />
      </span>
    );
  }

  // A custom value whose image failed (or has no resolvable URL) shows the
  // default preset instead of falling through to the initial.
  const icon = getCaratAvatar(avatar) || (isCustomAvatar(avatar) ? getCaratAvatar(DEFAULT_AVATAR_ID) : null);
  const classes = `avatar-circle${icon ? " avatar-circle--icon" : ""}${className ? ` ${className}` : ""}`;

  if (icon) {
    return (
      <span
        className={classes}
        style={{ background: `linear-gradient(135deg, ${icon.c1}, ${icon.c2})` }}
        aria-hidden="true"
      >
        <span className="avatar-circle-emoji">{icon.emoji}</span>
      </span>
    );
  }

  const photo = getGalleryItem(avatar);
  if (photo) {
    return (
      <span className={`avatar-circle avatar-circle--photo${className ? ` ${className}` : ""}`}>
        <SafeImg className="avatar-circle-img" src={photo.src} alt={photo.alt} loading="lazy" width={64} height={64} />
      </span>
    );
  }

  return (
    <span className={classes} style={defaultAvatarStyle(name)} aria-hidden="true">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export default AvatarCircle;
