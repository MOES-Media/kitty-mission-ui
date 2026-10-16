// A deterministic timer pair for the logic tests (and WP06's Chromium tests): no Node-only API, no real time.
import type { ShellScheduler } from '../../src/core/scheduler';

/** Lets every already-resolved promise chain run to its end. */
export async function flushMicrotasks(): Promise<void> {
  for (let turn = 0; turn < 200; turn += 1) await Promise.resolve();
}

export interface FakeScheduler extends ShellScheduler {
  /** Fake milliseconds since creation. */
  now(): number;
  /** The number of armed timers. */
  pending(): number;
  /** Moves fake time forward, firing due timers in due-time then creation order, flushing microtasks after each. */
  advance(ms: number): Promise<void>;
}

interface Timer {
  readonly id: number;
  readonly due: number;
  readonly fn: () => void;
}

export function createFakeScheduler(): FakeScheduler {
  let time = 0;
  let nextId = 1;
  const timers = new Map<number, Timer>();

  const earliest = (limit: number): Timer | undefined => {
    let best: Timer | undefined;
    for (const timer of timers.values()) {
      if (timer.due > limit) continue;
      if (!best || timer.due < best.due || (timer.due === best.due && timer.id < best.id)) best = timer;
    }
    return best;
  };

  return {
    now: () => time,
    pending: () => timers.size,
    setTimeout(fn, ms) {
      const timer = { id: nextId, due: time + Math.max(0, ms), fn };
      nextId += 1;
      timers.set(timer.id, timer);
      return timer.id;
    },
    clearTimeout(handle) {
      timers.delete(handle as number);
    },
    async advance(ms) {
      const target = time + ms;
      for (let timer = earliest(target); timer; timer = earliest(target)) {
        timers.delete(timer.id);
        time = timer.due;
        timer.fn();
        await flushMicrotasks();
      }
      time = target;
      await flushMicrotasks();
    },
  };
}
