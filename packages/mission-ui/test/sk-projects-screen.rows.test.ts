// The rows of the Projects screen (FR-002, FR-003, FR-004..FR-009, PR-01..PR-11, PR-24, PR-30): every fact shown, every null
// part hidden, unknown health raw and neutral, plurals, active-ago against `now`, the pill ellipsis rule and the accessible name.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkProjectsScreen } from '../src/elements/sk-projects-screen/sk-projects-screen.js';
import {
  NOW,
  activityEntries,
  allNullEntries,
  countEntries,
  entryBuilders,
  longEntries,
  notOpenableEntries,
  nullBranchEntries,
  nullVersionEntries,
  redactionEntries,
  threeEntries,
  unknownHealthEntries,
} from '../src/elements/sk-projects-screen/fixtures.js';
import { HEALTH_BADGES, NO_ACTIVITY_TEXT, UNKNOWN_HEALTH_TONE, missionCountText } from '../src/defaults/index.js';
import { buildRow } from '../src/logic/index.js';
import type { ProjectEntry } from '../src/project-types.js';
import { shellFrame } from '../src/story-support/shell-frame.js';

afterEach(() => {
  document.body.replaceChildren();
});

async function settle(screen: SkProjectsScreen): Promise<void> {
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}

async function mount(props: Partial<SkProjectsScreen> = {}, width = 1280): Promise<SkProjectsScreen> {
  await page.viewport(width, 900);
  const screen = document.createElement('sk-projects-screen');
  Object.assign(screen, { status: 'ready', entries: threeEntries(), now: NOW, ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(shellFrame(html`${screen}`, { layout: 'picker', flush: true }), box);
  await settle(screen);
  await Promise.all(Array.from(screen.shadowRoot?.querySelectorAll<HTMLElement & { updateComplete?: Promise<unknown> }>('sk-action-row, sk-pill-tag') ?? []).map((el) => el.updateComplete));
  return screen;
}

function root(el: Element): ShadowRoot {
  if (el.shadowRoot === null) throw new Error('no shadow root');
  return el.shadowRoot;
}
function one<T extends Element>(scope: ParentNode, selector: string): T {
  const found = scope.querySelector<T>(selector);
  if (found === null) throw new Error(`missing ${selector}`);
  return found;
}
const text = (el: Element | null): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const rowsOf = (screen: SkProjectsScreen): HTMLElement[] => Array.from(root(screen).querySelectorAll<HTMLElement>('li'));
/** The row of one key. */
const rowOf = (screen: SkProjectsScreen, key: string): HTMLElement => one(root(screen), `li[data-key="${key}"]`);
const view = (entry: ProjectEntry) => {
  const built = buildRow(entry, NOW, null);
  if (built.kind !== 'row') throw new Error('expected a row');
  return built;
};

describe('the fixture builders', () => {
  it('has the expected number of builders, each returning fresh objects with a synthetic location', () => {
    const names = Object.keys(entryBuilders);
    expect(names).toHaveLength(17);
    let ran = 0;
    for (const build of Object.values(entryBuilders)) {
      const first = build();
      const second = build();
      expect(first).not.toBe(second);
      expect(first[0]).not.toBe(second[0]);
      for (const entry of first) {
        expect(entry.location === '' || entry.location.startsWith('~/work/') || entry.location === '[path]').toBe(true);
        expect(entry.key).not.toBe('');
      }
      ran += 1;
    }
    expect(ran).toBe(17);
    expect(entryBuilders.fifty()).toHaveLength(50);
  });
});

describe('PR-01: every fact of a row, in host order', () => {
  it('shows name, version, health word, location line, Mission count and active-ago per row, and the arrow on openable rows', async () => {
    const entries = threeEntries();
    const screen = await mount({ entries });
    const rows = rowsOf(screen);
    expect(rows.map((li) => li.getAttribute('data-key'))).toEqual(entries.map((entry) => entry.key));
    expect(rows).toHaveLength(3);
    let ran = 0;
    for (const [index, entry] of entries.entries()) {
      const built = view(entry);
      const row = rows[index] as HTMLElement;
      expect(text(one(row, '[slot="title"]'))).toBe(built.name);
      expect(text(one(row, '[slot="reference"]'))).toBe(built.versionText);
      expect(text(one(row, 'sk-pill-tag'))).toBe(built.health.label);
      expect(text(one(row, '[slot="supporting"]'))).toBe(built.locationLine);
      expect(text(one(row, '[data-side] > span:first-child'))).toBe(built.missionCountText);
      expect(text(one(row, '[data-activity]'))).toBe(`${built.activityText} →`);
      expect(one(row, '[data-arrow]').getAttribute('aria-hidden')).toBe('true');
      ran += 1;
    }
    expect(ran).toBe(3);
  });

  it('reads the first row as "active 2 hours ago", the second "active yesterday", the third "active 6 days ago" against the host clock', async () => {
    const screen = await mount();
    const activity = rowsOf(screen).map((li) => text(one(li, '[data-activity]')));
    expect(activity).toEqual(['active 2 hours ago →', 'active yesterday →', 'active 6 days ago →']);
  });
});

describe('PR-02..PR-04: the health pill, a word and a tone, never colour alone', () => {
  it('takes the word and the tone of each known health value from the defaults table', async () => {
    const screen = await mount();
    const pills = rowsOf(screen).map((li) => one(li, 'sk-pill-tag'));
    const expected = threeEntries().map((entry) => view(entry).health);
    expect(pills.map((pill) => pill.getAttribute('status'))).toEqual(expected.map((badge) => badge.tone));
    expect(pills.map((pill) => text(pill))).toEqual(expected.map((badge) => badge.label));
    expect(new Set(expected.map((badge) => badge.tone)).size).toBe(2);
    expect(Object.keys(HEALTH_BADGES)).toHaveLength(2);
  });

  it('shows a health value outside the table as given, in the neutral tone', async () => {
    const screen = await mount({ entries: unknownHealthEntries() });
    const pill = one(rowsOf(screen)[0] as HTMLElement, 'sk-pill-tag');
    expect(text(pill)).toBe('unheard_of_health');
    expect(pill.getAttribute('status')).toBe(UNKNOWN_HEALTH_TONE);
    expect(Object.keys(HEALTH_BADGES)).not.toContain('unheard_of_health');
  });

  it('draws the pill with the full text in `title` and a mono face, one line with an ellipsis (E-31 b, c)', async () => {
    const screen = await mount();
    const pill = one<HTMLElement>(rowsOf(screen)[0] as HTMLElement, 'sk-pill-tag');
    expect(pill.getAttribute('title')).toBe(text(pill));
    const part = one<HTMLElement>(pill.shadowRoot as ShadowRoot, '[part="tag"]');
    const style = getComputedStyle(part);
    expect(style.whiteSpace).toBe('nowrap');
    expect(style.textOverflow).toBe('ellipsis');
    expect(style.fontFamily).toContain('JetBrains Mono');
    expect(style.borderTopWidth).toBe('1px');
    expect(style.borderTopStyle).toBe('solid');
  });
});

describe('PR-05..PR-07: null parts are hidden with no placeholder', () => {
  it('hides the version for a null version alone, and shows it for a row that has one (the present case)', async () => {
    const without = await mount({ entries: nullVersionEntries() });
    expect(rowsOf(without)[0]?.querySelectorAll('[slot="reference"]')).toHaveLength(0);
    document.body.replaceChildren();
    const withVersion = await mount({ entries: threeEntries() });
    expect(rowsOf(withVersion)[0]?.querySelectorAll('[slot="reference"]')).toHaveLength(1);
  });

  it('drops the branch segment with its separator for a null branch, with no "detached" claim', async () => {
    const screen = await mount({ entries: nullBranchEntries() });
    const entry = nullBranchEntries()[0] as ProjectEntry;
    expect(text(one(rowsOf(screen)[0] as HTMLElement, '[slot="supporting"]'))).toBe(entry.location);
    expect(text(rowsOf(screen)[0] ?? null)).not.toContain('detached');
  });

  it('shows the all-null project as: no version, no branch, "no activity" alone, 0 Missions, and the drift badge', async () => {
    const screen = await mount({ entries: allNullEntries() });
    const row = rowsOf(screen)[0] as HTMLElement;
    const entry = allNullEntries()[0] as ProjectEntry;
    expect(row.querySelectorAll('[slot="reference"]')).toHaveLength(0);
    expect(text(one(row, '[slot="supporting"]'))).toBe(entry.location);
    expect(text(one(row, '[data-activity]'))).toBe(`${NO_ACTIVITY_TEXT} →`);
    expect(text(one(row, '[data-side] > span:first-child'))).toBe(missionCountText(0));
    expect(one(row, 'sk-pill-tag').getAttribute('status')).toBe('attention');
  });
});

describe('PR-08, PR-09: active-ago and Mission counts', () => {
  it('reads minutes, hours, yesterday, days and an offset instant as the shared helper does', async () => {
    const screen = await mount({ entries: activityEntries() });
    const shown = rowsOf(screen).map((li) => text(one(li, '[data-activity]')));
    const expected = activityEntries().map((entry) => `${view(entry).activityText} →`);
    expect(shown).toEqual(expected);
    expect(shown).toHaveLength(5);
    expect(new Set(shown).size).toBe(5);
  });

  it('shows the ISO text as given when the host sends no clock, and the host time hook when there is one', async () => {
    const entry = threeEntries()[0] as ProjectEntry;
    const noClock = await mount({ entries: [entry], now: null });
    expect(text(one(rowsOf(noClock)[0] as HTMLElement, '[data-activity]'))).toBe(`active ${entry.project?.lastActivityAt} →`);
    document.body.replaceChildren();
    const hooked = await mount({ entries: [entry], labels: { time: () => 'a while back' } });
    expect(text(one(rowsOf(hooked)[0] as HTMLElement, '[data-activity]'))).toBe('active a while back →');
  });

  it('uses the plural of the defaults for 0, 1 and a large count', async () => {
    const screen = await mount({ entries: countEntries() });
    const shown = rowsOf(screen).map((li) => text(one(li, '[data-side] > span:first-child')));
    expect(shown).toEqual(['0 Missions', '1 Mission', '4096 Missions']);
  });
});

describe('PR-10, PR-30: the location line and verbatim text', () => {
  it('shows the host location, the branch and the local-only segment only when they exist', async () => {
    const entries = threeEntries();
    const screen = await mount({ entries });
    const lines = rowsOf(screen).map((li) => text(one(li, '[slot="supporting"]')));
    expect(lines).toEqual(entries.map((entry) => view(entry).locationLine));
    expect(lines[2]).toContain('local only');
    expect(lines[0]).not.toContain('local only');
  });

  it('shows redaction-like text in a name, a branch and a location as given, never parsed', async () => {
    const screen = await mount({ entries: redactionEntries() });
    const row = rowsOf(screen)[0] as HTMLElement;
    expect(text(one(row, '[slot="title"]'))).toBe('[path]');
    expect(text(one(row, '[slot="supporting"]'))).toBe('[path] · [email]');
  });
});

describe('PR-11: only openable rows are controls', () => {
  it('draws a button with the arrow for an openable row and a plain box without either for a not-openable one', async () => {
    const screen = await mount({ entries: notOpenableEntries() });
    const [openable, plain] = rowsOf(screen) as [HTMLElement, HTMLElement];
    const openableRow = one<HTMLElement>(openable, 'sk-action-row');
    const plainRow = one<HTMLElement>(plain, 'sk-action-row');
    expect(openableRow.shadowRoot?.querySelectorAll('button')).toHaveLength(1);
    expect(plainRow.shadowRoot?.querySelectorAll('button')).toHaveLength(0);
    expect(openable.querySelectorAll('[data-arrow]')).toHaveLength(1);
    expect(plain.querySelectorAll('[data-arrow]')).toHaveLength(0);
    expect(text(one(plain, '[data-activity]'))).not.toContain('→');
  });

  it('computes the row control name as the visible text in reading order, starting with the name, without the arrow (exact string)', async () => {
    const screen = await mount({ entries: threeEntries() });
    const built = view(threeEntries()[0] as ProjectEntry);
    expect(built.announcementText).toBe(`${built.name}, ${built.health.label}, ${built.missionCountText}`);
    const exact = 'harbor-ledger v3.2.6rc4 healthy 439 Missions active 2 hours ago ~/work/harbor-ledger · main';
    expect(page.getByRole('button', { name: exact, exact: true }).elements()).toHaveLength(1);
    // The arrow is decorative: a name with it is not the computed one.
    expect(page.getByRole('button', { name: `${exact} →`, exact: true }).elements()).toHaveLength(0);
    expect(one<HTMLElement>(rowOf(screen, built.key), 'sk-action-row').shadowRoot?.querySelectorAll('button')).toHaveLength(1);
  });

  it('leaves null parts out of the computed name: no version, no branch, "no activity" alone, 0 Missions', async () => {
    await mount({ entries: allNullEntries() });
    const exact = 'quartz-notes schema drift 0 Missions no activity ~/work/quartz-notes';
    expect(page.getByRole('button', { name: exact, exact: true }).elements()).toHaveLength(1);
    expect(page.getByRole('button', { name: /v\d|main|active/ }).elements()).toHaveLength(0);
  });
});

describe('PR-24: long texts never break out of the row', () => {
  it('keeps the page and every row inside the 900px column, with the full texts in `title` and the version on one line', async () => {
    const screen = await mount({ entries: longEntries() });
    const host = screen.getBoundingClientRect();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(host.width);
    let ran = 0;
    for (const li of rowsOf(screen)) {
      expect(li.getBoundingClientRect().right).toBeLessThanOrEqual(host.right);
      ran += 1;
    }
    expect(ran).toBe(2);
    const long = rowsOf(screen)[0] as HTMLElement;
    const entry = longEntries()[0] as ProjectEntry;
    expect(text(one(long, '[slot="title"]'))).toBe(entry.project?.name);
    const version = one<HTMLElement>(long, '[slot="reference"]');
    expect(version.getAttribute('title')).toBe(text(version));
    expect(version.getAttribute('title')?.length).toBeGreaterThan(60);
    const pill = one(long, 'sk-pill-tag');
    expect(pill.getAttribute('title')).toBe(text(pill));
  });
});

describe('rows keep host order and draw every entry (fifty entries, plain DOM)', () => {
  it('draws fifty rows in order, with the count', async () => {
    const entries = entryBuilders.fifty();
    const screen = await mount({ entries });
    expect(rowsOf(screen)).toHaveLength(50);
    expect(rowsOf(screen).map((li) => li.getAttribute('data-key'))).toEqual(entries.map((entry) => entry.key));
    expect(text(one(root(screen), '[data-count]'))).toBe('50 projects');
  });
});

describe('the row look comes from the library row, with the CP-1 grants', () => {
  it('lays name, version and health on one line and the location below, the side block to the right (two columns)', async () => {
    const screen = await mount();
    const row = rowsOf(screen)[0] as HTMLElement;
    const title = one<HTMLElement>(row, '[slot="title"]').getBoundingClientRect();
    const version = one<HTMLElement>(row, '[slot="reference"]').getBoundingClientRect();
    const pill = one<HTMLElement>(row, 'sk-pill-tag').getBoundingClientRect();
    const location = one<HTMLElement>(row, '[slot="supporting"]').getBoundingClientRect();
    const side = one<HTMLElement>(row, '[data-side]').getBoundingClientRect();
    expect(version.left).toBeGreaterThan(title.right - 1);
    expect(pill.left).toBeGreaterThan(version.right - 1);
    expect(Math.abs(version.top + version.height / 2 - (title.top + title.height / 2))).toBeLessThan(8);
    expect(location.top).toBeGreaterThanOrEqual(title.bottom - 1);
    expect(side.left).toBeGreaterThan(pill.right);
  });

  it('goes to one column at a content cell of 620px or less, the side block aligned to the start', async () => {
    const wide = await mount({}, 621);
    const wideRow = rowsOf(wide)[0] as HTMLElement;
    expect(one<HTMLElement>(wideRow, '[data-side]').getBoundingClientRect().left).toBeGreaterThan(one<HTMLElement>(wideRow, 'sk-pill-tag').getBoundingClientRect().right);
    document.body.replaceChildren();
    const narrow = await mount({}, 620);
    const row = rowsOf(narrow)[0] as HTMLElement;
    const side = one<HTMLElement>(row, '[data-side]').getBoundingClientRect();
    const location = one<HTMLElement>(row, '[slot="supporting"]').getBoundingClientRect();
    expect(side.top).toBeGreaterThanOrEqual(location.bottom - 1);
    expect(Math.abs(side.left - location.left)).toBeLessThan(2);
  });
});

describe('WP06 ruling: long names on one line, and the screen type of the prototype (E-31 b, E-34 c)', () => {
  it('ellipsizes a long project name on one line, with the full name in `title`', async () => {
    const screen = await mount({ entries: longEntries() });
    const long = rowsOf(screen)[0] as HTMLElement;
    const entry = longEntries()[0] as ProjectEntry;
    const name = one<HTMLElement>(long, '[slot="title"]');
    expect(name.getAttribute('title')).toBe(entry.project?.name);
    const part = one<HTMLElement>(one<HTMLElement>(long, 'sk-action-row').shadowRoot as ShadowRoot, '[part="title"]');
    const style = getComputedStyle(part);
    expect(style.whiteSpace).toBe('nowrap');
    expect(style.textOverflow).toBe('ellipsis');
    expect(style.overflowX).toBe('hidden');
    expect(part.scrollWidth).toBeGreaterThan(part.clientWidth);
    expect(part.getBoundingClientRect().height).toBeLessThan(40);
    // Positive control: a short name is not truncated.
    const short = one<HTMLElement>(one<HTMLElement>(rowsOf(screen)[1] as HTMLElement, 'sk-action-row').shadowRoot as ShadowRoot, '[part="title"]');
    expect(short.scrollWidth).toBeLessThanOrEqual(short.clientWidth);
  });

  it('sets the prototype body type: 14px on a 21px line for the screen, 14px row text, a bold name and a regular pill with 4px 8px padding', async () => {
    const screen = await mount();
    const host = getComputedStyle(screen);
    expect(host.fontSize).toBe('14px');
    expect(host.lineHeight).toBe('21px');
    const row = rowsOf(screen)[0] as HTMLElement;
    const inner = one<HTMLElement>(row, 'sk-action-row').shadowRoot as ShadowRoot;
    for (const part of ['reference', 'supporting', 'metadata']) {
      expect(getComputedStyle(one<HTMLElement>(inner, `[part="${part}"]`)).fontSize, part).toBe('14px');
    }
    expect(getComputedStyle(one<HTMLElement>(inner, '[part="title"]')).fontWeight).toBe('700');
    const tag = getComputedStyle(one<HTMLElement>(one<HTMLElement>(row, 'sk-pill-tag').shadowRoot as ShadowRoot, '[part="tag"]'));
    expect(tag.fontWeight).toBe('400');
    expect(tag.paddingTop).toBe('4px');
    expect(tag.paddingLeft).toBe('8px');
  });
});
