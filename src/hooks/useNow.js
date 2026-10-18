import { useEffect, useState } from "react";

// A ticking clock for live countdowns.
//
// One interval per caller, always cleared on unmount, and paused while the tab
// is hidden so a background tab isn't re-rendering every second. Coming back to
// the tab resyncs immediately instead of waiting for the next tick.
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let timer = 0;

    const start = () => {
      if (!timer) timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    };
    const stop = () => {
      if (timer) {
        window.clearInterval(timer);
        timer = 0;
      }
    };
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        setNow(Date.now());
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs]);

  return now;
}

export default useNow;
