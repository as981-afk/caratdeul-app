import { useEffect, useState } from "react";

// Returns a debounced copy of `value` that only updates after it has stopped
// changing for `delay` milliseconds. Useful for live search so expensive
// filtering runs only when the user pauses typing.
export function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}