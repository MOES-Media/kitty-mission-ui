// The screen pass of the hostile corpus (IC-07, PLAN-TEST-003): every entry of the corpus mounted in `sk-artifact-screen` inside the
// shell frame, and the same structural walker over the rendered pane, the Raw tab and the fallback source block. Every `sk-*` event of
// the screen is recorded: nothing is emitted by rendering, and every control emits exactly its event. The failure messages of an escape
// begin with `corpus escape`, the token the unit-tests plants look for, so a planted renderer weakening fails this pass too. A Content-
// Security-Policy meta with a violation listener corroborates the walk (with its positive control); the walk is the proof.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkArtifactScreen } from '../src/elements/sk-artifact-screen/sk-artifact-screen.js';
import { artifactFrame, listingProps, missionFacts } from '../src/elements/sk-artifact-screen/fixtures.js';
import type { ArtifactContentView, ArtifactListingView } from '../src/contract/types.js';
import { resolveLinks } from '../src/logic/markdown/links.js';
import { buildMarkdownModel } from '../src/logic/markdown/model.js';
import { CORPUS, FETCHED_ORIGINS, LISTING, OPEN_PATH, expectedElementCount, type Activation, type CorpusEntry } from './support/markdown-corpus-entries.js';
import { walkAllowed } from './support/walk-allowed.js';

/** The structural attributes the screen draws around the document (each is a fixed word, never document text). */
const SCREEN_ATTRIBUTES = new Set(['data-document', 'data-scroll', 'id', 'aria-labelledby', 'aria-label']);
const EVENT_NAMES = ['sk-select-artifact', 'sk-open-link', 'sk-select-work-package', 'sk-open-mission', 'sk-retry-load'] as const;
const EXPECTED_ENTRIES = 328;

const frames = async (n = 1): Promise<void> => {
  for (let i = 0; i < n; i += 1) await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
};

const SOURCE_ATTRIBUTES = new Set(['data-scroll', 'role', 'aria-label', 'tabindex']);

/** The source block holds text and nothing else: no child element, and only the attributes the part writes. The library notices that
 * sit beside it are not walked: the walker descends into open shadow roots, and those roots are the library's, not the document's. */
function walkSource(block: HTMLElement): string[] {
  const problems = walk(block).violations;
  if (block.children.length !== 0) problems.push('the source block holds an element');
  for (const name of block.getAttributeNames()) if (!SOURCE_ATTRIBUTES.has(name)) problems.push(`the source block has the attribute ${name}`);
  return problems;
}

/** The walker of the model pass, with the structural attributes of the screen's own wrappers allowed (a forbidden attribute never is). */
function walk(scope: Element | ShadowRoot): { visited: number; violations: string[] } {
  const result = walkAllowed(scope);
  const violations = result.violations.filter((line) => {
    const name = /has the unlisted attribute (\S+)$/.exec(line)?.[1];
    return name === undefined || !SCREEN_ATTRIBUTES.has(name);
  });
  return { visited: result.visited, violations };
}

const listing: ArtifactListingView = {
  ...listingProps('listingPopulated'),
  entries: [...LISTING].map(([path, kind]) => ({ path, kind, sizeBytes: 10, modifiedAt: '2026-09-23T08:00:00Z', readable: true })),
};

function contentOf(source: string): ArtifactContentView {
  return { path: OPEN_PATH, kind: 'spec', mediaType: 'text/markdown', encoding: 'utf-8', sizeBytes: source === '' ? 0 : source.length, redacted: false, content: source };
}

interface Harness {
  screen: SkArtifactScreen;
  events: CustomEvent[];
}

async function mountScreen(): Promise<Harness> {
  await page.viewport(1280, 900);
  const screen = document.createElement('sk-artifact-screen');
  Object.assign(screen, { status: 'ready', contentStatus: 'ready', listing, content: contentOf('x'), selectedPath: OPEN_PATH, mission: missionFacts, workPackages: [], view: 'rendered' });
  const box = document.createElement('div');
  document.body.append(box);
  // A control that is (wrongly) a real link must not navigate the test page: it would end the whole run, and the escape would
  // never be reported. The walk reports it instead.
  box.addEventListener('click', (event) => event.preventDefault());
  render(artifactFrame(html`${screen}`), box);
  await screen.updateComplete;
  const events: CustomEvent[] = [];
  for (const name of EVENT_NAMES) screen.addEventListener(name, (e) => events.push(e as CustomEvent));
  return { screen, events };
}

const root = (screen: Element): ShadowRoot => {
  if (screen.shadowRoot === null) throw new Error('no shadow root');
  return screen.shadowRoot;
};
const press = (target: Element, key: string): void => {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true }));
};
const clickOn = (target: Element): void => {
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }));
};
const asEvent = (activation: Activation): { type: string; detail: unknown } =>
  'artifact' in activation ? { type: 'sk-select-artifact', detail: { missionId: missionFacts.missionId, ...activation.artifact } } : { type: 'sk-open-link', detail: { href: activation.external } };
const seen = (events: CustomEvent[]): Array<{ type: string; detail: unknown }> => events.map((e) => ({ type: e.type, detail: e.detail }));

/** Shows `entry` in the screen on the given tab and waits for the render. */
async function show(harness: Harness, entry: CorpusEntry, view: 'rendered' | 'raw'): Promise<void> {
  const { screen } = harness;
  screen.content = contentOf(entry.source);
  screen.view = view;
  await screen.updateComplete;
}

/** The problems of one entry on the pane (rendered or fallback), on the Raw tab, and on every control. Empty is a pass. */
async function inspectEntry(harness: Harness, entry: CorpusEntry): Promise<string[]> {
  const { screen, events } = harness;
  const problems: string[] = [];
  events.length = 0;
  await show(harness, entry, 'rendered');
  const scope = root(screen);
  const document_ = scope.querySelector('[data-document]');
  if (document_ === null) return ['no document pane was drawn'];
  if (entry.source === '') {
    if (!(document_.textContent ?? '').includes('This file is empty.')) problems.push('the empty file did not show its words');
    return problems;
  }
  const article = scope.querySelector('article[data-scroll="article"]');
  const block = scope.querySelector<HTMLElement>('pre[data-scroll="source"]');

  if (entry.outcome === 'ok') {
    if (article === null) return ['the document did not render (an ok entry fell back)'];
    if (block !== null) problems.push('an ok entry drew a source block on the Rendered tab');
    const walked = walk(article);
    problems.push(...walked.violations);
    if (walked.visited === 0) problems.push('no element was rendered (a vacuous render)');
    const model = buildMarkdownModel(entry.source);
    if (model.kind !== 'ok') return [...problems, 'the model twin disagrees with the screen'];
    const wanted = expectedElementCount(resolveLinks(model.blocks, { openPath: OPEN_PATH, kindOf: LISTING })) + 1;
    if (walked.visited !== wanted) problems.push(`visited ${walked.visited} elements, the model derives ${wanted} (the eyebrow included)`);
    const text = article.textContent ?? '';
    for (const part of entry.text ?? []) if (!text.includes(part)) problems.push(`expected text missing: ${JSON.stringify(part.slice(0, 80))}`);
    for (const part of entry.absent ?? []) if (text.includes(part)) problems.push(`text that must be absent is present: ${JSON.stringify(part.slice(0, 80))}`);
    if (events.length !== 0) problems.push(`rendering emitted ${JSON.stringify(seen(events))}`);

    const controls = Array.from(article.querySelectorAll<HTMLElement>('a'));
    const expected = entry.controls ?? [];
    if (controls.length !== expected.length) problems.push(`${controls.length} link controls, expected ${expected.length}`);
    controls.forEach((control, at) => {
      for (const [how, act] of [['click', () => clickOn(control)], ['Enter', () => press(control, 'Enter')]] as const) {
        events.length = 0;
        act();
        const want = expected[at] === undefined ? [] : [asEvent(expected[at])];
        if (JSON.stringify(seen(events)) !== JSON.stringify(want)) problems.push(`${how} on control ${at} emitted ${JSON.stringify(seen(events))}, expected ${JSON.stringify(want)}`);
        for (const e of events) if (!e.bubbles || !e.composed || e.cancelable) problems.push(`the event of control ${at} is not bubbling, composed and not cancelable`);
      }
      events.length = 0;
      press(control, 'a');
      press(control, 'Tab');
      if (events.length !== 0) problems.push(`a key other than Enter activated control ${at}`);
    });
    events.length = 0;
    const inert = Array.from(article.querySelectorAll('span[data-md="inert-link"]'));
    if (entry.inert !== undefined && inert.length !== entry.inert) problems.push(`${inert.length} inert links, expected ${entry.inert}`);
    for (const span of inert) {
      clickOn(span);
      press(span, 'Enter');
    }
    if (events.length !== 0) problems.push(`an inert link emitted ${JSON.stringify(seen(events))}`);
  } else {
    if (block === null) return ['a fallback entry drew no source block'];
    if (article !== null) problems.push('a fallback entry drew an article');
    problems.push(...walkSource(block));
    if (block.textContent !== entry.source) problems.push('the fallback source is not the entry source, character for character');
    if (scope.querySelectorAll('[data-document] sk-notice').length < 1) problems.push('the fallback drew no notice');
  }

  // The Raw tab: the same walker, and the source is the entry source, character for character.
  events.length = 0;
  await show(harness, entry, 'raw');
  const raw = root(screen).querySelector<HTMLElement>('pre[data-scroll="source"]');
  if (raw === null) return [...problems, 'the Raw tab drew no source block'];
  problems.push(...walkSource(raw));
  if (raw.textContent !== entry.source) problems.push('the Raw tab text is not the entry source, character for character');
  if (root(screen).querySelector('[data-document] article') !== null) problems.push('the Raw tab drew an article');
  if (events.length !== 0) problems.push(`the Raw tab emitted ${JSON.stringify(seen(events))}`);
  return problems;
}

// --- request absence: the CSP meta and its listener (corroboration; the structural walk above is the proof) ----------------

const violations: string[] = [];
let waiting: (() => void) | null = null;
const onViolation = (event: SecurityPolicyViolationEvent): void => {
  violations.push(event.blockedURI);
  waiting?.();
};
let meta: HTMLMetaElement | null = null;

async function blockedImage(url: string): Promise<void> {
  const reached = new Promise<void>((resolve) => {
    waiting = resolve;
  });
  const image = document.createElement('img');
  image.src = url;
  document.body.append(image);
  await reached;
  waiting = null;
  image.remove();
}

beforeAll(() => {
  meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = "img-src 'none'; frame-src 'none'; object-src 'none'";
  document.head.append(meta);
  document.addEventListener('securitypolicyviolation', onViolation);
});

afterAll(() => {
  document.removeEventListener('securitypolicyviolation', onViolation);
  document.body.replaceChildren();
});

describe('the screen pass of the corpus', () => {
  it('has the entry count of the model twin, split into documents and fallbacks that add up to it', () => {
    const documents = CORPUS.filter((entry) => entry.outcome === 'ok').length;
    expect(CORPUS).toHaveLength(EXPECTED_ENTRIES);
    expect(documents).toBeGreaterThan(200);
    expect(CORPUS.length - documents).toBeGreaterThan(5);
    expect(FETCHED_ORIGINS.length).toBe(3);
  });

  it('the policy listener fires for a hand-built image (the control that makes "nothing was blocked" mean something)', async () => {
    expect(meta?.isConnected).toBe(true);
    await blockedImage('http://example.invalid/screen-x.png');
    expect(violations).toEqual(['http://example.invalid/screen-x.png']);
  });

  it('contains every entry in the screen: nothing escapes the allowlists on the pane, the Raw tab or the fallback block, every control emits exactly its event', async () => {
    const harness = await mountScreen();
    const failures: string[] = [];
    let ran = 0;
    for (const entry of CORPUS) {
      const problems = await inspectEntry(harness, entry);
      if (problems.length > 0) failures.push(`${entry.name}: ${problems.join('; ')}`);
      ran += 1;
    }
    await frames(2);
    if (failures.length > 0) throw new Error(`corpus escape: ${failures.length} of ${ran} entries on the screen: ${failures.join(' | ')}`);
    expect(ran).toBe(CORPUS.length);
    expect(ran).toBe(EXPECTED_ENTRIES);
  }, 600000);

  it('requested nothing: the control was seen, and nothing but the control was blocked', async () => {
    expect(violations).toEqual(['http://example.invalid/screen-x.png']);
    await blockedImage('http://example.invalid/screen-sentinel.png');
    expect(violations).toEqual(['http://example.invalid/screen-x.png', 'http://example.invalid/screen-sentinel.png']);
  });
});

describe('the pass can fail (a pass that cannot fail proves nothing)', () => {
  const find = (name: string): CorpusEntry => {
    const found = CORPUS.find((entry) => entry.name === name);
    if (found === undefined) throw new Error(`no entry ${name}`);
    return found;
  };

  it('passes a clean entry, and reports a wrong event expectation and a wrong text expectation', async () => {
    const harness = await mountScreen();
    const link = find('relative link to a listed artifact');
    expect(await inspectEntry(harness, link)).toEqual([]);
    const wrongEvent: CorpusEntry = { ...link, controls: [{ external: 'https://example.invalid/' }] };
    expect((await inspectEntry(harness, wrongEvent)).join(' ')).toMatch(/click on control 0 emitted/);
    const wrongText: CorpusEntry = { ...link, text: ['text that is not in the document'] };
    expect((await inspectEntry(harness, wrongText)).join(' ')).toMatch(/expected text missing/);
  });

  it('reports a source that differs from the entry source (the equality is real)', async () => {
    const harness = await mountScreen();
    const entry = find('script element');
    const other: CorpusEntry = { ...entry, source: `${entry.source}\nextra` };
    await show(harness, other, 'raw');
    const raw = root(harness.screen).querySelector<HTMLElement>('pre[data-scroll="source"]');
    expect(raw?.textContent).toBe(other.source);
    expect(raw?.textContent).not.toBe(entry.source);
  });
});
