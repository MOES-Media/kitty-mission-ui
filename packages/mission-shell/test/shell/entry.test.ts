// The ./shell entry (plan IC-06 T031, SC-005): exactly the surface of contracts/shell-api.md, additive. `.` stays port-only.
import { describe, expect, expectTypeOf, it } from 'vitest';
import * as port from '../../src/index';
import * as shell from '../../src/shell';
import type { MissionStatusClient } from '../../src/index';
import type { ShellHost as HostFromCore } from '../../src/core/host';
import type { ShellScheduler as SchedulerFromCore } from '../../src/core/scheduler';
import type { Scheduler } from '../../src/testing';

describe('the ./shell entry', () => {
  it('exports exactly MissionShell, formatRoute, mountShell and parseRoute at run time', () => {
    expect(Object.keys(shell).sort()).toEqual(['MissionShell', 'formatRoute', 'mountShell', 'parseRoute']);
  });

  it('keeps the main entry port-only: none of those names is in it', () => {
    for (const name of ['MissionShell', 'formatRoute', 'mountShell', 'parseRoute']) {
      expect(Object.keys(port), `${name} is not a port export`).not.toContain(name);
    }
    // Positive control: the port names are still there.
    expect(Object.keys(port)).toContain('CLIENT_OPERATIONS');
  });

  it('declares the types of the contract block (a rename fails typecheck)', () => {
    expectTypeOf<shell.ShellMode>().toEqualTypeOf<'desktop' | 'dashboard'>();
    expectTypeOf<shell.Destination['screen']>().toEqualTypeOf<'missions' | 'ops' | 'projects' | 'drift' | 'pipeline' | 'work-packages' | 'artifacts'>();
    expectTypeOf<shell.ShellHost>().toEqualTypeOf<HostFromCore>();
    expectTypeOf<shell.ShellScheduler>().toEqualTypeOf<SchedulerFromCore>();
    // Declared once, structurally identical to the fixture adapter's Scheduler, both ways.
    expectTypeOf<shell.ShellScheduler>().toEqualTypeOf<Scheduler>();
    expectTypeOf<shell.ShellOptions['client']>().toEqualTypeOf<MissionStatusClient | null>();
    expectTypeOf<shell.ShellOptions['mode']>().toEqualTypeOf<shell.ShellMode>();
    expectTypeOf<shell.ShellOptions>().toHaveProperty('route');
    expectTypeOf<shell.ShellOptions>().toHaveProperty('copy');
    expectTypeOf<shell.ShellOptions['copy']>().toEqualTypeOf<shell.ShellCopyOverrides | undefined>();
    expectTypeOf<{ title: string; body: string }>().toExtend<NonNullable<shell.ShellCopyOverrides['serviceMissing']>>();
    expectTypeOf<ReturnType<typeof shell.mountShell>>().toEqualTypeOf<{
      setRoute(route: string): void;
      setClient(client: MissionStatusClient | null, route?: string): void;
      setCopy(copy: shell.ShellCopyOverrides): void;
      destroy(): void;
    }>();
    expectTypeOf(shell.formatRoute).toEqualTypeOf<(destination: shell.Destination) => string>();
    expectTypeOf(shell.parseRoute).toEqualTypeOf<(route: string, mode: shell.ShellMode) => shell.Destination>();
  });

  it('the mounted handle has setCopy at run time, next to setRoute, setClient and destroy', async () => {
    const target = document.createElement('div');
    document.body.append(target);
    const handle = shell.mountShell(target, { client: null, mode: 'desktop' });
    expect(Object.keys(handle).sort()).toEqual(['destroy', 'setClient', 'setCopy', 'setRoute']);
    expect(() => handle.setCopy({ serviceMissing: { title: 'T', body: 'B' } })).not.toThrow();
    handle.destroy();
    expect(() => handle.setCopy({})).not.toThrow();
    target.remove();
  });

  it('formatRoute and parseRoute round-trip through the entry', () => {
    const destination = shell.parseRoute('/ops', 'desktop');
    expect(shell.formatRoute(destination)).toBe('/ops');
  });
});
