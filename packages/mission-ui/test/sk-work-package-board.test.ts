import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import type { SkWorkPackageBoard, SkSelectWorkPackageDetail } from '../src/elements/sk-work-package-board/sk-work-package-board.js';
import {
  badgesWps,
  customGroups,
  customGroupsWps,
  fiveColumnsWps,
  foreignLabels,
  longNamesWps,
  subtaskProgressWps,
  unknownAndNullWps,
  wp,
} from '../src/elements/sk-work-package-board/fixtures.js';
import type { WorkPackageView } from '../src/contract/types.js';
import type { LaneGroup } from '../src/logic/types.js';
import { BOARD_LABEL, DEFAULT_LANE_GROUPS, NOT_STARTED_BADGE, STATE_BADGES } from '../src/defaults/index.js';

async function mount(workPackages: WorkPackageView[], extra: Partial<SkWorkPackageBoard> = {}, width?: number): Promise<SkWorkPackageBoard> {
  const el = document.createElement('sk-work-package-board');
  el.workPackages = workPackages;
  el.missionId = 'MISSION-1';
  Object.assign(el, extra);
  if (width === undefined) {
    document.body.append(el);
  } else {
    const box = document.createElement('div');
    box.style.inlineSize = `${width}px`;
    box.append(el);
    document.body.append(box);
  }
  await el.updateComplete;
  return el;
}

/** The spoken counts of the five columns of `fiveColumnsWps`: one card each. */
const SPOKEN_FIVE_COLUMNS = ['1 Work Package', '1 Work Package', '1 Work Package', '1 Work Package', '1 Work Package'];

const root = (el: SkWorkPackageBoard): ShadowRoot => {
  if (el.shadowRoot === null) throw new Error('no shadow root');
  return el.shadowRoot;
};
const lanes = (el: SkWorkPackageBoard): HTMLElement[] => [...root(el).querySelectorAll<HTMLElement>('section.sk-workflow-lane')];
const laneTitle = (lane: HTMLElement): string => lane.querySelector('h3')?.textContent?.trim() ?? '';
const laneCount = (lane: HTMLElement): HTMLElement | null => lane.querySelector<HTMLElement>('[data-lane-count]');
const cardsOf = (lane: HTMLElement): HTMLElement[] => [...lane.querySelectorAll<HTMLElement>('ol > li > sk-action-row')];
const allCards = (el: SkWorkPackageBoard): HTMLElement[] => [...root(el).querySelectorAll<HTMLElement>('sk-action-row')];
const idsByLane = (el: SkWorkPackageBoard): string[][] => lanes(el).map((lane) => cardsOf(lane).map((card) => card.getAttribute('row-id') ?? ''));
const card = (el: SkWorkPackageBoard, wpId: string): HTMLElement => {
  const found = allCards(el).find((c) => c.getAttribute('row-id') === wpId);
  if (found === undefined) throw new Error(`no card ${wpId}`);
  return found;
};
const pillOf = (c: HTMLElement): HTMLElement | null => c.querySelector<HTMLElement>('sk-pill-tag');
const progressOf = (c: HTMLElement): HTMLProgressElement | null => c.querySelector<HTMLProgressElement>('progress');
const triggerOf = (c: HTMLElement): HTMLButtonElement => {
  const button = c.shadowRoot?.querySelector('button');
  if (!button) throw new Error('no trigger button');
  return button;
};

function listen(target: EventTarget, type: string): Event[] {
  const seen: Event[] = [];
  target.addEventListener(type, (event) => seen.push(event));
  return seen;
}

afterEach(async () => {
  document.body.replaceChildren();
  await page.viewport(414, 896);
});

describe('defaults: showsProgress', () => {
  it('is true on exactly one default group, the one holding claimed and in_progress', () => {
    const flagged = DEFAULT_LANE_GROUPS.filter((g) => g.showsProgress === true);
    expect(flagged.length).toBe(1);
    expect(flagged[0]?.lanes).toEqual(['claimed', 'in_progress']);
  });
});

describe('sk-work-package-board columns and placement', () => {
  it('renders the five default columns from laneGroups, in order, with the default heading', async () => {
    const el = await mount(fiveColumnsWps);
    expect(lanes(el).length).toBe(5);
    expect(lanes(el).map(laneTitle)).toEqual(DEFAULT_LANE_GROUPS.map((g) => g.label));
    expect(root(el).querySelector('h2')?.textContent?.trim()).toBe(BOARD_LABEL);
  });

  it('places a work package of every default lane in the column that holds it', async () => {
    const lanesList = DEFAULT_LANE_GROUPS.flatMap((g) => g.lanes);
    expect(lanesList.length).toBe(9);
    const el = await mount(lanesList.map((lane, i) => wp({ wpId: `W${i}`, title: `T${i}`, statusLane: lane })));
    expect(idsByLane(el)).toEqual([['W0', 'W1'], ['W2', 'W3'], ['W4', 'W5'], ['W6'], ['W7', 'W8']]);
  });

  it('shows the card count of each column, equal to the rendered cards, and names it', async () => {
    const el = await mount(fiveColumnsWps);
    let ran = 0;
    const spokenTexts: string[] = [];
    for (const lane of lanes(el)) {
      const count = laneCount(lane);
      expect(count?.textContent?.trim()).toBe(String(cardsOf(lane).length));
      // A role-less span cannot carry an accessible name: the digit is hidden from assistive technology and a visually hidden
      // text next to it, from src/defaults, says it.
      expect(count?.getAttribute('aria-label')).toBeNull();
      expect(count?.getAttribute('aria-hidden')).toBe('true');
      const spoken = count?.nextElementSibling as HTMLElement | null;
      expect(spoken?.hasAttribute('data-lane-count-text')).toBe(true);
      spokenTexts.push(spoken?.textContent?.trim() ?? '');
      expect(spoken?.getBoundingClientRect().width).toBeLessThanOrEqual(1);
      ran += 1;
    }
    expect(ran).toBe(5);
    // Literals, not the helper: the words themselves are pinned (a count of one is singular, C-03).
    expect(spokenTexts).toEqual(SPOKEN_FIVE_COLUMNS);
  });

  it('names each column section by its title', async () => {
    const el = await mount(fiveColumnsWps);
    let ran = 0;
    for (const lane of lanes(el)) {
      const title = lane.querySelector('h3');
      expect(title?.id).not.toBe('');
      expect(lane.getAttribute('aria-labelledby')).toBe(title?.id);
      ran += 1;
    }
    expect(ran).toBe(5);
  });

  it('tracks every lane title at 0.08em (E-09 pinned literal), uppercase mono, and not the card text', async () => {
    const el = await mount(fiveColumnsWps);
    const titles = [...root(el).querySelectorAll<HTMLElement>('.sk-workflow-lane__title')];
    expect(titles).toHaveLength(5);
    for (const title of titles) {
      const style = getComputedStyle(title);
      expect(style.textTransform).toBe('uppercase');
      // 0.08em of the title's own font size, in computed px.
      expect(parseFloat(style.letterSpacing)).toBeCloseTo(parseFloat(style.fontSize) * 0.08, 2);
    }
    expect(getComputedStyle(cardsOf(lanes(el)[0] as HTMLElement)[0] as HTMLElement).letterSpacing).toBe('normal');
  });

  it('puts a null lane and an unknown lane in the first column, the unknown one with its raw value as badge', async () => {
    const el = await mount(unknownAndNullWps);
    expect(idsByLane(el)).toEqual([['WP01', 'WP02', 'WP03'], ['WP04'], [], [], []]);
    expect(pillOf(card(el, 'WP02'))?.textContent?.trim()).toBe('parked');
    expect(pillOf(card(el, 'WP03'))?.textContent?.trim()).toBe(NOT_STARTED_BADGE.label);
  });

  it('keeps the input order inside a column and never sorts', async () => {
    const el = await mount([
      wp({ wpId: 'WP09', title: 'Z', statusLane: 'planned' }),
      wp({ wpId: 'WP01', title: 'A', statusLane: 'blocked' }),
      wp({ wpId: 'WP05', title: 'M', statusLane: 'planned' }),
    ]);
    expect(idsByLane(el)[0]).toEqual(['WP09', 'WP01', 'WP05']);
  });

  it('puts a lane that two groups hold in the first of them', async () => {
    const groups: LaneGroup[] = [
      { id: 'a', label: 'A', lanes: ['planned'] },
      { id: 'b', label: 'B', lanes: ['planned', 'done'] },
    ];
    const el = await mount([wp({ wpId: 'W1', title: 't', statusLane: 'planned' }), wp({ wpId: 'W2', title: 't', statusLane: 'done' })], { laneGroups: groups });
    expect(idsByLane(el)).toEqual([['W1'], ['W2']]);
  });

  it('renders custom groups with their own labels and no default lane word', async () => {
    const el = await mount(customGroupsWps, { laneGroups: customGroups });
    expect(lanes(el).map(laneTitle)).toEqual(['Intake', 'Build', 'Shipped']);
    expect(idsByLane(el)).toEqual([['WP01', 'WP02'], ['WP03'], ['WP04']]);
    const text = root(el).textContent ?? '';
    for (const word of ['Planned', 'In progress', 'Review', 'Approved', 'Done']) expect(text).not.toContain(word);
  });

  it('makes one synthetic column titled by the label for empty groups and drops nothing', async () => {
    const el = await mount(fiveColumnsWps, { laneGroups: [], label: 'My board' });
    expect(lanes(el).length).toBe(1);
    expect(laneTitle(lanes(el)[0] as HTMLElement)).toBe('My board');
    expect(idsByLane(el)).toEqual([['WP04', 'WP03', 'WP02', 'WP05', 'WP01']]);
  });

  it('renders an empty column as a header and an empty list without placeholder text', async () => {
    const el = await mount([wp({ wpId: 'W1', title: 't', statusLane: 'planned' })]);
    const empty = lanes(el)[3] as HTMLElement;
    expect(laneTitle(empty)).toBe('Approved');
    expect(empty.querySelectorAll('ol > li').length).toBe(0);
    expect(empty.textContent?.replace(/\s+/g, ' ').trim()).toBe('Approved 0 0 Work Packages');
  });

  it('renders a foreign vocabulary without any default label', async () => {
    const el = await mount(customGroupsWps, { laneGroups: customGroups, labels: foreignLabels });
    expect(pillOf(card(el, 'WP03'))?.textContent?.trim()).toBe('st:working');
    const text = root(el).textContent ?? '';
    for (const badge of Object.values(STATE_BADGES)) expect(text).not.toContain(badge.label);
  });

  it('uses a custom label as the heading', async () => {
    const el = await mount(fiveColumnsWps, { label: 'Pipeline board' });
    expect(root(el).querySelector('h2')?.textContent?.trim()).toBe('Pipeline board');
  });
});

describe('sk-work-package-board cards', () => {
  it('shows the id and the state pill in the marker slot and the title in the title slot', async () => {
    const el = await mount(fiveColumnsWps);
    const c = card(el, 'WP03');
    expect(c.querySelector('[slot="marker"] [data-wp-id]')?.textContent?.trim()).toBe('WP03');
    expect(pillOf(c)?.closest('[slot="marker"]')).not.toBeNull();
    expect(pillOf(c)?.textContent?.trim()).toBe(STATE_BADGES['in_progress']?.label);
    expect(pillOf(c)?.getAttribute('status')).toBe(STATE_BADGES['in_progress']?.tone);
    expect(c.querySelector('[slot="title"]')?.textContent?.trim()).toBe('Implement dark mode toggle in preferences');
  });

  it('renders the badges: blocked, reviewing, canceled and not started are four distinct words', async () => {
    const el = await mount(badgesWps);
    const words = badgesWps.map((w) => pillOf(card(el, w.wpId))?.textContent?.trim());
    expect(words).toEqual([NOT_STARTED_BADGE.label, 'blocked', 'reviewing', 'canceled']);
    expect(new Set(words).size).toBe(4);
    expect(pillOf(card(el, 'WP02'))?.getAttribute('status')).toBe('danger');
  });

  it('places blocked with planned and canceled with done', async () => {
    const el = await mount(badgesWps);
    expect(idsByLane(el)).toEqual([['WP01', 'WP02'], [], ['WP03'], [], ['WP04']]);
  });

  it('renders a card in the Review column with the review word', async () => {
    const el = await mount(fiveColumnsWps);
    const review = lanes(el)[2] as HTMLElement;
    expect(laneTitle(review)).toBe('Review');
    expect(cardsOf(review).length).toBe(1);
    expect(pillOf(cardsOf(review)[0] as HTMLElement)?.textContent?.trim()).toBe('review');
  });

  it('shows the actor and the dependencies when present, as given', async () => {
    const el = await mount(fiveColumnsWps);
    const c = card(el, 'WP04');
    expect(c.querySelector('[slot="metadata"] [data-actor]')?.textContent?.trim()).toBe('agent-alpha');
    expect(c.querySelector('[slot="tags"]')?.textContent?.trim()).toBe('depends on WP03');
  });

  it('lists several dependencies in the given order', async () => {
    const el = await mount([wp({ wpId: 'W1', title: 't', statusLane: 'planned', dependencies: ['WP09', 'WP02'] })]);
    expect(card(el, 'W1').querySelector('[slot="tags"]')?.textContent?.trim()).toBe('depends on WP09, WP02');
  });

  it('omits the actor and the dependencies when absent, without a placeholder', async () => {
    const el = await mount([wp({ wpId: 'W1', title: 't', statusLane: 'planned' })]);
    const c = card(el, 'W1');
    expect(c.querySelector('[data-actor]')).toBeNull();
    expect(c.querySelector('[slot="tags"]')).toBeNull();
    expect(c.textContent).not.toMatch(/depends/);
  });

  it('ends every card with a decorative arrow in the metadata slot, with or without an actor', async () => {
    const el = await mount(fiveColumnsWps);
    const cards = allCards(el);
    expect(cards.length).toBe(5);
    for (const c of cards) {
      const arrow = c.querySelector('[slot="metadata"] [data-arrow]');
      expect(arrow?.getAttribute('aria-hidden')).toBe('true');
      expect(arrow?.textContent?.trim()).toBe('→');
    }
    expect(card(el, 'WP05').querySelector('[data-actor]')).toBeNull();
  });

  it('renders each card as one native button inside an li', async () => {
    const el = await mount(fiveColumnsWps);
    for (const c of allCards(el)) {
      expect(c.parentElement?.localName).toBe('li');
      expect(triggerOf(c).localName).toBe('button');
    }
    expect(allCards(el).length).toBe(5);
  });
});

describe('sk-work-package-board subtask progress', () => {
  it('draws the bar with the values as given in the In progress column only', async () => {
    const el = await mount(subtaskProgressWps);
    const partly = progressOf(card(el, 'WP02'));
    expect(partly?.value).toBe(2);
    expect(partly?.max).toBe(5);
    expect(partly?.getAttribute('aria-label')).toBe('Subtask progress, 2 of 5 done');
    expect(partly?.classList.contains('sk-progress__bar')).toBe(true);
    const complete = progressOf(card(el, 'WP03'));
    expect(complete?.value).toBe(3);
    expect(complete?.max).toBe(3);
  });

  it('draws nothing when total is 0, even in the In progress column', async () => {
    const el = await mount(subtaskProgressWps);
    expect(progressOf(card(el, 'WP04'))).toBeNull();
  });

  it('draws nothing on cards in other columns even when total is above 0', async () => {
    const el = await mount(subtaskProgressWps);
    for (const id of ['WP01', 'WP05', 'WP06']) expect(progressOf(card(el, id)), id).toBeNull();
    expect(allCards(el).filter((c) => progressOf(c) !== null).length).toBe(2);
  });

  it('draws nothing in a custom group without the showsProgress field', async () => {
    const el = await mount(customGroupsWps, { laneGroups: customGroups });
    expect(allCards(el).filter((c) => progressOf(c) !== null).length).toBe(0);
  });

  it('draws the bar in a custom group that sets showsProgress', async () => {
    const groups = customGroups.map((g) => (g.id === 'build' ? { ...g, showsProgress: true } : g));
    const el = await mount(customGroupsWps, { laneGroups: groups });
    expect(allCards(el).filter((c) => progressOf(c) !== null).map((c) => c.getAttribute('row-id'))).toEqual(['WP03']);
  });

  it('puts the progress label into the card accessible name through its content', async () => {
    await mount(subtaskProgressWps);
    await expect.element(page.getByRole('button', { name: /Subtask progress, 2 of 5 done/ })).toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: /Subtask progress, 3 of 3 done/ })).toBeInTheDocument();
  });
});

describe('sk-work-package-board events', () => {
  it('emits sk-select-work-package exactly once per click with { missionId, wpId }', async () => {
    const el = await mount(fiveColumnsWps);
    const events = listen(el, 'sk-select-work-package');
    triggerOf(card(el, 'WP03')).click();
    await el.updateComplete;
    expect(events.length).toBe(1);
    const event = events[0] as CustomEvent<SkSelectWorkPackageDetail>;
    expect(event.detail).toEqual({ missionId: 'MISSION-1', wpId: 'WP03' });
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
    expect(event.cancelable).toBe(false);
  });

  it('emits one event per card with that card id', async () => {
    const el = await mount(fiveColumnsWps);
    const events = listen(el, 'sk-select-work-package');
    let ran = 0;
    for (const c of allCards(el)) {
      triggerOf(c).click();
      ran += 1;
      expect(events.length).toBe(ran);
      expect((events[ran - 1] as CustomEvent<SkSelectWorkPackageDetail>).detail).toEqual({ missionId: 'MISSION-1', wpId: c.getAttribute('row-id') });
    }
    expect(ran).toBe(5);
  });

  it('emits on Enter and on Space, once each', async () => {
    const el = await mount(fiveColumnsWps);
    const events = listen(el, 'sk-select-work-package');
    triggerOf(card(el, 'WP02')).focus();
    await userEvent.keyboard('{Enter}');
    expect(events.length).toBe(1);
    await userEvent.keyboard(' ');
    expect(events.length).toBe(2);
    expect((events[1] as CustomEvent<SkSelectWorkPackageDetail>).detail).toEqual({ missionId: 'MISSION-1', wpId: 'WP02' });
  });

  it('echoes the missionId property', async () => {
    const el = await mount(fiveColumnsWps, { missionId: 'OTHER' });
    const events = listen(el, 'sk-select-work-package');
    triggerOf(card(el, 'WP01')).click();
    expect((events[0] as CustomEvent<SkSelectWorkPackageDetail>).detail).toEqual({ missionId: 'OTHER', wpId: 'WP01' });
  });

  it('does not let the library sk-action-row-activate leak out of the board (positive control in the same test)', async () => {
    const el = await mount(fiveColumnsWps);
    const library = listen(document, 'sk-action-row-activate');
    const own = listen(document, 'sk-select-work-package');
    triggerOf(card(el, 'WP03')).click();
    expect(own.length).toBe(1);
    expect(library.length).toBe(0);
  });

  it('emits nothing when a column title or the empty board area is clicked (positive control)', async () => {
    const el = await mount(fiveColumnsWps);
    const events = listen(el, 'sk-select-work-package');
    root(el).querySelector<HTMLElement>('h3')?.click();
    root(el).querySelector<HTMLElement>('h2')?.click();
    root(el).querySelector<HTMLElement>('.sk-workflow-board__scroller')?.click();
    expect(events.length).toBe(0);
    triggerOf(card(el, 'WP03')).click();
    expect(events.length).toBe(1);
  });

  it('emits nothing when the properties change (positive control)', async () => {
    const el = await mount(fiveColumnsWps);
    const events = listen(el, 'sk-select-work-package');
    el.workPackages = badgesWps;
    await el.updateComplete;
    expect(events.length).toBe(0);
    triggerOf(card(el, 'WP02')).click();
    expect(events.length).toBe(1);
  });
});

describe('sk-work-package-board scroll region', () => {
  it('is a focusable labelled region while it overflows (narrow fixed container)', async () => {
    const el = await mount(fiveColumnsWps, {}, 300);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const scroller = root(el).querySelector<HTMLElement>('.sk-workflow-board__scroller') as HTMLElement;
    expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth);
    expect(scroller.getAttribute('role')).toBe('region');
    expect(scroller.getAttribute('tabindex')).toBe('0');
    const heading = root(el).querySelector('h2') as HTMLElement;
    expect(heading.id).not.toBe('');
    expect(scroller.getAttribute('aria-labelledby')).toBe(heading.id);
  });

  it('carries none of the three attributes while everything fits (wide fixed container)', async () => {
    const el = await mount(fiveColumnsWps, {}, 1000);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const scroller = root(el).querySelector<HTMLElement>('.sk-workflow-board__scroller') as HTMLElement;
    expect(scroller.scrollWidth).toBeLessThanOrEqual(scroller.clientWidth);
    expect(scroller.getAttribute('role')).toBeNull();
    expect(scroller.getAttribute('tabindex')).toBeNull();
    expect(scroller.getAttribute('aria-labelledby')).toBeNull();
  });

  it('drops the attributes again when the container grows (both states in one test)', async () => {
    const el = await mount(fiveColumnsWps, {}, 300);
    const box = el.parentElement as HTMLElement;
    const scroller = root(el).querySelector<HTMLElement>('.sk-workflow-board__scroller') as HTMLElement;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    expect(scroller.getAttribute('role')).toBe('region');
    box.style.inlineSize = '1000px';
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    expect(scroller.getAttribute('role')).toBeNull();
  });

  it('counts the scroll region as one control in the Tab walk, before the cards', async () => {
    const el = await mount(fiveColumnsWps, {}, 300);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const stops: string[] = [];
    for (let i = 0; i < 6; i += 1) {
      await userEvent.tab();
      const active = el.shadowRoot?.activeElement ?? null;
      if (active === null) {
        stops.push('outside');
        continue;
      }
      if (active.classList.contains('sk-workflow-board__scroller')) stops.push('region');
      else if (active.localName === 'sk-action-row') stops.push(`card:${active.getAttribute('row-id')}`);
      else stops.push(active.localName);
    }
    expect(stops).toEqual(['region', 'card:WP04', 'card:WP03', 'card:WP02', 'card:WP05', 'card:WP01']);
  });

  it('has no region stop in the Tab walk while everything fits', async () => {
    const el = await mount(fiveColumnsWps, {}, 1000);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await userEvent.tab();
    const active = el.shadowRoot?.activeElement ?? null;
    expect(active?.localName).toBe('sk-action-row');
    expect(active?.getAttribute('row-id')).toBe('WP04');
  });
});

describe('sk-work-package-board layout', () => {
  it('fits five lanes of the default groups without horizontal scrolling at a 900 px container', async () => {
    const el = await mount(fiveColumnsWps, {}, 900);
    const scroller = root(el).querySelector<HTMLElement>('.sk-workflow-board__scroller') as HTMLElement;
    expect(lanes(el).length).toBe(5);
    expect(scroller.scrollWidth).toBeLessThanOrEqual(scroller.clientWidth);
  });

  it('fits five lanes in the real shell content cell at 1280 px (904 px cell, 260 px inspector, 24 px board padding) without overflow (E-10)', async () => {
    const el = document.createElement('sk-work-package-board');
    el.workPackages = fiveColumnsWps;
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;inline-size:904px';
    const pad = document.createElement('div');
    pad.style.cssText = 'flex:1 1 0;min-inline-size:0;padding:24px';
    pad.append(el);
    const inspector = document.createElement('aside');
    inspector.style.cssText = 'flex:0 0 260px';
    row.append(pad, inspector);
    document.body.append(row);
    await el.updateComplete;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const scroller = root(el).querySelector<HTMLElement>('.sk-workflow-board__scroller') as HTMLElement;
    expect(lanes(el).length).toBe(5);
    expect(scroller.scrollWidth).toBeLessThanOrEqual(scroller.clientWidth);
    expect(scroller.getAttribute('role')).toBeNull();
  });

  describe('text wraps only between words (operator ruling)', () => {
    async function mountShellCell(wps: WorkPackageView[], groups?: LaneGroup[]): Promise<SkWorkPackageBoard> {
      const el = document.createElement('sk-work-package-board');
      el.workPackages = wps;
      if (groups !== undefined) el.laneGroups = groups;
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;inline-size:904px';
      const pad = document.createElement('div');
      pad.style.cssText = 'flex:1 1 0;min-inline-size:0;padding:24px';
      pad.append(el);
      const inspector = document.createElement('aside');
      inspector.style.cssText = 'flex:0 0 260px';
      row.append(pad, inspector);
      document.body.append(row);
      await el.updateComplete;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return el;
    }
    /** Words of an element's text that a line break splits (a word whose characters sit on more than one line). */
    function splitWords(host: HTMLElement): string[] {
      const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
      const split: string[] = [];
      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const text = node.textContent ?? '';
        for (const match of text.matchAll(/\S+/g)) {
          const range = document.createRange();
          range.setStart(node, match.index ?? 0);
          range.setEnd(node, (match.index ?? 0) + match[0].length);
          const tops = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
          if (tops.size > 1) split.push(match[0]);
        }
      }
      return split;
    }
    const titleEl = (c: HTMLElement): HTMLElement => c.querySelector<HTMLElement>('[slot="title"]') as HTMLElement;

    it('no word of a lane title or a card title is broken across lines at 1280 px, five lanes, no scroll', async () => {
      const el = await mountShellCell(fiveColumnsWps);
      const scroller = root(el).querySelector<HTMLElement>('.sk-workflow-board__scroller') as HTMLElement;
      expect(scroller.scrollWidth).toBeLessThanOrEqual(scroller.clientWidth);
      let checked = 0;
      for (const lane of lanes(el)) {
        expect(splitWords(lane.querySelector('h3') as HTMLElement), `lane ${laneTitle(lane)}`).toEqual([]);
        checked += 1;
      }
      for (const c of allCards(el)) {
        expect(splitWords(titleEl(c)), `card ${c.getAttribute('row-id')}`).toEqual([]);
        checked += 1;
      }
      expect(checked).toBe(10);
    });

    it('the wrapping is declared: overflow-wrap normal, no automatic hyphens, on lane titles and card titles', async () => {
      const el = await mountShellCell(fiveColumnsWps);
      for (const target of [(lanes(el)[1] as HTMLElement).querySelector('h3') as HTMLElement, titleEl(allCards(el)[0] as HTMLElement)]) {
        const style = getComputedStyle(target);
        expect(style.overflowWrap).toBe('normal');
        expect(style.wordBreak).toBe('normal');
        expect(style.hyphens).toBe('manual');
      }
    });

    it('a single over-long word is ellipsized, never broken: full text in the name and a title tooltip (card and lane)', async () => {
      const longWord = 'Supercalifragilisticexpialidocious_unbreakable_token';
      const groups: LaneGroup[] = [
        { id: 'a', label: 'Antidisestablishmentarianism', lanes: ['planned'] },
        { id: 'b', label: 'Build', lanes: ['in_progress'] },
        { id: 'c', label: 'Review', lanes: ['for_review'] },
        { id: 'd', label: 'Approved', lanes: ['approved'] },
        { id: 'e', label: 'Done', lanes: ['done'] },
      ];
      const el = await mountShellCell([wp({ wpId: 'WP90', title: longWord, statusLane: 'planned' }), ...fiveColumnsWps.slice(1)], groups);
      const title = titleEl(card(el, 'WP90'));
      const style = getComputedStyle(title);
      expect(style.textOverflow).toBe('ellipsis');
      expect(style.overflowX).toBe('hidden');
      expect(title.scrollWidth, 'the word really is wider than its box').toBeGreaterThan(title.clientWidth);
      expect(splitWords(title)).toEqual([]);
      expect(title.getAttribute('title')).toBe(longWord);
      expect(title.textContent?.trim()).toBe(longWord);
      const lane = (lanes(el)[0] as HTMLElement).querySelector('h3') as HTMLElement;
      expect(getComputedStyle(lane).textOverflow).toBe('ellipsis');
      expect(lane.scrollWidth).toBeGreaterThan(lane.clientWidth);
      expect(splitWords(lane)).toEqual([]);
      expect(lane.getAttribute('title')).toBe('Antidisestablishmentarianism');
      expect(lane.textContent?.trim()).toBe('Antidisestablishmentarianism');
      const scroller = root(el).querySelector<HTMLElement>('.sk-workflow-board__scroller') as HTMLElement;
      expect(scroller.scrollWidth).toBeLessThanOrEqual(scroller.clientWidth);
    });

    it('every card title carries its full text as a title tooltip', async () => {
      const el = await mountShellCell(fiveColumnsWps);
      for (const c of allCards(el)) expect(titleEl(c).getAttribute('title')).toBe(titleEl(c).textContent?.trim());
    });
  });

  it('keeps long titles, ids and dependencies inside their cards and columns', async () => {
    await page.viewport(800, 800);
    const el = await mount(longNamesWps, {}, 700);
    let ran = 0;
    for (const c of allCards(el)) {
      const lane = c.closest('section') as HTMLElement;
      const box = c.getBoundingClientRect();
      const laneBox = lane.getBoundingClientRect();
      expect(box.right).toBeLessThanOrEqual(laneBox.right + 0.5);
      expect(c.scrollWidth).toBeLessThanOrEqual(c.clientWidth + 1);
      ran += 1;
    }
    expect(ran).toBe(2);
  });

  it('wraps a long work package id inside the card instead of clipping it', async () => {
    const el = await mount(longNamesWps, {}, 800);
    const c = card(el, 'WP-LONG-IDENTIFIER-0042');
    const id = c.querySelector<HTMLElement>('[data-wp-id]') as HTMLElement;
    expect(id.textContent?.trim()).toBe('WP-LONG-IDENTIFIER-0042');
    expect(id.getBoundingClientRect().right).toBeLessThanOrEqual(c.getBoundingClientRect().right);
    const range = document.createRange();
    range.selectNodeContents(id);
    expect(range.getClientRects().length, 'the id wrapped onto more than one line').toBeGreaterThanOrEqual(2);
  });

  it('declares overflow-wrap: break-word on every work package id, and a long id stays inside the card padding', async () => {
    const el = await mount(longNamesWps, {}, 400);
    let ran = 0;
    for (const c of allCards(el)) {
      const id = c.querySelector<HTMLElement>('[data-wp-id]') as HTMLElement;
      expect(getComputedStyle(id).overflowWrap, c.getAttribute('row-id') ?? '').toBe('break-word');
      const trigger = c.shadowRoot?.querySelector('button') as HTMLElement;
      const edge = trigger.getBoundingClientRect().right - parseFloat(getComputedStyle(trigger).paddingRight);
      expect(id.getBoundingClientRect().right).toBeLessThanOrEqual(edge + 0.5);
      ran += 1;
    }
    expect(ran).toBe(2);
  });

  it('wraps the dependency phrase between words and never inside one', async () => {
    // Five columns in 700 px: each card is narrower than the phrase "depends on WP03", so it has to wrap.
    const el = await mount(fiveColumnsWps, {}, 700);
    const tags = card(el, 'WP04').querySelector<HTMLElement>('[slot="tags"]') as HTMLElement;
    const textNode = [...tags.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').includes('depends')) ?? tags.firstChild;
    const phrase = textNode?.textContent ?? '';
    const whole = document.createRange();
    whole.selectNodeContents(textNode as Node);
    expect(whole.getClientRects().length, 'the phrase wrapped onto a second line').toBeGreaterThanOrEqual(2);
    let ran = 0;
    let at = 0;
    for (const word of phrase.trim().split(/\s+/)) {
      const start = phrase.indexOf(word, at);
      at = start + word.length;
      const range = document.createRange();
      range.setStart(textNode as Node, start);
      range.setEnd(textNode as Node, at);
      expect(range.getClientRects().length, `word "${word}" is split across lines`).toBe(1);
      ran += 1;
    }
    expect(ran).toBe(3);
  });
});

describe('sk-work-package-board card header: stacked in narrow lanes, inline in wide ones (operator ruling, 2026-10-04)', () => {
  const headers = (el: SkWorkPackageBoard) =>
    allCards(el).map((c) => {
      const id = (c.querySelector('[data-wp-id]') as HTMLElement).getBoundingClientRect();
      const tag = (pillOf(c) as HTMLElement).shadowRoot?.querySelector('[part~="tag"]') as HTMLElement;
      const pill = tag.getBoundingClientRect();
      return { name: c.getAttribute('row-id') ?? '', stacked: pill.top >= id.bottom - 0.5, inline: pill.top < id.bottom - 0.5 && pill.left >= id.right - 0.5 };
    });

  it('five lanes in 800 px: the pill stacks under the id on every card, whatever its width', async () => {
    const el = await mount(fiveColumnsWps, {}, 800);
    const all = headers(el);
    expect(all.length).toBe(fiveColumnsWps.length);
    expect(all.filter((h) => !h.stacked).map((h) => h.name)).toEqual([]);
  });

  it('three lanes in 800 px (cards wider than 200 px): the pill sits beside the id on every card', async () => {
    const el = await mount(customGroupsWps, { laneGroups: customGroups, labels: foreignLabels }, 800);
    const all = headers(el);
    expect(all.length).toBe(customGroupsWps.length);
    expect(all.filter((h) => !h.inline).map((h) => h.name)).toEqual([]);
  });
});

describe('sk-work-package-board reconnect (squad fix round)', () => {
  it('keeps measuring overflow after the element is removed and appended again', async () => {
    const el = await mount(fiveColumnsWps, {}, 1000);
    const box = el.parentElement as HTMLElement;
    const frames = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    await frames();
    const scroller = (): HTMLElement => root(el).querySelector<HTMLElement>('.sk-workflow-board__scroller') as HTMLElement;
    expect(scroller().getAttribute('role')).toBeNull();
    el.remove();
    box.append(el);
    await el.updateComplete;
    box.style.inlineSize = '300px';
    await frames();
    expect(scroller().getAttribute('role'), 'region after shrinking').toBe('region');
    box.style.inlineSize = '1000px';
    await frames();
    expect(scroller().getAttribute('role'), 'no region after growing').toBeNull();
  });
});
