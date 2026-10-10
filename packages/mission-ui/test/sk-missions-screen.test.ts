import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { html, render } from 'lit';
import '@spec-kitty/tokens';
import '../src/index.js';
import type { SkMissionsScreen } from '../src/elements/sk-missions-screen/sk-missions-screen.js';
import * as stories from '../src/elements/sk-missions-screen/sk-missions-screen.stories.js';
import {
  BRANCH,
  NOW,
  duplicateNames,
  exhaustedMissions,
  firstMissions,
  firstPageInfo,
  fullMissions,
  fullMoreInfo,
  fullPageInfo,
  hostErrorMessage,
  lastPageInfo,
  longMissions,
  longNameMissions,
  longNamePageInfo,
  longPageInfo,
  mixedMissions,
  project,
  projectOf,
} from '../src/elements/sk-missions-screen/fixtures.js';
import { filterButton, filterGroup, mount, missionItems, one, readyProps, resetDocument, searchInput, settle, sr, type Props } from './support/missions-screen-harness.js';
import { shellFrame } from '../src/story-support/shell-frame.js';
import type { MissionOverviewView } from '../src/contract/types.js';
import type { PageInfo } from '../src/contract/types.js';

afterEach(resetDocument);







function visibleNames(el: SkMissionsScreen): string[] {
  return missionItems(el)
    .filter((li) => !li.hidden)
    .map((li) => one<HTMLElement>(li, '[slot="title"]').textContent?.trim() ?? '');
}

function rowButton(li: Element): HTMLButtonElement {
  const row = one<HTMLElement>(li, 'sk-action-row');
  return one<HTMLButtonElement>(row.shadowRoot as ShadowRoot, 'button');
}

function loadMoreItem(el: SkMissionsScreen): HTMLLIElement | null {
  return [...sr(el).querySelectorAll<HTMLLIElement>('ul > li')].find((li) => li.querySelector('sk-button') !== null) ?? null;
}

function loadMoreButton(el: SkMissionsScreen): HTMLElement {
  const li = loadMoreItem(el);
  if (!li) throw new Error('no Load more row');
  return one<HTMLElement>(li, 'sk-button');
}




function liveRegion(el: SkMissionsScreen): HTMLElement {
  return one<HTMLElement>(sr(el), '[role="status"]');
}

async function typeQuery(el: SkMissionsScreen, text: string): Promise<void> {
  searchInput(el).focus();
  await userEvent.keyboard(text);
  await settle(el);
}

async function pressFilter(el: SkMissionsScreen, label: string): Promise<void> {
  filterButton(el, label).click();
  await settle(el);
}

function collect<T>(target: EventTarget, name: string): CustomEvent<T>[] {
  const seen: CustomEvent<T>[] = [];
  target.addEventListener(name, (event) => seen.push(event as CustomEvent<T>));
  return seen;
}

/** Contract for an emitted event: bubbles, composed, not cancelable. */
function expectCrossing(event: CustomEvent<unknown>): void {
  expect(event.bubbles).toBe(true);
  expect(event.composed).toBe(true);
  expect(event.cancelable).toBe(false);
}

function deepActive(): Element | null {
  let active: Element | null = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

const names = (items: MissionOverviewView[]): string[] => items.map((m) => m.friendlyName);

describe('view states', () => {
  it('ready: header, search, six filters with All pressed, one list item per Mission', async () => {
    const el = await mount();
    const header = one<HTMLElement>(sr(el), 'sk-page-header');
    expect(one(header, '[slot="eyebrow"]').textContent).toBe('Project');
    expect(one(header, 'h1[slot="title"]').textContent).toBe('Missions');
    expect(one(header, '[slot="supporting"]').textContent).toBe('example-project · main · 3 Missions');
    expect(sr(el).querySelectorAll('sk-form-input').length).toBe(1);
    expect(filterGroup(el).value).toBe('all');
    expect(missionItems(el).length).toBe(6);
    expect(el.getAttribute('status')).toBe('ready');
  });

  it('loading: header kept, a busy region labelled "Reading local Mission index", no search, filters or rows', async () => {
    const el = await mount({ ...readyProps(), status: 'loading' });
    expect(sr(el).querySelectorAll('sk-page-header').length).toBe(1);
    const busy = one<HTMLElement>(sr(el), '[aria-busy="true"]');
    expect(busy.querySelector('.sk-progress--indeterminate')?.textContent).toContain('Reading local Mission index');
    expect(sr(el).querySelectorAll('sk-form-input, sk-filter-toggle-group, sk-action-row, ul').length).toBe(0);
  });

  it('error: an assertive danger notice with the heading and the host-neutral default body, no controls', async () => {
    const el = await mount({ ...readyProps(), status: 'error' });
    const notice = one<HTMLElement>(sr(el), 'sk-notice');
    expect(notice.getAttribute('tone')).toBe('danger');
    expect(notice.getAttribute('announce')).toBe('assertive');
    expect(one(notice, '[slot="heading"]').textContent).toBe('Mission index unavailable');
    expect(notice.textContent).toContain('The Mission index could not be read. No Missions are shown.');
    expect(notice.textContent).not.toContain('Kitty Desktop');
    // the library renders the assertive live region as role="alert" (spike S3)
    expect(notice.shadowRoot?.querySelector('[role="alert"]')).not.toBeNull();
    expect(sr(el).querySelectorAll('sk-page-header').length).toBe(1);
    expect(sr(el).querySelectorAll('sk-form-input, sk-filter-toggle-group, sk-action-row, sk-button, ul').length).toBe(0);
  });

  it('error: errorMessage replaces the default body', async () => {
    const el = await mount({ ...readyProps(), status: 'error', errorMessage: hostErrorMessage });
    const notice = one<HTMLElement>(sr(el), 'sk-notice');
    expect(notice.textContent).toContain(hostErrorMessage);
    expect(notice.textContent).not.toContain('could not be read. No Missions are shown');
  });

  it('empty: "No Missions in this project", header kept, search and filters hidden', async () => {
    const el = await mount({ ...readyProps(), status: 'empty', missions: [], project: projectOf(0) });
    expect(one(sr(el), '.sk-empty-state h2').textContent).toBe('No Missions in this project');
    expect(one(sr(el), '[slot="supporting"]').textContent).toBe('example-project · main · 0 Missions');
    expect(sr(el).querySelectorAll('sk-form-input, sk-filter-toggle-group, sk-action-row, ul').length).toBe(0);
  });

  it('an unknown status collapses to empty', async () => {
    const el = await mount({ ...readyProps(), status: 'bogus' as never });
    expect(one(sr(el), '.sk-empty-state h2').textContent).toBe('No Missions in this project');
    expect(sr(el).querySelectorAll('sk-action-row').length).toBe(0);
  });

  it('the header states what is present: singular count, no branch, no project', async () => {
    const single = await mount({ ...readyProps(), project: projectOf(1) });
    expect(one(sr(single), '[slot="supporting"]').textContent).toBe('example-project · main · 1 Mission');
    document.body.replaceChildren();
    const noBranch = await mount({ ...readyProps(), branch: '' });
    expect(one(sr(noBranch), '[slot="supporting"]').textContent).toBe('example-project · 3 Missions');
    document.body.replaceChildren();
    const noProject = await mount({ ...readyProps(), project: null });
    expect(one(sr(noProject), '[slot="supporting"]').textContent).toBe('main');
  });
});

describe('rows', () => {
  const rowOf = (el: SkMissionsScreen, name: string): HTMLLIElement => {
    const found = missionItems(el).find((li) => one(li, '[slot="title"]').textContent?.trim() === name);
    if (!found) throw new Error(`row ${name} missing`);
    return found;
  };
  const slotText = (li: Element, slot: string): string => (li.querySelector(`[slot="${slot}"]`)?.textContent ?? '').replace(/\s+/g, ' ').trim();

  it('shows name, slug, type, topology, lane summary, lifecycle badge and activity', async () => {
    const el = await mount();
    const li = rowOf(el, 'Active Mission');
    expect(slotText(li, 'reference')).toBe('active-mission-01JZAB3C');
    expect(slotText(li, 'tags')).toBe('software-dev lanes');
    expect(slotText(li, 'supporting')).toBe('3 done · 1 for review · 1 in progress · 1 planned');
    expect(slotText(li, 'metadata')).toContain('active');
    expect(slotText(li, 'metadata')).toContain('5 days ago');
    expect(one(li, 'sk-action-row').getAttribute('row-id')).toBe('01JZAB3C4D5E6F7G8H9JKMNPQR');
    expect(one(li, 'sk-action-row').hasAttribute('selectable')).toBe(true);
  });

  it('the blocked badge shows only above 0, with the count as given', async () => {
    const el = await mount();
    expect(slotText(rowOf(el, 'Blocked Mission'), 'tags')).toContain('1 blocked');
    expect(slotText(rowOf(el, 'Active Mission'), 'tags')).not.toContain('blocked');
    let checked = 0;
    for (const li of missionItems(el)) {
      const hasBadge = slotText(li, 'tags').includes('blocked');
      expect(hasBadge).toBe(li === rowOf(el, 'Blocked Mission'));
      checked += 1;
    }
    expect(checked).toBe(6);
  });

  it('a stale and active Mission shows both the lifecycle badge and the stale badge', async () => {
    const el = await mount();
    const li = rowOf(el, 'Stale Active Mission');
    expect(slotText(li, 'metadata')).toContain('active');
    expect(slotText(li, 'tags')).toContain('stale');
    expect(slotText(rowOf(el, 'Active Mission'), 'tags')).not.toContain('stale');
  });

  it('null type shows no type badge, an unknown topology shows "unknown", null activity shows "no activity"', async () => {
    const el = await mount();
    const li = rowOf(el, 'Example Mission Beta');
    expect(slotText(li, 'tags')).toBe('unknown');
    expect(slotText(li, 'metadata')).toContain('no activity');
  });

  it('every row ends with a decorative arrow', async () => {
    const el = await mount();
    let checked = 0;
    for (const li of missionItems(el)) {
      const arrow = one<HTMLElement>(li, '[slot="metadata"] [data-arrow]');
      expect(arrow.getAttribute('aria-hidden')).toBe('true');
      checked += 1;
    }
    expect(checked).toBe(6);
  });

  it('shows the lifecycle word of a discarded and a done Mission', async () => {
    const el = await mount({ ...readyProps(), missions: fullMissions, pageInfo: fullPageInfo });
    expect(slotText(rowOf(el, 'Example Mission Delta'), 'metadata')).toContain('Discarded');
    expect(slotText(rowOf(el, 'Done Mission'), 'metadata')).toContain('done');
    expect(slotText(rowOf(el, 'Draft Mission'), 'metadata')).toContain('draft');
  });

  it('relative time: the time hook wins, no now shows the ISO timestamp as given', async () => {
    const hooked = await mount({ ...readyProps(), labels: { time: (iso: string) => `at ${iso.slice(0, 10)}` } });
    expect(slotText(rowOf(hooked, 'Active Mission'), 'metadata')).toContain('at 2026-09-24');
    document.body.replaceChildren();
    const bare = await mount({ ...readyProps(), now: null });
    expect(slotText(rowOf(bare, 'Active Mission'), 'metadata')).toContain('2026-09-24T16:40:12Z');
  });

  it('rows render once and are keyed: the same li nodes survive a reordered list', async () => {
    const el = await mount();
    const before = missionItems(el);
    el.missions = [...mixedMissions].reverse();
    await settle(el);
    const after = missionItems(el);
    expect(after.length).toBe(6);
    for (const li of before) expect(after.includes(li)).toBe(true);
  });
});

describe('open Mission', () => {
  it('a pointer activation emits exactly one sk-open-mission with the exact payload', async () => {
    const el = await mount();
    const events = collect<{ missionId: string; slug: string }>(el, 'sk-open-mission');
    const li = missionItems(el)[1] as HTMLLIElement;
    rowButton(li).click();
    await settle(el);
    expect(events.length).toBe(1);
    expect(events[0]?.detail).toEqual({ missionId: '01JZF002000000000000000000', slug: 'example-mission-01JZF002' });
    expectCrossing(events[0] as CustomEvent<unknown>);
  });

  for (const key of ['{Enter}', ' ']) {
    it(`the keyboard (${key === ' ' ? 'Space' : 'Enter'}) emits exactly one event`, async () => {
      const el = await mount();
      const events = collect<{ missionId: string; slug: string }>(el, 'sk-open-mission');
      const button = rowButton(missionItems(el)[0] as HTMLLIElement);
      button.focus();
      await userEvent.keyboard(key);
      await settle(el);
      expect(events.length).toBe(1);
      expect(events[0]?.detail).toEqual({ missionId: '01JZAB3C4D5E6F7G8H9JKMNPQR', slug: 'active-mission-01JZAB3C' });
      expectCrossing(events[0] as CustomEvent<unknown>);
    });
  }

  it('two Missions with the same name are told apart by id and slug', async () => {
    const el = await mount({ ...readyProps(), missions: duplicateNames });
    const events = collect<{ missionId: string; slug: string }>(el, 'sk-open-mission');
    expect(names(duplicateNames)).toEqual(['Shared name', 'Shared name']);
    const items = missionItems(el);
    expect(items.length).toBe(2);
    rowButton(items[0] as HTMLLIElement).click();
    rowButton(items[1] as HTMLLIElement).click();
    await settle(el);
    expect(events.length).toBe(2);
    expect(events[0]?.detail).toEqual({ missionId: '01JZAB3C4D5E6F7G8H9JKMNPQR', slug: 'active-mission-01JZAB3C' });
    expect(events[1]?.detail).toEqual({ missionId: '01JZF006000000000000000000', slug: 'example-mission-01JZF006' });
  });

  it('the library activation event does not leave the screen, and the screen never navigates', async () => {
    const el = await mount();
    const library = collect<unknown>(document, 'sk-action-row-activate');
    const opened = collect<unknown>(el, 'sk-open-mission');
    const hashBefore = location.hash;
    rowButton(missionItems(el)[0] as HTMLLIElement).click();
    await settle(el);
    expect(opened.length).toBe(1);
    expect(library.length).toBe(0);
    expect(location.hash).toBe(hashBefore);
  });
});

describe('filters', () => {
  const expected: Array<[string, string[]]> = [
    ['All', ['Active Mission', 'Blocked Mission', 'Stale Active Mission', 'Example Mission Beta', 'Done Mission', 'Planned Mission', 'Draft Mission', 'Example Mission Delta', 'Stale Planned Mission']],
    ['Active', ['Active Mission', 'Blocked Mission', 'Stale Active Mission']],
    ['Planned', ['Example Mission Beta', 'Planned Mission', 'Stale Planned Mission']],
    ['Done', ['Done Mission']],
    ['Stale', ['Stale Active Mission', 'Stale Planned Mission']],
    ['Discarded', ['Example Mission Delta']],
  ];

  it('each filter shows exactly its Missions; drafts only under All; a stale active one under Active and Stale', async () => {
    const el = await mount({ ...readyProps(), missions: fullMissions, pageInfo: fullPageInfo });
    let ran = 0;
    for (const [label, wanted] of expected) {
      await pressFilter(el, label);
      expect(visibleNames(el), label).toEqual(wanted);
      expect(missionItems(el).length).toBe(9);
      ran += 1;
    }
    expect(ran).toBe(6);
    await pressFilter(el, 'Active');
    expect(visibleNames(el)).toContain('Stale Active Mission');
    await pressFilter(el, 'Stale');
    expect(visibleNames(el)).toContain('Stale Active Mission');
    expect(visibleNames(el)).not.toContain('Draft Mission');
  });

  it('a press emits exactly one sk-filter-change per filter with the id as payload', async () => {
    const el = await mount({ ...readyProps(), missions: fullMissions, pageInfo: fullPageInfo });
    const events = collect<{ filter: string }>(el, 'sk-filter-change');
    const ids = [['Active', 'active'], ['Planned', 'planned'], ['Done', 'done'], ['Stale', 'stale'], ['Discarded', 'discarded'], ['All', 'all']] as const;
    let ran = 0;
    for (const [label, id] of ids) {
      await pressFilter(el, label);
      expect(events.length).toBe(ran + 1);
      expect(events[ran]?.detail).toEqual({ filter: id });
      expectCrossing(events[ran] as CustomEvent<unknown>);
      expect(el.filter).toBe(id);
      expect(el.getAttribute('filter')).toBe(id);
      ran += 1;
    }
    expect(ran).toBe(6);
  });

  it('no event: pressing the pressed filter, a host-set filter (positive control: a real press emits)', async () => {
    const el = await mount({ ...readyProps(), missions: fullMissions, pageInfo: fullPageInfo });
    const events = collect<{ filter: string }>(el, 'sk-filter-change');
    await pressFilter(el, 'All');
    el.filter = 'done';
    await settle(el);
    expect(events.length).toBe(0);
    expect(visibleNames(el)).toEqual(['Done Mission']);
    expect(filterGroup(el).value).toBe('done');
    await pressFilter(el, 'Planned');
    expect(events.length).toBe(1);
  });

  it('an unknown filter id behaves as All, presses All and emits nothing', async () => {
    const el = await mount({ ...readyProps(), missions: fullMissions, pageInfo: fullPageInfo, filter: 'bogus' });
    const events = collect<{ filter: string }>(el, 'sk-filter-change');
    expect(visibleNames(el).length).toBe(9);
    expect(filterGroup(el).value).toBe('all');
    expect(events.length).toBe(0);
  });

  it('hidden rows are li[hidden]: the same nodes, no re-creation', async () => {
    const el = await mount({ ...readyProps(), missions: fullMissions, pageInfo: fullPageInfo });
    const before = missionItems(el);
    await pressFilter(el, 'Done');
    const after = missionItems(el);
    expect(after.length).toBe(9);
    for (let i = 0; i < 9; i += 1) expect(after[i]).toBe(before[i]);
    expect(after.filter((li) => li.hidden).length).toBe(8);
    expect(after.filter((li) => li.hasAttribute('hidden')).length).toBe(8);
  });
});

describe('hidden rows are not rendered', () => {
  it('a filtered-out li takes no space and is not displayed (author CSS must not beat [hidden])', async () => {
    const el = await mount({ ...readyProps(), missions: fullMissions, pageInfo: fullPageInfo });
    await pressFilter(el, 'Done');
    const items = missionItems(el);
    const shown = items.filter((li) => !li.hidden);
    const hidden = items.filter((li) => li.hidden);
    expect(shown.length).toBe(1);
    expect(hidden.length).toBe(8);
    for (const li of hidden) {
      expect(getComputedStyle(li).display).toBe('none');
      expect(li.getBoundingClientRect().height).toBe(0);
    }
    expect(shown[0]?.getBoundingClientRect().height).toBeGreaterThan(0);
  });
});

describe('search', () => {
  it('emits one sk-search per changed trimmed query, with the trimmed text', async () => {
    const el = await mount();
    const events = collect<{ query: string }>(el, 'sk-search');
    await typeQuery(el, 'ab');
    expect(events.length).toBe(2);
    expect(events.map((e) => e.detail)).toEqual([{ query: 'a' }, { query: 'ab' }]);
    for (const event of events) expectCrossing(event as CustomEvent<unknown>);
    expect(el.query).toBe('ab');
  });

  it('a whitespace-only change emits nothing (positive control: a letter emits)', async () => {
    const el = await mount();
    const events = collect<{ query: string }>(el, 'sk-search');
    await typeQuery(el, '   ');
    expect(events.length).toBe(0);
    await typeQuery(el, 'x');
    expect(events.length).toBe(1);
    expect(events[0]?.detail).toEqual({ query: 'x' });
    await typeQuery(el, ' ');
    expect(events.length).toBe(1);
  });

  it('a host-set query changes the view and emits nothing (positive control: typing emits)', async () => {
    const el = await mount();
    const events = collect<{ query: string }>(el, 'sk-search');
    el.query = 'research';
    await settle(el);
    expect(events.length).toBe(0);
    expect(visibleNames(el)).toEqual(['Done Mission']);
    expect(searchInput(el).value).toBe('research');
    await typeQuery(el, 'z');
    expect(events.length).toBe(1);
  });

  it('matches name, slug, type and topology as plain text, case-insensitive, trimmed', async () => {
    const el = await mount();
    const cases: Array<[string, string[]]> = [
      ['BLOCKED', ['Blocked Mission']],
      ['  planned mission ', ['Planned Mission']],
      ['01jzf005', ['Done Mission']],
      ['research', ['Done Mission']],
      ['single_branch', ['Done Mission']],
      ['unknown', ['Example Mission Beta']],
    ];
    let ran = 0;
    for (const [query, wanted] of cases) {
      el.query = query;
      await settle(el);
      expect(visibleNames(el), query).toEqual(wanted);
      ran += 1;
    }
    expect(ran).toBe(6);
  });

  it('does not search lifecycle words; regular-expression characters are text', async () => {
    const odd = mixedMissions.map((m, i) => (i === 0 ? { ...m, friendlyName: 'Fix (beta) a.b [x]' } : m));
    const el = await mount({ ...readyProps(), missions: odd });
    el.query = 'discarded';
    await settle(el);
    expect(visibleNames(el)).toEqual([]);
    const probes: Array<[string, number]> = [['(beta', 1], ['a.b', 1], ['[x]', 1], ['a.*', 0], ['^Fix', 0], ['(', 1]];
    let ran = 0;
    for (const [query, count] of probes) {
      el.query = query;
      await settle(el);
      expect(visibleNames(el).length, query).toBe(count);
      ran += 1;
    }
    expect(ran).toBe(6);
  });

  it('filter and query combine (AND)', async () => {
    const el = await mount({ ...readyProps(), missions: fullMissions, pageInfo: fullPageInfo });
    await pressFilter(el, 'Planned');
    el.query = 'stale';
    await settle(el);
    expect(visibleNames(el)).toEqual(['Stale Planned Mission']);
  });

  it('the search is named "Search Missions" and its label takes no layout space', async () => {
    const el = await mount();
    const field = one<HTMLElement>(sr(el), 'sk-form-input');
    expect(field.getAttribute('type')).toBe('search');
    expect(field.getAttribute('label')).toBe('Search Missions');
    const label = one<HTMLElement>(field.shadowRoot as ShadowRoot, 'label');
    expect(label.textContent).toBe('Search Missions');
    const box = label.getBoundingClientRect();
    expect(box.width).toBeLessThanOrEqual(1);
    expect(box.height).toBeLessThanOrEqual(1);
    const named = page.getByRole('searchbox', { name: 'Search Missions' });
    expect(named.elements().length).toBe(1);
  });
});

describe('the query is not reflected to an attribute (D-15)', () => {
  it('typed text stays out of the light DOM; an initial query attribute is still read', async () => {
    const el = await mount();
    const input = one<HTMLElement>(sr(el), 'sk-form-input');
    const inner = one<HTMLInputElement>(input.shadowRoot as ShadowRoot, 'input');
    inner.value = 'alpha';
    inner.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await settle(el);
    expect(el.query).toBe('alpha');
    expect(el.hasAttribute('query')).toBe(false);
    const fromAttribute = document.createElement('sk-missions-screen');
    fromAttribute.setAttribute('query', 'beta');
    document.body.append(fromAttribute);
    expect(fromAttribute.query).toBe('beta');
  });
});

describe('no match (MS-03)', () => {
  it('shows the panel, keeps search and filters, and offers Load more while pages remain', async () => {
    const el = await mount({ ...readyProps(), missions: fullMissions, pageInfo: fullMoreInfo });
    el.query = 'zzzz-nothing';
    await settle(el);
    expect(visibleNames(el)).toEqual([]);
    const panel = one<HTMLElement>(sr(el), '.sk-empty-state');
    expect(one(panel, 'h2').textContent).toBe('No Missions match');
    expect(panel.textContent).toContain('Try another status or clear the search text.');
    expect(sr(el).querySelectorAll('sk-form-input').length).toBe(1);
    expect(sr(el).querySelectorAll('sk-filter-toggle-group').length).toBe(1);
    expect(loadMoreItem(el)).not.toBeNull();
    expect(loadMoreItem(el)?.hidden).toBe(false);
  });

  it('on the last page there is no Load more row; a filter that matches nothing shows the same panel', async () => {
    const el = await mount({ ...readyProps(), filter: 'discarded' });
    expect(visibleNames(el)).toEqual([]);
    expect(one(sr(el), '.sk-empty-state h2').textContent).toBe('No Missions match');
    expect(loadMoreItem(el)).toBeNull();
  });

  it('a ready list with no Missions at all shows the panel too, and Load more while pages remain (C-01)', async () => {
    const el = await mount({ ...readyProps(), missions: exhaustedMissions, pageInfo: lastPageInfo(25) });
    expect(one(sr(el), '.sk-empty-state h2').textContent).toBe('No Missions match');
    expect(loadMoreItem(el)).toBeNull();
    el.pageInfo = firstPageInfo;
    await settle(el);
    expect(sr(el).querySelectorAll('.sk-empty-state').length).toBe(1);
    expect(loadMoreItem(el)).not.toBeNull();
  });

  it('the panel is gone as soon as one row matches', async () => {
    const el = await mount({ ...readyProps(), query: 'zzzz-nothing' });
    expect(sr(el).querySelectorAll('.sk-empty-state').length).toBe(1);
    el.query = '';
    await settle(el);
    expect(sr(el).querySelectorAll('.sk-empty-state').length).toBe(0);
  });
});

describe('paging', () => {
  it('the Load more row is the last li while a next page exists, and absent on the last page', async () => {
    const el = await mount({ ...readyProps(), missions: firstMissions, pageInfo: firstPageInfo });
    const items = [...sr(el).querySelectorAll('ul > li')];
    expect(items.length).toBe(3);
    expect(items[2]).toBe(loadMoreItem(el));
    expect(loadMoreButton(el).textContent?.trim()).toBe('Load more Missions');
    el.pageInfo = lastPageInfo(2);
    await settle(el);
    expect(loadMoreItem(el)).toBeNull();
    expect(sr(el).querySelectorAll('ul > li').length).toBe(2);
  });

  it('activation emits exactly one sk-load-more with the page cursor', async () => {
    const el = await mount({ ...readyProps(), missions: firstMissions, pageInfo: firstPageInfo });
    const events = collect<{ cursor: string }>(el, 'sk-load-more');
    loadMoreButton(el).click();
    await settle(el);
    expect(events.length).toBe(1);
    expect(events[0]?.detail).toEqual({ cursor: 'cGFnZS0y' });
    expectCrossing(events[0] as CustomEvent<unknown>);
  });

  it('while loadingMore the row is busy and inert (positive control: it emits again afterwards)', async () => {
    const el = await mount({ ...readyProps(), missions: firstMissions, pageInfo: firstPageInfo, loadingMore: true });
    const events = collect<{ cursor: string }>(el, 'sk-load-more');
    expect(loadMoreButton(el).hasAttribute('busy')).toBe(true);
    expect(loadMoreItem(el)?.getAttribute('aria-busy')).toBe('true');
    loadMoreButton(el).click();
    await settle(el);
    expect(events.length).toBe(0);
    el.loadingMore = false;
    await settle(el);
    expect(loadMoreButton(el).hasAttribute('busy')).toBe(false);
    loadMoreButton(el).click();
    await settle(el);
    expect(events.length).toBe(1);
  });

  it('a second activation before the host answers emits nothing; loadingMore or the next page re-arms it (C-09)', async () => {
    const el = await mount({ ...readyProps(), missions: firstMissions, pageInfo: firstPageInfo });
    const events = collect<{ cursor: string }>(el, 'sk-load-more');
    loadMoreButton(el).click();
    loadMoreButton(el).click();
    await settle(el);
    expect(events.map((e) => e.detail.cursor)).toEqual(['cGFnZS0y']);
    // the host answers with loadingMore, then drops it (a failed load): the same cursor may be asked again
    el.loadingMore = true;
    await settle(el);
    el.loadingMore = false;
    await settle(el);
    loadMoreButton(el).click();
    loadMoreButton(el).click();
    await settle(el);
    expect(events.map((e) => e.detail.cursor)).toEqual(['cGFnZS0y', 'cGFnZS0y']);
    // the next page arrives with a new cursor: one more
    el.missions = [...firstMissions, ...mixedMissions.slice(0, 1).map((m) => ({ ...m, missionId: 'NEXT-1' }))];
    el.pageInfo = { hasNextPage: true, nextPageCursor: 'cGFnZS0z', pageSize: 2 };
    await settle(el);
    loadMoreButton(el).click();
    loadMoreButton(el).click();
    await settle(el);
    expect(events.map((e) => e.detail.cursor)).toEqual(['cGFnZS0y', 'cGFnZS0y', 'cGFnZS0z']);
  });

  it('a next page without a cursor offers no Load more row', async () => {
    const broken: PageInfo = { hasNextPage: true, nextPageCursor: null, pageSize: 2 };
    const el = await mount({ ...readyProps(), missions: firstMissions, pageInfo: broken });
    expect(loadMoreItem(el)).toBeNull();
  });

  it('a long list is one scroll region of the shell: the screen sets no scroll listener and does not load by itself', async () => {
    const el = await mount({ ...readyProps(), missions: longMissions, pageInfo: longPageInfo });
    const events = collect<unknown>(el, 'sk-load-more');
    expect(missionItems(el).length).toBe(40);
    window.scrollTo(0, 100000);
    await settle(el);
    expect(events.length).toBe(0);
  });
});

describe('result-count live region', () => {
  it('is a polite status region, visually hidden, not a control, empty on first render', async () => {
    const el = await mount();
    const region = liveRegion(el);
    expect(region.getAttribute('role')).toBe('status');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.textContent?.trim()).toBe('');
    const box = region.getBoundingClientRect();
    expect(box.width).toBeLessThanOrEqual(1);
    expect(box.height).toBeLessThanOrEqual(1);
    expect(region.hasAttribute('tabindex')).toBe(false);
    expect(region.querySelectorAll('button, a, input, sk-button').length).toBe(0);
  });

  it('announces the number shown after a filter change and after a search change, and emits no event of its own', async () => {
    const el = await mount({ ...readyProps(), missions: fullMissions, pageInfo: fullMoreInfo });
    const region = liveRegion(el);
    const own: string[] = [];
    region.addEventListener('sk-open-mission', () => own.push('open'));
    expect(region.textContent?.trim()).toBe('');
    await pressFilter(el, 'Active');
    expect(region.textContent?.trim()).toBe('3 Missions shown');
    await typeQuery(el, 'blocked');
    expect(region.textContent?.trim()).toBe('1 Mission shown');
    await pressFilter(el, 'Planned');
    expect(region.textContent?.trim()).toBe('0 Missions shown');
    expect(own).toEqual([]);
  });

  it('repeats an announcement whose text did not change: each one is a change in the live region (PR-CORRECTNESS-004)', async () => {
    const el = await mount({ ...readyProps(), missions: fullMissions, pageInfo: fullMoreInfo });
    const region = liveRegion(el);
    await pressFilter(el, 'Active');
    const first = region.textContent?.trim();
    expect(first).toBe('3 Missions shown');
    const records: MutationRecord[] = [];
    const observer = new MutationObserver((list) => records.push(...list));
    observer.observe(region, { childList: true, characterData: true, subtree: true });
    await pressFilter(el, 'Planned');
    await new Promise((resolve) => setTimeout(resolve, 0));
    observer.disconnect();
    expect(region.textContent?.trim(), 'same text again').toBe(first);
    expect(records.length, 'the region changed in the DOM').toBeGreaterThan(0);
  });

  it('announces the full count after load more when nothing is filtered', async () => {
    const el = await mount({ ...readyProps(), missions: firstMissions, pageInfo: firstPageInfo });
    const region = liveRegion(el);
    expect(region.textContent?.trim()).toBe('');
    el.missions = [...firstMissions, ...mixedMissions];
    await settle(el);
    expect(region.textContent?.trim()).toBe('8 Missions shown');
  });

  it('a host-set filter, query or an unchanged missions array announces nothing (positive control: a press does)', async () => {
    const el = await mount({ ...readyProps(), missions: fullMissions, pageInfo: fullPageInfo });
    const region = liveRegion(el);
    el.filter = 'done';
    el.query = 'mission';
    el.missions = [...fullMissions].reverse();
    await settle(el);
    expect(region.textContent?.trim()).toBe('');
    await pressFilter(el, 'Planned');
    expect(region.textContent?.trim()).toBe('3 Missions shown');
  });

  it('a shorter list from the host announces nothing (positive control: a press does)', async () => {
    const el = await mount({ ...readyProps(), missions: fullMissions, pageInfo: fullPageInfo });
    const region = liveRegion(el);
    el.missions = fullMissions.slice(0, fullMissions.length - 2);
    await settle(el);
    expect(missionItems(el).length).toBe(fullMissions.length - 2);
    expect(region.textContent?.trim()).toBe('');
    await pressFilter(el, 'Planned');
    expect(region.textContent?.trim()).not.toBe('');
  });

  it('a list that grows from empty announces nothing (positive control: a press does)', async () => {
    const el = await mount({ ...readyProps(), missions: [], pageInfo: fullPageInfo });
    const region = liveRegion(el);
    el.missions = fullMissions;
    await settle(el);
    expect(missionItems(el).length).toBe(fullMissions.length);
    expect(region.textContent?.trim()).toBe('');
    await pressFilter(el, 'Planned');
    expect(region.textContent?.trim()).toBe('3 Missions shown');
  });

  it('is not in the tab order', async () => {
    const el = await mount();
    const region = liveRegion(el);
    searchInput(el).focus();
    const seen = new Set<Element>();
    for (let i = 0; i < 12; i += 1) {
      await userEvent.tab();
      const active = deepActive();
      if (active) seen.add(active);
    }
    expect([...seen].some((node) => region.contains(node) || node === region)).toBe(false);
    expect(seen.size).toBeGreaterThan(6);
  });
});

describe('Tab order per tier', () => {
  const tiers = [1280, 1024, 800, 680, 390, 320];

  async function mountInShell(width: number, props: Props = readyProps()): Promise<{ screen: SkMissionsScreen; shell: HTMLElement }> {
    await page.viewport(width, 800);
    const host = document.createElement('div');
    document.body.append(host);
    render(
      shellFrame(html`<sk-missions-screen
        status=${props.status ?? 'ready'}
        .project=${props.project ?? null}
        branch=${props.branch ?? ''}
        .missions=${props.missions ?? []}
        .pageInfo=${props.pageInfo ?? null}
        now=${props.now ?? ''}
      ></sk-missions-screen>`),
      host,
    );
    const shell = one<HTMLElement>(host, 'sk-mission-shell');
    const screen = one<SkMissionsScreen>(host, 'sk-missions-screen');
    await (shell as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete;
    await settle(screen);
    return { screen, shell };
  }

  /** Tabs from a sentinel before the shell; returns every stop in order until focus leaves the document. */
  async function walk(): Promise<Element[]> {
    const before = document.createElement('a');
    before.href = '#before';
    before.textContent = 'before';
    document.body.prepend(before);
    before.focus();
    const stops: Element[] = [];
    for (let i = 0; i < 90; i += 1) {
      await userEvent.tab();
      const active = deepActive();
      if (!active || active === document.body) break;
      if (stops.includes(active)) break;
      stops.push(active);
    }
    return stops;
  }

  const inScreen = (screen: SkMissionsScreen, node: Element): boolean => {
    let current: Node | null = node;
    while (current) {
      if (current === screen) return true;
      current = current.parentNode ?? (current as ShadowRoot).host ?? null;
    }
    return false;
  };

  for (const width of tiers) {
    it(`${width}px: search, six filters, then one stop per row, in order`, async () => {
      const { screen } = await mountInShell(width);
      const stops = await walk();
      const mine = stops.filter((node) => inScreen(screen, node));
      // search + 6 filters + 6 rows (the Populated page has no Load more row)
      expect(mine.length).toBe(1 + 6 + 6);
      expect(mine[0]).toBe(searchInput(screen));
      const buttons = [...(filterGroup(screen).shadowRoot?.querySelectorAll('button') ?? [])];
      expect(mine.slice(1, 7)).toEqual(buttons);
      expect(mine.slice(7)).toEqual(missionItems(screen).map((li) => rowButton(li)));
      expect(new Set(mine).size).toBe(13);
    });
  }

  it('the Load more row adds exactly one stop, last', async () => {
    const { screen } = await mountInShell(1280, { ...readyProps(), missions: firstMissions, pageInfo: firstPageInfo });
    const stops = (await walk()).filter((node) => inScreen(screen, node));
    expect(stops.length).toBe(1 + 6 + 2 + 1);
    expect(stops[stops.length - 1]?.closest?.('sk-button') ?? (stops[stops.length - 1]?.getRootNode() as ShadowRoot).host).toBe(loadMoreButton(screen));
  });

  it('the focused stories press Tab as many times as it takes to reach the search and the first row', async () => {
    const { screen } = await mountInShell(1280);
    const stops = await walk();
    const searchStop = stops.indexOf(searchInput(screen)) + 1;
    const rowStop = stops.indexOf(rowButton(missionItems(screen)[0] as HTMLLIElement)) + 1;
    expect(searchStop).toBeGreaterThan(0);
    expect(rowStop).toBe(searchStop + 7);
    expect(stories.SearchFocused1280.tags).toEqual(['vw-1280', `tab-${searchStop}`]);
    expect(stories.RowFocused1280.tags).toEqual(['vw-1280', `tab-${rowStop}`]);
  });
});

describe('large text', () => {
  for (const width of [1100, 720]) {
    it(`a 200% root font at ${width}px causes no horizontal overflow of the content`, async () => {
      document.documentElement.style.fontSize = '200%';
      await page.viewport(width, 900);
      const host = document.createElement('div');
      document.body.append(host);
      render(
        shellFrame(html`<sk-missions-screen
          status="ready"
          .project=${project}
          branch="main"
          .missions=${longMissions}
          .pageInfo=${longPageInfo}
          now=${NOW}
        ></sk-missions-screen>`),
        host,
      );
      const shell = one<HTMLElement>(host, 'sk-mission-shell');
      const screen = one<SkMissionsScreen>(host, 'sk-missions-screen');
      await (shell as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete;
      await settle(screen);
      const content = one<HTMLElement>(shell.shadowRoot as ShadowRoot, '[data-content]');
      expect(content.scrollWidth).toBeLessThanOrEqual(content.clientWidth);
      expect(screen.scrollWidth).toBeLessThanOrEqual(screen.clientWidth);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
    });
  }
});

describe('long names keep the row compact (inline title and slug)', () => {
  for (const width of [1280, 680]) {
    it(`unbreakable name and slug at ${width}px: bounded card, slug wider than a glyph, tags and time inside the row`, async () => {
      await page.viewport(width, 900);
      const host = document.createElement('div');
      document.body.append(host);
      render(
        shellFrame(html`<sk-missions-screen
          status="ready"
          .project=${projectOf(1)}
          branch="main"
          .missions=${longNameMissions}
          .pageInfo=${longNamePageInfo}
          now=${NOW}
        ></sk-missions-screen>`),
        host,
      );
      const shell = one<HTMLElement>(host, 'sk-mission-shell');
      const screen = one<SkMissionsScreen>(host, 'sk-missions-screen');
      await (shell as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete;
      await settle(screen);
      const row = one<HTMLElement>(screen.shadowRoot as ShadowRoot, 'sk-action-row');
      const rowBox = row.getBoundingClientRect();
      // Measured 154 px at 1280 and 222 px at 680 (the broken layout was 2384 px): a bound about 30% above each.
      expect(rowBox.height).toBeLessThan(width === 1280 ? 200 : 290);
      const parts = (name: string): HTMLElement => one<HTMLElement>(row.shadowRoot as ShadowRoot, `[part~="${name}"]`);
      const slug = parts('reference').getBoundingClientRect();
      expect(slug.width).toBeGreaterThan(60);
      const inside = (box: DOMRect): boolean =>
        box.width > 0 && box.height > 0 && box.top >= rowBox.top - 1 && box.bottom <= rowBox.bottom + 1 && box.left >= rowBox.left - 1 && box.right <= rowBox.right + 1;
      expect(inside(slug)).toBe(true);
      for (const name of ['tags', 'metadata']) expect(inside(parts(name).getBoundingClientRect())).toBe(true);
    });
  }
});

describe('operator Storybook review: no-match gap and full-width state panels (items 2 and 3)', () => {
  /** The pixel length a spacing token resolves to. */
  function spaceOf(token: string): number {
    const probe = document.createElement('div');
    probe.style.paddingLeft = `var(${token})`;
    document.body.append(probe);
    const value = parseFloat(getComputedStyle(probe).paddingLeft);
    probe.remove();
    return value;
  }

  it('item 2: Load more does not touch the no-match panel; a standard token gap sits between them', async () => {
    const el = await mount({ ...readyProps(), missions: fullMissions, pageInfo: fullMoreInfo });
    el.query = 'zzzz-nothing';
    await settle(el);
    const panel = one<HTMLElement>(sr(el), '.sk-empty-state').getBoundingClientRect();
    const loadMore = loadMoreButton(el).getBoundingClientRect();
    expect(loadMore.top - panel.bottom).toBeGreaterThanOrEqual(spaceOf('--sk-space-4') - 0.5);
  });

  const widthCases: Array<[string, Props, string]> = [
    ['empty', { status: 'empty' }, '.sk-empty-state'],
    ['loading', { status: 'loading' }, '.sk-empty-state'],
    ['error', { status: 'error' }, 'sk-notice'],
  ];
  for (const [name, props, selector] of widthCases) {
    it(`item 3: the ${name} panel spans the full content width`, async () => {
      const el = await mount({ ...props, project, branch: BRANCH });
      const panel = one<HTMLElement>(sr(el), selector).getBoundingClientRect();
      const host = el.getBoundingClientRect();
      expect(Math.abs(panel.left - host.left), 'left edge').toBeLessThanOrEqual(1);
      expect(Math.abs(panel.right - host.right), 'right edge').toBeLessThanOrEqual(1);
    });
  }

  it('item 3 follow-up: the loading label and bar are centred in the panel and the panel keeps the card fill', async () => {
    const el = await mount({ status: 'loading', project, branch: BRANCH });
    const panel = one<HTMLElement>(sr(el), '.sk-empty-state');
    const box = panel.getBoundingClientRect();
    const centre = box.left + box.width / 2;
    // The label and the bar sit on one row; that row, label and bar together, is centred in the panel.
    const label = one<HTMLElement>(panel, '.sk-progress__label').getBoundingClientRect();
    const bar = one<HTMLElement>(panel, '.sk-progress__bar').getBoundingClientRect();
    const row = (Math.min(label.left, bar.left) + Math.max(label.right, bar.right)) / 2;
    expect(Math.abs(row - centre), 'label and bar row').toBeLessThanOrEqual(1);
    // The card fill is the surface-card token (rgb(24, 26, 31) in the dark theme the baselines use).
    const probe = document.createElement('div');
    probe.style.background = 'var(--sk-surface-card)';
    (panel.parentElement as HTMLElement).append(probe);
    const fill = getComputedStyle(probe).backgroundColor;
    probe.remove();
    expect(fill).not.toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(panel).backgroundColor).toBe(fill);
  });
});

describe('container queries leave no gap at fractional widths (C-02)', () => {
  const triggerAreas = (el: SkMissionsScreen): string => {
    const row = one<HTMLElement>(sr(el), 'sk-action-row');
    const trigger = one<HTMLElement>(row.shadowRoot as ShadowRoot, '[part="trigger"]');
    return getComputedStyle(trigger).gridTemplateAreas;
  };

  it('every width is either the library narrow layout (up to 400px) or the screen layout (above it), 400.5 included', async () => {
    const seen: Array<[string, string]> = [];
    for (const width of [399, 400, 400.5, 400.99, 401, 402]) {
      await page.viewport(900, 900);
      const box = document.createElement('div');
      box.style.inlineSize = `${width}px`;
      const el = document.createElement('sk-missions-screen');
      Object.assign(el, { ...readyProps(), missions: [mixedMissions[0] as MissionOverviewView] });
      box.append(el);
      document.body.append(box);
      await settle(el);
      seen.push([String(width), triggerAreas(el).replace(/\s+/g, ' ')]);
      document.body.replaceChildren();
    }
    // the screen layout puts the slug on the title line; the library wide default does not
    const screenLayout = (areas: string): boolean => areas.includes('"marker title reference metadata"');
    expect(seen.map(([width, areas]) => [width, screenLayout(areas)])).toEqual([
      ['399', false],
      ['400', false],
      ['400.5', true],
      ['400.99', true],
      ['401', true],
      ['402', true],
    ]);
  });
});

describe('operator Storybook review item 9: one gap above the list and above Load more', () => {
  const firstVisible = (el: SkMissionsScreen): HTMLLIElement => missionItems(el).find((li) => !li.hidden) as HTMLLIElement;
  const lastVisible = (el: SkMissionsScreen): HTMLLIElement => missionItems(el).filter((li) => !li.hidden).pop() as HTMLLIElement;

  it('toolbar to first row equals last row to Load more on a paged list', async () => {
    const el = await mount({ ...readyProps(), missions: fullMissions, pageInfo: fullMoreInfo });
    const toolbar = one<HTMLElement>(sr(el), '[data-toolbar]').getBoundingClientRect();
    const toFirst = firstVisible(el).getBoundingClientRect().top - toolbar.bottom;
    const toMore = loadMoreItem(el)!.getBoundingClientRect().top - lastVisible(el).getBoundingClientRect().bottom;
    expect(toFirst).toBeGreaterThan(0);
    expect(Math.abs(toFirst - toMore)).toBeLessThanOrEqual(0.5);
  });

  it('toolbar to first row equals no-match panel to Load more', async () => {
    const el = await mount({ ...readyProps(), missions: fullMissions, pageInfo: fullMoreInfo });
    const toolbar = one<HTMLElement>(sr(el), '[data-toolbar]').getBoundingClientRect();
    const toFirst = firstVisible(el).getBoundingClientRect().top - toolbar.bottom;
    el.query = 'zzzz-nothing';
    await settle(el);
    const panel = one<HTMLElement>(sr(el), '.sk-empty-state').getBoundingClientRect();
    const toMore = loadMoreItem(el)!.getBoundingClientRect().top - panel.bottom;
    expect(Math.abs(toFirst - toMore)).toBeLessThanOrEqual(0.5);
  });
});

describe('operator Storybook review item 10: the lifecycle badge starts at the row content edge when stacked', () => {
  for (const width of [390, 320]) {
    it(`at ${width}: badge, title and tag pills share one left edge`, async () => {
      const el = await mount(readyProps(), width);
      const li = missionItems(el)[0] as HTMLLIElement;
      const title = one<HTMLElement>(li, '[slot="title"]').getBoundingClientRect().left;
      const tags = one<HTMLElement>(li, '[data-badges] sk-pill-tag').getBoundingClientRect().left;
      const badge = one<HTMLElement>(li, '[slot="metadata"] sk-pill-tag').getBoundingClientRect().left;
      expect(Math.abs(tags - title), 'tags').toBeLessThanOrEqual(1);
      expect(Math.abs(badge - title), 'badge').toBeLessThanOrEqual(1);
    });
  }
});

describe('state panel chrome and display face (E-13, N-7; operator rulings F1 and F4)', () => {
  /** The computed value of a property off a probe element that sets it from a token. */
  function fromToken(property: 'fontFamily' | 'fontWeight' | 'borderTopColor', token: string): string {
    const probe = document.createElement('div');
    if (property === 'borderTopColor') probe.style.border = `1px solid var(${token})`;
    else probe.style[property] = `var(${token})`;
    document.body.append(probe);
    const value = getComputedStyle(probe)[property];
    probe.remove();
    return value;
  }

  // The loading panel has no heading (a progress bar and a body line); the empty panel and the no-match panel do.
  const cases: Array<[string, Props, string, string, boolean]> = [
    ['empty', { status: 'empty', missions: [], project: projectOf(0) }, 'dashed', '--sk-border-control', true],
    ['loading', { status: 'loading' }, 'solid', '--sk-border-default', false],
  ];
  for (const [name, props, style, colourToken, hasHeading] of cases) {
    it(`${name}: a ${style} token border, a radius, a filled card background${hasHeading ? ' and the display-face heading' : ''}`, async () => {
      const el = await mount({ ...props, project, branch: BRANCH });
      const panel = one<HTMLElement>(sr(el), '.sk-empty-state');
      const computed = getComputedStyle(panel);
      expect(computed.borderTopStyle).toBe(style);
      expect(computed.borderTopWidth).toBe('1px');
      expect(computed.borderTopColor).toBe(fromToken('borderTopColor', colourToken));
      expect(parseFloat(computed.borderTopLeftRadius)).toBeGreaterThan(0);
      expect(computed.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      if (!hasHeading) return;
      const heading = one<HTMLElement>(panel, 'h2');
      expect(getComputedStyle(heading).fontFamily).toBe(fromToken('fontFamily', '--sk-font-display'));
      expect(getComputedStyle(heading).fontWeight).toBe(fromToken('fontWeight', '--sk-weight-bold'));
    });
  }

  it('no-match: a dashed token border, a radius, a filled background and the display-face heading', async () => {
    const el = await mount({ ...readyProps(), missions: fullMissions, pageInfo: fullMoreInfo });
    el.query = 'zzzz-nothing';
    await settle(el);
    const panel = one<HTMLElement>(sr(el), '[data-no-match]');
    const computed = getComputedStyle(panel);
    expect(computed.borderTopStyle).toBe('dashed');
    expect(computed.borderTopColor).toBe(fromToken('borderTopColor', '--sk-border-control'));
    expect(parseFloat(computed.borderTopLeftRadius)).toBeGreaterThan(0);
    expect(computed.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(one<HTMLElement>(panel, 'h2')).fontFamily).toBe(fromToken('fontFamily', '--sk-font-display'));
  });
});

describe('state stories carry a shell that agrees with them (PR-VISUAL-006)', () => {
  const countIn = (text: string): string => /(\d+) Missions?/.exec(text)?.[1] ?? 'none';
  for (const [name, story] of [
    ['empty', stories.Empty1280],
    ['loading', stories.Loading1280],
    ['error', stories.Error1280],
  ] as const) {
    it(`${name}: the shell sidebar names the same Mission count as the screen header`, async () => {
      const args = { ...stories.default.args, ...story.args };
      const host = document.createElement('div');
      document.body.append(host);
      const meta = stories.default as unknown as { render: (a: unknown, c: unknown) => unknown };
      render(meta.render(args, {}) as ReturnType<typeof html>, host);
      const shell = host.querySelector('sk-mission-shell') as HTMLElement & { updateComplete: Promise<boolean>; project: { detail?: string } | null };
      const screen = host.querySelector('sk-missions-screen') as SkMissionsScreen;
      await shell.updateComplete;
      await settle(screen);
      const header = countIn(sr(screen).textContent ?? '');
      const sidebar = countIn(shell.project?.detail ?? '');
      expect(sidebar, `${name} sidebar`).not.toBe('none');
      expect(sidebar, `${name} sidebar equals header`).toBe(args.project === undefined || args.project === null ? sidebar : String(args.project.missionCount));
      if (name === 'empty') expect(sidebar).toBe('0');
      expect(header === 'none' || header === sidebar, `${name} header ${header}`).toBe(true);
    });
  }

  // The stories' shared count is the same number in the shell and the header, so on their own they cannot contradict.
  // Overriding the count makes the shell prove it follows the screen's own state instead of the shared sample frame.
  for (const [name, story] of [
    ['loading', stories.Loading1280],
    ['error', stories.Error1280],
  ] as const) {
    it(`${name}: the shell sidebar follows the screen's Mission count (3, not the sample frame's 6)`, async () => {
      const args = { ...stories.default.args, ...story.args, project: projectOf(3) };
      const host = document.createElement('div');
      document.body.append(host);
      const meta = stories.default as unknown as { render: (a: unknown, c: unknown) => unknown };
      render(meta.render(args, {}) as ReturnType<typeof html>, host);
      const shell = host.querySelector('sk-mission-shell') as HTMLElement & { updateComplete: Promise<boolean>; project: { detail?: string } | null };
      const screen = host.querySelector('sk-missions-screen') as SkMissionsScreen;
      await shell.updateComplete;
      await settle(screen);
      expect(countIn(shell.project?.detail ?? ''), `${name} sidebar`).toBe('3');
      expect(countIn(sr(screen).textContent ?? ''), `${name} header`).toBe('3');
    });
  }
});
