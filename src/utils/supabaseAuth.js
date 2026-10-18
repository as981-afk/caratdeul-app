// Supabase-backed account (login identity) helpers.
//
// An "account" here is only the credential identity shared across devices; the
// per-viewer identities (profiles) live in utils/supabaseProfiles.js. Every
// function returns `{ ok, account }` / `{ error }`, which is the shape the login
// screens consume.
//
// `account` is `{ id, username, email }`:
//   id       the Supabase user id (used to scope rows / per-device state)
//   username the handle chosen at sign-up (display only)
//   email    the address used to log in

import { supabase, isSupabaseConfigured } from "../lib/supabase.js";
import { storageGet, storageSet, storageRemove } from "./storage.js";

// Mirrors isValidEmail in utils/auth.js. Duplicated rather than imported so the
// two modules do not form an import cycle.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// A tiny account cache so the first paint does not wait on the network. It is
// only a hint: getCurrentAccount() still asks Supabase for the real session and
// clears the cache when there is none.
const ACCOUNT_CACHE_KEY = "caratflix-supabase-account";

export function isValidEmail(email) {
  return EMAIL_RE.test((email || "").trim());
}

function accountFromUser(user) {
  if (!user) return null;
  const meta = user.user_metadata || {};
  const fallback = user.email ? user.email.split("@")[0] : "Carat";
  return {
    id: user.id,
    username: meta.username || meta.display_name || fallback,
    email: user.email || "",
  };
}

export function loadCachedAccount() {
  if (!isSupabaseConfigured) return null;
  try {
    const raw = storageGet(ACCOUNT_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed.id === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function saveCachedAccount(account) {
  if (!isSupabaseConfigured) return;
  if (account) storageSet(ACCOUNT_CACHE_KEY, JSON.stringify(account));
  else storageRemove(ACCOUNT_CACHE_KEY);
}

// Current signed-in account, or null. Resolves from the session Supabase keeps
// in storage (persisted per device).
export async function getCurrentAccount() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error("[CaratFlix] auth.getSession failed; using cached account", error);
      return loadCachedAccount();
    }
    const token = data?.session?.access_token || null;
    // The token here is the one supabase-js attaches as
    // `Authorization: Bearer <token>` on every profiles / my_list /
    // watch_progress request after login, so its presence is the check that
    // "the auth token is sent in the request headers".
    console.log("[CaratFlix] auth.getSession ✓", {
      hasSession: Boolean(data?.session),
      hasAccessToken: Boolean(token),
      tokenLength: token ? token.length : 0,
    });
    const account = accountFromUser(data?.session?.user);
    saveCachedAccount(account);
    return account;
  } catch (error) {
    console.error("[CaratFlix] auth.getSession threw; using cached account", error);
    return loadCachedAccount();
  } finally {
    console.log("[CaratFlix] auth.getSession settled");
  }
}

// Re-fires whenever the session changes (sign-in/out, token refresh, another
// tab). Returns an unsubscribe function.
export function onAccountChange(callback) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const account = accountFromUser(session?.user);
    saveCachedAccount(account);
    callback(account);
  });
  return () => data?.subscription?.unsubscribe?.();
}

// Creates the credential account. `username` / `displayName` / `avatarId` are
// stored in user metadata (there is no server table for them, so they are not
// globally unique — that is fine for the handle).
export async function signUpAccount({ username, displayName, email, password, avatarId }) {
  if (!supabase) return { error: "Supabase is not configured." };
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        username: (username || "").trim(),
        display_name: (displayName || "").trim(),
        avatar: avatarId || "",
      },
    },
  });
    const alreadyUsed = "That email is already in use. Try logging in, or reset your password.";
  if (error) {
    const msg = String(error.message || "").toLowerCase();
    if (msg.includes("already registered") || error.code === "user_already_exists") {
      return { error: alreadyUsed };
    }
  }
  if (data?.user && data.user.identities?.length === 0) {
    return { error: alreadyUsed };
  }
  if (error) return { error: error.message };
  const account = accountFromUser(data?.user);
  if (data?.session) saveCachedAccount(account);
  // No session means the project requires email confirmation before the first
  // sign-in.
  return { ok: true, account, needsConfirmation: !data?.session };
}

export async function signInAccount(identifier, password) {
  if (!supabase) return { error: "Supabase is not configured." };
  if (!isValidEmail(identifier)) {
    return { error: "Please log in with the email address for this account." };
  }
  console.log("[CaratFlix] auth.signInWithPassword →", { email: identifier.trim().toLowerCase() });
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: identifier.trim().toLowerCase(),
      password,
    });
    if (error) {
      // Normalize Supabase's copy into plain wording for the login screen.
      const message = /invalid login credentials/i.test(error.message)
        ? "Incorrect email or password."
        : /email not confirmed/i.test(error.message)
        ? "Please confirm your email address before logging in."
        : error.message;
      console.error("[CaratFlix] auth.signInWithPassword ✗", error);
      return { error: message };
    }
    const account = accountFromUser(data?.user);
    saveCachedAccount(account);
    console.log("[CaratFlix] auth.signInWithPassword ✓", {
      userId: account?.id,
      hasAccessToken: Boolean(data?.session?.access_token),
    });
    return { ok: true, account };
  } catch (error) {
    console.error("[CaratFlix] auth.signInWithPassword threw", error);
    return { error: error.message || "Could not log in." };
  } finally {
    console.log("[CaratFlix] auth.signInWithPassword settled");
  }
}

// Signs out THIS device only. `scope: "local"` tells Supabase not to revoke the
// session tokens held by other devices, so they stay signed in.
export async function signOutAccount() {
  if (!supabase) return;
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    /* already signed out / offline — nothing else to do */
  }
  saveCachedAccount(null);
}

// Changes the password of the signed-in account.
export async function updateAccountPassword(newPassword) {
  if (!supabase) return { error: "Supabase is not configured." };
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return error ? { error: error.message } : { ok: true };
}
