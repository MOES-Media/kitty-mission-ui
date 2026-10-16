import { describe, expect, it } from 'vitest';
import { CONNECTION_STATES, type ConnectionState } from '../../src/client/port';
import {
  bannerCopy,
  CONNECTION_CONDITIONS,
  createConnectionPresenter,
  GRACE_MS,
  SHELL_COPY,
  type ConnectionCondition,
} from '../../src/core/connection';
import { createFakeScheduler } from '../support/fake-scheduler';

function setup(initial: ConnectionState = 'connected') {
  const fake = createFakeScheduler();
  let changes = 0;
  const presenter = createConnectionPresenter({ scheduler: fake, initial, onChange: () => (changes += 1) });
  return { fake, presenter, changes: () => changes };
}

const EXPECTED: Record<ConnectionState, ConnectionCondition | null> = {
  connecting: 'connecting',
  connected: null,
  reconnecting: null, // only after the grace period
  'degraded: service-missing': 'service-missing',
  'degraded: contract-mismatch': 'contract-mismatch',
};

describe('condition of each state (SC-003: five of five, plus the refused notice)', () => {
  it('gives each state its condition at once, and none for connected', () => {
    let seen = 0;
    for (const state of CONNECTION_STATES) {
      const { presenter } = setup(state);
      expect(presenter.condition(), state).toBe(EXPECTED[state]);
      seen += 1;
    }
    expect(seen).toBe(5);
  });

  it('shows the refused notice when no state condition does, with a positive control', () => {
    const { presenter } = setup('connected');
    expect(presenter.condition()).toBeNull();
    presenter.setRefused();
    expect(presenter.condition()).toBe('live-updates-off');
    expect(presenter.refused()).toBe(true);
  });

  it('lets the connection conditions take precedence over the refused notice', () => {
    const { presenter, fake } = setup('connected');
    presenter.setRefused();
    presenter.setState('degraded: service-missing');
    expect(presenter.condition()).toBe('service-missing');
    presenter.setState('connecting');
    expect(presenter.condition()).toBe('connecting');
    presenter.setState('reconnecting');
    expect(presenter.condition()).toBe('live-updates-off');
    void fake.advance(GRACE_MS);
  });

  it('lists the five conditions', () => {
    expect([...CONNECTION_CONDITIONS]).toEqual(['connecting', 'reconnecting', 'service-missing', 'contract-mismatch', 'live-updates-off']);
  });

  it('connected hides any banner in the same update', () => {
    for (const state of ['connecting', 'degraded: service-missing', 'degraded: contract-mismatch'] as const) {
      const { presenter } = setup(state);
      expect(presenter.condition()).not.toBeNull();
      presenter.setState('connected');
      expect(presenter.condition(), state).toBeNull();
    }
  });
});

describe('degraded shows in the same update (NFR-004)', () => {
  it('is present right after the state change, before any advance', () => {
    for (const [state, condition] of [
      ['degraded: service-missing', 'service-missing'],
      ['degraded: contract-mismatch', 'contract-mismatch'],
    ] as const) {
      const { presenter, fake } = setup('connected');
      expect(presenter.condition()).toBeNull();
      presenter.setState(state);
      expect(presenter.condition()).toBe(condition);
      expect(fake.now()).toBe(0);
    }
  });
});

describe('reconnecting grace timer (R2-08)', () => {
  it('shows nothing at 999 ms and the condition at 1000 ms', async () => {
    const { presenter, fake } = setup('connected');
    presenter.setState('reconnecting');
    expect(presenter.state()).toBe('reconnecting');
    expect(presenter.condition()).toBeNull();
    await fake.advance(999);
    expect(presenter.condition()).toBeNull();
    await fake.advance(1);
    expect(presenter.condition()).toBe('reconnecting');
  });

  it('notifies once when the timer fires', async () => {
    const { presenter, fake, changes } = setup('connected');
    presenter.setState('reconnecting');
    const before = changes();
    await fake.advance(GRACE_MS);
    expect(changes()).toBe(before + 1);
  });

  it('updates the state before it arms the timer', () => {
    const fake = createFakeScheduler();
    const order: string[] = [];
    const armed = fake.setTimeout.bind(fake);
    fake.setTimeout = (fn, ms) => {
      order.push(`arm:${presenter.state()}`);
      return armed(fn, ms);
    };
    const presenter = createConnectionPresenter({ scheduler: fake, initial: 'connected', onChange: () => undefined });
    presenter.setState('reconnecting');
    expect(order).toEqual(['arm:reconnecting']);
  });

  it('a re-entry arms a fresh timer: nothing at the first mark, the condition 1000 ms after the second entry', async () => {
    const { presenter, fake } = setup('connected');
    presenter.setState('reconnecting');
    await fake.advance(500);
    presenter.setState('connected');
    expect(fake.pending()).toBe(0);
    presenter.setState('reconnecting'); // second entry at t = 500
    await fake.advance(500); // t = 1000: the first entry's mark
    expect(presenter.condition()).toBeNull();
    await fake.advance(499); // t = 1499
    expect(presenter.condition()).toBeNull();
    await fake.advance(1); // t = 1500 = second entry + 1000
    expect(presenter.condition()).toBe('reconnecting');
  });

  it('has no pending timer after any exit or after dispose', async () => {
    for (const exit of ['connected', 'connecting', 'degraded: service-missing', 'degraded: contract-mismatch'] as const) {
      const { presenter, fake } = setup('connected');
      presenter.setState('reconnecting');
      expect(fake.pending()).toBe(1);
      presenter.setState(exit);
      expect(fake.pending(), exit).toBe(0);
      await fake.advance(2 * GRACE_MS);
      expect(presenter.condition() === 'reconnecting', exit).toBe(false);
    }
    const { presenter, fake } = setup('connected');
    presenter.setState('reconnecting');
    presenter.dispose();
    expect(fake.pending()).toBe(0);
  });

  it('a flap shorter than one second shows nothing at all', async () => {
    const { presenter, fake, changes } = setup('connected');
    presenter.setState('reconnecting');
    await fake.advance(300);
    presenter.setState('connected');
    await fake.advance(5000);
    expect(changes()).toBe(2); // the two state updates only
    expect(presenter.condition()).toBeNull();
  });

  it('a client that starts reconnecting arms the timer too', async () => {
    const { presenter, fake } = setup('reconnecting');
    expect(fake.pending()).toBe(1);
    await fake.advance(GRACE_MS);
    expect(presenter.condition()).toBe('reconnecting');
  });
});

describe('the copy (contracts/connection-presentation.md)', () => {
  it('matches the contract literally', () => {
    expect(SHELL_COPY.banners).toEqual({
      connecting: { title: 'Connecting', body: 'Connecting to the Mission Status service.' },
      reconnecting: { title: 'Reconnecting', body: 'The connection was lost. The data shown may be out of date until it is restored.' },
      'service-missing': {
        title: 'Service not available',
        body: 'The Mission Status service could not be found or started. Data that was already loaded stays visible.',
      },
      'contract-mismatch': {
        title: 'Incompatible service',
        body: 'The Mission Status service speaks a different contract version than this app. Data that was already loaded stays visible.',
      },
      'live-updates-off': {
        title: 'Live updates are off',
        body: 'The service refused the change stream. Views are not updated automatically; navigate or refresh to read again.',
      },
    });
    expect(SHELL_COPY.projectEyebrow).toBe('Project');
    expect(SHELL_COPY.missionNotFound).toBe('This Mission could not be found. It may have been removed.');
    expect(SHELL_COPY.readFailed).toBe('The data could not be loaded.');
    expect(SHELL_COPY.chromeError).toBe('The project could not be loaded.');
    expect(SHELL_COPY.noProjectOpen).toBe('No project is open.');
  });

  it('overrides only the two degraded conditions', () => {
    const copy = {
      serviceMissing: { title: 'S title', body: 'S body' },
      contractMismatch: { title: 'C title', body: 'C body' },
    };
    expect(bannerCopy('service-missing', copy)).toEqual(copy.serviceMissing);
    expect(bannerCopy('contract-mismatch', copy)).toEqual(copy.contractMismatch);
    for (const condition of ['connecting', 'reconnecting', 'live-updates-off'] as const) {
      expect(bannerCopy(condition, copy)).toEqual(SHELL_COPY.banners[condition]);
    }
    expect(bannerCopy('service-missing', {})).toEqual(SHELL_COPY.banners['service-missing']);
    expect(bannerCopy('service-missing')).toEqual(SHELL_COPY.banners['service-missing']);
  });

  it('holds no tone or announce (FS-06)', () => {
    const text = JSON.stringify(SHELL_COPY);
    expect(text).not.toMatch(/tone|announce/);
  });
});
