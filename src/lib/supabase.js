// Supabase client.
//
// Configuration comes from Vite env vars so no key is ever committed:
//   VITE_SUPABASE_URL
//   VITE_SUPABASE_PUBLISHABLE_KEY
// Copy `.env.example` to `.env` and fill them in. The publishable key is
// designed to be public: it only grants what the Row Level Security policies
// allow, so it is safe to ship in the browser bundle. The `service_role` /
// secret key must NEVER be used in client code.
//
// These values are read at build/transform time, so changing `.env` requires a
// dev-server restart (or a rebuild for production). When a var is missing,
// `supabase` is null and sign-in is disabled — there is no local-only account
// fallback — and the warning below names exactly which var is missing.

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
// `VITE_SUPABASE_ANON_KEY` is accepted as a fallback for projects still using
// the older anon-key name; new projects use the publishable key.
const publicKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && publicKey);

// The same public configuration the client ships with, re-exported so avatar
// storage can build public object URLs and stream raw uploads (with progress)
// against the Storage REST endpoint. These are never secrets.
export const SUPABASE_URL = url || "";
export const SUPABASE_PUBLIC_KEY = publicKey || "";

if (isSupabaseConfigured) {
  console.info(
    `[CaratFlix] Supabase configured (url: ${url}, publishable key: ${publicKey.slice(0, 8)}…).`
  );
} else {
  const missing = [
    !url && "VITE_SUPABASE_URL",
    !publicKey && "VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY)",
  ].filter(Boolean);
  console.warn(
    `[CaratFlix] Supabase is NOT configured: missing ${missing.join(" + ")}. ` +
      "Put them in a `.env` file at the project root and restart the dev server " +
      "(env vars are read once at startup). Accounts are disabled without them — " +
      "there is no local-only account store."
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(url, publicKey, {
      auth: {
        // Keep the session across reloads and refresh it automatically. Each
        // device/browser has its own session, so signing out on one never
        // touches the other.
        persistSession: true,
        autoRefreshToken: true,
        // Supabase sends confirmation / magic-link redirects back with the
        // session in the URL fragment; let the client pick it up.
        detectSessionInUrl: true,
      },
    })
  : null;

export default supabase;
