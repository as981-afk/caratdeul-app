import { useState } from "react";

// Self-contained placeholder used when an image fails to load, so cards never
// render a broken-image icon. A branded SVG data URI works offline and in the
// browser without any network request.
export const IMG_FALLBACK =
  "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360'%3E%3Crect width='640' height='360' fill='%231A1535'/%3E%3Crect width='636' height='356' x='2' y='2' fill='none' stroke='%23EEB6CE' stroke-opacity='0.5' stroke-width='2'/%3E%3Ctext x='50%25' y='48%25' fill='%23D9C6EC' font-family='Arial' font-size='24' font-weight='bold' text-anchor='middle'%3ECARATFLIX%3C/text%3E%3Ctext x='50%25' y='60%25' fill='%239B93B8' font-family='Arial' font-size='13' text-anchor='middle'%3ESEVENTEEN fan archive%3C/text%3E%3C/svg%3E";

// <img> wrapper that swaps to a branded placeholder on error. `src` is
// intentionally not passed back to the DOM so a later re-render can't reset a
// failed image back to its broken URL.
//
// Off-screen images defer by default (`loading="lazy"` + async decode); callers
// pass `loading="eager"` for above-the-fold art and explicit width/height so the
// browser can reserve space and avoid layout shift.
export default function SafeImg({ src, fallback = IMG_FALLBACK, alt = "", loading = "lazy", decoding = "async", ...rest }) {
  const [current, setCurrent] = useState(src || fallback);

  return (
    <img
      src={current}
      alt={alt}
      loading={loading}
      decoding={decoding}
      onError={() => {
        if (fallback && current !== fallback) setCurrent(fallback);
      }}
      {...rest}
    />
  );
}