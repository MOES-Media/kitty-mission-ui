// What the live region says across updates (FR-004, FR-008, FR-009, FR-026, pre-merge squad CONTRACT-001, CONTRACT-002, A11Y-003/004):
// a report that is not shown announces nothing, a missing or empty scan time never prints "undefined" or a bare "last scan" (the load line drops the time clause, F-1), and a
// rescan is announced once. Every absence has a positive control.
// Revert check (temporary local edit, never committed): in logic/drift-announce.ts delete the `next.withheld` line of the `loading`
// case and "a scoped scan that receives another Mission's finding announces nothing" fails; make `scannedAt` pass through
// unnormalised in `announcementInput` and "a missing or empty scan time never prints" fails; drop the `rescanning` clause and
// "a rescan is announced once" fails.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkDriftScreen } from '../src/elements/sk-drift-screen/sk-drift-screen.js';
import { driftFrame, reportProps, stateProps } from '../src/elements/sk-drift-screen/fixtures.js';
import type { DriftScreenProps } from '../src/elements/sk-drift-screen/fixtures.js';
import { COPY_RESULT_TEXT, DRIFT_LOADING_LABEL, ERROR_ANNOUNCEMENT, READY_ANNOUNCEMENT, RESCANNING_ANNOUNCEMENT, RESCANNED_TEXT, RESCAN_UNCHANGED_ANNOUNCEMENT } from '../src/defaults/index.js';
import { reportPopulated, reportScoped, reportScopedForeign } from '../src/contract/fixtures.generated.js';
import type { DriftReportView } from '../src/contract/types.js';

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

async function settle(screen: SkDriftScreen): Promise<void> {
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}
async function mount(props: Partial<DriftScreenProps> = {}): Promise<SkDriftScreen> {
  await page.viewport(1280, 900);
  const screen = document.createElement('sk-drift-screen');
  Object.assign(screen, { ...reportProps('reportPopulated', { select: 1 }), ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(driftFrame(html`${screen}`), box);
  await settle(screen);
  return screen;
}
const root = (screen: SkDriftScreen): ShadowRoot => {
  if (screen.shadowRoot === null) throw new Error('no shadow root');
  return screen.shadowRoot;
};
const live = (screen: SkDriftScreen): string => (root(screen).querySelector('[data-live]')?.textContent ?? '').replace(/\s+/g, ' ').trim();
const state = (screen: SkDriftScreen): string | null => root(screen).querySelector('[data-root]')?.getAttribute('data-state') ?? null;

describe('a report that is not shown announces nothing (FR-008, FR-009)', () => {
  it("a scoped scan that receives another Mission's finding announces nothing; a real loading status still announces (positive control)", async () => {
    const scoped = reportProps('reportScoped', { select: 0 });
    const screen = await mount(scoped);
    expect(state(screen)).toBe('ready');
    expect(live(screen)).toBe('');
    screen.report = reportScopedForeign as DriftReportView;
    await settle(screen);
    expect(state(screen)).toBe('loading');
    expect(live(screen), 'foreign finding: the loading look, no words').toBe('');
    // Positive control: the same screen announces the loading words when the host really says loading.
    screen.report = reportScoped as DriftReportView;
    await settle(screen);
    expect(state(screen)).toBe('ready');
    screen.status = 'loading';
    await settle(screen);
    expect(live(screen)).toBe(DRIFT_LOADING_LABEL);
  });

  it('a ready status with a null report announces nothing (positive control: the same transition into a real loading status announces)', async () => {
    const screen = await mount();
    screen.report = null;
    screen.selectedFinding = null;
    await settle(screen);
    expect(state(screen)).toBe('loading');
    expect(live(screen)).toBe('');
    const control = await mount();
    control.status = 'loading';
    await settle(control);
    expect(live(control)).toBe(DRIFT_LOADING_LABEL);
  });
});

describe('a missing or empty scan time never prints "undefined" or a bare "last scan" (CONTRACT-001)', () => {
  const without = (patch: Partial<DriftReportView> | { scannedAt: undefined }): DriftReportView => ({ ...reportPopulated, ...patch }) as DriftReportView;

  it('loading to ready: a report without scannedAt, or with an empty one, announces the load line without the time, no half sentence (positive control: with a time it announces the ready line)', async () => {
    let ran = 0;
    for (const report of [without({ scannedAt: undefined }), without({ scannedAt: '' }), without({ scannedAt: 7 as unknown as string })]) {
      const screen = await mount({ ...stateProps.loading() });
      screen.status = 'ready';
      screen.report = report;
      await settle(screen);
      expect(state(screen)).toBe('ready');
      expect(live(screen)).toBe('Drift scan loaded: 5 findings');
      expect(live(screen)).not.toContain('undefined');
      expect(live(screen)).not.toMatch(/last scan\s*$/);
      expect(live(screen)).not.toMatch(/last scan 7/);
      document.body.replaceChildren();
      ran += 1;
    }
    expect(ran).toBe(3);
    const control = await mount({ ...stateProps.loading() });
    control.status = 'ready';
    control.report = reportPopulated;
    await settle(control);
    expect(live(control)).toBe(READY_ANNOUNCEMENT(5, '2 minutes ago'));
  });
});

describe('a rescan is announced once (A11Y-003, A11Y-004)', () => {
  it('"Rescanning" is announced once when the rescan starts, "Rescanned" when the report arrives; a re-render adds nothing', async () => {
    const screen = await mount();
    expect(live(screen)).toBe('');
    screen.rescanning = true;
    await settle(screen);
    expect(live(screen)).toBe(RESCANNING_ANNOUNCEMENT);
    expect(RESCANNING_ANNOUNCEMENT).toBe('Rescanning');
    const seq = root(screen).querySelector('[data-live] [data-seq]')?.getAttribute('data-seq');
    screen.now = '2026-10-06T09:10:00Z';
    await settle(screen);
    expect(root(screen).querySelector('[data-live] [data-seq]')?.getAttribute('data-seq'), 'a clock tick adds no announcement').toBe(seq);
    screen.report = { ...reportPopulated, scannedAt: '2026-10-06T09:05:00Z' };
    screen.rescanning = false;
    await settle(screen);
    expect(live(screen)).toBe(RESCANNED_TEXT(5, '5 minutes ago'));
  });

  it('a screen that never rescans announces no "Rescanning" (positive control)', async () => {
    const screen = await mount();
    screen.now = '2026-10-06T09:10:00Z';
    await settle(screen);
    expect(live(screen)).toBe('');
  });

  // F-3: Rescan is drawn in the error and not-found states too, so the start is announced there.
  it('"Rescanning" is announced when a rescan starts from the error or the not-found state (positive control: idle stays silent)', async () => {
    for (const props of [stateProps.error(), stateProps.notFound()]) {
      const screen = await mount(props);
      const before = live(screen);
      await settle(screen);
      expect(live(screen)).toBe(before);
      screen.rescanning = true;
      await settle(screen);
      expect(live(screen)).toBe(RESCANNING_ANNOUNCEMENT);
      document.body.replaceChildren();
    }
  });
});

// Pre-merge squad round 3 (S-1, S-2): the end of a rescan is decided, in the update where `rescanning` falls (no timers, NFR-005),
// against the input captured when the rescan STARTED. The host contract: the report arrives before, or in the same update as, the
// cleared flag. A host that clears the flag first hears "no changes", then the real line when the report lands (tested below).
// Revert check (temporary local edit, never committed): make `rescanCompletion` compare with the previous update instead of the base
// and the report-first tests fail.
const seqOf = (screen: SkDriftScreen): number => Number(root(screen).querySelector('[data-live] [data-seq]')?.getAttribute('data-seq') ?? 0);
/** Lets the update and a frame pass. */
async function afterHost(screen: SkDriftScreen): Promise<void> {
  await settle(screen);
}
/** Starts a rescan and returns the lines said so far, which is only "Rescanning". */
async function startRescan(screen: SkDriftScreen): Promise<void> {
  screen.rescanning = true;
  await settle(screen);
  expect(live(screen)).toBe(RESCANNING_ANNOUNCEMENT);
  expect(seqOf(screen)).toBe(1);
}
const NEWER = '2026-10-06T09:05:00Z';

describe('the end of a rescan is decided against the report captured at its start (S-1)', () => {
  it('an unchanged rescan says "no changes" once when the report comes together with the flag or before it', async () => {
    for (const order of ['together', 'report first'] as const) {
      const screen = await mount();
      await startRescan(screen);
      if (order === 'together') {
        screen.report = { ...reportPopulated };
        screen.rescanning = false;
      } else {
        screen.report = { ...reportPopulated };
        await screen.updateComplete;
        screen.rescanning = false;
      }
      await afterHost(screen);
      expect(live(screen), order).toBe(RESCAN_UNCHANGED_ANNOUNCEMENT);
      expect(seqOf(screen), order).toBe(2);
      document.body.replaceChildren();
    }
  });

  it('a newer report says "Rescanned" once and never "no changes", when it comes together with the flag or before it', async () => {
    for (const order of ['together', 'report first'] as const) {
      const screen = await mount();
      await startRescan(screen);
      screen.now = '2026-10-06T09:06:00Z';
      const newer = { ...reportPopulated, scannedAt: NEWER };
      if (order === 'together') {
        screen.report = newer;
        screen.rescanning = false;
      } else if (order === 'report first') {
        screen.report = newer;
        await screen.updateComplete;
        screen.rescanning = false;
      }
      await afterHost(screen);
      expect(live(screen), order).toBe(RESCANNED_TEXT(5, '1 minute ago'));
      expect(seqOf(screen), order).toBe(2);
      document.body.replaceChildren();
    }
  });

  // The documented cost of a host that breaks the ordering contract: the flag clears first.
  it('a host that clears the flag BEFORE the report hears "no changes", then the real line when the report lands', async () => {
    const screen = await mount();
    await startRescan(screen);
    screen.now = '2026-10-06T09:06:00Z';
    screen.rescanning = false;
    await settle(screen);
    expect(live(screen)).toBe(RESCAN_UNCHANGED_ANNOUNCEMENT);
    expect(seqOf(screen)).toBe(2);
    screen.report = { ...reportPopulated, scannedAt: NEWER };
    await settle(screen);
    expect(live(screen)).toBe(RESCANNED_TEXT(5, '1 minute ago'));
    expect(seqOf(screen)).toBe(3);
  });

  it('a rescan that ends on an OLDER scan time is not "no changes": the report that is shown is announced', async () => {
    for (const order of ['together', 'report first'] as const) {
      const screen = await mount();
      await startRescan(screen);
      screen.now = '2026-10-06T09:06:00Z';
      const older = { ...reportPopulated, scannedAt: '2026-10-06T08:00:00Z' };
      screen.report = older;
      if (order === 'report first') await screen.updateComplete;
      screen.rescanning = false;
      await afterHost(screen);
      expect(live(screen), order).toBe(READY_ANNOUNCEMENT(5, '1 hour ago'));
      expect(live(screen), order).not.toBe(RESCAN_UNCHANGED_ANNOUNCEMENT);
      expect(seqOf(screen), order).toBe(2);
      document.body.replaceChildren();
    }
  });

  it('a copy answer that arrives with the end of the rescan is announced, and the end of the rescan with it', async () => {
    const screen = await mount();
    await startRescan(screen);
    (root(screen).querySelector('[data-copy]') as HTMLElement).click();
    await screen.updateComplete;
    screen.rescanning = false;
    screen.copyResult = 'copied';
    await afterHost(screen);
    expect(live(screen)).toBe('Copied. Rescan complete: no changes');
    expect(seqOf(screen)).toBe(2);
  });

  it('a manual copy answer that arrives with the end of the rescan is spoken after the end line, not dropped', async () => {
    const screen = await mount();
    await startRescan(screen);
    (root(screen).querySelector('[data-copy]') as HTMLElement).click();
    await screen.updateComplete;
    const spoken: string[] = [];
    const region = root(screen).querySelector('[data-live]');
    if (region === null) throw new Error('no live region');
    const watch = new MutationObserver(() => {
      const line = live(screen);
      if (line !== '' && spoken[spoken.length - 1] !== line) spoken.push(line);
    });
    watch.observe(region, { childList: true, characterData: true, subtree: true });
    screen.rescanning = false;
    screen.copyResult = 'manual';
    await afterHost(screen);
    await afterHost(screen);
    watch.disconnect();
    expect(spoken).toEqual([RESCAN_UNCHANGED_ANNOUNCEMENT, COPY_RESULT_TEXT.manual]);
    expect(seqOf(screen)).toBe(3);
  });

  it('a second rescan is announced again, and its own end too (positive control)', async () => {
    const screen = await mount();
    await startRescan(screen);
    screen.rescanning = false;
    await afterHost(screen);
    expect(seqOf(screen)).toBe(2);
    screen.rescanning = true;
    await settle(screen);
    expect(live(screen)).toBe(RESCANNING_ANNOUNCEMENT);
    screen.rescanning = false;
    await afterHost(screen);
    expect(live(screen)).toBe(RESCAN_UNCHANGED_ANNOUNCEMENT);
    expect(seqOf(screen)).toBe(4);
  });
});

describe('a rescan that ends in the error or not-found state it started in replaces "Rescanning" (S-2)', () => {
  it('says "no changes" when the state and its words are the same, in both states', async () => {
    for (const props of [stateProps.error(), stateProps.notFound()]) {
      const screen = await mount(props);
      await startRescan(screen);
      screen.rescanning = false;
      await afterHost(screen);
      expect(live(screen)).toBe(RESCAN_UNCHANGED_ANNOUNCEMENT);
      expect(seqOf(screen)).toBe(2);
      document.body.replaceChildren();
    }
  });

  it("says the state's own line when the error words changed during the rescan, once (positive control)", async () => {
    const screen = await mount({ ...stateProps.error(), errorMessage: 'first words' });
    await startRescan(screen);
    screen.errorMessage = 'second words';
    screen.rescanning = false;
    await afterHost(screen);
    expect(live(screen)).toBe(ERROR_ANNOUNCEMENT('second words'));
    expect(seqOf(screen)).toBe(2);
  });
});
