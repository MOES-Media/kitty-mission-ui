// The pairing table of `contracts/contract-pin.md` as input (IC-09): every story pairs a Work Package with a detail, and
// the pair must tell one story. Rules: the ids agree after `pairDetail`; no Work Package depends on itself; the
// dependency ids of WP-01, WP-13 and WP-14 agree on both sides; the review state agrees except for the literal exemption
// list; no two stories share a composition unless they are listed as same-composition rows.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import {
  DETAIL_FIXTURES,
  PAIRINGS,
  WORK_PACKAGE_FIXTURES,
  pairDetail,
  pairingProps,
  workPackageFrame,
} from '../src/elements/sk-work-package-screen/fixtures.js';
import type { PairingId } from '../src/elements/sk-work-package-screen/fixtures.js';
import type { WorkPackageDetailView, WorkPackageRecordView } from '../src/contract/types.js';

afterEach(() => {
  document.body.replaceChildren();
});

type Row = { workPackage: keyof typeof WORK_PACKAGE_FIXTURES; detail: keyof typeof DETAIL_FIXTURES; cycles?: 'first' | 'last' | 'none' };
const IDS = Object.keys(PAIRINGS) as PairingId[];
const rowOf = (id: PairingId): Row => PAIRINGS[id] as Row;

/** The pair of a row, built as the stories build it. */
function pairOf(id: PairingId): { wp: WorkPackageRecordView; detail: WorkPackageDetailView } {
  const props = pairingProps(id);
  return { wp: props.workPackage as WorkPackageRecordView, detail: props.detail as WorkPackageDetailView };
}

/** Review-state agreement of one pair: the problems it has (empty means it tells one story). */
export function reviewProblems(wp: WorkPackageRecordView, detail: WorkPackageDetailView): string[] {
  const cycles = detail.reviewCycles ?? [];
  const latest = wp.review?.latestResult ?? null;
  const last = cycles.length === 0 ? undefined : cycles[cycles.length - 1];
  if (latest === null) {
    // no result recorded: every paired cycle must say nothing about a verdict (an empty list, or null verdicts)
    return cycles.filter((c) => c.verdict !== null).map((c) => `cycle ${c.cycleNumber} has a verdict but the Work Package has no latest result`);
  }
  if (last === undefined) return ['a latest result is present but there is no paired cycle'];
  return last.verdict === latest.verdict ? [] : [`last cycle verdict ${String(last.verdict)} differs from latest result ${latest.verdict}`];
}

// The documented exemption list of the review-state agreement: a latest result with no cycles (the summary alone).
const SUMMARY_ALONE = ['WP-29', 'WP-44'] as const;
// Stories that carry the unparseable cycle (a null verdict): they assert nothing about a result.
const NULL_VERDICT = ['WP-30', 'WP-35b'] as const;
// Same-composition rows (literal): they differ in the region under test, in the viewport, or in the tab-order tag.
const SAME_COMPOSITION: ReadonlyArray<readonly string[]> = [
  ['WP-01', 'WP-11', 'WP-25', 'WP-31', 'WP-34', 'WP-46', 'WP-47', 'WP-48'],
  ['WP-28', 'WP-49'],
  ['WP-30', 'WP-35b'],
];

/** Groups of ids that share Work Package fixture, detail fixture and cycles option (all stories are ready/ready). */
export function sharedCompositions(ids: readonly PairingId[]): string[][] {
  const groups = new Map<string, string[]>();
  for (const id of ids) {
    const r = rowOf(id);
    const key = `${r.workPackage}|${r.detail}|${r.cycles ?? '-'}`;
    groups.set(key, [...(groups.get(key) ?? []), id]);
  }
  return [...groups.values()].filter((g) => g.length > 1);
}

describe('the pairing table (contract-pin.md, "Pairing")', () => {
  it('has 32 pairs, and every pair agrees on wpId after pairDetail', () => {
    expect(IDS).toHaveLength(32);
    let checked = 0;
    for (const id of IDS) {
      const { wp, detail } = pairOf(id);
      expect(detail.wpId, id).toBe(wp.wpId);
      checked += 1;
    }
    expect(checked).toBe(32);
    // positive control: the rewrite is real, it follows the Work Package's id
    const raw = DETAIL_FIXTURES[rowOf('WP-14').detail];
    expect(pairDetail({ ...WORK_PACKAGE_FIXTURES.wpPopulated, wpId: 'WP99' }, raw).wpId).toBe('WP99');
  });

  it('no pair makes a Work Package depend on itself (either side), with a positive control that the check can see one', () => {
    const selfDependent = (wp: WorkPackageRecordView, detail: WorkPackageDetailView): boolean =>
      wp.dependencies.includes(wp.wpId) || detail.dependencies.some((d) => d.wpId === wp.wpId);
    let checked = 0;
    for (const id of IDS) {
      const { wp, detail } = pairOf(id);
      expect(selfDependent(wp, detail), id).toBe(false);
      checked += 1;
    }
    expect(checked).toBe(32);
    const { wp, detail } = pairOf('WP-13');
    expect(selfDependent({ ...wp, dependencies: [...wp.dependencies, wp.wpId] }, detail)).toBe(true);
  });

  it('WP-01, WP-13 and WP-14: the dependency ids of both sides are equal; WP-13 readiness.unsatisfied equals both', () => {
    for (const id of ['WP-01', 'WP-13', 'WP-14'] as const) {
      const { wp, detail } = pairOf(id);
      expect(detail.dependencies.map((d) => d.wpId), id).toEqual(wp.dependencies);
    }
    const { wp, detail } = pairOf('WP-13');
    expect(wp.readiness.unsatisfied).toEqual(wp.dependencies);
    expect(wp.readiness.unsatisfied).toEqual(detail.dependencies.map((d) => d.wpId));
    expect(wp.readiness.satisfied).toBe(false);
    // WP-14 is ready: its readiness has nothing unsatisfied (the positive sibling of WP-13)
    expect(pairOf('WP-14').wp.readiness.unsatisfied).toEqual([]);
  });

  it('the review state agrees for every pair except the literal exemptions, and the exemptions really are exempt', () => {
    expect([...SUMMARY_ALONE]).toEqual(['WP-29', 'WP-44']);
    let checked = 0;
    for (const id of IDS) {
      const { wp, detail } = pairOf(id);
      const problems = reviewProblems(wp, detail);
      if ((SUMMARY_ALONE as readonly string[]).includes(id)) {
        expect(problems, id).toEqual(['a latest result is present but there is no paired cycle']);
      } else {
        expect(problems, id).toEqual([]);
      }
      checked += 1;
    }
    expect(checked).toBe(32);
    for (const id of NULL_VERDICT) {
      const { detail } = pairOf(id);
      expect(detail.reviewCycles ?? [], id).toHaveLength(1);
      expect(detail.reviewCycles?.[0]?.verdict, id).toBeNull();
    }
  });

  it('negative case: wpPopulated + detailPopulated WITHOUT cycles none fails the review-state rule; the table pair passes', () => {
    const wp = WORK_PACKAGE_FIXTURES.wpPopulated;
    const without = pairDetail(wp, DETAIL_FIXTURES.detailPopulated);
    expect(reviewProblems(wp, without).length).toBeGreaterThan(0);
    const withNone = pairDetail(wp, DETAIL_FIXTURES.detailPopulated, { cycles: 'none' });
    expect(reviewProblems(wp, withNone)).toEqual([]);
    // an approved Work Package against a changes-requested last cycle fails too
    const approved = WORK_PACKAGE_FIXTURES.wpApproved;
    expect(reviewProblems(approved, pairDetail(approved, DETAIL_FIXTURES.detailPopulated, { cycles: 'first' })).length).toBeGreaterThan(0);
  });

  it('no two stories share Work Package, detail and cycles option unless the table lists them as same-composition rows', () => {
    const groups = sharedCompositions(IDS);
    expect(groups.map((g) => [...g].sort())).toEqual(SAME_COMPOSITION.map((g) => [...g].sort()).sort((a, b) => IDS.indexOf(a[0] as PairingId) - IDS.indexOf(b[0] as PairingId)));
    let covered = 0;
    for (const group of groups) {
      expect(SAME_COMPOSITION.some((listed) => listed.length === group.length && group.every((id) => listed.includes(id)))).toBe(true);
      covered += group.length;
    }
    expect(covered).toBe(12);
    // the literal lists name only ids that exist
    for (const id of SAME_COMPOSITION.flat()) expect(IDS.includes(id as PairingId), id).toBe(true);
  });

  it('negative case: WP-02 against WP-29 is NOT a shared pairing, and a real duplicate IS flagged', () => {
    expect(sharedCompositions(['WP-02', 'WP-29'])).toEqual([]);
    expect(sharedCompositions(['WP-02', 'WP-29', 'WP-01', 'WP-11'])).toEqual([['WP-01', 'WP-11']]);
  });

  it('WP-32 through the screen: the workspace panel says no and implies no removal', async () => {
    await page.viewport(1280, 900);
    const screen = document.createElement('sk-work-package-screen');
    Object.assign(screen, pairingProps('WP-32'));
    const box = document.createElement('div');
    document.body.append(box);
    render(workPackageFrame(html`${screen}`), box);
    await screen.updateComplete;
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    const panel = screen.shadowRoot?.querySelector('[data-region="workspace"]');
    expect(panel).not.toBeNull();
    const words = /remov|delet|missing|gone|cleaned|pruned|destroyed|discarded/i;
    expect(words.test(panel?.textContent ?? '')).toBe(false);
    expect(words.test('Worktree removed')).toBe(true);
  });
});
