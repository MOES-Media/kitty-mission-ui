// bindIntents (plan IC-06, FR-003): one Svelte action that binds every intent of one HOSTING element from INTENT_TABLE.
// A handler entry gets one listener on the node, which forwards `(tag, event, detail)` to `controller.intent`; the controller
// dispatches through the table and owns the dashboard guard. A `{ via }` entry belongs to a nested pattern element whose
// bubbling, composed event reaches its hosting element, so it is never bound here (each intent is handled exactly once).
// Apply the action only to the nine hosting elements, once each. It touches only `node`.
import type { ShellController } from '../controller/shell-controller';
import type { MissionUiIntents } from '../generated/elements';
import { INTENT_TABLE, type HostingTag } from '../intents/table';

/** The detail of any intent of a hosting element, as MissionUiIntents types it. */
type HostingDetail = { [H in HostingTag]: MissionUiIntents[H][keyof MissionUiIntents[H]] }[HostingTag];

export interface BindIntentsParams<T extends HostingTag> {
  readonly tag: T;
  readonly controller: Pick<ShellController, 'intent'>;
}

/** The events of a hosting tag whose table entry is a handler (not a `via`). */
function handledEvents(tag: HostingTag): string[] {
  const entries: Readonly<Record<string, unknown>> = INTENT_TABLE[tag];
  return Object.keys(entries).filter((event) => typeof entries[event] === 'function');
}

export function bindIntents<T extends HostingTag>(
  node: HTMLElement,
  params: BindIntentsParams<T>,
): { update(next: BindIntentsParams<HostingTag>): void; destroy(): void } {
  let bound: { event: string; listener: (event: Event) => void }[] = [];

  const unbind = (): void => {
    for (const { event, listener } of bound) node.removeEventListener(event, listener);
    bound = [];
  };

  const bind = ({ tag, controller }: BindIntentsParams<HostingTag>): void => {
    unbind();
    bound = handledEvents(tag).map((event) => {
      const listener = (raised: Event): void => {
        const detail: HostingDetail | undefined = (raised as CustomEvent<HostingDetail>).detail;
        void controller.intent(tag, event, detail);
      };
      node.addEventListener(event, listener);
      return { event, listener };
    });
  };

  let current: BindIntentsParams<HostingTag> = params;
  bind(current);
  return {
    update(next) {
      if (next.tag === current.tag && next.controller === current.controller) return;
      current = next;
      bind(current);
    },
    destroy: unbind,
  };
}
