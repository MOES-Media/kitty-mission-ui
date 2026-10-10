// The skeleton of the Artifact Viewer (IC-06b): one test per event (exactly one, exact payload, bubbles, composed), the unknown value
// of each enumerated property, the selected-tab state, the three caches, the focusable pane, the selection-agreement rows and the
// announcement keyed on what is shown. The dispatch goes through the real controls of the stub parts.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkArtifactScreen } from '../src/elements/sk-artifact-screen/sk-artifact-screen.js';
import {
  PAIRINGS,
  artifactFrame,
  contentAt,
  contentProps,
  listingProps,
  missionFacts,
  pairingProps,
  refusalProps,
  workPackageList,
} from '../src/elements/sk-artifact-screen/fixtures.js';
import type { ArtifactScreenProps } from '../src/elements/sk-artifact-screen/fixtures.js';
import { announceContentLoaded, announceContentLoading, announceListingLoaded } from '../src/defaults/index.js';
import { parseTokens } from '../src/logic/markdown/parse.js';

// Vite resolves `import.meta.glob` at build time; this package carries no vite types, so the call is typed here.
type Glob = (pattern: string, options: { query: string; import: string; eager: boolean }) => Record<string, string>;

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

async function settle(screen: SkArtifactScreen): Promise<void> {
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}

async function mount(props: Partial<ArtifactScreenProps> = {}, width = 1280): Promise<SkArtifactScreen> {
  await page.viewport(width, 900);
  const screen = document.createElement('sk-artifact-screen');
  Object.assign(screen, { ...pairingProps('AV-03'), ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(artifactFrame(html`${screen}`), box);
  await settle(screen);
  return screen;
}

const root = (el: Element): ShadowRoot => {
  if (el.shadowRoot === null) throw new Error('no shadow root');
  return el.shadowRoot;
};
function one<T extends Element>(scope: ParentNode, selector: string): T {
  const found = scope.querySelector<T>(selector);
  if (found === null) throw new Error(`missing ${selector}`);
  return found;
}
const byText = <T extends Element>(scope: ParentNode, selector: string, text: string): T => {
  const found = Array.from(scope.querySelectorAll<T>(selector)).find((el) => (el.textContent ?? '').includes(text));
  if (found === undefined) throw new Error(`missing ${selector} with ${text}`);
  return found;
};

function record(screen: Element, names: readonly string[]): CustomEvent[] {
  const events: CustomEvent[] = [];
  for (const name of names) screen.addEventListener(name, (e) => events.push(e as CustomEvent));
  return events;
}
const EVENT_NAMES = ['sk-select-artifact', 'sk-open-link', 'sk-select-work-package', 'sk-open-mission', 'sk-retry-load'] as const;

function expectOne(events: CustomEvent[], name: string, detail: unknown): void {
  expect(events.map((e) => e.type)).toEqual([name]);
  const [event] = events;
  expect(event?.bubbles).toBe(true);
  expect(event?.composed).toBe(true);
  expect(event?.cancelable).toBe(false);
  expect(event?.detail).toEqual(detail);
}

describe('the five events', () => {
  it('sk-select-artifact: an internal link carries the Mission id, the path and the kind of the target entry', async () => {
    const screen = await mount();
    const events = record(screen, EVENT_NAMES);
    byText<HTMLElement>(root(screen), 'a[data-md="link"]', 'data model').click();
    expectOne(events, 'sk-select-artifact', { missionId: missionFacts.missionId, path: 'data-model.md', kind: 'data_model' });
  });

  it('sk-open-link: an external link carries only the href', async () => {
    const screen = await mount();
    const events = record(screen, EVENT_NAMES);
    byText<HTMLElement>(root(screen), 'a[data-md="link"]', 'project site').click();
    expectOne(events, 'sk-open-link', { href: 'https://example.org/docs/plan' });
  });

  it('sk-select-work-package: a linked Work Package control carries the Mission id and the Work Package id', async () => {
    const screen = await mount();
    const events = record(screen, EVENT_NAMES);
    byText<HTMLElement>(root(screen), 'button.sk-pill-tag', 'WP02').click();
    expectOne(events, 'sk-select-work-package', { missionId: missionFacts.missionId, wpId: 'WP02' });
  });

  it('sk-select-work-package: "Open Work Package" of a prompt carries the matched id', async () => {
    const screen = await mount(pairingProps('AV-27'));
    const events = record(screen, EVENT_NAMES);
    byText<HTMLElement>(root(screen), 'sk-button', 'Open Work Package WP01').click();
    expectOne(events, 'sk-select-work-package', { missionId: missionFacts.missionId, wpId: 'WP01' });
  });

  it('sk-open-mission: "Return to Pipeline" of the not-found state carries the Mission id and slug', async () => {
    const screen = await mount(pairingProps('AV-23'));
    const events = record(screen, EVENT_NAMES);
    one<HTMLElement>(root(screen), 'sk-button').click();
    expectOne(events, 'sk-open-mission', { missionId: missionFacts.missionId, slug: missionFacts.slug });
  });

  it('sk-retry-load: the listing error retries the listing', async () => {
    const screen = await mount(pairingProps('AV-14'));
    const events = record(screen, EVENT_NAMES);
    one<HTMLElement>(root(screen), 'sk-button').click();
    expectOne(events, 'sk-retry-load', { missionId: missionFacts.missionId, target: 'listing' });
  });

  it('sk-retry-load: an unreadable content retries the content with its path', async () => {
    const screen = await mount(pairingProps('AV-13'));
    const events = record(screen, EVENT_NAMES);
    one<HTMLElement>(root(screen), 'sk-button').click();
    expectOne(events, 'sk-retry-load', { missionId: missionFacts.missionId, target: 'content', path: 'spec.md' });
  });

  it('draws no Retry for a refusal that is not retryable (positive control: the unreadable one draws it)', async () => {
    const refused = await mount(pairingProps('AV-10'));
    expect(root(refused).querySelector('sk-button')).toBeNull();
    const unreadable = await mount(pairingProps('AV-13'));
    expect(root(unreadable).querySelector('sk-button')).not.toBeNull();
  });

  it('emits nothing from an inert control, and the same control emits once a Mission exists', async () => {
    const screen = await mount({ ...pairingProps('AV-14'), mission: null });
    const events = record(screen, EVENT_NAMES);
    one<HTMLElement>(root(screen), 'sk-button').click();
    expect(events).toHaveLength(0);
    screen.mission = missionFacts;
    await settle(screen);
    one<HTMLElement>(root(screen), 'sk-button').click();
    expect(events.map((e) => e.type)).toEqual(['sk-retry-load']);
  });

  it('an artifact link needs a Mission, an external link does not (positive control inside the test)', async () => {
    const screen = await mount({ mission: null });
    const events = record(screen, EVENT_NAMES);
    byText<HTMLElement>(root(screen), 'a[data-md="link"]', 'data model').click();
    expect(events).toHaveLength(0);
    byText<HTMLElement>(root(screen), 'a[data-md="link"]', 'project site').click();
    expect(events.map((e) => e.type)).toEqual(['sk-open-link']);
  });

  it('keeps exactly five literal dispatch sites in the screen file and none in a part', async () => {
    const files = (import.meta as unknown as { glob: Glob }).glob('../src/elements/sk-artifact-screen/*.ts', { query: '?raw', import: 'default', eager: true });
    let screenSites = 0;
    let partSites = 0;
    let ran = 0;
    for (const [path, source] of Object.entries(files)) {
      const sites = (source.match(/dispatchEvent\(/g) ?? []).length;
      if (path.endsWith('/sk-artifact-screen.ts')) screenSites += sites;
      else partSites += sites;
      ran += 1;
    }
    expect(ran).toBeGreaterThan(8);
    expect(screenSites).toBe(5);
    expect(partSites).toBe(0);
    for (const name of EVENT_NAMES) expect(files['../src/elements/sk-artifact-screen/sk-artifact-screen.ts']).toContain(`'${name}'`);
  });
});

describe('the enumerated properties', () => {
  it('an unknown status collapses to empty, an unknown content status to ready, an unknown view to rendered (controls: the known values)', async () => {
    const empty = await mount({ ...pairingProps('AV-18'), status: 'nonsense' as never });
    expect(root(empty).textContent).toContain('No artifacts');
    const loading = await mount({ ...pairingProps('AV-20') });
    expect(root(loading).textContent).toContain('Loading artifacts');
    const ready = await mount({ contentStatus: 'nonsense' as never });
    expect(root(ready).querySelector('article[data-scroll="article"]')).not.toBeNull();
    const raw = await mount({ view: 'nonsense' as never });
    expect(one(root(raw), '[role="tab"][aria-selected="true"]').textContent).toBe('Rendered');
    const known = await mount({ view: 'raw' });
    expect(one(root(known), '[role="tab"][aria-selected="true"]').textContent).toBe('Raw');
  });
});

describe('the selected tab', () => {
  const selected = (el: Element): string => one(root(el), '[role="tab"][aria-selected="true"]').textContent ?? '';

  it('seeds from view, follows a click without any event, and resets on a path change', async () => {
    const screen = await mount({ ...pairingProps('AV-01'), view: 'raw' });
    const events = record(screen, EVENT_NAMES);
    expect(selected(screen)).toBe('Raw');
    byText<HTMLElement>(root(screen), '[role="tab"]', 'Rendered').click();
    await settle(screen);
    expect(selected(screen)).toBe('Rendered');
    expect(events).toHaveLength(0);
    screen.selectedPath = 'plan.md';
    screen.content = contentAt(contentProps('contentMarkdown'), 'plan.md');
    await settle(screen);
    expect(selected(screen)).toBe('Raw');
  });

  it('keeps the tab while the path is unchanged (control for the reset), and a new view seeds it again', async () => {
    const screen = await mount();
    expect(selected(screen)).toBe('Rendered');
    screen.view = 'raw';
    await settle(screen);
    expect(selected(screen)).toBe('Raw');
    byText<HTMLElement>(root(screen), '[role="tab"]', 'Rendered').click();
    await settle(screen);
    screen.now = '2026-09-24T10:00:00Z';
    await settle(screen);
    expect(selected(screen)).toBe('Rendered');
  });

  it('leaves no dangling aria-controls or aria-labelledby idref', async () => {
    for (const view of ['rendered', 'raw'] as const) {
      const screen = await mount({ view });
      const ids = new Set(Array.from(root(screen).querySelectorAll('[id]')).map((el) => el.id));
      const refs = Array.from(root(screen).querySelectorAll('[aria-controls],[aria-labelledby]'));
      expect(refs.length).toBeGreaterThan(0);
      for (const el of refs) for (const ref of [el.getAttribute('aria-controls'), el.getAttribute('aria-labelledby')]) if (ref !== null) expect(ids.has(ref), ref).toBe(true);
    }
  });
});

describe('the three caches', () => {
  const builds = (el: SkArtifactScreen): { model: number; kindOf: number; resolved: number } => (el as unknown as { cacheBuilds: { model: number; kindOf: number; resolved: number } }).cacheBuilds;

  it('the markdown model is built once per value of the content text and media type (a rebuilt object with the same text does not re-parse)', async () => {
    const screen = await mount();
    const content = screen.content!;
    const before = parseTokens.calls;
    const first = { ...builds(screen) };
    for (let i = 0; i < 3; i += 1) {
      screen.now = `2026-09-24T10:0${i}:00Z`;
      await settle(screen);
    }
    screen.content = { ...content };
    await settle(screen);
    expect(parseTokens.calls).toBe(before);
    expect(builds(screen).model).toBe(first.model);
    screen.content = { ...content, content: `${content.content}\nmore\n` };
    await settle(screen);
    expect(parseTokens.calls).toBe(before + 1);
    expect(builds(screen).model).toBe(first.model + 1);
  });

  it('the media type and the vocabulary are terms of the caches: with the content text held constant, each change rebuilds the model and the resolved tree and changes the view', async () => {
    const screen = await mount();
    const content = screen.content!;
    const shown = (): string => root(screen).innerHTML.replace(/<!--[^>]*-->/g, '');
    const rendered = shown();
    const b0 = { ...builds(screen) };

    // 1. The media type alone: markdown to json. The text is the same; the model is gone and the view is the source.
    screen.content = { ...content, mediaType: 'application/json' };
    await settle(screen);
    const asJson = shown();
    expect(asJson).not.toBe(rendered);
    const b1 = { ...builds(screen) };
    expect(b1.model).toBe(b0.model + 1);
    expect(b1.resolved).toBe(b0.resolved + 1);

    // 2. The vocabulary that names json as the rendered media type: the same text and type now parse as markdown.
    screen.vocabulary = { mediaType: 'application/json' };
    await settle(screen);
    expect(shown()).not.toBe(asJson);
    const b2 = { ...builds(screen) };
    expect(b2.model).toBe(b1.model + 1);
    expect(b2.resolved).toBe(b1.resolved + 1);

    // 3. The input of the third cache: with no model (the vocabulary names another type), a new vocabulary object still rebuilds the
    //    resolved tree, and a relabelled kind shows in the view.
    screen.vocabulary = { mediaType: 'text/x-other' };
    await settle(screen);
    const b3 = { ...builds(screen) };
    screen.vocabulary = { mediaType: 'text/x-other', kinds: { plan: { label: 'Blueprint', icon: 'file' } } };
    await settle(screen);
    const b4 = { ...builds(screen) };
    expect(shown()).toContain('Blueprint');
    expect(b4.model).toBe(b3.model + 1);
    expect(b4.resolved).toBe(b3.resolved + 1);
  });

  it('the path-to-kind map is rebuilt for a new listing and not for an unchanged one', async () => {
    const screen = await mount();
    const first = builds(screen).kindOf;
    screen.now = '2026-09-24T10:00:00Z';
    await settle(screen);
    expect(builds(screen).kindOf).toBe(first);
    screen.listing = { ...screen.listing!, entries: [...screen.listing!.entries] };
    await settle(screen);
    expect(builds(screen).kindOf).toBe(first + 1);
  });

  it('the resolved tree is rebuilt for a new open path or listing and not for an unrelated change', async () => {
    const screen = await mount();
    const first = builds(screen).resolved;
    screen.now = '2026-09-24T10:00:00Z';
    screen.errorMessage = 'x';
    await settle(screen);
    expect(builds(screen).resolved).toBe(first);
    screen.selectedPath = 'spec.md';
    screen.content = contentProps('contentMarkdown');
    await settle(screen);
    expect(builds(screen).resolved).toBeGreaterThan(first);
  });
});

describe('the pane', () => {
  it('is a named region that takes programmatic focus and carries no id', async () => {
    const screen = await mount();
    const pane = one<HTMLElement>(root(screen), '[data-region="document-pane"]');
    expect(pane.getAttribute('role')).toBe('region');
    expect(pane.getAttribute('aria-label')).toBe('Document: plan.md');
    expect(pane.id).toBe('');
    expect(pane.getAttribute('tabindex')).toBe('-1');
    pane.focus();
    expect(root(screen).activeElement).toBe(pane);
  });

  it('moves focus to the pane when the focused Retry disappears, and leaves other focus alone (positive control)', async () => {
    const screen = await mount(pairingProps('AV-13'));
    const outside = document.createElement('input');
    document.body.append(outside);
    const retry = one<HTMLElement>(root(screen), 'sk-button');
    retry.focus();
    screen.contentStatus = 'loading';
    await settle(screen);
    await settle(screen);
    expect(root(screen).activeElement).toBe(one(root(screen), '[data-region="document-pane"]'));
    outside.focus();
    screen.contentStatus = 'ready';
    screen.content = contentProps('contentMarkdown');
    await settle(screen);
    await settle(screen);
    expect(document.activeElement).toBe(outside);
  });
});

describe('selection agreement', () => {
  it('a content for another path counts as not loaded: the loading look and nothing of its text (control: the agreeing content)', async () => {
    const other = contentAt(contentProps('contentMarkdown'), 'plan.md');
    const screen = await mount({ ...pairingProps('AV-01'), content: other });
    expect(root(screen).textContent).not.toContain('Example Mission');
    expect(root(screen).querySelector('[aria-busy="true"]')).not.toBeNull();
    screen.content = contentProps('contentMarkdown');
    await settle(screen);
    expect(root(screen).textContent).toContain('Example Mission');
  });

  it('a listing of another Mission counts as not loaded (control: the agreeing listing)', async () => {
    const stranger = { ...listingProps('listingPopulated'), missionId: 'OTHER' };
    const screen = await mount({ ...pairingProps('AV-01'), listing: stranger });
    expect(root(screen).querySelector('[data-region="inspector"]')).toBeNull();
    expect(root(screen).textContent).toContain('Loading artifacts');
    screen.listing = listingProps('listingPopulated');
    await settle(screen);
    expect(root(screen).querySelector('[data-region="inspector"]')).not.toBeNull();
  });

  it('an empty selection or an empty Mission id disagrees with nothing', async () => {
    const screen = await mount({ ...pairingProps('AV-01'), mission: null });
    expect(root(screen).querySelector('article')).not.toBeNull();
  });
});

describe('announcements follow what is shown', () => {
  const live = (el: Element): string => one(root(el), '[data-region="live-region"]').textContent ?? '';

  async function observe(screen: SkArtifactScreen, act: () => Promise<void>): Promise<string[]> {
    const texts: string[] = [];
    const node = one(root(screen), '[data-region="live-region"]');
    const observer = new MutationObserver(() => texts.push(node.textContent ?? ''));
    observer.observe(node, { childList: true, characterData: true, subtree: true });
    await act();
    observer.disconnect();
    return texts;
  }

  it('announces nothing on the first render', async () => {
    const screen = await mount();
    expect(live(screen)).toBe('');
  });

  it('a content that arrives later and agrees is announced once; a same-content refresh announces nothing', async () => {
    const screen = await mount({ ...pairingProps('AV-01'), contentStatus: 'loading', content: null });
    const texts = await observe(screen, async () => {
      screen.contentStatus = 'ready';
      screen.content = contentProps('contentMarkdown');
      await settle(screen);
    });
    expect(texts).toEqual([announceContentLoaded('spec.md')]);
    const refresh = await observe(screen, async () => {
      screen.content = { ...contentProps('contentMarkdown') };
      screen.now = '2026-09-24T10:00:00Z';
      await settle(screen);
    });
    expect(refresh).toEqual([]);
  });

  it('a disagreeing content announces the loading, not the loaded (the words follow what is shown)', async () => {
    const screen = await mount({ ...pairingProps('AV-01'), contentStatus: 'loading', content: null });
    const texts = await observe(screen, async () => {
      screen.contentStatus = 'ready';
      screen.content = contentAt(contentProps('contentMarkdown'), 'plan.md');
      await settle(screen);
    });
    expect(texts).toEqual([]);
    expect(live(screen)).toBe('');
    screen.selectedPath = 'plan.md';
    await settle(screen);
    expect(live(screen)).toBe(announceContentLoaded('plan.md'));
  });

  it('announces the loading of a selected file and the listing when it becomes ready', async () => {
    const screen = await mount(pairingProps('AV-20'));
    const first = await observe(screen, async () => {
      Object.assign(screen, pairingProps('AV-22'));
      await settle(screen);
    });
    expect(first).toEqual([announceListingLoaded(12)]);
    const second = await observe(screen, async () => {
      Object.assign(screen, { status: 'ready', selectedPath: 'spec.md', contentStatus: 'loading', content: null });
      await settle(screen);
    });
    expect(second).toEqual([announceContentLoading('spec.md')]);
  });
});

describe('the pairing table', () => {
  it('holds a row for every story row of the contract, each agreeing with its selection', () => {
    const ids = Object.keys(PAIRINGS) as (keyof typeof PAIRINGS)[];
    expect(ids).toHaveLength(45);
    let ran = 0;
    for (const id of ids) {
      const props = pairingProps(id);
      if (props.content !== null) expect(props.content.path, id).toBe(props.selectedPath);
      if (props.content !== null && props.listing !== null) expect(props.listing.entries.some((e) => e.path === props.selectedPath), id).toBe(true);
      ran += 1;
    }
    expect(ran).toBe(ids.length);
    expect(refusalProps('refusalNotFound')).toBe('not_found');
    expect(workPackageList).toHaveLength(2);
  });
});
