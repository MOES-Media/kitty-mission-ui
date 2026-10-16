// Shared by the shell stories (contracts/stories.md): the mount technique, the immediate scheduler and the fixed clock.
// Story-only: no package entry exports this module.
import { mount } from 'svelte';
import type { ShellScheduler } from '../shell';
import { MissionShell } from '../shell';
import type { ShellOptions } from '../shell';

/** The Mission of the fixture's own change sequence; every story that names a Mission uses it. */
export const STORY_MISSION_ID = '01JZAB3C4D5E6F7G8H9JKMNPQR';

/** An artifact path of the fixture's artifact examples. */
export const STORY_ARTIFACT_PATH = 'spec.md';

/**
 * A scheduler with no waiting: `setTimeout(fn)` runs `fn` on a microtask unless its handle was cleared first, so the
 * reconnecting grace period elapses at once and a story needs no real delay.
 */
export function immediateScheduler(): ShellScheduler {
  const cleared = new WeakSet<object>();
  return {
    setTimeout(fn) {
      const handle = {};
      void Promise.resolve().then(() => {
        if (!cleared.has(handle)) fn();
      });
      return handle;
    },
    clearTimeout(handle) {
      if (typeof handle === 'object' && handle !== null) cleared.add(handle);
    },
  };
}

const FIXED_INSTANT = '2026-09-22T12:00:00Z';

/** A fixed clock, so relative times in every story are stable. */
export const fixedClock = (): Date => new Date(FIXED_INSTANT);

/** The options every story shares; a story adds its client, route and mode. */
export function storyOptions(options: Pick<ShellOptions, 'client' | 'mode'> & Partial<ShellOptions>): ShellOptions {
  return { scheduler: immediateScheduler(), clock: fixedClock, ...options };
}

export interface MountedStory {
  /** The root `sk-mission-shell` element, first element child of the detached container (research R-07, option a). */
  readonly element: Element;
  /** The Svelte instance; the story's `beforeEach` cleanup passes it to `unmount`. */
  readonly instance: ReturnType<typeof mount>;
}

/** Mounts the shell into a detached container and hands back its root element. */
export function mountStory(options: ShellOptions): MountedStory {
  const container = document.createElement('div');
  const instance = mount(MissionShell, { target: container, props: options });
  const element = container.firstElementChild;
  if (element === null) throw new Error('shell story: MissionShell rendered no element');
  return { element, instance };
}
