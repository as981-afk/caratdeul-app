import { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import { storageGet, storageSet } from "./utils/storage.js";
import { ACCENT_KEY, THEME_COLORS, THEME_KEY, normalizeTheme, systemTheme } from "./utils/theme.js";
import { DEFAULT_ACCENT_ID, getAccent } from "./data/AVATARS.js";
import ProfileContext from "./context/ProfileContext.jsx";

// `undefined` (not `null`) so useTheme can tell "outside the provider" apart
// from a provider that legitimately stores a nullish value.
const ThemeContext = createContext(undefined);

function getInitialTheme() {
  const stored = storageGet(THEME_KEY);
  return stored === "light" || stored === "dark" ? stored : systemTheme();
}

function getInitialAccent() {
  return storageGet(ACCENT_KEY) || DEFAULT_ACCENT_ID;
}

// Theme + accent, driven by the active profile.
//
// The active profile is the single source of truth: when it is present the
// applied theme/accent come from its record, and toggling writes back to it.
// When there is no active profile (the login / picker screens) a local fallback
// is used. Either way the effective values are mirrored into the caches the
// inline boot script reads (caratflix-theme / caratflix-accent), so a reload
// paints the right theme and brand colour before React mounts.
export function ThemeProvider({ children }) {
  const profiles = useContext(ProfileContext);
  const activeProfile = profiles?.activeProfile || null;

  const [localTheme, setLocalTheme] = useState(getInitialTheme);
  const [localAccent, setLocalAccent] = useState(getInitialAccent);

  const theme = activeProfile ? normalizeTheme(activeProfile.theme) : localTheme;
  const accentId = activeProfile ? activeProfile.accent || DEFAULT_ACCENT_ID : localAccent;
  const accent = getAccent(accentId);

  // useLayoutEffect applies the attribute before paint. The boot script in
  // index.html already set the same value for the very first frame, so this
  // only matters after a theme change.
  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_COLORS[theme] || THEME_COLORS.dark);
  }, [theme]);

  // The accent overrides the brand gradient by setting --rose / --serenity on
  // <html>. Inline custom properties win over the [data-theme] blocks, so the
  // accent applies in both light and dark.
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (accent) {
      root.style.setProperty("--rose", accent.c1);
      root.style.setProperty("--serenity", accent.c2);
    } else {
      root.style.removeProperty("--rose");
      root.style.removeProperty("--serenity");
    }
  }, [accent]);

  // Persisting can be slow (storage is sync), so it stays out of the pre-paint
  // effects above.
  useEffect(() => {
    storageSet(THEME_KEY, theme);
  }, [theme]);
  useEffect(() => {
    storageSet(ACCENT_KEY, accentId);
  }, [accentId]);

  const setTheme = useCallback(
    (next) => {
      const value = normalizeTheme(next);
      if (activeProfile && profiles) profiles.updateProfile(activeProfile.id, { theme: value });
      else setLocalTheme(value);
    },
    [activeProfile, profiles]
  );

  const toggleTheme = useCallback(
    () => setTheme(theme === "dark" ? "light" : "dark"),
    [theme, setTheme]
  );

  const setAccent = useCallback(
    (next) => {
      const value = next || DEFAULT_ACCENT_ID;
      if (activeProfile && profiles) profiles.updateProfile(activeProfile.id, { accent: value });
      else setLocalAccent(value);
    },
    [activeProfile, profiles]
  );

  const value = useMemo(
    () => ({ theme, accent: accentId, setAccent, setTheme, toggleTheme }),
    [theme, accentId, setAccent, setTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (value === undefined) {
    throw new Error(
      "useTheme() must be called inside a <ThemeProvider>. " +
        "Wrap the component tree in <ThemeProvider> (see src/App.jsx)."
    );
  }
  return value;
}
