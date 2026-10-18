import { useEffect, useRef, useState } from "react";
import RowSkeleton from "./RowSkeleton";

// Mounts a home-page row only once it scrolls near the viewport.
//
// Home renders ~12 rows. Mounting them all on the first paint costs the lazy
// row chunks, their data passes, and a full card subtree per row (dozens of
// <img> elements and hearts) — most of it far below the fold. An
// IntersectionObserver with a generous rootMargin mounts a row one-and-a-half
// screens before it can be seen, so the visible experience is identical while
// the work is spread out over the scroll.
//
// The placeholder is the shared RowSkeleton, whose geometry already mirrors
// `.row` / `.card` (see RowSkeleton.css), so nothing shifts when the real row
// swaps in. The `id` is passed to the placeholder as well, so the scroll-spy
// sections and `scrollToIdWhenReady` jumps keep resolving while a row is still
// deferred. Without IntersectionObserver the row renders immediately.
export default function DeferredRow({ children, id, title = "Loading", cards = 5, rootMargin = "1200px 0px" }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (shown) return undefined;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return undefined;
    }
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      setShown(true);
      observer.disconnect();
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) reveal();
      },
      { rootMargin }
    );
    observer.observe(el);

    // Belt and braces: the observer is the fast path, but it must never be the
    // *only* path. A row whose callback never arrives stays a skeleton for the
    // rest of the session, with nothing in the console — an observer reports
    // nothing for a page that boots in a background tab, and a target inside a
    // skipped (`content-visibility`) or otherwise unpainted subtree can be passed
    // over too. A cheap geometry check on scroll / resize / visibilitychange
    // gives the row a second way out; both listeners are removed on reveal.
    const margin = Number.parseInt(rootMargin, 10) || 0;
    const check = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      // No layout box at all → no observer rectangle will ever intersect it.
      if ((!rect.width && !rect.height) || (rect.top < vh + margin && rect.bottom > -margin)) reveal();
    };
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    document.addEventListener("visibilitychange", check);
    check();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [shown, rootMargin]);

  return <div ref={ref}>{shown ? children : <RowSkeleton id={id} title={title} cards={cards} />}</div>;
}
