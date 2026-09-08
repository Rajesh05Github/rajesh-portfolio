/** A stopwatch, not a scheduler — `Date.now()` deltas are all a single-process app needs for stage latency (already the pattern every `recordUsage()` call site uses individually; this just names it). */
export function startTimer(): { elapsedMs: () => number } {
  const start = Date.now();
  return { elapsedMs: () => Date.now() - start };
}
