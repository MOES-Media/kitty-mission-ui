// Review panel and cancellation notice (WP06, IC-05): the summary, the override notice, the cycles and the cancellation notice,
// drawn through the screen. Omitted, empty and null are separate paired tests; every absence has a present sibling.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkWorkPackageScreen } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import { DETAIL_FIXTURES, WORK_PACKAGE_FIXTURES, pairDetail, pairingProps, workPackageFrame, workPackageProps } from '../src/elements/sk-work-package-screen/fixtures.js';
import type { WpScreenProps } from '../src/elements/sk-work-package-screen/fixtures.js';
import type { ReviewCycle, WorkPackageRecordView } from '../src/contract/types.js';
import {
  ABSENT_MARKER,
  CANCELLED_NOTICE_HEADING,
  CYCLE_NUMBER_LABEL,
  LABEL_LATEST_RESULT,
  NO_CYCLES_TEXT,
  NO_REVIEW_TEXT,
  NO_VERDICT_TEXT,
  OPEN_REVIEW_LABEL,
  OVERRIDE_HEADING,
  OVERRIDE_PARTIAL_NOTE,
  REASON_SOURCE_WORDS,
  REVIEW_TITLE,
  STATE_BADGES,
  VERDICT_BADGES,
} from '../src/defaults/index.js';
import { resolveVerdict } from '../src/logic/index.js';
import type { LabelHooks } from '../src/logic/index.js';

const NOW = '2026-09-24T10:00:00Z';

afterEach(() => {
  document.body.replaceChildren();
});

async function mount(props: Partial<WpScreenProps> & { labels?: LabelHooks | null } = {}, width = 1280): Promise<SkWorkPackageScreen> {
  await page.viewport(width, 900);
  const screen = document.createElement('sk-work-package-screen');
  Object.assign(screen, { ...pairingProps('WP-01'), now: NOW, ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(workPackageFrame(html`${screen}`), box);
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  return screen;
}
function root(el: Element): ShadowRoot {
  if (el.shadowRoot === null) throw new Error('no shadow root');
  return el.shadowRoot;
}
const region = (screen: SkWorkPackageScreen, id: string): HTMLElement | null => root(screen).querySelector<HTMLElement>(`[data-region="${id}"]`);
const must = (screen: SkWorkPackageScreen, id: string): HTMLElement => {
  const found = region(screen, id);
  if (found === null) throw new Error(`no region ${id}`);
  return found;
};
const text = (el: Element | null): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
/** The Review panel: the card whose heading is the Review title. */
const reviewPanel = (screen: SkWorkPackageScreen): HTMLElement => {
  const found = root(screen).querySelector<HTMLElement>('sk-card:not([data-region])');
  if (found === null) throw new Error('no review panel');
  return found;
};
const pair = (wp: WorkPackageRecordView, detailName: keyof typeof DETAIL_FIXTURES, cycles?: 'first' | 'last' | 'none'): Partial<WpScreenProps> => ({
  ...workPackageProps('wpPopulated'),
  workPackage: wp,
  wpId: wp.wpId,
  detail: pairDetail(wp, DETAIL_FIXTURES[detailName], cycles === undefined ? {} : { cycles }),
});
const cyclesOf = (screen: SkWorkPackageScreen): HTMLElement[] => [...must(screen, 'review-cycles').querySelectorAll<HTMLElement>('ol > li')];
const cycle = (n: number, extra: Partial<ReviewCycle> = {}): ReviewCycle => ({
  cycleNumber: n,
  reviewedAt: '2026-09-21T09:15:00+00:00',
  reviewer: 'reviewer-renata',
  verdict: 'changes_requested',
  feedbackReference: `review-cycle://example/WP04/review-cycle-${n}.md`,
  artifactPath: `tasks/WP04/review-cycle-${n}.md`,
  ...extra,
});
const withCycles = (cycles: ReviewCycle[]): Partial<WpScreenProps> => {
  const wp = WORK_PACKAGE_FIXTURES.wpApproved;
  return { ...pair(wp, 'detailPopulated'), detail: { ...pairDetail(wp, DETAIL_FIXTURES.detailPopulated), reviewCycles: cycles } };
};

describe('Review composition: omitted, empty and absent results', () => {
  it('no result and [] cycles: the summary is the empty form AND the cycles wrapper holds the none-found text, both ids present', async () => {
    const screen = await mount(pairingProps('WP-02'));
    expect(text(must(screen, 'review-summary'))).toBe(NO_REVIEW_TEXT);
    expect(must(screen, 'review-summary').querySelectorAll('.sk-empty-state')).toHaveLength(1);
    expect(text(must(screen, 'review-cycles'))).toBe(NO_CYCLES_TEXT);
    expect(cyclesOf(screen)).toHaveLength(0);
    expect(text(reviewPanel(screen).querySelector('h2'))).toBe(REVIEW_TITLE);
  });

  it('a latest result with [] cycles: the summary alone, no review-cycles region and no none-found text (paired with the no-result row)', async () => {
    const screen = await mount(pairingProps('WP-29'));
    expect(region(screen, 'review-cycles')).toBeNull();
    expect(text(reviewPanel(screen))).not.toContain(NO_CYCLES_TEXT);
    expect(text(reviewPanel(screen))).not.toContain(NO_REVIEW_TEXT);
    expect(text(must(screen, 'review-summary'))).toContain(LABEL_LATEST_RESULT);
    document.body.replaceChildren();
    const none = await mount(pairingProps('WP-02'));
    expect(region(none, 'review-cycles')).not.toBeNull();
    expect(text(reviewPanel(none))).toContain(NO_CYCLES_TEXT);
  });

  it('reviewCycles omitted with no result: no cycles region, no none-found claim, the empty summary form only (paired with the empty list)', async () => {
    const wp = WORK_PACKAGE_FIXTURES.wpReviewNone;
    const screen = await mount(pair(wp, 'detailOmittedProvisional'));
    expect('reviewCycles' in DETAIL_FIXTURES.detailOmittedProvisional).toBe(false);
    expect(region(screen, 'review-cycles')).toBeNull();
    expect(text(reviewPanel(screen))).not.toContain(NO_CYCLES_TEXT);
    expect(text(must(screen, 'review-summary'))).toBe(NO_REVIEW_TEXT);
    document.body.replaceChildren();
    const empty = await mount(pair(wp, 'detailNoCycles'));
    expect(region(empty, 'review-cycles')).not.toBeNull();
    expect(text(reviewPanel(empty))).toContain(NO_CYCLES_TEXT);
  });

  it('reviewCycles omitted with a result: the summary only, no cycles region', async () => {
    const screen = await mount(pair(WORK_PACKAGE_FIXTURES.wpApproved, 'detailOmittedProvisional'));
    expect(region(screen, 'review-cycles')).toBeNull();
    expect(text(reviewPanel(screen))).not.toContain(NO_CYCLES_TEXT);
    expect(text(must(screen, 'review-summary'))).toContain(LABEL_LATEST_RESULT);
  });

  it('a Work Package with no detail (null) draws no cycles region and no none-found claim; the same Work Package with a detail draws it', async () => {
    const bare = await mount(workPackageProps('wpReviewNone'));
    expect(region(bare, 'review-cycles')).toBeNull();
    expect(text(reviewPanel(bare))).not.toContain(NO_CYCLES_TEXT);
    expect(text(must(bare, 'review-summary'))).toBe(NO_REVIEW_TEXT);
    document.body.replaceChildren();
    const withDetail = await mount(pairingProps('WP-02'));
    expect(text(reviewPanel(withDetail))).toContain(NO_CYCLES_TEXT);
  });
});

describe('Review summary: the latest result and the override', () => {
  it('shows the reviewer, the verdict as word plus tone and the reference as plain text', async () => {
    const screen = await mount(pairingProps('WP-03'));
    const summary = must(screen, 'review-summary');
    const wp = WORK_PACKAGE_FIXTURES.wpApproved;
    const result = wp.review.latestResult;
    if (result === null) throw new Error('fixture has no latest result');
    const badge = resolveVerdict(result.verdict);
    const pills = summary.querySelectorAll('sk-pill-tag');
    expect(pills).toHaveLength(1);
    expect(text(pills[0] ?? null)).toBe(badge.label);
    expect(pills[0]?.getAttribute('status')).toBe(badge.tone);
    expect(text(summary)).toContain(result.reviewer ?? '');
    expect(text(summary)).toContain(result.reference);
    expect(summary.querySelector('a')).toBeNull();
    expect(summary.querySelector('sk-notice')).toBeNull();
  });

  it('a complete override is a notice with who, when and why; the incompleteness text is NOT drawn', async () => {
    const screen = await mount(workPackageProps('wpOverride'));
    const notices = must(screen, 'review-summary').querySelectorAll('sk-notice');
    expect(notices).toHaveLength(1);
    const override = WORK_PACKAGE_FIXTURES.wpOverride.review.override;
    if (override === null) throw new Error('fixture has no override');
    expect(text(notices[0] ?? null)).toContain(OVERRIDE_HEADING);
    expect(text(notices[0] ?? null)).toContain(override.actor ?? '');
    expect(text(notices[0] ?? null)).toContain(override.reason ?? '');
    expect(text(notices[0] ?? null)).not.toContain(OVERRIDE_PARTIAL_NOTE);
    expect(text(notices[0] ?? null)).not.toContain(ABSENT_MARKER);
  });

  it('a partial override shows the absent marker for blank members and says the merge gate stays blocked', async () => {
    const screen = await mount(workPackageProps('wpOverridePartial'));
    const notice = must(screen, 'review-summary').querySelector('sk-notice');
    expect(notice).not.toBeNull();
    expect(text(notice)).toContain(OVERRIDE_PARTIAL_NOTE);
    expect(WORK_PACKAGE_FIXTURES.wpOverridePartial.review.override?.reason).toBeNull();
    expect(text(notice)).toContain(ABSENT_MARKER);
    expect(text(notice)).not.toContain('undefined');
    expect(text(notice)).not.toContain('null');
  });

  it('an override without a latest result still draws the notice and no empty-form text', async () => {
    const wp: WorkPackageRecordView = { ...WORK_PACKAGE_FIXTURES.wpOverride, review: { latestResult: null, override: WORK_PACKAGE_FIXTURES.wpOverride.review.override } };
    const screen = await mount({ ...workPackageProps('wpOverride'), workPackage: wp });
    expect(must(screen, 'review-summary').querySelectorAll('sk-notice')).toHaveLength(1);
    expect(text(must(screen, 'review-summary'))).not.toContain(NO_REVIEW_TEXT);
    expect(text(must(screen, 'review-summary'))).not.toContain(LABEL_LATEST_RESULT);
  });

  it('a null reviewer shows the absent marker; a foreign verdict shows its raw text with the neutral tone, never undefined', async () => {
    const base = WORK_PACKAGE_FIXTURES.wpApproved;
    const wp: WorkPackageRecordView = { ...base, review: { latestResult: { reviewer: null, verdict: 'needs_coffee', reference: 'ref://x' } as never, override: null } };
    const screen = await mount({ ...workPackageProps('wpApproved'), workPackage: wp });
    const summary = must(screen, 'review-summary');
    expect(text(summary)).toContain(ABSENT_MARKER);
    expect(text(summary)).toContain('needs_coffee');
    expect(summary.querySelector('sk-pill-tag')?.getAttribute('status')).toBe('neutral');
    expect(text(summary)).not.toContain('undefined');
  });
});

describe('Review cycles', () => {
  it('draws one li per cycle in the order the contract gives, with the number, verdict word and tone, reviewer, time and reference', async () => {
    const screen = await mount(pairingProps('WP-28'));
    const rows = cyclesOf(screen);
    const given = DETAIL_FIXTURES.detailPopulated.reviewCycles ?? [];
    expect(given).toHaveLength(2);
    expect(rows).toHaveLength(2);
    given.forEach((c, index) => {
      const row = rows[index] as HTMLElement;
      const badge = resolveVerdict(c.verdict);
      expect(text(row)).toContain(CYCLE_NUMBER_LABEL(c.cycleNumber));
      expect(text(row.querySelector('sk-pill-tag'))).toBe(badge.label);
      expect(row.querySelector('sk-pill-tag')?.getAttribute('status')).toBe(badge.tone);
      expect(text(row)).toContain(c.reviewer ?? '');
      expect(text(row)).toContain(c.feedbackReference ?? '');
    });
    expect(text(rows[0] ?? null)).not.toBe(text(rows[1] ?? null));
  });

  it('cycles given in DESCENDING number keep the array order (no sort, no comparison)', async () => {
    const screen = await mount(withCycles([cycle(3), cycle(1), cycle(2)]));
    const rows = cyclesOf(screen);
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => /Cycle (\d+)/.exec(text(row))?.[1])).toEqual(['3', '1', '2']);
  });

  it('"Open review" is drawn only for a non-null artifact path, named per cycle; a null path draws no control at all', async () => {
    const screen = await mount(withCycles([cycle(1), cycle(2, { artifactPath: null })]));
    const [first, second] = cyclesOf(screen) as [HTMLElement, HTMLElement];
    const buttons = first.querySelectorAll('sk-button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.getAttribute('label')).toBe(OPEN_REVIEW_LABEL(1));
    expect(text(buttons[0] ?? null)).toBe('Open review');
    expect(buttons[0]?.getAttribute('variant')).toBe('secondary');
    expect(buttons[0]?.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(buttons[0]?.hasAttribute('disabled')).toBe(false);
    expect(second.querySelectorAll('sk-button')).toHaveLength(0);
    expect(second.querySelectorAll('button, a')).toHaveLength(0);
    expect(text(second)).not.toContain('Open review');
  });

  it('two cycles with paths give two distinct accessible names', async () => {
    const screen = await mount(pairingProps('WP-28'));
    const names = [...must(screen, 'review-cycles').querySelectorAll('sk-button')].map((button) => button.getAttribute('label'));
    expect(names).toEqual([OPEN_REVIEW_LABEL(1), OPEN_REVIEW_LABEL(2)]);
  });

  it('a cycle with every nullable member null (WP-30) draws absent markers only and no "Open review"; a null verdict reads as the no-verdict text', async () => {
    const screen = await mount(pairingProps('WP-30'));
    const rows = cyclesOf(screen);
    expect(rows).toHaveLength(1);
    const row = rows[0] as HTMLElement;
    expect(text(row)).toContain(CYCLE_NUMBER_LABEL(2));
    expect(text(row)).toContain(NO_VERDICT_TEXT);
    expect(text(row).split(ABSENT_MARKER).length - 1).toBeGreaterThanOrEqual(2);
    expect(row.querySelectorAll('sk-button')).toHaveLength(0);
    expect(text(row)).not.toContain('undefined');
    expect(text(row)).not.toContain('null');
    // positive control: a populated cycle on the same screen path has the control
    document.body.replaceChildren();
    const populated = await mount(pairingProps('WP-28'));
    expect(must(populated, 'review-cycles').querySelectorAll('sk-button').length).toBeGreaterThan(0);
  });

  it('a foreign verdict in a cycle shows its raw text with the neutral tone; the known words come from the table', async () => {
    const known = Object.keys(VERDICT_BADGES)[0] as string;
    const screen = await mount(withCycles([cycle(1, { verdict: 'needs_coffee' } as unknown as Partial<ReviewCycle>), cycle(2, { verdict: known } as unknown as Partial<ReviewCycle>)]));
    const [foreign, table] = cyclesOf(screen) as [HTMLElement, HTMLElement];
    expect(text(foreign.querySelector('sk-pill-tag'))).toBe('needs_coffee');
    expect(foreign.querySelector('sk-pill-tag')?.getAttribute('status')).toBe('neutral');
    expect(text(table.querySelector('sk-pill-tag'))).toBe(resolveVerdict(known).label);
    expect(text(foreign)).not.toContain('undefined');
  });

  it('latest result and cycles are shown without reconciling them (N-4): a disagreement is drawn as given', async () => {
    const screen = await mount(pair(WORK_PACKAGE_FIXTURES.wpApproved, 'detailPopulated', 'first'));
    const first = cyclesOf(screen);
    expect(first).toHaveLength(1);
    expect(text(first[0] ?? null)).toContain(resolveVerdict('changes_requested').label);
    expect(text(must(screen, 'review-summary'))).toContain(resolveVerdict(WORK_PACKAGE_FIXTURES.wpApproved.review.latestResult?.verdict ?? null).label);
  });
});

describe('Cancellation notice', () => {
  it('an operator reason is drawn with its source in words; the notice is above the Review panel', async () => {
    const screen = await mount(workPackageProps('wpCanceled'));
    const notice = must(screen, 'cancellation');
    const cancellation = WORK_PACKAGE_FIXTURES.wpCanceled.cancellation;
    if (cancellation === null) throw new Error('fixture has no cancellation');
    expect(notice.querySelectorAll('sk-notice')).toHaveLength(1);
    expect(text(notice)).toContain(CANCELLED_NOTICE_HEADING);
    expect(text(notice)).toContain(cancellation.reason ?? '');
    expect(text(notice)).toContain(REASON_SOURCE_WORDS[cancellation.reasonSource] ?? '');
    expect(notice.compareDocumentPosition(reviewPanel(screen)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('a synthetic reason names the tool as its source; a null reason draws no made-up text and no empty reason element', async () => {
    const synthetic = await mount(workPackageProps('wpCanceledSynthetic'));
    const syntheticCancellation = WORK_PACKAGE_FIXTURES.wpCanceledSynthetic.cancellation;
    expect(text(must(synthetic, 'cancellation'))).toContain(REASON_SOURCE_WORDS[syntheticCancellation?.reasonSource ?? ''] ?? '');
    expect(text(must(synthetic, 'cancellation'))).toContain(syntheticCancellation?.reason ?? '');
    document.body.replaceChildren();
    const nullReason = await mount(workPackageProps('wpCanceledNullReason'));
    const notice = must(nullReason, 'cancellation');
    expect(WORK_PACKAGE_FIXTURES.wpCanceledNullReason.cancellation?.reason).toBeNull();
    expect(text(notice)).toContain(CANCELLED_NOTICE_HEADING);
    expect(text(notice)).not.toContain('null');
    expect(text(notice)).not.toContain('undefined');
    expect(notice.querySelectorAll('[data-reason]')).toHaveLength(0);
    expect(text(notice)).not.toContain(ABSENT_MARKER);
  });

  it('the notice draws the canceled lane word and tone from the lane tables, and from the host state hook when it has one (DW-22, FR-020)', async () => {
    const lane = WORK_PACKAGE_FIXTURES.wpCanceled.statusLane ?? '';
    const table = STATE_BADGES[lane];
    expect(table).toBeDefined();
    const byDefault = await mount(workPackageProps('wpCanceled'));
    const notice = must(byDefault, 'cancellation').querySelector('sk-notice');
    const pill = must(byDefault, 'cancellation').querySelector('sk-pill-tag');
    expect(notice?.getAttribute('tone')).toBe(table?.tone);
    expect(pill?.getAttribute('status')).toBe(table?.tone);
    expect(text(pill)).toBe(table?.label);
    document.body.replaceChildren();
    // A hook whose tone differs from the table's: a fixed tone or a fixed word cannot pass.
    const calls: string[] = [];
    const hooked = await mount({
      ...workPackageProps('wpCanceled'),
      labels: {
        state: (l) => {
          calls.push(l);
          return { label: 'Dropped by us', tone: 'danger' };
        },
      },
    });
    const hookedNotice = must(hooked, 'cancellation').querySelector('sk-notice');
    expect(calls).toContain(lane);
    expect(hookedNotice?.getAttribute('tone')).toBe('danger');
    expect(text(must(hooked, 'cancellation').querySelector('sk-pill-tag'))).toBe('Dropped by us');
    expect(table?.tone).not.toBe('danger');
  });

  it('a Work Package that is not canceled draws no cancellation region (paired with the canceled one)', async () => {
    const plain = await mount(workPackageProps('wpPopulated'));
    expect(region(plain, 'cancellation')).toBeNull();
    expect(text(root(plain) as unknown as Element)).not.toContain(CANCELLED_NOTICE_HEADING);
    document.body.replaceChildren();
    const canceled = await mount(workPackageProps('wpCanceled'));
    expect(region(canceled, 'cancellation')).not.toBeNull();
  });
});
