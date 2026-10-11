// The lane table (DR-02, DR-03, DR-04, DR-05, DR-06, DR-25). Revert check for this file: in `table-parts.ts` delete the
// `scope="col"` of the headers and "real header cells" fails.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkDriftScreen } from '../src/elements/sk-drift-screen/sk-drift-screen.js';
import { driftFrame, reportProps } from '../src/elements/sk-drift-screen/fixtures.js';
import type { DriftScreenProps } from '../src/elements/sk-drift-screen/fixtures.js';
import { reportManyLanes, reportPopulated } from '../src/contract/fixtures.generated.js';

afterEach(() => {
  document.body.replaceChildren();
});

async function mount(props: Partial<DriftScreenProps>, width = 1280): Promise<SkDriftScreen> {
  await page.viewport(width, 900);
  const screen = document.createElement('sk-drift-screen');
  Object.assign(screen, props);
  const box = document.createElement('div');
  document.body.append(box);
  render(driftFrame(html`${screen}`), box);
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))));
  await screen.updateComplete;
  return screen;
}
const root = (el: Element): ShadowRoot => {
  if (el.shadowRoot === null) throw new Error('no shadow root');
  return el.shadowRoot;
};
const rowsOf = (screen: SkDriftScreen): string[][] =>
  [...root(screen).querySelectorAll('[data-region="detail"] table tbody tr')].map((tr) => [...tr.children].map((cell) => cell.textContent?.trim() ?? ''));

describe('rows and headers', () => {
  it('real header cells: three th with scope col, in the contract words, inside a table named for the status lane', async () => {
    const screen = await mount(reportProps('reportPopulated', { select: 1 }));
    const heads = [...root(screen).querySelectorAll('table thead th')];
    expect(heads.map((th) => th.textContent?.trim())).toEqual(['Work Package', 'status.json', 'Event log']);
    expect(heads.map((th) => th.getAttribute('scope'))).toEqual(['col', 'col', 'col']);
    expect(root(screen).querySelectorAll('table')).toHaveLength(1);
    expect(root(screen).querySelector('table')?.getAttribute('aria-label')).toMatch(/status lane/i);
    expect(root(screen).querySelector('table')?.getAttribute('aria-label') ?? '').not.toMatch(/feature/i);
  });

  it('DR-03: one-sided Work Packages show "not present" on the null side only; words come from the lane vocabulary', async () => {
    const screen = await mount(reportProps('reportOneSidedLane', { select: 0 }));
    expect(rowsOf(screen)).toEqual([
      ['WP01', 'not present', 'planned'],
      ['WP02', 'done', 'not present'],
    ]);
  });

  it('DR-02: the rows are exactly the differing rows, in the given order (equality with the independent filter of the fixture)', async () => {
    const screen = await mount(reportProps('reportPopulated', { select: 1 }));
    const compared: ReadonlyArray<{ wpId: string; persistedStatusLane: string | null; derivedStatusLane: string | null }> = reportPopulated.findings[1]?.laneComparison ?? [];
    const expected = compared.filter((row) => row.persistedStatusLane !== row.derivedStatusLane).map((row) => row.wpId);
    expect(expected).toEqual(['WP01', 'WP03']);
    expect(rowsOf(screen).map((row) => row[0])).toEqual(expected);
  });

  it('equal rows are dropped: a comparison with equal rows draws only the differing ones (the fixture is asserted to hold both kinds)', async () => {
    type Lane = { wpId: string; persistedStatusLane: string | null; derivedStatusLane: string | null };
    const base = reportManyLanes.findings[0];
    if (base === undefined) throw new Error('fixture');
    const added: Lane[] = [
      { wpId: 'WP90', persistedStatusLane: 'planned', derivedStatusLane: 'planned' },
      { wpId: 'WP91', persistedStatusLane: null, derivedStatusLane: null },
    ];
    const lanes: Lane[] = [...base.laneComparison, ...added];
    const differing = lanes.filter((row) => row.persistedStatusLane !== row.derivedStatusLane);
    const equalRows = lanes.filter((row) => row.persistedStatusLane === row.derivedStatusLane);
    expect(equalRows.map((row) => row.wpId)).toEqual(['WP90', 'WP91']);
    expect(differing.length).toBeGreaterThan(0);
    expect(differing.length + equalRows.length).toBe(lanes.length);
    const withEqual = { ...reportManyLanes, findings: [{ ...base, laneComparison: lanes }] };
    const screen = await mount({ ...reportProps('reportManyLanes', { select: 0 }), report: withEqual });
    expect(rowsOf(screen).map((row) => row[0])).toEqual(differing.map((row) => row.wpId));
    expect(rowsOf(screen).map((row) => row[0])).not.toContain('WP90');
    const equalOnly = {
      ...reportPopulated,
      findings: [{ ...(reportPopulated.findings[1] as (typeof reportPopulated.findings)[number]), laneComparison: [{ wpId: 'WP09', persistedStatusLane: 'planned', derivedStatusLane: 'planned' }] }],
    };
    const none = await mount({ ...reportProps('reportPopulated', { select: 0 }), report: equalOnly, selectedFinding: { missionId: equalOnly.findings[0]?.missionId ?? '', kind: equalOnly.findings[0]?.kind ?? '', artifactPath: 'status.json' } });
    expect(root(none).querySelector('table')).toBeNull();
  });
});

describe('no table where the data has none', () => {
  it('DR-04: no rows, no table and no sentence; DR-05: one row, a table (positive control)', async () => {
    const provenance = await mount(reportProps('reportPopulated', { select: 2 }));
    expect(root(provenance).querySelector('table')).toBeNull();
    expect(root(provenance).querySelector('[data-lane-note]')).toBeNull();
    const terminal = await mount(reportProps('reportPopulated', { select: 3 }));
    expect(rowsOf(terminal)).toEqual([['WP02', 'approved', 'done']]);
  });

  it('DR-06: corrupt JSON replaces the table with one sentence and keeps the command', async () => {
    const screen = await mount(reportProps('reportCorruptJson', { select: 0 }));
    expect(root(screen).querySelector('table')).toBeNull();
    expect(root(screen).querySelectorAll('[data-lane-note]')).toHaveLength(1);
    expect(root(screen).querySelector('[data-lane-note]')?.textContent?.trim()).toBe('The snapshot is not a valid JSON object, so there are no lanes to compare.');
    expect(root(screen).querySelector('[data-copy]')).not.toBeNull();
  });
});

describe('scroll region only while the table overflows (DR-25)', () => {
  it('a short table at 1280 is not a region and has no tab stop; the 40-lane table with a 66-character identifier at 380 is a labelled focusable region', async () => {
    const roomy = await mount(reportProps('reportPopulated', { select: 1 }), 1280);
    const quiet = root(roomy).querySelector('.sk-data-table__scroller');
    expect(quiet).not.toBeNull();
    expect(quiet?.getAttribute('role')).toBeNull();
    expect(quiet?.getAttribute('tabindex')).toBeNull();
    const longId = 'WP-an-unbreakable-work-package-identifier-of-seventy-characters-xx'.replace(/-/g, '_');
    const wide = reportProps('reportManyLanes', { select: 0 });
    const report = wide.report;
    const finding = report?.findings[0];
    if (report === null || finding === undefined) throw new Error('fixture');
    const lanes = finding.laneComparison.map((row, index) => (index === 0 ? { ...row, wpId: longId } : row));
    const narrow = await mount({ ...wide, report: { ...report, findings: [{ ...finding, laneComparison: lanes }] } }, 380);
    const scroller = root(narrow).querySelector('.sk-data-table__scroller') as HTMLElement;
    expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth);
    expect(scroller.getAttribute('role')).toBe('region');
    expect(scroller.getAttribute('tabindex')).toBe('0');
    expect(scroller.getAttribute('aria-label')?.length ?? 0).toBeGreaterThan(0);
    expect(scroller.getAttribute('aria-label')).not.toBe(root(narrow).querySelector('table')?.getAttribute('aria-label'));
  });
});

describe('cell colour (E-37 table cells, DD register: the prototype td is the body colour)', () => {
  it('a body cell is painted with --sk-fg-body the header cell with --sk-fg-subtle (positive control: they differ)', async () => {
    const screen = await mount(reportProps('reportPopulated', { select: 1 }));
    const cell = root(screen).querySelector('.sk-data-table td') as HTMLElement;
    const head = root(screen).querySelector('.sk-data-table thead th') as HTMLElement;
    const probe = (token: string): string => {
      const el = document.createElement('span');
      el.style.color = `var(${token})`;
      root(screen).append(el);
      const colour = getComputedStyle(el).color;
      el.remove();
      return colour;
    };
    const body = probe('--sk-fg-body');
    expect(body).not.toBe('');
    expect(getComputedStyle(cell).color).toBe(body);
    expect(getComputedStyle(head).color).toBe(probe('--sk-fg-subtle'));
    expect(body).not.toBe(probe('--sk-fg-subtle'));
  });
});
