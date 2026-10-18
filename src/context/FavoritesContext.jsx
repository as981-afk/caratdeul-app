import { createContext, useContext } from "react";
import { useFavorites } from "../hooks/useFavorites";

// Favorites context: the single per-user source of truth for My List.
//
// The storage + mutation logic lives in the useFavorites hook; this provider
// owns one instance for the logged-in user and shares it through the tree.
// App.jsx also surfaces the same values on SessionContext, so components that
// already read favorites from there keep working unchanged.
const FavoritesContext = createContext(null);

export function FavoritesProvider({ user, children }) {
  const favorites = useFavorites(user);
  return <FavoritesContext.Provider value={favorites}>{children}</FavoritesContext.Provider>;
}

export function useFavoritesContext() {
  return useContext(FavoritesContext);
}

export default FavoritesContext;
