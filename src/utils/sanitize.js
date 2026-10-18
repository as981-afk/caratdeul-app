// Input sanitisation shared by every user-authored field (comments today).
//
// React already escapes text nodes, so this is defence-in-depth, not the only
// guard: it strips control characters and angle brackets, collapses runs of
// whitespace to a single space, trims, and hard-caps the length. The same hard
// cap is exposed so the UI can show a live "x / max" counter and disable submit.

export const COMMENT_MAX = 240;

// Replaces C0/C1 control codes with a space, by code point (no control-character
// regex). Comments are single-line, so newlines collapse with the whitespace
// pass below anyway.
function stripControl(text) {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0);
    out += code <= 0x1f || (code >= 0x7f && code <= 0x9f) ? " " : ch;
  }
  return out;
}

export function sanitizeText(input, max = COMMENT_MAX) {
  if (typeof input !== "string") return "";
  let text = stripControl(input)
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length > max) text = text.slice(0, max);
  return text;
}

// A stable-ish unique id for locally stored records (comments, reactions).
export function localId(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
