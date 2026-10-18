import { useMemo } from "react";
import {
  SessionContext,
  SessionIdentityContext,
  SessionLibraryContext,
} from "./SessionContext.jsx";

// Publishes session state to the tree: the two halves separately, so a consumer
// can subscribe to just one, plus the merged view most components read.
//
// Kept in its own file so the provider and the contexts can never be confused:
// SessionContext.jsx owns the context objects and the hooks (all values), this
// file owns the only component and is what App.jsx imports the provider from.
export function SessionProvider({ identity, library, children }) {
  const merged = useMemo(() => ({ ...identity, ...library }), [identity, library]);

  return (
    <SessionIdentityContext.Provider value={identity}>
      <SessionLibraryContext.Provider value={library}>
        <SessionContext.Provider value={merged}>{children}</SessionContext.Provider>
      </SessionLibraryContext.Provider>
    </SessionIdentityContext.Provider>
  );
}

export default SessionProvider;
