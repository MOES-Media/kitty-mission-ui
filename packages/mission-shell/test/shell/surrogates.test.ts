// CON-001 on the mounted shell: a route or a project swap with a lone surrogate in the artifact path falls back to Missions.
import { afterEach, describe, expect, it } from 'vitest';
import { M, destroyAll, fixtureClient, mountAt, recordingHost, screenTag, settle } from './helpers';

afterEach(destroyAll);

const BAD_ROUTE = `/missions/${M}/artifacts/a\uD800`;

describe('lone surrogates on the mounted shell (CON-001)', () => {
  it('mounts, setRoute and setClient with such a route show Missions and throw nothing', async () => {
    const host = recordingHost();
    const harness = await mountAt(BAD_ROUTE, { host });
    expect(screenTag(harness.shell)).toBe('sk-missions-screen');
    harness.mounted.setRoute('/ops');
    await settle(harness);
    expect(screenTag(harness.shell)).toBe('sk-ops-screen');
    expect(() => harness.mounted.setRoute(BAD_ROUTE)).not.toThrow();
    await settle(harness);
    expect(screenTag(harness.shell)).toBe('sk-missions-screen');
    harness.mounted.setRoute('/ops');
    await settle(harness);
    expect(() => harness.mounted.setClient(fixtureClient(harness.scheduler), BAD_ROUTE)).not.toThrow();
    await settle(harness);
    expect(screenTag(harness.shell)).toBe('sk-missions-screen');
  });
});
