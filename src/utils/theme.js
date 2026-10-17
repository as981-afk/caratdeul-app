// Theme + accent primitives shared by the React ThemeProvider and the inline
// boot script in index.html. Kept dependency-free (no React, no other app
// modules) so both can import it in any order without a cycle.

// The *effective* theme is cached here on every change so the inline boot
// script in index.html can apply the active profile's theme before first paint
// without knowing anything about profiles or React.
export const THEME_KEY = "caratflix-theme";

// The active profile's accent id, cached for the same reason (so the brand
// gradient is correct on the very first frame).
export const ACCENT_KEY = "caratflix-accent";

// Page-background colour per theme, kept in sync with the --obsidian values in
// base.css and the inline boot script. Used to tint the browser UI (address
// bar / PWA chrome) via <meta name="theme-color">.
export const THEME_COLORS = { dark: "#0a0b12", light: "#f1efe9" };

// System preference fallback used when nothing is stored yet. Kept in sync with
// the inline boot script, which applies the theme before first paint so the page
// never flashes the wrong colours.
export function systemTheme() {
  try {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
      return "light";
    }
  } catch {
    /* matchMedia unavailable -> dark */
  }
  return "dark";
}

// Coerces an arbitrary value to a valid theme name (anything else -> dark).
export function normalizeTheme(value) {
  return value === "light" ? "light" : "dark";
}
