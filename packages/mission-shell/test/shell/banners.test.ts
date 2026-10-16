// FR-011, SC-003, NFR-004 on real elements: the five conditions of contracts/connection-presentation.md as sk-notice, with
// their tone, announce and title, and the grace timer of `reconnecting` on the fake scheduler. A thrown error anywhere fails
// the run (the setup file and vitest enforce it), so "zero thrown errors" is the passing of this file.
import { afterEach, describe, expect, it } from 'vitest';
import { createFixtureClient, setConnectionState } from '../../src/client/fixture';
import type { MissionStatusClient } from '../../src/client/port';
import { createFakeScheduler, type FakeScheduler } from '../support/fake-scheduler';
import { deepQueryAll, destroyAll, mountAt, screenElement, settle, type Harness } from './helpers';

afterEach(destroyAll);

interface Row {
  readonly condition: string;
  readonly tone: string;
  readonly announce: string;
  readonly title: string;
  readonly body: string;
}

// Written out from the contract table, independently of the code under test.
const ROWS: Record<string, Row> = {
  connecting: { condition: 'connecting', tone: 'info', announce: 'polite', title: 'Connecting', body: 'Connecting to the Mission Status service.' },
  reconnecting: {
    condition: 'reconnecting',
    tone: 'attention',
    announce: 'polite',
    title: 'Reconnecting',
    body: 'The connection was lost. The data shown may be out of date until it is restored.',
  },
  serviceMissing: {
    condition: 'service-missing',
    tone: 'danger',
    announce: 'assertive',
    title: 'Service not available',
    body: 'The Mission Status service could not be found or started. Data that was already loaded stays visible.',
  },
  contractMismatch: {
    condition: 'contract-mismatch',
    tone: 'danger',
    announce: 'assertive',
    title: 'Incompatible service',
    body: 'The Mission Status service speaks a different contract version than this app. Data that was already loaded stays visible.',
  },
  liveUpdatesOff: {
    condition: 'live-updates-off',
    tone: 'neutral',
    announce: 'polite',
    title: 'Live updates are off',
    body: 'The service refused the change stream. Views are not updated automatically; navigate or refresh to read again.',
  },
};

const notices = (harness: Harness): HTMLElement[] => [...harness.shell.querySelectorAll<HTMLElement>(':scope sk-notice')];

function expectNotice(harness: Harness, row: Row): void {
  const found = notices(harness);
  expect(found.length, `one sk-notice for ${row.condition}`).toBe(1);
  const notice = found[0] as HTMLElement & { message: string };
  expect(notice.getAttribute('tone')).toBe(row.tone);
  expect(notice.getAttribute('announce')).toBe(row.announce);
  expect(notice.querySelector('[slot="heading"]')?.textContent).toBe(row.title);
  expect(notice.message).toBe(row.body);
  expect(notice.parentElement?.parentElement, 'the notice is in the shell content slot').toBe(harness.shell);
  // Above the hosted screen.
  const children = [...harness.shell.children];
  const screenIndex = children.findIndex((child) => child.localName.endsWith('-screen'));
  expect(children.indexOf(notice.parentElement as Element)).toBeLessThan(screenIndex);
}

async function mountWith(scheduler: FakeScheduler, client: MissionStatusClient, route = '/missions'): Promise<Harness> {
  return mountAt(route, { scheduler, client });
}

describe('connection banners (FR-011, SC-003)', () => {
  it('connecting shows its notice at once, and connected removes it in the same render', async () => {
    const scheduler = createFakeScheduler();
    const client = createFixtureClient({ scheduler, initialState: 'connecting' });
    const harness = await mountWith(scheduler, client);
    expectNotice(harness, ROWS.connecting as Row);
    setConnectionState(client, 'connected');
    await settle(harness);
    expect(notices(harness).length, 'connected shows no sk-notice').toBe(0);
  });

  it('reconnecting shows nothing at 999 ms and the banner at 1000 ms (NFR-004)', async () => {
    const scheduler = createFakeScheduler();
    const client = createFixtureClient({ scheduler });
    const harness = await mountWith(scheduler, client);
    expect(notices(harness).length).toBe(0);
    setConnectionState(client, 'reconnecting');
    await settle(harness, 999);
    expect(notices(harness).length, 'nothing at 999 ms').toBe(0);
    await settle(harness, 1);
    expectNotice(harness, ROWS.reconnecting as Row);
    setConnectionState(client, 'connected');
    await settle(harness);
    expect(notices(harness).length, 'connected hides the banner').toBe(0);
  });

  it('a degraded service-missing banner appears without advancing time, and keeps the loaded data', async () => {
    const scheduler = createFakeScheduler();
    const client = createFixtureClient({ scheduler });
    const harness = await mountWith(scheduler, client);
    const before = screenElement<HTMLElement & { missions: unknown[] }>(harness.shell, 'sk-missions-screen').missions.length;
    expect(before).toBeGreaterThan(0);
    setConnectionState(client, 'degraded: service-missing');
    await settle(harness);
    expectNotice(harness, ROWS.serviceMissing as Row);
    expect(screenElement<HTMLElement & { missions: unknown[] }>(harness.shell, 'sk-missions-screen').missions.length).toBe(before);
  });

  it('a degraded contract-mismatch banner appears without advancing time', async () => {
    const scheduler = createFakeScheduler();
    const client = createFixtureClient({ scheduler });
    const harness = await mountWith(scheduler, client);
    setConnectionState(client, 'degraded: contract-mismatch');
    await settle(harness);
    expectNotice(harness, ROWS.contractMismatch as Row);
  });

  it('B3: a refused change stream shows the live-updates-off notice and a read still applies afterwards', async () => {
    const scheduler = createFakeScheduler();
    const client = createFixtureClient({ scheduler, examples: { streamEvents: 'StreamRefusal.content-mismatch' } });
    const harness = await mountWith(scheduler, client);
    await settle(harness, 1);
    expectNotice(harness, ROWS.liveUpdatesOff as Row);
    // Navigate to Ops: its read is applied although the stream is refused.
    const ops = deepQueryAll(harness.target, 'sk-shell-nav-item').find((item) => (item as unknown as { itemId: string }).itemId === 'nav-ops');
    const anchor = ops?.shadowRoot ? (deepQueryAll(ops.shadowRoot, 'a')[0] as HTMLAnchorElement | undefined) : undefined;
    expect(anchor).toBeDefined();
    anchor?.click();
    await settle(harness);
    const screen = screenElement<HTMLElement & { items: unknown[]; status: string }>(harness.shell, 'sk-ops-screen');
    expect(screen.status).toBe('ready');
    expect(screen.items.length).toBeGreaterThan(0);
    expectNotice(harness, ROWS.liveUpdatesOff as Row);
  });

  it('positive control: the same mount without a refusal shows no notice', async () => {
    const scheduler = createFakeScheduler();
    const harness = await mountWith(scheduler, createFixtureClient({ scheduler }));
    await settle(harness, 1);
    expect(notices(harness).length).toBe(0);
  });

  it('the host overrides the two degraded explanations through copy', async () => {
    const scheduler = createFakeScheduler();
    const client = createFixtureClient({ scheduler });
    const copy = { serviceMissing: { title: 'Sample override', body: 'Sample override body.' } };
    const harness = await mountAt('/missions', { scheduler, client, copy });
    setConnectionState(client, 'degraded: service-missing');
    await settle(harness);
    expectNotice(harness, { ...(ROWS.serviceMissing as Row), title: 'Sample override', body: 'Sample override body.' });
  });
});
