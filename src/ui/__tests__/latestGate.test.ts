import { describe, expect, it } from 'vitest';
import { createLatestGate } from '../latestGate';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('createLatestGate', () => {
  it('marks only the most recently started run as latest', () => {
    const gate = createLatestGate();
    const a = gate.begin();
    const b = gate.begin();
    expect(gate.isLatest(a)).toBe(false);
    expect(gate.isLatest(b)).toBe(true);
  });

  it('discards a stale run even when it finishes AFTER the newer one', async () => {
    const gate = createLatestGate();
    const applied: string[] = [];

    const older = deferred<void>();
    const newer = deferred<void>();

    // Two overlapping "analyses". The older starts first, the newer second.
    const runOlder = (async () => {
      const id = gate.begin();
      await older.promise;
      if (gate.isLatest(id)) applied.push('older');
    })();
    const runNewer = (async () => {
      const id = gate.begin();
      await newer.promise;
      if (gate.isLatest(id)) applied.push('newer');
    })();

    // The newer run resolves first and wins…
    newer.resolve();
    await runNewer;
    // …then the older, slower run resolves last but must be discarded.
    older.resolve();
    await runOlder;

    expect(applied).toEqual(['newer']);
  });
});
