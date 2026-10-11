// The Ops page parts (WP06, IC-05): the header, the source notice, the section heading with its count badge and profile fact,
// Load more, the skipped note and the load-more error. The part is rendered on its own with a view-model and handlers (it
// dispatches nothing); the count, the skipped sentence and the profile fact are also read through the screen.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { html, render } from 'lit';
import '@spec-kitty/tokens';
import '../src/index.js';
import type { SkOpsScreen } from '../src/elements/sk-ops-screen/sk-ops-screen.js';
import { renderOpsPage } from '../src/elements/sk-ops-screen/ops-page-parts.js';
import type { OpsPageHandlers, OpsPageView } from '../src/elements/sk-ops-screen/ops-page-parts.js';
import { Op17, Op28 } from '../src/elements/sk-ops-screen/sk-ops-screen.paging.stories.js';
import { project as contractProject } from '../src/contract/fixtures.generated.js';
import { OPS_COPY } from '../src/defaults/ops-copy.js';
import { OPS_PAGE_FIXTURES, OPS_PROFILE, opsProps } from '../src/elements/sk-ops-screen/fixtures.js';
import type { OpsScreenProps } from '../src/elements/sk-ops-screen/fixtures.js';

afterEach(() => {
  document.body.replaceChildren();
});

const VIEW: OpsPageView = {
  eyebrow: 'Eyebrow text',
  title: 'Title text',
  badge: 'Badge text',
  supporting: null,
  notice: 'Notice text',
  sectionEyebrow: 'Section eyebrow',
  sectionHeading: 'Section heading',
  countText: '6 of 249',
  profileFact: null,
  skippedNote: null,
  loadMore: null,
  loadMoreError: null,
};

interface Calls {
  loadMore: number;
  retry: number;
}

function draw(view: Partial<OpsPageView>): { host: HTMLElement; calls: Calls } {
  const calls: Calls = { loadMore: 0, retry: 0 };
  const handlers: OpsPageHandlers = {
    onLoadMore: () => {
      calls.loadMore += 1;
    },
    onRetry: () => {
      calls.retry += 1;
    },
  };
  const host = document.createElement('div');
  document.body.append(host);
  render(renderOpsPage({ ...VIEW, ...view }, handlers, html`<li data-stub-row>row</li>`), host);
  return { host, calls };
}

const q = (host: Element, selector: string): Element | null => host.querySelector(selector);
const text = (host: Element, selector: string): string => (q(host, selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();

async function settle(screen: SkOpsScreen): Promise<void> {
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}

async function mount(props: Partial<OpsScreenProps>, width = 1280): Promise<SkOpsScreen> {
  await page.viewport(width, 900);
  const screen = document.createElement('sk-ops-screen');
  Object.assign(screen, props);
  document.body.append(screen);
  await settle(screen);
  return screen;
}

const inside = (screen: SkOpsScreen, selector: string): Element | null => screen.shadowRoot?.querySelector(selector) ?? null;
const insideText = (screen: SkOpsScreen, selector: string): string => (inside(screen, selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('the page header', () => {
  it('draws the eyebrow, the title as the one h1 and the badge as page-header content', () => {
    const { host } = draw({});
    const header = q(host, 'sk-page-header');
    expect(header).not.toBeNull();
    expect(text(host, '[slot="eyebrow"]')).toBe('Eyebrow text');
    expect(host.querySelectorAll('h1')).toHaveLength(1);
    expect(q(host, 'h1')?.getAttribute('slot')).toBe('title');
    expect(text(host, 'h1')).toBe('Title text');
    const badge = q(host, '[data-read-only]');
    expect(badge?.tagName.toLowerCase()).toBe('sk-pill-tag');
    expect(badge?.textContent?.trim()).toBe('Badge text');
    expect(header?.contains(badge ?? null)).toBe(true);
  });

  it('names the project in a muted supporting line only when one is supplied (paired)', () => {
    const named = draw({ supporting: 'Sample Project' });
    expect(text(named.host, '[slot="supporting"]')).toBe('Sample Project');
    const absent = draw({ supporting: null });
    expect(absent.host.querySelectorAll('[slot="supporting"]')).toHaveLength(0);
    const blank = draw({ supporting: '' });
    expect(blank.host.querySelectorAll('[slot="supporting"]')).toHaveLength(0);
  });

  it('through the screen: the header reads the default copy', async () => {
    const screen = await mount(opsProps.ready());
    expect(insideText(screen, 'sk-page-header [slot="eyebrow"]')).toBe(OPS_COPY.headerEyebrow);
    expect(insideText(screen, 'h1')).toBe(OPS_COPY.headerTitle);
    expect(insideText(screen, '[data-read-only]')).toBe(OPS_COPY.headerBadge);
  });

  it('through the screen: the project name is the one supporting line when a project is set, and no line is drawn when it is null (paired)', async () => {
    const named = await mount({ ...opsProps.ready(), project: { ...contractProject, name: 'sample-project' } });
    const lines = named.shadowRoot?.querySelectorAll('sk-page-header [slot="supporting"]');
    expect(lines).toHaveLength(1);
    expect(lines?.[0]?.textContent?.trim()).toBe('sample-project · invocation records');
    const none = await mount({ ...opsProps.ready(), project: null });
    expect(none.shadowRoot?.querySelectorAll('sk-page-header [slot="supporting"]')).toHaveLength(0);
    // The line follows the property: set it, then clear it, then set another name.
    named.project = null;
    await settle(named);
    expect(named.shadowRoot?.querySelectorAll('sk-page-header [slot="supporting"]')).toHaveLength(0);
    named.project = { ...contractProject, name: 'other-project' };
    await settle(named);
    expect(insideText(named, 'sk-page-header [slot="supporting"]')).toBe('other-project · invocation records');
    expect(named.shadowRoot?.querySelectorAll('sk-page-header [slot="supporting"]')).toHaveLength(1);
  });

  it('through the screen: a project with an empty name draws no supporting line, not a lone separator (paired with a named one)', async () => {
    const blank = await mount({ ...opsProps.ready(), project: { ...contractProject, name: '' } });
    expect(blank.shadowRoot?.querySelectorAll('sk-page-header [slot="supporting"]')).toHaveLength(0);
    expect(blank.shadowRoot?.querySelector('sk-page-header')?.textContent).not.toContain('invocation records');
    const named = await mount({ ...opsProps.ready(), project: { ...contractProject, name: 'p' } });
    expect(insideText(named, 'sk-page-header [slot="supporting"]')).toBe('p · invocation records');
  });

  it('through the screen: the separator of the supporting line is copy too, overridable through labels.copy (paired)', async () => {
    expect(OPS_COPY.headerSeparator).toBe(' · ');
    const reworded = document.createElement('sk-ops-screen');
    Object.assign(reworded, { ...opsProps.ready(), project: { ...contractProject, name: 'p' }, labels: { copy: (key: string) => (key === 'headerSeparator' ? ' / ' : undefined) } });
    document.body.append(reworded);
    await settle(reworded);
    expect(insideText(reworded, 'sk-page-header [slot="supporting"]')).toBe('p / invocation records');
  });

  it('through the screen: the tail of the supporting line is copy, overridable through labels.copy, and the override emits nothing (paired)', async () => {
    const base = { ...opsProps.ready(), project: { ...contractProject, name: 'sample-project' } };
    const plain = await mount(base);
    expect(OPS_COPY.headerSupportingTail).toBe('invocation records');
    expect(insideText(plain, 'sk-page-header [slot="supporting"]')).toBe('sample-project · invocation records');
    const events: CustomEvent[] = [];
    const reworded = document.createElement('sk-ops-screen');
    Object.assign(reworded, { ...base, labels: { copy: (key: string) => (key === 'headerSupportingTail' ? 'read from disk' : undefined) } });
    for (const name of ['sk-load-more', 'sk-retry-load']) reworded.addEventListener(name, (event) => events.push(event as CustomEvent));
    document.body.append(reworded);
    await settle(reworded);
    expect(insideText(reworded, 'sk-page-header [slot="supporting"]')).toBe('sample-project · read from disk');
    expect(events).toEqual([]);
    // Positive control: the same element does emit when the load-more control is pressed.
    reworded.shadowRoot?.querySelector<HTMLElement>('[data-load-more]')?.click();
    await settle(reworded);
    expect(events).toHaveLength(1);
    const [fired] = events as [CustomEvent];
    expect(fired.type).toBe('sk-load-more');
    expect(fired.detail).toEqual({ cursor: OPS_PAGE_FIXTURES.opsPageFirst.pageInfo.nextPageCursor });
    // A copy hook for another key leaves the tail alone (control).
    const other = document.createElement('sk-ops-screen');
    Object.assign(other, { ...base, labels: { copy: (key: string) => (key === 'headerTitle' ? 'Other' : undefined) } });
    document.body.append(other);
    await settle(other);
    expect(insideText(other, 'sk-page-header [slot="supporting"]')).toBe('sample-project · invocation records');
  });

  it('through the screen: the ready look draws exactly one header', async () => {
    const ready = await mount({ ...opsProps.ready(), project: { ...contractProject, name: 'sample-project' } });
    expect(ready.shadowRoot?.querySelectorAll('sk-page-header')).toHaveLength(1);
  });
});

describe('the page badges: the outlined mono badge of the prototype, aligned to the heading (Ops G-3)', () => {
  /** The computed style a probe gets from the given declarations, so the expectation is the token and never a literal. */
  function probe(screen: SkOpsScreen, declarations: string): CSSStyleDeclaration {
    const element = document.createElement('span');
    element.style.cssText = declarations;
    screen.shadowRoot?.append(element);
    const computed = getComputedStyle(element);
    const copy = {
      fontFamily: computed.fontFamily,
      fontWeight: computed.fontWeight,
      borderTopColor: computed.borderTopColor,
    } as CSSStyleDeclaration;
    element.remove();
    return copy;
  }
  const tagOf = (pill: Element | null): HTMLElement => {
    const found = pill?.shadowRoot?.querySelector<HTMLElement>('[part="tag"]');
    if (found === null || found === undefined) throw new Error('no tag part');
    return found;
  };

  it('marks exactly the "Read only" and the count pills, and the section heading, with the pinned attributes', async () => {
    const { host } = draw({});
    // BOUNDARY-005: the page pills have their own attribute, so the row badge's rules (data-ops-badge) never reach them.
    const badges = host.querySelectorAll('[data-ops-page-badge]');
    expect(badges).toHaveLength(2);
    expect([...badges].map((badge) => badge.tagName.toLowerCase())).toEqual(['sk-pill-tag', 'sk-pill-tag']);
    expect(q(host, '[data-read-only]')?.hasAttribute('data-ops-page-badge')).toBe(true);
    expect(q(host, '[data-count]')?.hasAttribute('data-ops-page-badge')).toBe(true);
    expect(host.querySelectorAll('[data-ops-badge]')).toHaveLength(0);
    expect(host.querySelectorAll('sk-section-header[data-ops-section-head]')).toHaveLength(1);
    expect(host.querySelectorAll('sk-pill-tag:not([data-ops-page-badge])')).toHaveLength(0);
  });

  it('the row badge rules and the page pill rules do not reach each other\'s pills (BOUNDARY-005)', async () => {
    const screen = await mount(opsProps.ready());
    const plain = document.createElement('sk-pill-tag');
    plain.textContent = 'plain';
    screen.shadowRoot?.append(plain);
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    const library = getComputedStyle(tagOf(plain));
    const OWN = ['display', 'overflow', 'textOverflow', 'whiteSpace', 'paddingTop', 'paddingBottom', 'boxSizing'] as const;
    const pick = (style: CSSStyleDeclaration): Record<string, string> => Object.fromEntries(OWN.map((key) => [key, style[key]]));
    // the count pill keeps the library's own display and block padding: the row badge's rule does not reach it
    const count = getComputedStyle(tagOf(inside(screen, '[data-count]')));
    expect(pick(count)).toEqual(pick(library));
    const readOnly = getComputedStyle(tagOf(inside(screen, '[data-read-only]')));
    expect(pick(readOnly)).toEqual(pick(library));
    // positive control: the row badge does take its own rule (a block part, clipped, with block padding)
    const row = getComputedStyle(tagOf(inside(screen, 'li[data-row-id] [data-ops-badge]')));
    expect([row.display, row.overflow, row.whiteSpace]).toEqual(['block', 'hidden', 'nowrap']);
    expect(pick(row)).not.toEqual(pick(library));
    // the row badge's font weight is its own (inherited from its host), not the page rule's token
    const badge = inside(screen, 'li[data-row-id] [data-ops-badge]') as HTMLElement;
    badge.style.fontWeight = '700';
    expect(getComputedStyle(tagOf(badge)).fontWeight).toBe('700');
    // and the page pill's weight is the page rule's token, whatever its host sets
    const countHost = inside(screen, '[data-count]') as HTMLElement;
    countHost.style.fontWeight = '700';
    const normal = probe(screen, 'font-weight: var(--sk-weight-normal);').fontWeight;
    expect(getComputedStyle(tagOf(countHost)).fontWeight).toBe(normal);
    expect(normal).not.toBe('700');
    plain.remove();
  });

  it('draws both pills with the outline, the mono font and a 1.2 line height (and the plain library pill does not)', async () => {
    const screen = await mount(opsProps.ready());
    const mono = probe(screen, 'font-family: var(--sk-font-mono); font-weight: var(--sk-weight-normal); border: var(--sk-border-width-1) solid var(--sk-border-default);');
    let checked = 0;
    for (const selector of ['[data-read-only]', '[data-count]']) {
      const tag = tagOf(inside(screen, selector));
      const style = getComputedStyle(tag);
      expect(style.borderTopStyle, selector).toBe('solid');
      expect(style.borderTopWidth, selector).toBe('1px');
      expect(style.borderTopColor, selector).toBe(mono.borderTopColor);
      expect(style.fontFamily, selector).toBe(mono.fontFamily);
      expect(style.fontWeight, selector).toBe(mono.fontWeight);
      expect(style.fontVariantNumeric, selector).toBe('tabular-nums');
      expect(Number.parseFloat(style.lineHeight), selector).toBeCloseTo(Number.parseFloat(style.fontSize) * 1.2, 1);
      checked += 1;
    }
    expect(checked).toBe(2);
    // Positive control: a library pill the screen did not mark keeps the library look (no border, not the mono font).
    const plain = document.createElement('sk-pill-tag');
    plain.textContent = 'plain';
    screen.shadowRoot?.append(plain);
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    const plainStyle = getComputedStyle(tagOf(plain));
    expect(plainStyle.borderTopStyle).toBe('none');
    expect(plainStyle.fontFamily).not.toBe(mono.fontFamily);
    plain.remove();
  });

  it('centres the count pill on the heading row, not on the empty description row below it', async () => {
    const screen = await mount(opsProps.ready());
    const pill = inside(screen, '[data-count]')?.getBoundingClientRect();
    const heading = inside(screen, 'h2')?.getBoundingClientRect();
    if (pill === undefined || heading === undefined) throw new Error('missing box');
    expect(Math.abs(pill.y + pill.height / 2 - (heading.y + heading.height / 2))).toBeLessThanOrEqual(1);
    // With a profile fact the description row exists and the pill still sits on the heading row.
    const rows = OPS_PAGE_FIXTURES.opsPageFirst.items.map((item) => ({ ...structuredClone(item), profileId: OPS_PROFILE }));
    const filtered = await mount({ ...opsProps.ready(), profile: OPS_PROFILE, items: rows });
    const pill2 = inside(filtered, '[data-count]')?.getBoundingClientRect();
    const heading2 = inside(filtered, 'h2')?.getBoundingClientRect();
    if (pill2 === undefined || heading2 === undefined) throw new Error('missing box');
    expect(Math.abs(pill2.y + pill2.height / 2 - (heading2.y + heading2.height / 2))).toBeLessThanOrEqual(1);
  });
});

describe('the source notice', () => {
  it('is one neutral sk-notice with the given sentence and no path or format', () => {
    const { host } = draw({ notice: OPS_COPY.sourceNotice });
    const notices = host.querySelectorAll('[data-source-notice]');
    expect(notices).toHaveLength(1);
    expect(notices[0]?.tagName.toLowerCase()).toBe('sk-notice');
    expect(notices[0]?.getAttribute('tone')).toBe('neutral');
    expect(notices[0]?.getAttribute('announce')).toBe('off');
    expect(notices[0]?.textContent?.trim()).toBe(OPS_COPY.sourceNotice);
    expect(OPS_COPY.sourceNotice).not.toMatch(/jsonl|kitty-ops|\.yaml|\//);
  });
});

describe('the section heading, the count badge and the profile fact', () => {
  it('draws the eyebrow, an h2 that is a programmatic focus target, and the count badge', () => {
    const { host } = draw({});
    expect(text(host, '[data-section-eyebrow]')).toBe('Section eyebrow');
    const headings = host.querySelectorAll('h2');
    expect(headings).toHaveLength(1);
    expect(headings[0]?.getAttribute('tabindex')).toBe('-1');
    expect(headings[0]?.hasAttribute('data-focus-target')).toBe(true);
    expect(headings[0]?.textContent?.trim()).toBe('Section heading');
    expect(q(host, '[data-count]')?.tagName.toLowerCase()).toBe('sk-pill-tag');
    expect(text(host, '[data-count]')).toBe('6 of 249');
  });

  it('prints a profile fact only when one is given, without a control or an event hook (paired)', () => {
    const shown = draw({ profileFact: 'Profile: architect-alphonso' });
    const fact = shown.host.querySelectorAll('[data-profile-fact]');
    expect(fact).toHaveLength(1);
    expect(fact[0]?.textContent?.trim()).toBe('Profile: architect-alphonso');
    expect(fact[0]?.closest('h2')).toBeNull();
    expect(fact[0]?.querySelectorAll('button, sk-button, a, input, [tabindex], sk-pill-tag')).toHaveLength(0);
    const none = draw({ profileFact: null });
    expect(none.host.querySelectorAll('[data-profile-fact]')).toHaveLength(0);
  });

  it('through the screen: the badge is "6 of 249" for the first page, "{n} records" when all are loaded, and the total as given when smaller', async () => {
    const first = await mount(opsProps.ready());
    expect(first.items).toHaveLength(OPS_PAGE_FIXTURES.opsPageFirst.items.length);
    expect(insideText(first, '[data-count]')).toBe(`${first.items.length} of ${OPS_PAGE_FIXTURES.opsPageFirst.totalCount}`);
    const six = await mount({ ...opsProps.longPage(6), totalCount: 249 });
    expect(six.items).toHaveLength(6);
    expect(insideText(six, '[data-count]')).toBe('6 of 249');
    const last = await mount(opsProps.lastPage());
    expect(insideText(last, '[data-count]')).toBe(`${last.items.length} of ${OPS_PAGE_FIXTURES.opsPageLast.totalCount}`);
    const all = await mount({ ...opsProps.longPage(6), totalCount: 6, pageInfo: { hasNextPage: false, nextPageCursor: null, pageSize: 50 } });
    expect(insideText(all, '[data-count]')).toBe('6 records');
    const one = await mount({ ...opsProps.longPage(1), totalCount: 1 });
    expect(insideText(one, '[data-count]')).toBe('1 record');
    const lagging = await mount({ ...opsProps.longPage(6), totalCount: 2 });
    expect(insideText(lagging, '[data-count]')).toBe('6 of 2');
    // Nothing flags a lag: no extra notice, no extra pill beyond the header's and the count's.
    // The rows carry their own status pills (WP05); the two page pills are the ones outside a row.
    const pagePills = [...(lagging.shadowRoot?.querySelectorAll('sk-pill-tag') ?? [])].filter((pill) => pill.closest('[data-ops-row]') === null);
    expect(pagePills).toHaveLength(2);
    expect(pagePills.map((pill) => pill.hasAttribute('data-read-only') || pill.hasAttribute('data-count'))).toEqual([true, true]);
    expect(lagging.shadowRoot?.querySelectorAll('sk-notice')).toHaveLength(1);
  });

  it('through the screen: the profile fact appears with a profile and not without (paired)', async () => {
    // Rows of another profile with a profile set are the loading look (OP-35): the page, and so its fact, is not drawn.
    const disagreeing = await mount(opsProps.mismatchedProfile());
    expect(disagreeing.shadowRoot?.querySelectorAll('[data-profile-fact]')).toHaveLength(0);
    const rows = OPS_PAGE_FIXTURES.opsPageFirst.items.map((item) => ({ ...structuredClone(item), profileId: OPS_PROFILE }));
    const shown = await mount({ ...opsProps.ready(), profile: OPS_PROFILE, items: rows });
    expect(insideText(shown, '[data-profile-fact]')).toBe(`Profile: ${OPS_PROFILE}`);
    const plain = await mount(opsProps.ready());
    expect(plain.shadowRoot?.querySelectorAll('[data-profile-fact]')).toHaveLength(0);
  });
});

describe('the paging stories show what their rows promise', () => {
  it('OP-17 is a last page whose badge reads loaded equals total ("6 records"), with no Load more', async () => {
    const screen = await mount(Op17.args as Partial<OpsScreenProps>);
    expect(screen.items).toHaveLength(6);
    expect(insideText(screen, '[data-count]')).toBe('6 records');
    expect(screen.shadowRoot?.querySelectorAll('[data-load-more]')).toHaveLength(0);
  });

  it('OP-28 shows 200 rows against a larger total while a next page exists', async () => {
    const screen = await mount(Op28.args as Partial<OpsScreenProps>);
    expect(screen.items).toHaveLength(200);
    expect(screen.totalCount).toBeGreaterThan(200);
    expect(insideText(screen, '[data-count]')).toBe(`200 of ${screen.totalCount}`);
    expect(screen.shadowRoot?.querySelectorAll('[data-load-more]')).toHaveLength(1);
  });
});

describe('the rows slot and the list', () => {
  it('draws the given rows in one list, then the paging controls after it', () => {
    const { host } = draw({ loadMore: { label: 'Load more', busy: false } });
    const lists = host.querySelectorAll('ul');
    expect(lists).toHaveLength(1);
    expect(lists[0]?.querySelectorAll('[data-stub-row]')).toHaveLength(1);
    const control = q(host, '[data-load-more]');
    expect(control).not.toBeNull();
    expect(lists[0]?.contains(control ?? null)).toBe(true);
  });
});

describe('Load more', () => {
  it('is a secondary sk-button in a list item, calls onLoadMore once on a click and is not busy at rest', () => {
    const { host, calls } = draw({ loadMore: { label: 'Load more', busy: false } });
    const controls = host.querySelectorAll('[data-load-more]');
    expect(controls).toHaveLength(1);
    const control = controls[0] as HTMLElement;
    expect(control.tagName.toLowerCase()).toBe('sk-button');
    expect(control.getAttribute('variant')).toBe('secondary');
    expect(control.hasAttribute('busy')).toBe(false);
    expect(control.textContent?.trim()).toBe('Load more');
    const item = control.closest('li');
    expect(item?.getAttribute('aria-busy')).toBe('false');
    expect(calls.loadMore).toBe(0);
    control.click();
    expect(calls.loadMore).toBe(1);
    expect(calls.retry).toBe(0);
  });

  it('is busy and its list item aria-busy while loading, and the click still reaches the handler (the screen guards it)', () => {
    const { host, calls } = draw({ loadMore: { label: 'Load more', busy: true } });
    const control = q(host, '[data-load-more]') as HTMLElement;
    expect(control.hasAttribute('busy')).toBe(true);
    expect(control.closest('li')?.getAttribute('aria-busy')).toBe('true');
    control.click();
    expect(calls.loadMore).toBe(1);
  });

  it('is not drawn when the view has none, with the paired control present in the sibling fixture', () => {
    expect(draw({ loadMore: null }).host.querySelectorAll('[data-load-more]')).toHaveLength(0);
    expect(draw({ loadMore: { label: 'Load more', busy: false } }).host.querySelectorAll('[data-load-more]')).toHaveLength(1);
  });

  it('through the screen: shown with a next page and a cursor, absent on the last page and with a null cursor (paired)', async () => {
    const withNext = await mount(opsProps.ready());
    expect(withNext.shadowRoot?.querySelectorAll('[data-load-more]')).toHaveLength(1);
    const last = await mount(opsProps.lastPage());
    expect(last.shadowRoot?.querySelectorAll('[data-load-more]')).toHaveLength(0);
    // The last page says nothing about the end: no extra text beyond the count badge.
    expect(last.shadowRoot?.textContent).not.toMatch(/end of|no more|all records/i);
    const nullCursor = await mount({ ...opsProps.ready(), pageInfo: { hasNextPage: true, nextPageCursor: null, pageSize: 50 } });
    expect(nullCursor.shadowRoot?.querySelectorAll('[data-load-more]')).toHaveLength(0);
  });

  it('through the screen: a load-more error replaces Load more even though a next page exists (paired with the ready look)', async () => {
    const failed = await mount(opsProps.loadMoreError(null));
    expect(failed.pageInfo?.hasNextPage).toBe(true);
    expect(failed.pageInfo?.nextPageCursor).not.toBeNull();
    expect(failed.shadowRoot?.querySelectorAll('[data-load-more]')).toHaveLength(0);
    expect(failed.shadowRoot?.querySelectorAll('[data-load-more-error]')).toHaveLength(1);
    const ready = await mount(opsProps.ready());
    expect(ready.shadowRoot?.querySelectorAll('[data-load-more]')).toHaveLength(1);
    expect(ready.shadowRoot?.querySelectorAll('[data-load-more-error]')).toHaveLength(0);
  });

  it('through the screen: the busy state follows loadingMore and the list item carries aria-busy', async () => {
    const idle = await mount(opsProps.ready());
    expect(inside(idle, '[data-load-more]')?.hasAttribute('busy')).toBe(false);
    expect(inside(idle, '[data-load-more]')?.closest('li')?.getAttribute('aria-busy')).toBe('false');
    const busy = await mount(opsProps.loadingMore());
    expect(inside(busy, '[data-load-more]')?.hasAttribute('busy')).toBe(true);
    expect(inside(busy, '[data-load-more]')?.closest('li')?.getAttribute('aria-busy')).toBe('true');
  });
});

describe('the skipped note', () => {
  it('is one quiet neutral sk-notice below the list when given, and absent when null (paired)', () => {
    const shown = draw({ skippedNote: '3 records in this project could not be read and are not shown.' });
    const notes = shown.host.querySelectorAll('[data-skipped-note]');
    expect(notes).toHaveLength(1);
    expect(notes[0]?.tagName.toLowerCase()).toBe('sk-notice');
    expect(notes[0]?.getAttribute('announce')).toBe('off');
    expect(notes[0]?.textContent?.trim()).toBe('3 records in this project could not be read and are not shown.');
    expect(shown.host.querySelector('ul')?.contains(notes[0] ?? null)).toBe(false);
    expect(draw({ skippedNote: null }).host.querySelectorAll('[data-skipped-note]')).toHaveLength(0);
  });

  it('through the screen: singular and plural sentences say "in this project", never "for this profile"; none at 0', async () => {
    const counts = [0, 1, 3];
    let ran = 0;
    for (const skippedCount of counts) {
      const screen = await mount({ ...opsProps.ready(), skippedCount, profile: null });
      const note = inside(screen, '[data-skipped-note]');
      if (skippedCount === 0) expect(note).toBeNull();
      else {
        expect(note?.textContent?.trim()).toBe(
          skippedCount === 1 ? '1 record in this project could not be read and is not shown.' : `${skippedCount} records in this project could not be read and are not shown.`,
        );
        expect(note?.textContent).not.toMatch(/for this profile/i);
      }
      ran += 1;
    }
    expect(ran).toBe(counts.length);
  });
});

describe('the load-more error', () => {
  const ERROR = { sentence: 'The next records could not be loaded.', actionLabel: 'Try again', inert: false };

  it('is a danger sk-notice that does not announce, with a retry button; Load more is not drawn beside it', () => {
    const { host, calls } = draw({ loadMoreError: ERROR });
    const notices = host.querySelectorAll('[data-load-more-error]');
    expect(notices).toHaveLength(1);
    expect(notices[0]?.tagName.toLowerCase()).toBe('sk-notice');
    expect(notices[0]?.getAttribute('tone')).toBe('danger');
    expect(notices[0]?.getAttribute('announce')).toBe('off');
    expect(notices[0]?.textContent).toContain(ERROR.sentence);
    // The action sits BESIDE the notice, never in its actions slot: a slotted control is out of the Tab order (FR-034).
    expect(notices[0]?.querySelectorAll('[data-retry]')).toHaveLength(0);
    const retries = host.querySelectorAll('[data-retry]');
    expect(retries).toHaveLength(1);
    expect(retries[0]?.tagName.toLowerCase()).toBe('sk-button');
    expect(retries[0]?.textContent?.trim()).toBe('Try again');
    expect(retries[0]?.hasAttribute('disabled')).toBe(false);
    expect(retries[0]?.hasAttribute('slot')).toBe(false);
    expect(notices[0]?.nextElementSibling).toBe(retries[0]);
    expect(host.querySelectorAll('[data-load-more]')).toHaveLength(0);
    (retries[0] as HTMLElement).click();
    expect(calls.retry).toBe(1);
    expect(calls.loadMore).toBe(0);
    expect(draw({ loadMoreError: null }).host.querySelectorAll('[data-load-more-error]')).toHaveLength(0);
  });

  it('draws the action inert when no request can be built', () => {
    const inert = draw({ loadMoreError: { ...ERROR, inert: true } });
    expect(inert.host.querySelector('[data-retry]')?.hasAttribute('disabled')).toBe(true);
    const live = draw({ loadMoreError: ERROR });
    expect(live.host.querySelector('[data-retry]')?.hasAttribute('disabled')).toBe(false);
  });

  it('through the screen: an unknown or null code shows the generic sentence and "Try again"; the refused code shows the refresh wording', async () => {
    const generic = [null, 'something_else'];
    let ran = 0;
    for (const code of generic) {
      const screen = await mount(opsProps.loadMoreError(code));
      expect(insideText(screen, '[data-load-more-error]')).toContain(OPS_COPY.loadMoreError);
      expect(insideText(screen, '[data-retry]')).toBe(OPS_COPY.retryLabel);
      ran += 1;
    }
    expect(ran).toBe(generic.length);
    const refused = await mount(opsProps.refusedCursor());
    expect(insideText(refused, '[data-load-more-error]')).toContain(OPS_COPY.refusedCursor);
    expect(insideText(refused, '[data-retry]')).toBe(OPS_COPY.refreshAction);
    // The rows and the badge stay while the error shows.
    expect(refused.shadowRoot?.querySelectorAll('ul > li:not([aria-busy])')).toHaveLength(refused.items.length);
    expect(insideText(refused, '[data-count]')).toBe(`${refused.items.length} of ${refused.totalCount}`);
  });
});

describe('the page parts carry no dispatch, no loader and no copy', () => {
  it('draws no href, src, anchor, image or event dispatch in the ready page', async () => {
    const screen = await mount(opsProps.loadMoreError(null));
    const root = screen.shadowRoot as ShadowRoot;
    let checked = 0;
    for (const selector of ['a', 'img', '[href]', '[src]', 'iframe', 'form', 'script']) {
      expect(root.querySelectorAll(selector)).toHaveLength(0);
      checked += 1;
    }
    expect(checked).toBe(7);
  });
});

async function update(screen: SkOpsScreen, props: Partial<OpsScreenProps>): Promise<void> {
  Object.assign(screen, props);
  await settle(screen);
}

describe('OP-35: a page that disagrees with the profile filter', () => {
  const liveText = (screen: SkOpsScreen): string => insideText(screen, '[role="status"]');
  const lookOf = (screen: SkOpsScreen): string | null => inside(screen, '[data-look]')?.getAttribute('data-look') ?? null;

  it('draws the loading look and announces nothing for it (positive control: a plain loading status announces the loading text)', async () => {
    // Loading, then the page arrives: the live region now holds the loaded text, so "unchanged" is a real claim.
    const screen = await mount(opsProps.loading());
    await update(screen, opsProps.ready());
    const before = liveText(screen);
    expect(before).toBe(`${screen.items.length} of ${screen.totalCount} records loaded`);
    expect(lookOf(screen)).toBe('ready');
    // The host applies a profile the rows do not match: the page counts as not loaded.
    screen.profile = OPS_PROFILE;
    await settle(screen);
    expect(lookOf(screen)).toBe('loading');
    expect(inside(screen, '[data-count]')).toBeNull();
    expect(liveText(screen)).toBe(before);
    // Positive control: the same screen told it is loading announces the loading copy.
    screen.profile = null;
    await settle(screen);
    screen.status = 'loading';
    await settle(screen);
    expect(lookOf(screen)).toBe('loading');
    expect(liveText(screen)).toBe(OPS_COPY.announceLoading);
  });

  it('mounted already mismatched, it announces nothing at all', async () => {
    const screen = await mount(opsProps.mismatchedProfile());
    expect(lookOf(screen)).toBe('loading');
    expect(liveText(screen)).toBe('');
    const plain = await mount(opsProps.loading());
    expect(lookOf(plain)).toBe('loading');
    await update(plain, { status: 'ready', items: opsProps.ready().items, pageInfo: opsProps.ready().pageInfo, totalCount: 5 });
    expect(liveText(plain)).not.toBe('');
  });
});
