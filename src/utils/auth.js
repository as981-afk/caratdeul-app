// ============================================================================
// AUTHENTICATION — Supabase Auth only.
// ----------------------------------------------------------------------------
// This app has no password storage of its own. Credentials are handled entirely
// by Supabase Auth (`supabase.auth.signUp` / `signInWithPassword`): passwords
// are hashed server-side and each device gets its own session. The same email +
// password therefore works on any device, and signing out on one device does
// not affect the others.
//
// There is deliberately NO local account lookup. An earlier build kept usernames
// + hashes in localStorage, so an account created in one browser could not be
// found in another — that was the "No account found" error. It is gone: login
// and sign-up always talk to Supabase.
//
// An account is only the login identity. Everything per-viewer (profiles,
// favorites, continue-watching, theme, ...) is stored per profile in Supabase —
// see utils/supabaseProfiles.js and context/SyncContext.jsx.
// ============================================================================

import { isSupabaseConfigured } from "../lib/supabase.js";
import { signInAccount, signUpAccount } from "./supabaseAuth.js";

// Minimum password length enforced by the Create Account screen.
export const MIN_PASSWORD_LENGTH = 8;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email) {
  return EMAIL_RE.test((email || "").trim());
}

// Shown when the build is missing its Supabase configuration. This replaces the
// old silent fallback to a browser-local account store — which is exactly what
// made the same credentials fail on a second device.
const NOT_CONFIGURED =
  "This build is not connected to Supabase, so accounts cannot be shared " +
  "across devices. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, " +
  "then restart (dev) or rebuild (production).";

// Validates the Create Account form before it reaches Supabase.
function validateRegistration({ name, mail, password, confirmPassword }) {
  if (!name || !mail || !password) {
    return "Please fill in every required field.";
  }
  if (name.length < 3) {
    return "Username must be at least 3 characters.";
  }
  if (!isValidEmail(mail)) {
    return "Please enter a valid email address.";
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }
  return "";
}

// Creates the account directly in Supabase Auth. `username` is display-only
// (kept in user metadata); Supabase enforces a unique email.
// Returns `{ ok, account, needsConfirmation }` or `{ error }`.
export async function registerUser({ username, displayName, email, password, confirmPassword, avatarId }) {
  const name = (username || "").trim();
  const mail = (email || "").trim().toLowerCase();
  const display = (displayName || "").trim() || name;
  const invalid = validateRegistration({ name, mail, password, confirmPassword });
  if (invalid) return { error: invalid };
  if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };
  return signUpAccount({ username: name, displayName: display, email: mail, password, avatarId });
}

// Logs in straight against `supabase.auth.signInWithPassword` — no local
// pre-check, so an account created on another device is accepted here.
// Returns `{ ok, account }` or `{ error }`.
export async function loginUser(identifier, password) {
  if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };
  return signInAccount(identifier, password);
}
