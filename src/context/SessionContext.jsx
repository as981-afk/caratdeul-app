import { createContext, useContext } from "react";

// Session context: exposes the current demo user + favorites to the tree.
// Components that need scoped storage for the logged-in user read from here.
const SessionContext = createContext(null);

export function useSession() {
  return useContext(SessionContext);
}

export default SessionContext;
