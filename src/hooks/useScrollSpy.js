import { useState, useEffect } from "react";

// Tracks which section id is currently in view (or null while the billboard is
// on screen) so the navbar can highlight the active link. Sections stream in
// lazily and vanish entirely during a search, so the element list is re-synced
// from the DOM on every mutation instead of being observed once on mount.
export function useScrollSpy(ids) {
  const [active, setActive] = useState(null);
  useEffect(() => {
    // null tracks the hero billboard: while it sits in the middle band no
    // section is active and the header highlights "Home".
    const keys = [...ids, null];
    const findEl = (key) => (key ? document.getElementById(key) : document.querySelector(".billboard"));
    const elKey = new WeakMap();
    const seen = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (!elKey.has(entry.target)) continue;
          setActive(elKey.get(entry.target));
        }
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    const sync = () => {
      for (const key of keys) {
        const el = findEl(key);
        if (!el || seen.get(key) === el) continue;
        const prev = seen.get(key);
        if (prev) observer.unobserve(prev);
        seen.set(key, el);
        elKey.set(el, key);
        observer.observe(el);
      }
    };
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      observer.disconnect();
    };
  }, [ids]);
  return active;
}

export default useScrollSpy;
