// The runes mirror of the controller's snapshot (research R-01: runes live in ui/ only). It holds no logic: it copies each
// snapshot the controller emits into one reactive cell. The snapshot is immutable, so the cell is not deeply proxied.
import type { ShellController, ShellSnapshot } from '../controller/shell-controller';

export interface SnapshotMirror {
  readonly snapshot: ShellSnapshot;
  /** Stops listening to the controller. */
  release(): void;
}

export function mirrorSnapshot(controller: Pick<ShellController, 'snapshot' | 'subscribe'>): SnapshotMirror {
  let current = $state.raw(controller.snapshot());
  const release = controller.subscribe((next) => {
    current = next;
  });
  return {
    get snapshot() {
      return current;
    },
    release,
  };
}
