// The live region (IC-08, FR-035): one polite region, one text change per transition, announcements keyed on what the screen SHOWS
// (a content for another path is not shown, so it announces nothing; an agreeing content that arrives later announces once). A
// MutationObserver on the region counts the changes; every "nothing" assertion has a positive control on the same observer.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkArtifactScreen } from '../src/elements/sk-artifact-screen/sk-artifact-screen.js';
import { artifactFrame, contentAt, pairingProps } from '../src/elements/sk-artifact-screen/fixtures.js';
import type { ArtifactScreenProps, PairingId } from '../src/elements/sk-artifact-screen/fixtures.js';
import { contentMarkdown } from '../src/contract/fixtures.generated.js';

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

async function settle(screen: SkArtifactScreen): Promise<void> {
  await screen.updateComplete;
  for (let i = 0; i < 3; i += 1) await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}
async function mount(id: PairingId, props: Partial<ArtifactScreenProps> = {}): Promise<SkArtifactScreen> {
  await page.viewport(1280, 900);
  const screen = document.createElement('sk-artifact-screen');
  Object.assign(screen, { ...pairingProps(id), ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(artifactFrame(html`${screen}`), box);
  await settle(screen);
  return screen;
}
const region = (screen: Element): HTMLElement => {
  const found = screen.shadowRoot?.querySelector<HTMLElement>('[data-region="live-region"]');
  if (found === null || found === undefined) throw new Error('no live region');
  return found;
};
const text = (screen: Element): string => (region(screen).textContent ?? '').trim();

/**
 * Runs `action`, lets the screen settle, and returns the number of mutation batches the region saw (one per commit of its text; the
 * first text of an empty region adds its node in the same batch) and the text it ends with.
 */
async function changes(screen: SkArtifactScreen, action: () => void): Promise<{ count: number; text: string }> {
  const el = region(screen);
  let count = 0;
  const observer = new MutationObserver(() => {
    count += 1;
  });
  observer.observe(el, { childList: true, characterData: true, subtree: true });
  action();
  await settle(screen);
  observer.disconnect();
  return { count, text: (el.textContent ?? '').trim() };
}
const plan = pairingProps('AV-03');
const planContent = (): ArtifactScreenProps['content'] => plan.content;

describe('the region itself', () => {
  it('is one polite status region, empty after the first render of a ready state (FR-035; control: a transition fills it)', async () => {
    const screen = await mount('AV-01');
    const regions = screen.shadowRoot?.querySelectorAll('[role="status"], [aria-live]') ?? [];
    expect(regions.length).toBe(1);
    expect(region(screen).getAttribute('role')).toBe('status');
    expect(region(screen).getAttribute('aria-live')).toBe('polite');
    expect(text(screen)).toBe('');
    const moved = await changes(screen, () => Object.assign(screen, { selectedPath: 'plan.md', content: planContent() }));
    expect(moved.text).toBe('plan.md loaded');
  });

  it('stays empty on the first render of every other state (a listing, a refusal, nothing selected)', async () => {
    let ran = 0;
    for (const id of ['AV-09', 'AV-14', 'AV-20', 'AV-21', 'AV-22', 'AV-23'] as const) {
      const screen = await mount(id);
      expect(text(screen), id).toBe('');
      ran += 1;
    }
    expect(ran).toBe(6);
  });
});

describe('one text change per transition', () => {
  it('announces the new document once when the selection moves (exactly one change)', async () => {
    const screen = await mount('AV-01');
    const result = await changes(screen, () => Object.assign(screen, { selectedPath: 'plan.md', content: planContent() }));
    expect(result).toEqual({ count: 1, text: 'plan.md loaded' });
  });

  it('announces a rapid A then B selection once, as B (A is never shown, so never said)', async () => {
    const screen = await mount('AV-01');
    const seen: string[] = [];
    const observer = new MutationObserver(() => seen.push(text(screen)));
    observer.observe(region(screen), { childList: true, characterData: true, subtree: true });
    const result = await changes(screen, () => {
      Object.assign(screen, { selectedPath: 'tasks.md', content: contentAt(contentMarkdown, 'tasks.md') });
      Object.assign(screen, { selectedPath: 'plan.md', content: planContent() });
    });
    observer.disconnect();
    expect(result).toEqual({ count: 1, text: 'plan.md loaded' });
    expect(seen.includes('tasks.md loaded')).toBe(false);
    // Control: the same two selections one update apart say both.
    const slow = await mount('AV-01');
    const first = await changes(slow, () => Object.assign(slow, { selectedPath: 'tasks.md', content: contentAt(contentMarkdown, 'tasks.md') }));
    const second = await changes(slow, () => Object.assign(slow, { selectedPath: 'plan.md', content: planContent() }));
    expect([first.text, second.text]).toEqual(['tasks.md loaded', 'plan.md loaded']);
  });

  it('announces each state the screen moves through, once, in the words of the state', async () => {
    const screen = await mount('AV-01');
    const loading = await changes(screen, () => Object.assign(screen, { selectedPath: 'plan.md', contentStatus: 'loading', content: null }));
    expect(loading).toEqual({ count: 1, text: 'Loading plan.md' });
    const refused = await changes(screen, () => Object.assign(screen, { contentStatus: 'refused', refusalCode: 'artifact_secret' }));
    expect(refused).toEqual({ count: 1, text: 'plan.md unavailable: Credential found' });
    const loaded = await changes(screen, () => Object.assign(screen, { contentStatus: 'ready', refusalCode: null, content: planContent() }));
    expect(loaded).toEqual({ count: 1, text: 'plan.md loaded' });
    const failed = await changes(screen, () => Object.assign(screen, { contentStatus: 'error', content: null }));
    expect(failed).toEqual({ count: 1, text: 'plan.md unavailable: The artifact could not be loaded.' });
  });

  it('announces the listing states: loading, loaded with its count, and the error', async () => {
    const screen = await mount('AV-20');
    const loaded = await changes(screen, () => Object.assign(screen, { status: 'nothing-selected', listing: pairingProps('AV-22').listing }));
    expect(loaded.count).toBe(1);
    expect(loaded.text).toMatch(/^\d+ artifacts loaded$/);
    const failed = await changes(screen, () => Object.assign(screen, { status: 'error', listing: null }));
    expect(failed).toEqual({ count: 1, text: 'The list of artifacts could not be loaded' });
    const again = await changes(screen, () => Object.assign(screen, { status: 'loading' }));
    expect(again).toEqual({ count: 1, text: 'Loading artifacts' });
  });
});

describe('announcements follow what is shown (selection agreement)', () => {
  it('says nothing is loaded for a content that belongs to another path, then "loaded" once when the agreeing content arrives', async () => {
    const screen = await mount('AV-01');
    // The selection moves to plan.md while the content is still spec.md's: the screen shows the loading look.
    const stale = await changes(screen, () => Object.assign(screen, { selectedPath: 'plan.md' }));
    expect(stale).toEqual({ count: 1, text: 'Loading plan.md' });
    expect(stale.text).not.toContain('loaded');
    // The same stale content set again changes nothing that is shown.
    const again = await changes(screen, () => Object.assign(screen, { content: { ...(screen.content as object) } }));
    expect(again.count).toBe(0);
    const arrived = await changes(screen, () => Object.assign(screen, { content: planContent() }));
    expect(arrived).toEqual({ count: 1, text: 'plan.md loaded' });
    // Control: a second agreeing delivery (same path) announces nothing more.
    const repeat = await changes(screen, () => Object.assign(screen, { content: { ...(planContent() as object) } as ArtifactScreenProps['content'] }));
    expect(repeat.count).toBe(0);
  });

  it('announces nothing at the first render for a mismatched content, and "loaded" once when the matching one arrives (control)', async () => {
    const screen = await mount('AV-01', { selectedPath: 'plan.md' });
    expect(text(screen)).toBe('');
    const arrived = await changes(screen, () => Object.assign(screen, { content: planContent() }));
    expect(arrived).toEqual({ count: 1, text: 'plan.md loaded' });
  });

  it('announces nothing for a refresh of the same content, a tab change or a new `now` (control: a path change announces)', async () => {
    const screen = await mount('AV-01');
    const refreshed = await changes(screen, () => Object.assign(screen, { content: { ...(screen.content as object) } as ArtifactScreenProps['content'] }));
    expect(refreshed.count).toBe(0);
    const tab = await changes(screen, () => Object.assign(screen, { view: 'raw' }));
    expect(tab.count).toBe(0);
    const clock = await changes(screen, () => Object.assign(screen, { now: '2026-09-25T10:00:00Z' }));
    expect(clock.count).toBe(0);
    const moved = await changes(screen, () => Object.assign(screen, { selectedPath: 'plan.md', content: planContent() }));
    expect(moved.count).toBe(1);
  });

  it('counts a listing of another Mission as not loaded: nothing is announced for it (control: the agreeing listing announces)', async () => {
    const screen = await mount('AV-20');
    const listing = pairingProps('AV-22').listing;
    if (listing === null) throw new Error('no listing');
    const foreign = await changes(screen, () => Object.assign(screen, { status: 'ready', selectedPath: '', listing: { ...listing, missionId: 'ANOTHER-MISSION' } }));
    expect(foreign.text).not.toMatch(/artifacts loaded/);
    const own = await changes(screen, () => Object.assign(screen, { listing }));
    expect(own.text).toMatch(/^\d+ artifacts loaded$/);
  });
});
