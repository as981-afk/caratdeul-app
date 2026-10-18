// Diagnostics for the app's real network calls (Supabase Auth, profiles and the
// My List / watch-progress mirror).
//
// `loggedFetch(label, meta, run)` wraps an async request in try/catch/finally
// and logs the start, the outcome and the elapsed time. The `finally` block is
// always reached, which is the point: it makes it obvious in the console (and
// the terminal) whether a request settled, so a stuck loading state can never be
// mistaken for a slow one.
//
// Nothing here swallows an error — it is re-thrown so the existing error
// handling (SyncContext's catch, ProfileContext's `.catch`) still runs.
export async function loggedFetch(label, meta, run) {
  const startedAt = Date.now();
  console.log(`[CaratFlix] ${label} →`, meta);
  try {
    const result = await run();
    console.log(`[CaratFlix] ${label} ✓`, { ...meta, ms: Date.now() - startedAt });
    return result;
  } catch (error) {
    console.error(`[CaratFlix] ${label} ✗`, { ...meta, ms: Date.now() - startedAt, error });
    throw error;
  } finally {
    // Always runs; proves the request settled even when both logs above are
    // filtered out.
    console.log(`[CaratFlix] ${label} settled in ${Date.now() - startedAt}ms`);
  }
}

export default loggedFetch;
