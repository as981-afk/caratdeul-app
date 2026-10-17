// ============================================================================
// DEMO AUTHENTICATION — NOT SECURE. DO NOT USE FOR PRODUCTION.
// ----------------------------------------------------------------------------
// The login below stores usernames and hashes in the browser's localStorage.
// Only hashes are ever written: passwords are SHA-256 hashed (with a static
// salt) before storage, and browsers without WebCrypto fall back to a
// non-reversible FNV-style hash — a raw password is never persisted in any
// form. Hashes still offer no real protection versus anyone with access to
// the browser, so for real authentication integrate a backend / auth provider
// (OAuth, JWT sessions, Supabase, Firebase, Auth0, NextAuth, ...).
//
// An account is only the login identity. Everything per-viewer (favorites,
// continue-watching, theme, ...) now lives on a *profile* under that account —
// see utils/profiles.js. The account-level profile record written here exists
// purely as a migration source for the first profile and for the demo seed.
// ============================================================================

const AUTH_KEY = "caratflix-auth";
const USERS_KEY = "caratflix-users";
const PROFILE_KEY = "caratflix-profile";

// Demo account seeded on first visit so the login form can be used straight
// away instead of forcing visitors through registration first.
export const DEMO_USER = "carat";
export const DEMO_PASSWORD = "caratflix";
export const DEMO_EMAIL = "carat@caratflix.demo";

// Minimum password length enforced by the Create Account screen (demo policy).
export const MIN_PASSWORD_LENGTH = 8;

import { storageGet, storageSet, storageRemove } from "./storage.js";
import { saveAvatar } from "./avatarStore.js";
import { saveList } from "../hooks/useLocalStorageList.js";
import { FAV_KEY } from "./watchHistory.js";

// Non-reversible fallback for browsers without WebCrypto (FNV-1a variant).
// Not cryptographic — it exists purely so the plaintext password is never
// written to storage when crypto.subtle is unavailable.
function fallbackHash(password) {
  const input = `caratflix::${password}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 + c + i, 2246822519) >>> 0;
  }
  return `fb-${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}

export async function hashPassword(password) {
  try {
    if (!globalThis.crypto || !globalThis.crypto.subtle) throw new Error("no WebCrypto");
    // Static salt so identical passwords don't produce identical raw hashes
    // matching common lookup tables; fine for demo purposes.
    const data = new TextEncoder().encode(`caratflix::${password}`);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return fallbackHash(password);
  }
}

// Matches a stored record against a password. Returns "ok" when it matches
// the stored hash, "legacy" when it matched an old plaintext record that
// should be upgraded, or false.
function matchStored(stored, password, hashed) {
  if (stored === hashed) return "ok";
  // Very old builds wrote `plain-<password>` when WebCrypto was missing. The
  // value is only ever compared here — it is rewritten as a hash on the next
  // successful login, so no new plaintext ever lands in storage.
  if (typeof stored === "string" && stored.startsWith("plain-")) {
    return stored === `plain-${password}` ? "legacy" : false;
  }
  return false;
}

export function loadCurrentUser() {
  return storageGet(AUTH_KEY);
}

export function saveCurrentUser(user) {
  if (user) storageSet(AUTH_KEY, user);
  else storageRemove(AUTH_KEY);
}

export function loadUsers() {
  try { return JSON.parse(storageGet(USERS_KEY)) || {}; }
  catch { return {}; }
}

export function saveUsers(users) {
  storageSet(USERS_KEY, JSON.stringify(users));
}

// --- User record helpers -----------------------------------------------------
// v1 stored `users[name] = hashString`. v2 stores an object
// `{ hash, email, displayName, createdAt }`. Both are read here so older
// accounts keep working; the next successful login upgrades a v1 record.

function recordHash(record) {
  if (typeof record === "string") return record;
  if (record && typeof record === "object") return record.hash;
  return null;
}

function recordEmail(record) {
  return record && typeof record === "object" ? record.email || "" : "";
}

function recordDisplayName(record, fallback) {
  const name = record && typeof record === "object" ? record.displayName : "";
  return name || fallback;
}

function toRecord(hash, fields = {}) {
  return {
    hash,
    email: (fields.email || "").trim().toLowerCase(),
    displayName: (fields.displayName || "").trim(),
    createdAt: fields.createdAt || Date.now(),
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email) {
  return EMAIL_RE.test((email || "").trim());
}

// Case-insensitive email lookup across all accounts; returns the username or null.
function findUsernameByEmail(users, email) {
  const target = (email || "").trim().toLowerCase();
  if (!target) return null;
  for (const [name, record] of Object.entries(users)) {
    if (recordEmail(record).toLowerCase() === target) return name;
  }
  return null;
}

// Synchronous checks used for inline validation on the Create Account screen.
export function isUsernameTaken(username) {
  const name = (username || "").trim();
  return name ? loadUsers()[name] !== undefined : false;
}

export function isEmailTaken(email) {
  return !!findUsernameByEmail(loadUsers(), email);
}

// Creates the demo account when the browser has no accounts at all, so a
// first-time visitor can log in immediately. Never touches an existing store,
// so a visitor's own registrations are never overwritten. Safe to call on
// every mount (StrictMode runs effects twice) — later calls are no-ops.
// Returns the users map once seeding is done.
export async function ensureDemoAccount() {
  const users = loadUsers();
  if (Object.keys(users).length > 0) return users;
  const seeded = {
    [DEMO_USER]: toRecord(await hashPassword(DEMO_PASSWORD), {
      email: DEMO_EMAIL,
      displayName: "Carat",
    }),
  };
  saveUsers(seeded);
  if (!loadLegacyProfileRecord(DEMO_USER)) {
    saveLegacyProfileRecord(DEMO_USER, { displayName: "Carat", favoriteUnit: "All" });
  }
  return seeded;
}

// Legacy (pre-profile) account-level profile record, stored under
// `caratflix-profile-{account}`. New builds keep every per-profile setting on
// the profile record itself (utils/profiles.js); this is only read once by
// ensureProfiles() to seed the account's first profile with the old
// display name / bio / biases.
export function loadLegacyProfileRecord(user) {
  try { return JSON.parse(storageGet(`${PROFILE_KEY}-${user}`)) || null; }
  catch { return null; }
}

// Merges the given fields into the legacy account profile, applying defaults on
// first save. Returns the merged record, or null if the write failed.
export function saveLegacyProfileRecord(user, data) {
  const existing = loadLegacyProfileRecord(user) || {};
  const merged = {
    displayName: data.displayName ?? existing.displayName ?? user,
    bio: data.bio ?? existing.bio ?? "",
    favoriteUnit: data.favoriteUnit ?? existing.favoriteUnit ?? "All",
    biasWrecker: data.biasWrecker ?? existing.biasWrecker ?? "",
    status: data.status ?? existing.status ?? "",
    memberSince: data.memberSince ?? existing.memberSince ?? "",
    joinedAt: existing.joinedAt ?? Date.now(),
  };
  try { storageSet(`${PROFILE_KEY}-${user}`, JSON.stringify(merged)); }
  catch { return null; }
  return merged;
}

// Creates a new account alongside the seeded demo one. This is the only place
// a user-created account is written. Also seeds the matching profile record, an
// optional starting avatar, and an empty My List so the account starts clean.
// Returns `{ ok, user }` or `{ error }`.
export async function registerUser({ username, displayName, email, password, confirmPassword, avatarId }) {
  const name = (username || "").trim();
  const mail = (email || "").trim().toLowerCase();
  const display = (displayName || "").trim() || name;
  if (!name || !mail || !password) {
    return { error: "Please fill in every required field." };
  }
  if (name.length < 3) {
    return { error: "Username must be at least 3 characters." };
  }
  if (!isValidEmail(mail)) {
    return { error: "Please enter a valid email address." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }
  const users = loadUsers();
  if (users[name] !== undefined) {
    return { error: "That username is already taken. Try logging in instead." };
  }
  if (findUsernameByEmail(users, mail)) {
    return { error: "That email is already registered. Try logging in instead." };
  }
  users[name] = toRecord(await hashPassword(password), { email: mail, displayName: display });
  saveUsers(users);

  // Starting state for the new account: legacy profile record, optional
  // starting avatar, empty My List. The first profile (created on first login by
  // ensureProfiles) migrates all three.
  saveLegacyProfileRecord(name, { displayName: display });
  if (avatarId) saveAvatar(name, avatarId);
  saveList(`${FAV_KEY}-${name}`, { videos: [], members: [] });

  return { ok: true, user: name };
}

// Verifies a username *or email* + password pair for an existing account only
// — unknown identifiers must register first. Returns `{ ok, user }` or `{ error }`.
export async function loginUser(identifier, password) {
  const users = loadUsers();
  const id = (identifier || "").trim();
  const username = users[id] !== undefined ? id : findUsernameByEmail(users, id);
  const stored = username ? users[username] : undefined;
  if (stored === undefined) {
    return { error: "No account found for this username or email. Please register first." };
  }
  const hashed = await hashPassword(password);
  const match = matchStored(recordHash(stored), password, hashed);
  if (!match) {
    return { error: "Incorrect password for this account." };
  }
  if (match === "legacy" || typeof stored === "string") {
    // Upgrade a v1 record to v2, preserving any known fields.
    users[username] = toRecord(hashed, {
      email: recordEmail(stored),
      displayName: recordDisplayName(stored, username),
    });
    saveUsers(users);
  }
  return { ok: true, user: username, isNew: false };
}

// Checks a password against the stored hash without creating an account.
export async function verifyPassword(username, password) {
  const users = loadUsers();
  const stored = users[username];
  if (stored === undefined) return false;
  const hashed = await hashPassword(password);
  return !!matchStored(recordHash(stored), password, hashed);
}

// Replaces the stored hash for an existing account once the current password
// is confirmed. Returns `{ ok }` or `{ error }`. Reuses the same hashing logic
// as login so the storage format stays unchanged.
export async function changePassword(username, currentPassword, newPassword) {
  if (!(await verifyPassword(username, currentPassword))) {
    return { error: "Current password is incorrect." };
  }
  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    return { error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (newPassword === currentPassword) {
    return { error: "New password must be different from the current one." };
  }
  const users = loadUsers();
  const existing = users[username];
  if (existing === undefined) {
    return { error: "This account does not exist." };
  }
  users[username] = toRecord(await hashPassword(newPassword), {
    email: recordEmail(existing),
    displayName: recordDisplayName(existing, username),
    createdAt: existing && typeof existing === "object" ? existing.createdAt : undefined,
  });
  saveUsers(users);
  return { ok: true };
}