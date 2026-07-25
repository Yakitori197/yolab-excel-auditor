/**
 * A tiny "latest run wins" gate.
 *
 * File parsing is asynchronous (FileReader + a dynamic import), so if the user
 * starts a second analysis before the first finishes, the older (possibly
 * slower) run could otherwise overwrite the newer result. Each run takes a
 * ticket via `begin()`; only the most recent ticket is `isLatest()`, so stale
 * runs can detect that they have been superseded and discard their result.
 */
export interface LatestGate {
  /** Start a new run and return its monotonically increasing id. */
  begin: () => number;
  /** True only for the most recently started run. */
  isLatest: (id: number) => boolean;
}

export function createLatestGate(): LatestGate {
  let current = 0;
  return {
    begin: () => {
      current += 1;
      return current;
    },
    isLatest: (id: number) => id === current,
  };
}
