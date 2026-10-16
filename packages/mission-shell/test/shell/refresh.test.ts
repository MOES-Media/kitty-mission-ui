// FR-016 on real elements: the Refresh button exists only on Artifact and Ops, in the top-bar slot, with the contract labels,
// and pressing it re-reads the destination's own explicit-refresh keys once and nothing else.
import { afterEach, describe, expect, it } from 'vitest';
import { createFixtureClient } from '../../src/client/fixture';
import { createFakeScheduler } from '../support/fake-scheduler';
import { recordingClient } from '../support/recording-client';
import { M, destroyAll, mountAt, recordingHost, settle } from './helpers';

afterEach(destroyAll);

const buttons = (root: Element): HTMLElement[] => [...root.querySelectorAll<HTMLElement>(':scope > sk-button')];

describe('Refresh button (FR-016)', () => {
  const WITH: readonly [string, string, string][] = [
    ['ops', '/ops', 'Refresh Ops'],
    ['artifacts', `/missions/${M}/artifacts/plan.md`, 'Refresh artifacts'],
  ];
  const WITHOUT: readonly [string, string][] = [
    ['missions', '/missions'],
    ['drift', '/drift'],
    ['pipeline', `/missions/${M}`],
    ['work-packages', `/missions/${M}/work-packages/WP04`],
    ['projects', '/projects'],
  ];

  for (const [name, route, label] of WITH) {
    it(`refresh: ${name} has a ghost small button in the top-bar slot labelled "${label}"`, async () => {
      const harness = await mountAt(route);
      const found = buttons(harness.shell);
      expect(found.length).toBe(1);
      const button = found[0] as HTMLElement & { label: string };
      expect(button.getAttribute('slot')).toBe('top-bar-actions');
      expect(button.getAttribute('variant')).toBe('ghost');
      expect(button.getAttribute('size')).toBe('sm');
      expect(button.label).toBe(label);
      expect(button.textContent?.trim()).toBe('Refresh');
    });
  }

  for (const [name, route] of WITHOUT) {
    it(`refresh: ${name} has none`, async () => {
      const harness = await mountAt(route);
      expect(buttons(harness.shell).length).toBe(0);
    });
  }

  it('refresh: pressing it on Ops re-reads the Ops page once and nothing else, and announces the route', async () => {
    const scheduler = createFakeScheduler();
    const client = recordingClient(createFixtureClient({ scheduler }));
    const host = recordingHost();
    const harness = await mountAt('/ops', { scheduler, client, host });
    client.take();
    host.calls.length = 0;
    (buttons(harness.shell)[0] as HTMLElement).click();
    await settle(harness);
    expect(client.take()).toEqual(['listOpsInvocations {}']);
    expect(host.calls.filter((call) => call.member === 'routeChanged').map((call) => call.args[0])).toEqual(['/ops']);
  });

  it('refresh: pressing it on Artifacts re-reads the listing and the open content once each, and nothing else', async () => {
    const scheduler = createFakeScheduler();
    const client = recordingClient(createFixtureClient({ scheduler }));
    const harness = await mountAt(`/missions/${M}/artifacts/plan.md`, { scheduler, client });
    client.take();
    (buttons(harness.shell)[0] as HTMLElement).click();
    await settle(harness);
    const reads = client.take();
    expect(reads.map((read) => read.split(' ')[0]).sort()).toEqual(['getArtifactContent', 'listArtifacts']);
    expect(reads.filter((read) => read.startsWith('listArtifacts')).length).toBe(1);
  });

  it('refresh: the button goes away with the destination (positive control: it was there)', async () => {
    const harness = await mountAt('/ops');
    expect(buttons(harness.shell).length).toBe(1);
    harness.mounted.setRoute('/missions');
    await settle(harness);
    expect(buttons(harness.shell).length).toBe(0);
  });
});
