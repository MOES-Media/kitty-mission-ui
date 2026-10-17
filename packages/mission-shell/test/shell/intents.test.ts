// FR-003 and SC-001 on real elements (plan IC-06, R5-10): one case per (tag, event) pair, GENERATED from INTENT_TABLE.
// Each case dispatches a real bubbling, composed CustomEvent on a real element of the mounted shell (the hosting element
// itself, or the nested pattern element for a `via` entry) and asserts (a) the table's handler of the hosting element ran
// exactly once with the event's detail, and (b) the effect of contracts/intent-map.md.
// N2 (WP05 review): the table's `via` constraint accepts any hosting tag that declares the same event, so a wrong host still
// typechecks. The case therefore also asserts that the nested element sits, in the real mounted tree, inside the host the
// table names. N1: the command detail types stop at `unknown`; the details below are typed by MissionUiIntents only.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFixtureClient } from '../../src/client/fixture';
import type { MissionStatusClient } from '../../src/client/port';
import type { MissionUiIntents } from '../../src/generated/elements';
import type { ShellMode } from '../../src/core/routes';
import { INTENT_PAIRS, INTENT_TABLE, type HostedTag } from '../../src/intents/table';
import { createFakeScheduler } from '../support/fake-scheduler';
import { recordingClient, type RecordingClient } from '../support/recording-client';
import { unavailable } from '../support/results';
import { M, deepQueryAll, destroyAll, mountAt, recordingHost, screenElement, screenTag, settle, type Harness, type RecordingHost } from './helpers';

afterEach(destroyAll);

type PairKey = { [T in HostedTag]: `${T} ${keyof MissionUiIntents[T] & string}` }[HostedTag];

interface Ctx {
  readonly harness: Harness;
  readonly host: RecordingHost;
  readonly client: RecordingClient;
}

interface Spec {
  readonly route: string;
  readonly mode?: ShellMode;
  readonly viewport?: readonly [number, number];
  readonly flakyProject?: boolean;
  readonly detail: unknown;
  readonly effect: (ctx: Ctx) => void | Promise<void>;
}

function spec<T extends HostedTag, E extends keyof MissionUiIntents[T] & string>(
  tag: T,
  event: E,
  detail: MissionUiIntents[T][E],
  rest: Omit<Spec, 'detail'>,
): [PairKey, Spec] {
  return [`${tag} ${event}` as PairKey, { ...rest, detail }];
}

const WP = `/missions/${M}/work-packages/WP04`;
const ARTIFACT = `/missions/${M}/artifacts/spec.md`;

const routeChangedTo = (ctx: Ctx, ...routes: string[]): void => {
  expect(ctx.host.calls.filter((call) => call.member === 'routeChanged').map((call) => call.args[0])).toEqual(routes);
};
const shows = (ctx: Ctx, tag: string): void => {
  expect(screenTag(ctx.harness.shell)).toBe(tag);
};
const hostCalled = (ctx: Ctx, member: string, ...args: unknown[]): void => {
  expect(ctx.host.calls.filter((call) => call.member === member).map((call) => call.args)).toEqual([args]);
};
const readsMatching = (ctx: Ctx, op: string, ...fragments: string[]): void => {
  const reads = ctx.client.take().filter((read) => read.startsWith(`${op} `));
  expect(reads.length, `${op} reads: ${JSON.stringify(reads)}`).toBe(1);
  for (const fragment of fragments) expect(reads[0]).toContain(fragment);
};
const property = (element: Element, name: string): unknown => (element as unknown as Record<string, unknown>)[name];

const EXPECTATIONS = new Map<PairKey, Spec>([
  spec('sk-mission-shell', 'sk-navigate', { id: 'nav-drift', href: '#/drift' }, {
    route: '/missions',
    effect: (ctx) => {
      shows(ctx, 'sk-drift-screen');
      routeChangedTo(ctx, '/drift');
    },
  }),
  spec('sk-mission-shell', 'sk-tree-toggle', { id: 'tasks/', expanded: true }, {
    route: ARTIFACT,
    effect: (ctx) => {
      const tree = deepQueryAll(ctx.harness.target, 'sk-shell-tree')[0];
      const folder = (property(tree as Element, 'items') as { id: string; expanded?: boolean }[]).find((node) => node.id === 'tasks/');
      expect(folder?.expanded).toBe(true);
    },
  }),
  spec('sk-mission-shell', 'sk-toggle-drawer', { open: true, reason: 'host' }, {
    route: '/missions',
    viewport: [600, 800],
    effect: (ctx) => {
      expect(property(ctx.harness.shell, 'drawerOpen')).toBe(true);
    },
  }),
  spec('sk-mission-shell', 'sk-toggle-flyout', { open: true, reason: 'activate' }, {
    route: '/missions',
    viewport: [900, 800],
    effect: (ctx) => {
      expect(property(ctx.harness.shell, 'flyoutOpen')).toBe(true);
    },
  }),
  spec('sk-mission-shell', 'sk-shell-retry', {}, {
    route: '/missions',
    flakyProject: true,
    effect: (ctx) => {
      readsMatching(ctx, 'getProject');
    },
  }),
  spec('sk-shell-nav-item', 'sk-navigate', { id: 'nav-ops', href: '#/ops' }, {
    route: '/missions',
    effect: (ctx) => {
      shows(ctx, 'sk-ops-screen');
      routeChangedTo(ctx, '/ops');
    },
  }),
  spec('sk-shell-tree', 'sk-navigate', { id: 'WP02', href: `#/missions/${M}/work-packages/WP02` }, {
    route: `/missions/${M}/work-packages`,
    effect: (ctx) => {
      shows(ctx, 'sk-work-package-screen');
      routeChangedTo(ctx, `/missions/${M}/work-packages/WP02`);
    },
  }),
  spec('sk-shell-tree', 'sk-tree-toggle', { id: 'tasks/', expanded: true }, {
    route: ARTIFACT,
    effect: (ctx) => {
      const tree = deepQueryAll(ctx.harness.target, 'sk-shell-tree')[0];
      const folder = (property(tree as Element, 'items') as { id: string; expanded?: boolean }[]).find((node) => node.id === 'tasks/');
      expect(folder?.expanded).toBe(true);
    },
  }),
  spec('sk-missions-screen', 'sk-open-mission', { missionId: M, slug: 'example-mission' }, {
    route: '/missions',
    effect: (ctx) => {
      shows(ctx, 'sk-pipeline-screen');
      routeChangedTo(ctx, `/missions/${M}`);
    },
  }),
  spec('sk-missions-screen', 'sk-search', { query: 'alpha' }, {
    route: '/missions',
    effect: (ctx) => {
      expect(property(screenElement(ctx.harness.shell, 'sk-missions-screen'), 'query')).toBe('alpha');
    },
  }),
  spec('sk-missions-screen', 'sk-load-more', { cursor: 'cursor-2' }, {
    route: '/missions',
    effect: (ctx) => {
      readsMatching(ctx, 'listMissions', '"pageCursor":"cursor-2"');
    },
  }),
  spec('sk-missions-screen', 'sk-filter-change', { filter: 'active' }, {
    route: '/missions',
    effect: (ctx) => {
      expect(property(screenElement(ctx.harness.shell, 'sk-missions-screen'), 'filter')).toBe('active');
    },
  }),
  spec('sk-filter-toggle-group', 'sk-filter-change', { filter: 'recent' }, {
    route: '/missions',
    effect: (ctx) => {
      expect(property(screenElement(ctx.harness.shell, 'sk-missions-screen'), 'filter')).toBe('recent');
    },
  }),
  spec('sk-pipeline-screen', 'sk-open-missions', {}, {
    route: `/missions/${M}`,
    effect: (ctx) => {
      shows(ctx, 'sk-missions-screen');
      routeChangedTo(ctx, '/missions');
    },
  }),
  spec('sk-pipeline-screen', 'sk-view-artifacts', { missionId: M }, {
    route: `/missions/${M}`,
    effect: (ctx) => {
      shows(ctx, 'sk-artifact-screen');
      routeChangedTo(ctx, `/missions/${M}/artifacts`);
    },
  }),
  spec('sk-pipeline-screen', 'sk-select-work-package', { missionId: M, wpId: 'WP03' }, {
    route: `/missions/${M}`,
    effect: (ctx) => {
      shows(ctx, 'sk-work-package-screen');
      routeChangedTo(ctx, `/missions/${M}/work-packages/WP03`);
    },
  }),
  spec('sk-work-package-board', 'sk-select-work-package', { missionId: M, wpId: 'WP05' }, {
    route: `/missions/${M}`,
    effect: (ctx) => {
      shows(ctx, 'sk-work-package-screen');
      routeChangedTo(ctx, `/missions/${M}/work-packages/WP05`);
    },
  }),
  spec('sk-work-package-screen', 'sk-select-work-package', { missionId: M, wpId: 'WP02' }, {
    route: WP,
    effect: (ctx) => {
      routeChangedTo(ctx, `/missions/${M}/work-packages/WP02`);
      expect(property(screenElement(ctx.harness.shell, 'sk-work-package-screen'), 'wpId')).toBe('WP02');
    },
  }),
  spec('sk-work-package-screen', 'sk-open-mission', { missionId: M, slug: 'example-mission' }, {
    route: WP,
    effect: (ctx) => {
      shows(ctx, 'sk-pipeline-screen');
      routeChangedTo(ctx, `/missions/${M}`);
    },
  }),
  spec('sk-work-package-screen', 'sk-open-artifact', { missionId: M, path: 'tasks/WP01-example.md', kind: 'work_package_prompt' }, {
    route: WP,
    effect: (ctx) => {
      shows(ctx, 'sk-artifact-screen');
      routeChangedTo(ctx, `/missions/${M}/artifacts/${encodeURIComponent('tasks/WP01-example.md')}`);
    },
  }),
  spec('sk-work-package-screen', 'sk-retry-load', { target: 'work-package', missionId: M, wpId: 'WP04' }, {
    route: WP,
    effect: (ctx) => {
      readsMatching(ctx, 'getWorkPackage', '"wpId":"WP04"');
    },
  }),
  spec('sk-artifact-screen', 'sk-select-artifact', { missionId: M, path: 'plan.md', kind: 'plan' }, {
    route: ARTIFACT,
    effect: (ctx) => {
      routeChangedTo(ctx, `/missions/${M}/artifacts/plan.md`);
      expect(property(screenElement(ctx.harness.shell, 'sk-artifact-screen'), 'selectedPath')).toBe('plan.md');
    },
  }),
  spec('sk-artifact-screen', 'sk-open-link', { href: 'https://example.test/page' }, {
    route: ARTIFACT,
    effect: (ctx) => {
      hostCalled(ctx, 'openExternalLink', 'https://example.test/page');
    },
  }),
  spec('sk-artifact-screen', 'sk-select-work-package', { missionId: M, wpId: 'WP01' }, {
    route: ARTIFACT,
    effect: (ctx) => {
      shows(ctx, 'sk-work-package-screen');
      routeChangedTo(ctx, `/missions/${M}/work-packages/WP01`);
    },
  }),
  spec('sk-artifact-screen', 'sk-open-mission', { missionId: M, slug: 'example-mission' }, {
    route: ARTIFACT,
    effect: (ctx) => {
      shows(ctx, 'sk-pipeline-screen');
      routeChangedTo(ctx, `/missions/${M}`);
    },
  }),
  spec('sk-artifact-screen', 'sk-retry-load', { target: 'listing', missionId: M }, {
    route: ARTIFACT,
    effect: (ctx) => {
      readsMatching(ctx, 'listArtifacts');
    },
  }),
  spec('sk-drift-screen', 'sk-select-finding', { missionId: M, kind: 'sample-kind', artifactPath: 'plan.md' }, {
    route: '/drift',
    effect: (ctx) => {
      expect(property(screenElement(ctx.harness.shell, 'sk-drift-screen'), 'selectedFinding')).toEqual({ missionId: M, kind: 'sample-kind', artifactPath: 'plan.md' });
    },
  }),
  spec('sk-drift-screen', 'sk-rescan-drift', { missionId: null }, {
    route: '/drift',
    effect: (ctx) => {
      readsMatching(ctx, 'getDriftReport');
    },
  }),
  spec('sk-drift-screen', 'sk-copy-command', { text: 'sample command', missionId: M, remedy: 'sample-remedy' }, {
    route: '/drift',
    effect: (ctx) => {
      hostCalled(ctx, 'copyText', 'sample command');
      expect(property(screenElement(ctx.harness.shell, 'sk-drift-screen'), 'copyResult')).toBe('copied');
    },
  }),
  spec('sk-drift-screen', 'sk-open-mission', { missionId: M, slug: 'example-mission' }, {
    route: '/drift',
    effect: (ctx) => {
      shows(ctx, 'sk-pipeline-screen');
      routeChangedTo(ctx, `/missions/${M}`);
    },
  }),
  spec('sk-drift-screen', 'sk-open-missions', {}, {
    route: '/drift',
    effect: (ctx) => {
      shows(ctx, 'sk-missions-screen');
      routeChangedTo(ctx, '/missions');
    },
  }),
  spec('sk-drift-screen', 'sk-retry-load', { missionId: null, target: 'drift-report' }, {
    route: '/drift',
    effect: (ctx) => {
      readsMatching(ctx, 'getDriftReport');
    },
  }),
  spec('sk-ops-screen', 'sk-load-more', { cursor: 'cursor-2' }, {
    route: '/ops',
    effect: (ctx) => {
      readsMatching(ctx, 'listOpsInvocations', '"pageCursor":"cursor-2"');
    },
  }),
  spec('sk-ops-screen', 'sk-retry-load', { target: 'ops-page' }, {
    route: '/ops',
    effect: (ctx) => {
      readsMatching(ctx, 'listOpsInvocations');
    },
  }),
  spec('sk-projects-screen', 'sk-open-project', { key: 'sample-project' }, {
    route: '/projects',
    effect: (ctx) => {
      hostCalled(ctx, 'openProject', { key: 'sample-project' });
    },
  }),
  spec('sk-projects-screen', 'sk-request-open-project', null, {
    route: '/projects',
    effect: (ctx) => {
      hostCalled(ctx, 'listFolders', '');
      const dialog = deepQueryAll(ctx.harness.target, 'sk-open-project-dialog')[0] as Element;
      expect(property(dialog, 'open')).toBe(true);
    },
  }),
  spec('sk-projects-screen', 'sk-retry-load', { target: 'projects' }, {
    route: '/projects',
    effect: (ctx) => {
      hostCalled(ctx, 'listRecentProjects');
    },
  }),
  spec('sk-open-project-dialog', 'sk-browse-folder', { location: 'sample-folder' }, {
    route: '/projects',
    effect: (ctx) => {
      hostCalled(ctx, 'listFolders', 'sample-folder');
    },
  }),
  spec('sk-open-project-dialog', 'sk-confirm-open-project', { location: 'sample-folder' }, {
    route: '/projects',
    effect: (ctx) => {
      hostCalled(ctx, 'openProject', { location: 'sample-folder' });
    },
  }),
  spec('sk-open-project-dialog', 'sk-retry-load', { target: 'folders' }, {
    route: '/projects',
    effect: (ctx) => {
      hostCalled(ctx, 'listFolders', '');
    },
  }),
]);

type Table = Record<string, Record<string, unknown>>;
const table = INTENT_TABLE as unknown as Table;
const HOSTING = Object.keys(table).filter((tag) => Object.values(table[tag] ?? {}).some((entry) => typeof entry === 'function'));

/** The hosting tag of the nearest hosting element above the node, crossing shadow roots. */
function hostingAncestor(node: Element): string | null {
  let current: Element | null = node;
  while (current !== null) {
    const parent: Element | null = current.parentElement ?? (current.getRootNode() instanceof ShadowRoot ? (current.getRootNode() as ShadowRoot).host : null);
    if (parent !== null && HOSTING.includes(parent.localName)) return parent.localName;
    current = parent;
  }
  return null;
}

/** The first project read fails, then the client answers as it always does (so a retry has something to repair). */
function flaky(inner: MissionStatusClient): MissionStatusClient {
  let first = true;
  return {
    ...inner,
    getProject: (params) => {
      if (!first) return inner.getProject(params);
      first = false;
      return Promise.resolve(unavailable('getProject'));
    },
    connection: inner.connection,
  };
}

describe('the sweep is generated from INTENT_TABLE (R5-10, non-vacuity)', () => {
  it('has 40 pairs and 23 distinct event names, nine hosting tags and one expectation per pair', () => {
    expect(INTENT_PAIRS.length).toBe(40);
    expect(new Set(INTENT_PAIRS.map(([, event]) => event)).size).toBe(23);
    expect(HOSTING.length).toBe(9);
    const keys = INTENT_PAIRS.map(([tag, event]) => `${tag} ${event}`);
    expect(keys.filter((key) => !EXPECTATIONS.has(key as PairKey)), 'pairs without an expectation').toEqual([]);
    expect([...EXPECTATIONS.keys()].filter((key) => !keys.includes(key)), 'expectations without a pair').toEqual([]);
  });

  it('has exactly five via entries, each naming a hosting tag that declares the same event', () => {
    const via = INTENT_PAIRS.filter(([tag, event]) => typeof table[tag]?.[event] === 'object');
    expect(via.length).toBe(5);
    for (const [tag, event] of via) {
      const host = (table[tag]?.[event] as { via: string }).via;
      expect(HOSTING, `${tag} ${event} via ${host}`).toContain(host);
      expect(typeof table[host]?.[event], `${host} handles ${event}`).toBe('function');
    }
  });
});

describe('every (tag, event) pair of INTENT_TABLE on a real element', () => {
  for (const [tag, event] of INTENT_PAIRS) {
    const key = `${tag} ${event}`;
    it(`intent: ${key}`, async () => {
      const expected = EXPECTATIONS.get(key as PairKey);
      expect(expected, `no expectation for ${key}`).toBeDefined();
      const wanted = expected as Spec;
      const entry = table[tag]?.[event];
      const via = typeof entry === 'object' && entry !== null ? (entry as { via: string }).via : null;
      const handlerTag = via ?? tag;

      // Count the handler of the hosting element through the live table the controller reads.
      const handlers = table[handlerTag] as Record<string, unknown>;
      const original = handlers[event] as (...args: unknown[]) => unknown;
      const counted = vi.fn(original);
      handlers[event] = counted;
      try {
        const scheduler = createFakeScheduler();
        const base = createFixtureClient({ scheduler });
        const client = recordingClient(wanted.flakyProject === true ? flaky(base) : base);
        const host = recordingHost();
        const harness = await mountAt(wanted.route, { scheduler, client, host, mode: wanted.mode ?? 'desktop', ...(wanted.viewport === undefined ? {} : { viewport: wanted.viewport }) });
        const ctx: Ctx = { harness, host, client };

        const element = deepQueryAll(harness.target, tag)[0];
        expect(element, `${tag} is not in the mounted shell at ${wanted.route}`).toBeDefined();
        if (via !== null) {
          expect(hostingAncestor(element as Element), `${tag} sits inside ${via}`).toBe(via);
        } else {
          expect(tag).toBe(handlerTag);
        }
        client.take();
        host.calls.length = 0;

        (element as Element).dispatchEvent(new CustomEvent(event, { detail: wanted.detail, bubbles: true, composed: true }));
        await settle(harness);

        expect(counted, `${handlerTag} ${event} handled once`).toHaveBeenCalledTimes(1);
        expect(counted.mock.calls[0]?.[1]).toEqual(wanted.detail);
        await wanted.effect(ctx);
      } finally {
        handlers[event] = original;
      }
    });
  }
});

describe('unknown pairs do nothing and never throw in the view bindings', () => {
  it('events the hosting elements do not declare reach no handler', async () => {
    const host = recordingHost();
    const harness = await mountAt('/missions', { host });
    host.calls.length = 0;
    const counted = Object.values(table).flatMap((events) => Object.keys(events));
    expect(counted.length).toBe(40);
    for (const name of ['sk-unknown', 'constructor', '__proto__', 'toString', 'hasOwnProperty', 'sk-open-project', 'sk-navigate-away']) {
      for (const element of [harness.shell, screenElement(harness.shell, 'sk-missions-screen')]) {
        element.dispatchEvent(new CustomEvent(name, { detail: { href: '#/ops', open: true }, bubbles: true, composed: true }));
      }
    }
    await settle(harness);
    expect(screenTag(harness.shell)).toBe('sk-missions-screen');
    expect(host.calls).toEqual([]);
    // Positive control: a declared event on the same element does reach its handler.
    harness.shell.dispatchEvent(new CustomEvent('sk-navigate', { detail: { id: 'nav-ops', href: '#/ops' }, bubbles: true, composed: true }));
    await settle(harness);
    expect(screenTag(harness.shell)).toBe('sk-ops-screen');
  });

  it('a malformed detail on a declared event does nothing', async () => {
    const host = recordingHost();
    const harness = await mountAt('/missions', { host });
    host.calls.length = 0;
    for (const detail of [null, undefined, 42, 'text', [], { href: 7 }]) {
      harness.shell.dispatchEvent(new CustomEvent('sk-navigate', { detail, bubbles: true, composed: true }));
      screenElement(harness.shell, 'sk-missions-screen').dispatchEvent(new CustomEvent('sk-open-mission', { detail, bubbles: true, composed: true }));
    }
    await settle(harness);
    expect(host.calls.filter((call) => call.member !== 'routeChanged')).toEqual([]);
    // Every malformed `sk-navigate` normalised to Missions, the screen already shown.
    expect(screenTag(harness.shell)).toBe('sk-missions-screen');
  });
});
