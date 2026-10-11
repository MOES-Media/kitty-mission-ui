// The mounting helpers shared by sk-missions-screen.test.ts and sk-missions-screen.perf.test.ts (the timing-ceiling tests run in their own
// vitest project, so they live in a sibling file and import these instead of copying them).
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../../src/index.js';
import type { SkMissionsScreen } from '../../src/elements/sk-missions-screen/sk-missions-screen.js';
import type { SkFilterToggleGroup } from '../../src/elements/sk-filter-toggle-group/sk-filter-toggle-group.js';
import { BRANCH, NOW, mixedMissions, mixedPageInfo, project } from '../../src/elements/sk-missions-screen/fixtures.js';

export type Props = Partial<SkMissionsScreen>;

export const readyProps = (): Props => ({
  status: 'ready',
  project,
  branch: BRANCH,
  missions: mixedMissions,
  pageInfo: mixedPageInfo,
  now: NOW,
});

export async function mount(props: Props = readyProps(), width = 1280): Promise<SkMissionsScreen> {
  await page.viewport(width, 900);
  const el = document.createElement('sk-missions-screen');
  Object.assign(el, props);
  document.body.append(el);
  await settle(el);
  return el;
}

/** Waits for the screen and every library element inside it. */
export async function settle(el: SkMissionsScreen): Promise<void> {
  await el.updateComplete;
  const toggle = el.shadowRoot?.querySelector<SkFilterToggleGroup>('sk-filter-toggle-group');
  await toggle?.updateComplete;
  for (const row of el.shadowRoot?.querySelectorAll('sk-action-row') ?? []) await (row as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete;
  for (const tag of ['sk-form-input', 'sk-notice', 'sk-page-header', 'sk-button']) {
    for (const node of el.shadowRoot?.querySelectorAll(tag) ?? []) await (node as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete;
  }
}

export function sr(el: SkMissionsScreen): ShadowRoot {
  if (!el.shadowRoot) throw new Error('no shadow root');
  return el.shadowRoot;
}

export function one<T extends Element>(scope: ParentNode, selector: string): T {
  const found = scope.querySelector<T>(selector);
  if (!found) throw new Error(`missing ${selector}`);
  return found;
}

/** The Mission rows' wrapping list items (not the Load more row). */
export function missionItems(el: SkMissionsScreen): HTMLLIElement[] {
  return [...sr(el).querySelectorAll<HTMLLIElement>('ul > li')].filter((li) => li.querySelector('sk-action-row') !== null);
}

export function filterGroup(el: SkMissionsScreen): SkFilterToggleGroup {
  return one<SkFilterToggleGroup>(sr(el), 'sk-filter-toggle-group');
}

export function filterButton(el: SkMissionsScreen, label: string): HTMLButtonElement {
  const found = [...(filterGroup(el).shadowRoot?.querySelectorAll<HTMLButtonElement>('button') ?? [])].find((b) => b.textContent?.trim() === label);
  if (!found) throw new Error(`filter ${label} missing`);
  return found;
}

export function searchInput(el: SkMissionsScreen): HTMLInputElement {
  const field = one<HTMLElement>(sr(el), 'sk-form-input');
  return one<HTMLInputElement>(field.shadowRoot as ShadowRoot, 'input');
}

/** The afterEach of both files: an empty body, the default font size and the phone viewport. */
export async function resetDocument(): Promise<void> {
  document.body.replaceChildren();
  document.documentElement.style.fontSize = '';
  await page.viewport(414, 896);
}
