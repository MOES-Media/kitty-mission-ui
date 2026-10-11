// The skeleton of the Projects screen (IC-04b): one test per event, the layout cases, the status switch, the focus rule and the
// wiring of the live region.
//
// The dispatch methods are `protected` members of the screen; the tests reach them through a type cast. NO test-only template
// hook exists and nothing is added to the shipped surface (surface-freeze.test.ts would fail if a property, event or method
// were). In this work package every part is a stub, so the screen draws no controls: the handler is called here the way the
// region parts will call it. The focus case detaches a node by overriding `render` on ONE instance, inside the test.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkProjectsScreen } from '../src/elements/sk-projects-screen/sk-projects-screen.js';
import * as headerParts from '../src/elements/sk-projects-screen/header-parts.js';
import * as rowParts from '../src/elements/sk-projects-screen/row-parts.js';
import * as stateParts from '../src/elements/sk-projects-screen/state-parts.js';
import { project } from '../src/contract/fixtures.generated.js';
import { ENTRY_ERROR_TEXT, HEALTH_BADGES, LIST_EMPTY_TITLE, LIST_ERROR_BODY, LIST_LOADING_TEXT, missionCountText, projectCountText } from '../src/defaults/index.js';
import type { ProjectEntry } from '../src/project-types.js';
import { shellFrame } from '../src/story-support/shell-frame.js';

interface Handlers {
  openProject(view: unknown): void;
  views: Array<{ key: string }>;
  requestOpenProject(): void;
  retryProject(key: string): void;
  retryProjects(): void;
}
const handlersOf = (el: SkProjectsScreen): Handlers => el as unknown as Handlers;

const EVENT_NAMES = ['sk-open-project', 'sk-request-open-project', 'sk-retry-load'] as const;

const entry = (key: string, extra: Partial<ProjectEntry> = {}): ProjectEntry => ({ key, location: `~/work/${key}`, project: { ...project, name: key }, ...extra });
let tick = 0;
const THREE: ProjectEntry[] = [entry('alpha'), entry('beta'), entry('gamma')];

/** The measured literals assume the bundled faces: wait for them, and fail loudly if one did not load (TESTS-001). */
beforeAll(async () => {
  for (const face of ['400 14px "Inter"', '600 14px "Inter"', '700 24px "Falling Sky"']) {
    const loaded = await document.fonts.load(face);
    expect(loaded.length, face).toBeGreaterThan(0);
    expect(loaded.every((font) => font.status === 'loaded'), face).toBe(true);
  }
  await document.fonts.ready;
});

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

async function settle(screen: SkProjectsScreen): Promise<void> {
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}

/** The screen inside the shell's `picker` layout, `flush`, as the stories mount it. */
async function mount(props: Partial<SkProjectsScreen> = {}, width = 1280): Promise<SkProjectsScreen> {
  await page.viewport(width, 900);
  const screen = document.createElement('sk-projects-screen');
  Object.assign(screen, { status: 'ready', entries: THREE, ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(shellFrame(html`${screen}`, { layout: 'picker', flush: true }), box);
  await settle(screen);
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
const regions = (screen: SkProjectsScreen): string[] => Array.from(root(screen).querySelectorAll('[data-region]')).map((el) => el.getAttribute('data-region') ?? '');

/** Collects the events of the three names, and any other `sk-` event the tests know of. */
function collect(screen: SkProjectsScreen): CustomEvent[] {
  const seen: CustomEvent[] = [];
  for (const name of EVENT_NAMES) screen.addEventListener(name, (event) => seen.push(event as CustomEvent));
  return seen;
}
function expectEvent(event: CustomEvent | undefined, name: string, detail: unknown): void {
  expect(event?.type).toBe(name);
  expect(event?.bubbles).toBe(true);
  expect(event?.composed).toBe(true);
  expect(event?.cancelable).toBe(false);
  expect(event?.detail).toEqual(detail);
}

describe('events: exactly one event with the exact payload (handlers called through a type cast, no test-only hook)', () => {
  it('sk-open-project { key } for a shown, openable row; nothing for a plain row, a loading row or a view without a usable key', async () => {
    const screen = await mount({ entries: [entry('alpha'), entry('beta', { openable: false }), { key: 'gamma', location: '~/work/gamma', state: 'loading' }] });
    const seen = collect(screen);
    const viewOf = (key: string): unknown => handlersOf(screen).views.find((view) => view.key === key);
    handlersOf(screen).openProject(viewOf('alpha'));
    expect(seen).toHaveLength(1);
    expectEvent(seen[0], 'sk-open-project', { key: 'alpha' });
    // The positive control above proves the listener works; the plain and loading rows and a view without a usable key emit nothing.
    let ran = 0;
    for (const view of [viewOf('beta'), viewOf('gamma'), { kind: 'row', key: 'missing', openable: false }, { kind: 'row', key: '', openable: true }]) {
      handlersOf(screen).openProject(view);
      ran += 1;
    }
    expect(ran).toBe(4);
    expect(seen).toHaveLength(1);
  });

  it('sk-request-open-project, without a payload', async () => {
    const screen = await mount();
    const seen = collect(screen);
    handlersOf(screen).requestOpenProject();
    expect(seen).toHaveLength(1);
    expectEvent(seen[0], 'sk-request-open-project', null);
  });

  it('sk-retry-load { target: project, key } for a keyed row and { target: projects } for the list; a keyless row is inert', async () => {
    const screen = await mount();
    const seen = collect(screen);
    handlersOf(screen).retryProject('beta');
    expect(seen).toHaveLength(1);
    expectEvent(seen[0], 'sk-retry-load', { target: 'project', key: 'beta' });
    handlersOf(screen).retryProject('');
    expect(seen).toHaveLength(1);
    handlersOf(screen).retryProjects();
    expect(seen).toHaveLength(2);
    expectEvent(seen[1], 'sk-retry-load', { target: 'projects' });
  });

  it('an event crosses the shell: it bubbles and is composed out of the screen', async () => {
    const screen = await mount();
    const outer: string[] = [];
    document.body.addEventListener('sk-request-open-project', (event) => outer.push(event.type));
    handlersOf(screen).requestOpenProject();
    expect(outer).toEqual(['sk-request-open-project']);
  });
});

describe('the status switch: the whole-list state wins and replaces the list', () => {
  it('draws the list for ready, one row item per entry in host order, and not the state region', async () => {
    const screen = await mount();
    expect(regions(screen)).toEqual(['header', 'toolbar', 'list', 'notice']);
    const keys = Array.from(root(screen).querySelectorAll('li')).map((li) => li.getAttribute('data-key'));
    expect(keys).toEqual(['alpha', 'beta', 'gamma']);
    expect(root(screen).querySelector('[data-region="state"]')).toBeNull();
  });

  it('draws the state region and no list for loading, error and empty, also with entries given; the notice only for ready and empty', async () => {
    let ran = 0;
    for (const [status, expected] of [
      ['loading', ['header', 'toolbar', 'state']],
      ['error', ['header', 'toolbar', 'state']],
      ['empty', ['header', 'toolbar', 'state', 'notice']],
      ['ready', ['header', 'toolbar', 'list', 'notice']],
    ] as const) {
      const screen = await mount({ status });
      expect(regions(screen), status).toEqual(expected);
      expect(screen.getAttribute('status')).toBe(status);
      ran += 1;
      document.body.replaceChildren();
    }
    expect(ran).toBe(4);
  });

  it('collapses an unknown status to the empty form, and reflects the property to the attribute', async () => {
    const screen = await mount({ status: 'bogus' as unknown as SkProjectsScreen['status'] });
    expect(regions(screen)).toEqual(['header', 'toolbar', 'state', 'notice']);
    screen.status = 'ready';
    await settle(screen);
    expect(screen.getAttribute('status')).toBe('ready');
    expect(regions(screen)).toContain('list');
  });

  it('does not sort or filter: host order is display order', async () => {
    const screen = await mount({ entries: [entry('zeta'), entry('alpha'), entry('mid')] });
    expect(Array.from(root(screen).querySelectorAll('li')).map((li) => li.getAttribute('data-key'))).toEqual(['zeta', 'alpha', 'mid']);
  });
});

describe('layout inside the shell picker layout (flush): the thresholds of CP-1, 800 and 620', () => {
  const geometry = (screen: SkProjectsScreen) => {
    const header = one<HTMLElement>(root(screen), '[data-region="header"]');
    const content = one<HTMLElement>(root(screen), '[data-content]');
    const narrow = one<HTMLElement>(root(screen), '[data-narrow]');
    const host = screen.getBoundingClientRect();
    const box = narrow.getBoundingClientRect();
    return {
      host: host.width,
      direction: getComputedStyle(header).flexDirection,
      padding: getComputedStyle(content).paddingLeft,
      narrow: box.width,
      leftGap: box.left - host.left,
      rightGap: host.right - box.right,
    };
  };

  it('1280 and 1100: the content cell is the viewport, the header is a row and the narrow column is 900px, centred', async () => {
    let ran = 0;
    for (const width of [1280, 1100]) {
      const screen = await mount({}, width);
      const g = geometry(screen);
      expect(g.host, `${width} host`).toBe(width);
      expect(g.direction).toBe('row');
      expect(g.padding).toBe('24px');
      expect(g.narrow).toBe(900);
      expect(Math.abs(g.leftGap - g.rightGap)).toBeLessThan(1);
      ran += 1;
      document.body.replaceChildren();
    }
    expect(ran).toBe(2);
  });

  it('800: the header stacks and the content padding reduces; 801 keeps the row (the flip is at exactly 800)', async () => {
    const stacked = geometry(await mount({}, 800));
    expect(stacked.host).toBe(800);
    expect(stacked.direction).toBe('column');
    expect(stacked.padding).toBe('16px');
    expect(stacked.narrow).toBe(768);
    document.body.replaceChildren();
    const wide = geometry(await mount({}, 801));
    expect(wide.host).toBe(801);
    expect(wide.direction).toBe('row');
    expect(wide.padding).toBe('24px');
  });

  it('620 and 621: the narrow column follows the cell, and the cell equals the viewport (the row threshold of the row parts)', async () => {
    const small = geometry(await mount({}, 620));
    expect(small.host).toBe(620);
    expect(small.direction).toBe('column');
    expect(small.narrow).toBe(588);
    document.body.replaceChildren();
    expect(geometry(await mount({}, 621)).host).toBe(621);
  });
});

describe('the focus rule: focus moves to the h1 (else the root) only when the focused node is gone', () => {
  async function focusInside(screen: SkProjectsScreen): Promise<HTMLButtonElement> {
    const button = document.createElement('button');
    button.textContent = 'x';
    root(screen).append(button);
    button.focus();
    expect(root(screen).activeElement).toBe(button);
    return button;
  }
  /** One update during which `button` is removed, as a re-render that replaces the focused control would do. */
  async function updateRemoving(screen: SkProjectsScreen, button: HTMLElement | null, also: HTMLElement | null = null): Promise<void> {
    const original = screen['render' as keyof SkProjectsScreen] as unknown as () => unknown;
    Object.defineProperty(screen, 'render', {
      configurable: true,
      value(this: SkProjectsScreen) {
        button?.remove();
        also?.remove();
        return original.call(this);
      },
    });
    tick += 1;
    screen.now = `2026-10-0${tick}T00:00:00Z`;
    await settle(screen);
    await settle(screen);
  }

  it('lands on the h1 of the header when the focused node was removed by the update, and on the root when no h1 is drawn', async () => {
    // The header part draws the one real `h1` (region work package): the focus lands on it.
    const screen = await mount();
    const button = await focusInside(screen);
    await updateRemoving(screen, button);
    const heading = one<HTMLElement>(root(screen), 'h1');
    expect(root(screen).activeElement).toBe(heading);
    expect(heading.tabIndex).toBe(-1);

    // Without any `h1` (the update removes it with the focused node) the root takes the focus.
    const withoutHeading = await mount();
    const second = await focusInside(withoutHeading);
    const headingNode = one<HTMLElement>(root(withoutHeading), 'h1');
    await updateRemoving(withoutHeading, second, headingNode);
    expect(headingNode.isConnected).toBe(false);
    expect(root(withoutHeading).activeElement).toBe(one(root(withoutHeading), '[data-root]'));
  });

  it('leaves focus alone when the focused node is still there (positive control above: the same update moved it)', async () => {
    const screen = await mount();
    const button = await focusInside(screen);
    await updateRemoving(screen, null);
    expect(button.isConnected).toBe(true);
    expect(root(screen).activeElement).toBe(button);
  });
});

describe('the polite live region: announcements follow what is shown', () => {
  const live = (screen: SkProjectsScreen): string => (root(screen).querySelector('[data-live]')?.textContent ?? '').trim();

  it('is one polite status region, empty at first render', async () => {
    const screen = await mount();
    const region = one(root(screen), '[data-live]');
    expect(region.getAttribute('role')).toBe('status');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(live(screen)).toBe('');
    expect(root(screen).querySelectorAll('[data-live]')).toHaveLength(1);
  });

  it('announces the state shown after a change, with the count for ready, and nothing for an update that changes nothing', async () => {
    const screen = await mount({ status: 'loading', entries: [] });
    expect(live(screen)).toBe('');
    screen.entries = THREE;
    screen.status = 'ready';
    await settle(screen);
    expect(live(screen)).toBe(projectCountText(3));
    const seq = root(screen).querySelector('[data-seq]')?.getAttribute('data-seq');
    screen.now = '2026-10-03T00:00:00Z';
    await settle(screen);
    expect(root(screen).querySelector('[data-seq]')?.getAttribute('data-seq')).toBe(seq);
    screen.status = 'error';
    await settle(screen);
    expect(live(screen)).toBe(LIST_ERROR_BODY);
    screen.errorMessage = 'Host words';
    screen.status = 'loading';
    await settle(screen);
    expect(live(screen)).toBe(LIST_LOADING_TEXT);
    screen.status = 'error';
    await settle(screen);
    expect(live(screen)).toBe('Host words');
    screen.status = 'empty';
    await settle(screen);
    expect(live(screen)).toBe(LIST_EMPTY_TITLE);
  });

  it('announces the entry whose kind changed, and never a ready for an entry that is still loading', async () => {
    const loading: ProjectEntry = { key: 'beta', location: '~/work/beta', name: 'Beta', state: 'loading' };
    const screen = await mount({ entries: [entry('alpha'), loading] });
    expect(live(screen)).toBe('');
    screen.entries = [entry('alpha'), { ...loading, state: 'error' }];
    await settle(screen);
    expect(live(screen)).toBe(`Beta. ${ENTRY_ERROR_TEXT}`);
    screen.entries = [entry('alpha'), entry('beta')];
    await settle(screen);
    expect(live(screen)).toBe(`beta, ${HEALTH_BADGES['healthy']?.label}, ${missionCountText(project.missionCount)}`);
  });
});

describe('the parts: the stubs exist at the contract signatures (bodies belong to the region work packages)', () => {
  it('exports every part function and styles block of the screen directory', () => {
    const exported = [
      ...Object.keys(headerParts),
      ...Object.keys(rowParts),
      ...Object.keys(stateParts),
    ].sort();
    expect(exported).toEqual(['headerStyles', 'renderHeader', 'renderListState', 'renderNotice', 'renderRow', 'renderToolbar', 'rowStyles', 'stateStyles'].sort());
    expect(exported).toHaveLength(8);
  });
});
