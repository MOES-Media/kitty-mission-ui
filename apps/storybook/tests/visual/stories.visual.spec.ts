import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

interface IndexEntry {
  id: string;
  type: string;
  title: string;
  tags?: string[];
}

const MIN_STORIES_PER_COMPONENT = 4;
// The web-components renderer mounts every story inside `#root-inner`, so the story's own first element is the first
// child of that wrapper (whatever its tag): `#storybook-root > *:first-child` resolves to the wrapper, not the story.
const STORY_ELEMENT = '#storybook-root > *:first-child > *:first-child';
const indexPath = resolve('storybook-static', 'index.json');
const index = JSON.parse(readFileSync(indexPath, 'utf8')) as { entries: Record<string, IndexEntry> };

// Autodocs adds `<id>--docs` entries of type 'docs'; every real story of every component gets a baseline.
const stories = Object.values(index.entries).filter((entry) => entry.type === 'story');
const storyIds = stories.map((entry) => entry.id).sort();
const entryById = new Map(stories.map((entry) => [entry.id, entry]));

// Story tags: `vw-<n>` sets the viewport width (and asserts the shell tier), `tab-<n>` presses Tab n times before the shot.
// Stories with neither tag behave exactly as before.
const TIER_BREAKPOINTS = { expanded: 1100, collapsed: 620 } as const;

function tagNumber(entry: IndexEntry, prefix: string): number | undefined {
  const tag = (entry.tags ?? []).find((t) => new RegExp(`^${prefix}-\\d+$`).test(t));
  return tag === undefined ? undefined : Number(tag.slice(prefix.length + 1));
}

function expectedTier(width: number): string {
  if (width >= TIER_BREAKPOINTS.expanded) return 'expanded';
  if (width >= TIER_BREAKPOINTS.collapsed) return 'collapsed';
  return 'mobile';
}

const perComponent = new Map<string, number>();
for (const { title } of stories) perComponent.set(title, (perComponent.get(title) ?? 0) + 1);
const thin = [...perComponent].filter(([, n]) => n < MIN_STORIES_PER_COMPONENT);
if (perComponent.size === 0 || thin.length > 0) {
  throw new Error(
    `visual gate: every component needs at least ${MIN_STORIES_PER_COMPONENT} stories in index.json; found ` +
      (perComponent.size === 0 ? 'none' : thin.map(([title, n]) => `${title}=${n}`).join(', ')),
  );
}

let registered = 0;

for (const id of storyIds) {
  registered += 1;
  test(id, async ({ page }) => {
    const entry = entryById.get(id);
    const width = entry === undefined ? undefined : tagNumber(entry, 'vw');
    const tabs = entry === undefined ? undefined : tagNumber(entry, 'tab');
    const consoleProblems: string[] = [];
    page.on('console', (msg) => {
      if (/two copies|multiple versions of lit/i.test(msg.text())) consoleProblems.push(msg.text());
    });

    if (width !== undefined) await page.setViewportSize({ width, height: 800 });
    await page.goto(`/iframe.html?id=${id}&viewMode=story`);
    const element = page.locator(STORY_ELEMENT);
    await element.waitFor({ state: 'attached' });
    const tag = await element.evaluate((el) => el.localName);
    await page.evaluate(async ([name, selector]) => {
      await customElements.whenDefined(name as string);
      const el = document.querySelector(selector as string) as
        | (HTMLElement & { updateComplete?: Promise<unknown> })
        | null;
      await el?.updateComplete;
      await document.fonts.ready;
    }, [tag, STORY_ELEMENT]);

    // Anti-vacuity: the story rendered, fonts really loaded, and nothing errored.
    await expect(page.locator('.sb-errordisplay:visible')).toHaveCount(0);
    const loadedFaces = await page.evaluate(() =>
      [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family),
    );
    expect(loadedFaces.some((f) => /inter/i.test(f)), `Inter font loaded, got ${loadedFaces.join(',')}`).toBe(true);
    const upgraded = await page.evaluate((name) => customElements.get(name) !== undefined, tag);
    expect(upgraded, `${tag} is registered`).toBe(true);

    if (width !== undefined) {
      // Mandatory for every vw-* story: the element must report the tier that matches the viewport width.
      const tier = await element.getAttribute('tier');
      expect(tier, `${id}: vw-${width} story element must reflect tier="${expectedTier(width)}", got ${tier}`).toBe(
        expectedTier(width),
      );
    }
    for (let i = 0; i < (tabs ?? 0); i += 1) await page.keyboard.press('Tab');

    const root = page.locator('#storybook-root');
    const shot = await root.screenshot({ animations: 'disabled' });
    const distinctColours = await page.evaluate(async (b64) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      if (ctx === null) return 0;
      ctx.drawImage(bitmap, 0, 0);
      const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
      const seen = new Set<number>();
      for (let i = 0; i < data.length; i += 4) {
        seen.add(((data[i] ?? 0) << 16) | ((data[i + 1] ?? 0) << 8) | (data[i + 2] ?? 0));
      }
      return seen.size;
    }, shot.toString('base64'));
    expect(distinctColours, 'screenshot is not blank (pixel variance)').toBeGreaterThanOrEqual(8);
    expect(consoleProblems).toEqual([]);

    await expect(root).toHaveScreenshot(`${id}.png`);
  });
}

// eslint-disable-next-line no-empty-pattern -- Playwright requires a destructured first argument
test('baseline parity: test count equals story count, baselines map 1:1 to stories', async ({}, testInfo) => {
  expect(registered).toBe(storyIds.length);
  expect(registered).toBeGreaterThanOrEqual(MIN_STORIES_PER_COMPONENT);
  const dir = resolve(testInfo.config.rootDir, '__snapshots__');
  let files: string[] = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
  } catch {
    files = [];
  }
  const expected = storyIds.map((id) => `${id}.png`);
  const orphans = files.filter((f) => !expected.includes(f));
  expect(orphans, 'orphan baselines without a story').toEqual([]);
  if (testInfo.config.updateSnapshots !== 'all') {
    const missing = expected.filter((f) => !files.includes(f));
    expect(missing, 'stories without a baseline').toEqual([]);
  }
});
