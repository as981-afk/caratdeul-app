import { createContext, useContext } from "react";

// Session context, split in two so a change in one half no longer re-renders
// consumers that only read the other:
//
//   identity — who is signed in, which profile is active, the avatar, and the
//              member-navigation helpers. Changes on login / profile switch.
//   library  — My List and watch state (favourites, watched flags, progress).
//              Changes on nearly every interaction in the app.
//
// `useSession()` still returns both merged, which is what most components want
// and what they already read. A component that only needs identity should call
// `useSessionIdentity()` instead: a context change re-renders every consumer
// regardless of React.memo, so subscribing to the quiet half is the only way to
// keep a heart tap in one row from touching, say, every member chip on screen.
//
// The provider that publishes these lives in SessionProvider.jsx; import it from
// there with a named import. Nothing in this file is a component — the merged
// context below is an object, so importing it as a provider renders a
// value-less provider and every `useSession()` consumer then reads `undefined`.
export const SessionIdentityContext = createContext(null);
export const SessionLibraryContext = createContext(null);

// Merged view, kept for backwards compatibility with existing consumers.
export const SessionContext = createContext(null);

export function useSession() {
  return useContext(SessionContext);
}

// Identity only: `user`, `profile`, `profileId`, `avatar`, `setAvatar`,
// `openMember`, `openMembers`.
export function useSessionIdentity() {
  return useContext(SessionIdentityContext);
}

// Library only: `favs`, `toggleFav`, `setFavMembers`, `replaceFavs`,
// `refreshFavs`, `watched`, `markWatched`, `unmarkWatched`, `progressFor`,
// `isWatched`.
export function useSessionLibrary() {
  return useContext(SessionLibraryContext);
}
