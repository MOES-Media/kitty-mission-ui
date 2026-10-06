// The header band of the Work Package screen (WP05, IC-04): the h1, the status, actor and staleness badges, drawn through the
// screen so the wiring of `renderHeader` into the header region is proved with it. The crumb itself is WP04's and is not
// re-tested here beyond its place in the band; its event is in `sk-work-package-screen.events-4.test.ts`.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkWorkPackageScreen } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import {
  DETAIL_FIXTURES,
  WORK_PACKAGE_FIXTURES,
  pairDetail,
  pairingProps,
  workPackageFrame,
  workPackageProps,
} from '../src/elements/sk-work-package-screen/fixtures.js';
import type { WpScreenProps } from '../src/elements/sk-work-package-screen/fixtures.js';
import type { WorkPackageRecordView } from '../src/contract/types.js';
import { NOT_STARTED_BADGE, STALE_BADGE, STALENESS_MINUTES_TEXT, STALENESS_REASON_WORDS, announceLoaded } from '../src/defaults/index.js';
import { joinHandles, resolveStateBadge, stalenessView } from '../src/logic/index.js';

afterEach(() => {
  document.body.replaceChildren();
});

async function mount(props: Partial<WpScreenProps> = {}, width = 1280): Promise<SkWorkPackageScreen> {
  await page.viewport(width, 900);
  const screen = document.createElement('sk-work-package-screen');
  Object.assign(screen, { ...pairingProps('WP-01'), ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(workPackageFrame(html`${screen}`), box);
  await settle(screen);
  return screen;
}
async function settle(screen: SkWorkPackageScreen): Promise<void> {
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}
function root(el: Element): ShadowRoot {
  if (el.shadowRoot === null) throw new Error('no shadow root');
  return el.shadowRoot;
}
const header = (screen: SkWorkPackageScreen): HTMLElement => {
  const found = root(screen).querySelector<HTMLElement>('[data-region="header"]');
  if (found === null) throw new Error('no header region');
  return found;
};
const badge = (screen: SkWorkPackageScreen, kind: 'status' | 'actor' | 'staleness'): HTMLElement | null =>
  header(screen).querySelector<HTMLElement>(`sk-pill-tag[data-badge="${kind}"]`);
const text = (el: Element | null): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const withWp = (patch: Partial<WorkPackageRecordView>): Partial<WpScreenProps> => ({
  workPackage: { ...WORK_PACKAGE_FIXTURES.wpPopulated, ...patch },
});

describe('the band: an sk-page-header holding the crumb, the h1 and the badges', () => {
  it('draws one sk-page-header inside the header region, with the crumb as the eyebrow, the h1 as the title and the badges as supporting content', async () => {
    const screen = await mount(workPackageProps('wpStale'));
    const band = header(screen).querySelector('sk-page-header');
    expect(band).not.toBeNull();
    expect(header(screen).querySelectorAll('sk-page-header')).toHaveLength(1);
    expect(band?.querySelector('[slot="eyebrow"] nav.sk-breadcrumbs')).not.toBeNull();
    expect(band?.querySelectorAll('h1[slot="title"]')).toHaveLength(1);
    expect(band?.querySelectorAll('[slot="supporting"] sk-pill-tag')).toHaveLength(3);
    // no hand-rolled band and no status indicator
    expect(header(screen).querySelector('sk-status-indicator')).toBeNull();
  });

  it('the h1 is the one page heading and its text is the title', async () => {
    const screen = await mount();
    expect(root(screen).querySelectorAll('h1')).toHaveLength(1);
    expect(text(root(screen).querySelector('h1'))).toBe(WORK_PACKAGE_FIXTURES.wpPopulated.title);
  });

  it('a long title wraps between words and ellipsizes an over-long word, keeping the full text in the name and the tooltip', async () => {
    const long = WORK_PACKAGE_FIXTURES.wpLong;
    const screen = await mount(workPackageProps('wpLong'), 800);
    const h1 = root(screen).querySelector<HTMLElement>('h1') as HTMLElement;
    expect(text(h1)).toBe(long.title);
    expect(h1.getAttribute('title')).toBe(long.title);
    const style = getComputedStyle(h1);
    expect(style.overflow).toBe('hidden');
    expect(style.textOverflow).toBe('ellipsis');
    // it does not push the band wider than the screen
    expect(h1.getBoundingClientRect().right).toBeLessThanOrEqual(screen.getBoundingClientRect().right);
    // an over-long single word really is ellipsized: it overflows its box (clipped) while the text is whole
    const word = await mount(withWp({ title: 'Supercalifragilisticexpialidocious'.repeat(8) }), 800);
    const wordH1 = root(word).querySelector<HTMLElement>('h1') as HTMLElement;
    expect(wordH1.scrollWidth).toBeGreaterThan(wordH1.clientWidth);
    expect(text(wordH1)).toBe('Supercalifragilisticexpialidocious'.repeat(8));
    // positive control: a short title has no clipped line
    const short = await mount();
    const shortH1 = root(short).querySelector<HTMLElement>('h1') as HTMLElement;
    expect(shortH1.scrollWidth).toBeLessThanOrEqual(shortH1.clientWidth);
  });
});

describe('the status badge: word and tone together, from the lane table', () => {
  it('a known lane shows its word with its tone', async () => {
    const screen = await mount();
    const expected = resolveStateBadge(WORK_PACKAGE_FIXTURES.wpPopulated.statusLane, null);
    const el = badge(screen, 'status');
    expect(text(el)).toBe(expected.label);
    expect(el?.getAttribute('status')).toBe(expected.tone);
  });

  it('a null lane gives "not started" and no actor badge (WP-09), against a populated sibling that has an actor badge', async () => {
    const empty = await mount(workPackageProps('wpNoEvents'));
    expect(text(badge(empty, 'status'))).toBe(NOT_STARTED_BADGE.label);
    expect(badge(empty, 'status')?.getAttribute('status')).toBe(NOT_STARTED_BADGE.tone);
    expect(badge(empty, 'actor')).toBeNull();
    const populated = await mount();
    expect(badge(populated, 'actor')).not.toBeNull();
  });

  it('an unknown lane value shows raw with the neutral tone, never undefined', async () => {
    const screen = await mount(withWp({ statusLane: 'on_hold' }));
    expect(text(badge(screen, 'status'))).toBe('on_hold');
    expect(badge(screen, 'status')?.getAttribute('status')).toBe('neutral');
    expect(header(screen).textContent).not.toContain('undefined');
  });

  it('the status is the pill text, not a colour: every known and unknown lane shows a non-empty word', async () => {
    const lanes = ['planned', 'claimed', 'in_progress', 'for_review', 'approved', 'done', 'blocked', 'canceled', 'on_hold', null];
    let seen = 0;
    for (const lane of lanes) {
      const screen = await mount(withWp({ statusLane: lane }));
      expect(text(badge(screen, 'status')), String(lane)).not.toBe('');
      seen += 1;
    }
    expect(seen).toBe(10);
  });
});

describe('the actor badge: the non-null handles joined by a colon, absent for three nulls', () => {
  const cases = [
    ['wpActorStructured', 'claude:implementer:implementer-ivan'],
    ['wpActorHandle', 'finalize-tasks'],
  ] as const;
  it('structured and handle-only actors (WP-17, WP-18)', async () => {
    let seen = 0;
    for (const [name, expected] of cases) {
      const screen = await mount(workPackageProps(name));
      expect(joinHandles(WORK_PACKAGE_FIXTURES[name].actor)).toBe(expected);
      expect(text(badge(screen, 'actor')), name).toBe(expected);
      seen += 1;
    }
    expect(seen).toBe(2);
  });
  it('a redacted actor draws no badge and no placeholder (WP-19), against the structured sibling', async () => {
    const redacted = await mount(workPackageProps('wpActorRedacted'));
    expect(badge(redacted, 'actor')).toBeNull();
    expect(header(redacted).querySelectorAll('sk-pill-tag')).toHaveLength(1);
    const structured = await mount(workPackageProps('wpActorStructured'));
    expect(badge(structured, 'actor')).not.toBeNull();
    expect(header(structured).querySelectorAll('sk-pill-tag')).toHaveLength(2);
  });
});

describe('the staleness badge: only for a stale status, with the words from the defaults', () => {
  it('wpStale draws the stale word, the minutes as given and the reason word (WP-20)', async () => {
    const screen = await mount(workPackageProps('wpStale'));
    const view = stalenessView(WORK_PACKAGE_FIXTURES.wpStale.staleness);
    expect(view.role).toBe('badge');
    const el = badge(screen, 'staleness');
    expect(text(el)).toContain(STALE_BADGE.label);
    expect(text(el)).toContain(STALENESS_MINUTES_TEXT(2880));
    expect(text(el)).toContain(STALENESS_REASON_WORDS['live_claim_process'] as string);
    expect(el?.getAttribute('status')).toBe(STALE_BADGE.tone);
  });

  it('a null reason drops the reason clause and a null minutes value drops the minutes clause', async () => {
    const noReason = await mount(workPackageProps('wpProvisional'));
    expect(text(badge(noReason, 'staleness'))).toBe(`${STALE_BADGE.label}, ${STALENESS_MINUTES_TEXT(1440.5)}`);
    const bare = await mount(withWp({ staleness: { status: 'stale', reason: null, minutesSinceCommit: null } }));
    expect(text(badge(bare, 'staleness'))).toBe(STALE_BADGE.label);
    const foreign = await mount(withWp({ staleness: { status: 'stale', reason: 'a_reason_nobody_saw', minutesSinceCommit: 5 } as never }));
    expect(text(badge(foreign, 'staleness'))).toBe(`${STALE_BADGE.label}, ${STALENESS_MINUTES_TEXT(5)}, a_reason_nobody_saw`);
    expect(text(badge(foreign, 'staleness'))).not.toContain('undefined');
  });

  it('fresh, not applicable, an unknown status, a null and an omitted staleness draw no header badge, against stale as the positive control', async () => {
    const stale = await mount(workPackageProps('wpStale'));
    expect(badge(stale, 'staleness')).not.toBeNull();
    const none: Partial<WpScreenProps>[] = [
      workPackageProps('wpFresh'),
      workPackageProps('wpNotApplicable'),
      withWp({ staleness: { status: 'a_status_nobody_saw', reason: null, minutesSinceCommit: 3 } as never }),
      withWp({ staleness: null }),
      workPackageProps('wpStalenessOmitted'),
    ];
    const populated = await mount();
    expect(badge(populated, 'staleness')).toBeNull();
    let seen = 0;
    for (const props of none) {
      const screen = await mount(props);
      expect(badge(screen, 'staleness'), `case ${seen}`).toBeNull();
      expect(header(screen).querySelectorAll('sk-pill-tag')).toHaveLength(2);
      seen += 1;
    }
    expect(seen).toBe(5);
  });

  it('the contract provisional example (wpProvisional) draws exactly what stalenessView says for it, with no undefined', async () => {
    const wp = WORK_PACKAGE_FIXTURES.wpProvisional;
    const screen = await mount(workPackageProps('wpProvisional'));
    const view = stalenessView(wp.staleness);
    expect(view.role).toBe('badge');
    const el = badge(screen, 'staleness');
    expect(el).not.toBeNull();
    expect(text(el)).toContain(STALENESS_MINUTES_TEXT(view.minutes as number));
    expect(text(el)).not.toContain('undefined');
    expect(header(screen).textContent).not.toContain('undefined');
  });
});

describe('the wiring: renderHeader sits in the header region and the live region follows the Work Package id', () => {
  it('the header region holds the crumb with the Mission name and the id as the current crumb', async () => {
    const screen = await mount();
    const nav = header(screen).querySelector('nav') as HTMLElement;
    expect(text(nav.querySelector('sk-button'))).toBe('Sample mission');
    expect(text(nav.querySelector('[aria-current="page"]'))).toBe(WORK_PACKAGE_FIXTURES.wpPopulated.wpId);
  });

  it('the trail shows exactly one visible separator between the two crumbs: the renderer draws none, the library sheet draws one', async () => {
    const screen = await mount();
    const items = [...header(screen).querySelectorAll<HTMLElement>('nav li')];
    expect(items).toHaveLength(2);
    expect(items.every((li) => getComputedStyle(li).display !== 'none')).toBe(true);
    expect(getComputedStyle(items[0] as HTMLElement, '::before').content).toBe('none');
    expect(getComputedStyle(items[1] as HTMLElement, '::before').content).toContain('/');
    expect(text(header(screen).querySelector('nav'))).not.toContain('/');
    expect(header(screen).querySelector('nav [aria-hidden="true"]')).toBeNull();
  });

  it('a change of wpId while ready announces the new Work Package once; a same-id refresh announces nothing', async () => {
    const screen = await mount();
    const seqOf = (): string | null => root(screen).querySelector('[data-live] [data-seq]')?.getAttribute('data-seq') ?? null;
    expect(seqOf()).toBeNull();
    const next = WORK_PACKAGE_FIXTURES.wpActorHandle;
    screen.workPackage = next;
    screen.detail = pairDetail(next, DETAIL_FIXTURES.detailPopulated);
    screen.wpId = next.wpId;
    await settle(screen);
    const first = seqOf();
    expect(first).not.toBeNull();
    expect(text(root(screen).querySelector('[data-live]'))).toBe(announceLoaded(next.wpId));
    screen.workPackage = { ...next, title: 'A refreshed title' };
    await settle(screen);
    expect(seqOf()).toBe(first);
    expect(text(root(screen).querySelector('h1'))).toBe('A refreshed title');
    screen.wpId = 'WP99';
    await settle(screen);
    expect(Number(seqOf())).toBe(Number(first) + 1);
  });
});

describe('the panel chrome the screen draws around the bodies (E-18, with the CP-1 and ratification rulings), as computed style', () => {
  it('every panel is a 1px border, 12px radius, 20px padding card; the title is 18px at weight 700 with a 16px gap to the body and a row gap of 0', async () => {
    const screen = await mount();
    const panels = [...root(screen).querySelectorAll<HTMLElement>('sk-card[data-region]')];
    expect(panels.length).toBeGreaterThanOrEqual(3);
    let seen = 0;
    for (const id of ['facts', 'assignment', 'frontmatter']) {
      const card = root(screen).querySelector<HTMLElement>(`sk-card[data-region="${id}"]`) as HTMLElement;
      const part = card.shadowRoot?.querySelector<HTMLElement>('[part~="card"]') as HTMLElement;
      const style = getComputedStyle(part);
      expect(style.borderTopWidth, id).toBe('1px');
      expect(style.borderTopLeftRadius, id).toBe('12px');
      expect(style.paddingTop, id).toBe('20px');
      expect(style.paddingLeft, id).toBe('20px');
      const title = getComputedStyle(card.querySelector('h2') as HTMLElement);
      expect(title.fontSize, id).toBe('18px');
      expect(title.fontWeight, id).toBe('700');
      const sectionHeader = card.querySelector('sk-section-header') as HTMLElement;
      const headerPart = sectionHeader.shadowRoot?.querySelector<HTMLElement>('[part~="header"]') as HTMLElement;
      expect(getComputedStyle(headerPart).rowGap, id).toBe('0px');
      const body = sectionHeader.nextElementSibling as HTMLElement;
      expect(body, id).not.toBeNull();
      expect(Math.round(body.getBoundingClientRect().top - sectionHeader.getBoundingClientRect().bottom), id).toBe(16);
      seen += 1;
    }
    expect(seen).toBe(3);
  });
});

describe('the ten stories of Screens/Work Package/Header and facts', () => {
  it('are exactly ten, named Wp<NN><letter>, each with the one lowercase row tag matching its name and one tier tag', async () => {
    const stories = await import('../src/elements/sk-work-package-screen/sk-work-package-screen.header-facts.stories.js');
    const meta = stories.default as { title: string };
    expect(meta.title).toBe('Screens/Work Package/Header and facts');
    const entries = Object.entries(stories).filter(([name]) => name !== 'default') as [string, { tags: string[] }][];
    expect(entries.map(([name]) => name)).toEqual(['Wp01', 'Wp09', 'Wp17', 'Wp18', 'Wp19', 'Wp20', 'Wp21a', 'Wp21b', 'Wp22', 'Wp38']);
    let seen = 0;
    for (const [name, story] of entries) {
      const rowTags = story.tags.filter((tag) => tag.startsWith('wp-'));
      expect(rowTags, name).toEqual([`wp-${name.slice(2).toLowerCase()}`]);
      expect(story.tags.filter((tag) => tag.startsWith('vw-')), name).toEqual(['vw-1280']);
      seen += 1;
    }
    expect(seen).toBe(10);
  });
});
