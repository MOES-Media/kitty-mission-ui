// The hostile-corpus gate of the markdown renderer (the security gate of this mission). Every entry is parsed, resolved and
// rendered into a container; the structural walk (assertions 1 to 3: element allowlist, attribute allowlist, no href, src,
// srcset, srcdoc, style, class or on*) is the stated proof of NFR-005. A Content-Security-Policy meta with a
// `securitypolicyviolation` listener corroborates it, with a positive control. Every failure message of an escape begins with
// the token `corpus escape`, and that token appears nowhere else (not in a title, not in a console line), so a clean run never
// contains it: the unit-tests plants of gates/plants/unit-tests look for it.
import { html, render, type TemplateResult } from 'lit';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolveLinks, type ResolvedBlock } from '../src/logic/markdown/links.js';
import { buildMarkdownModel } from '../src/logic/markdown/model.js';
import { renderMarkdown, type LinkHandlers } from '../src/logic/markdown/render.js';
import { CORPUS, FETCHED_ORIGINS, LISTING, OPEN_PATH, expectedElementCount, type Activation, type CorpusEntry } from './support/markdown-corpus-entries.js';
import { CORPUS_SIZE, recorder } from './support/markdown-corpus-harness.js';
import { walkAllowed } from './support/walk-allowed.js';

/** Pinned: the number of entries. A change to the corpus changes this number on purpose. */
const EXPECTED_ENTRIES = 326;

type Renderer = (blocks: ResolvedBlock[], handlers: LinkHandlers) => TemplateResult;

function press(target: Element, key: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true }));
}

function click(target: Element): void {
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }));
}

const sameActivation = (a: Activation | undefined, b: Activation | undefined): boolean => JSON.stringify(a) === JSON.stringify(b);

/**
 * Renders one entry with `renderer` and returns every way it escapes or misses its expectation. An empty list is a pass. A
 * renderer that throws is reported as a problem, never as an exception out of here.
 */
function inspect(entry: CorpusEntry, renderer: Renderer = renderMarkdown): string[] {
  const problems: string[] = [];
  const model = buildMarkdownModel(entry.source);
  if (model.kind !== entry.outcome && !(model.kind === 'fallback' && model.reason === entry.outcome)) {
    return [`model result is ${model.kind === 'ok' ? 'ok' : model.reason}, expected ${entry.outcome}`];
  }
  if (model.kind === 'fallback') return problems;
  const resolved = resolveLinks(model.blocks, { openPath: OPEN_PATH, kindOf: LISTING });
  const container = document.createElement('div');
  document.body.append(container);
  // A control that is (wrongly) a real link must not navigate the test page: the escape is reported by the walk instead.
  container.addEventListener('click', (event) => event.preventDefault());
  try {
    const { events, handlers } = recorder();
    try {
      render(renderer(resolved, handlers), container);
    } catch (error) {
      return [`render threw: ${String(error)}`];
    }
    const walk = walkAllowed(container);
    problems.push(...walk.violations);
    if (walk.visited === 0) problems.push('no element was rendered (a vacuous render)');
    const wanted = expectedElementCount(resolved);
    if (walk.visited !== wanted) problems.push(`visited ${walk.visited} elements, the model derives ${wanted}`);
    const text = container.textContent ?? '';
    for (const part of entry.text ?? []) if (!text.includes(part)) problems.push(`expected text missing: ${JSON.stringify(part.slice(0, 80))}`);
    for (const part of entry.absent ?? []) if (text.includes(part)) problems.push(`text that must be absent is present: ${JSON.stringify(part.slice(0, 80))}`);
    const controls = Array.from(container.querySelectorAll('a'));
    const expected = entry.controls ?? [];
    if (controls.length !== expected.length) problems.push(`${controls.length} link controls, expected ${expected.length}`);
    controls.forEach((control, at) => {
      if (control.getAttribute('role') !== 'link' || control.getAttribute('tabindex') !== '0') problems.push(`control ${at} is not role=link tabindex=0`);
      if (control.querySelector('a') !== null) problems.push(`control ${at} contains another control`);
      for (const [how, act] of [['click', () => click(control)], ['Enter', () => press(control, 'Enter')]] as const) {
        events.length = 0;
        act();
        if (events.length !== 1 || !sameActivation(events[0], expected[at])) {
          problems.push(`${how} on control ${at} emitted ${JSON.stringify(events)}, expected ${JSON.stringify(expected[at])}`);
        }
      }
      events.length = 0;
      press(control, 'a');
      press(control, 'Tab');
      if (events.length !== 0) problems.push(`a key other than Enter activated control ${at}`);
    });
    const inert = Array.from(container.querySelectorAll('span[data-md="inert-link"]'));
    if (entry.inert !== undefined && inert.length !== entry.inert) problems.push(`${inert.length} inert links, expected ${entry.inert}`);
    events.length = 0;
    for (const span of inert) {
      click(span);
      press(span, 'Enter');
    }
    if (events.length !== 0) problems.push(`an inert link emitted ${JSON.stringify(events)}`);
  } finally {
    container.remove();
  }
  return problems;
}

/** The one place a corpus failure is thrown: the message begins with the token the unit-tests plants look for. */
function assertContained(entries: readonly CorpusEntry[], renderer?: Renderer): number {
  const failures: string[] = [];
  let ran = 0;
  for (const entry of entries) {
    const problems = inspect(entry, renderer);
    if (problems.length > 0) failures.push(`${entry.name}: ${problems.join('; ')}`);
    ran += 1;
  }
  if (failures.length > 0) throw new Error(`corpus escape: ${failures.length} of ${ran} entries: ${failures.join(' | ')}`);
  return ran;
}

// --- request absence: the CSP meta and its listener (corroboration; the structural walk above is the proof) ----------------

const violations: string[] = [];
let waiting: (() => void) | null = null;
const onViolation = (event: SecurityPolicyViolationEvent): void => {
  violations.push(event.blockedURI);
  waiting?.();
};
let meta: HTMLMetaElement | null = null;

/** Hand-builds an image the policy must block, and resolves when the listener has seen the violation. */
async function blockedImage(url: string): Promise<void> {
  const seen = new Promise<void>((resolve) => {
    waiting = resolve;
  });
  const image = document.createElement('img');
  image.src = url;
  document.body.append(image);
  await seen;
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
});

describe('request absence: the policy listener and its positive control', () => {
  it('fires without a network for a hand-built image (the control that makes "nothing was blocked" mean something)', async () => {
    expect(meta?.isConnected).toBe(true);
    await blockedImage('http://example.invalid/x.png');
    expect(violations).toEqual(['http://example.invalid/x.png']);
  });
});

describe('the corpus', () => {
  it('holds the pinned number of entries, each name once, and every origin of the source list', () => {
    expect(CORPUS_SIZE).toBe(CORPUS.length);
    expect(new Set(CORPUS.map((entry) => entry.name)).size).toBe(CORPUS_SIZE);
    expect(new Set(CORPUS.map((entry) => entry.origin))).toEqual(new Set(['owasp', 'commonmark', 'markdown-it', 'authored', 'contract', 'shape']));
    expect(CORPUS_SIZE).toBe(EXPECTED_ENTRIES);
  });

  it('cites every entry of a fetched origin (source and place) and no two of them cite the same place; the other origins cite nothing', () => {
    const cited = CORPUS.filter((entry) => FETCHED_ORIGINS.includes(entry.origin));
    expect(cited.length).toBeGreaterThan(150);
    for (const entry of cited) expect({ name: entry.name, cite: (entry.cite ?? '').length > 20 }).toEqual({ name: entry.name, cite: true });
    expect(new Set(cited.map((entry) => entry.cite)).size).toBe(cited.length);
    for (const origin of FETCHED_ORIGINS) expect(CORPUS.filter((entry) => entry.origin === origin).length, origin).toBeGreaterThan(30);
    for (const entry of CORPUS.filter((candidate) => !FETCHED_ORIGINS.includes(candidate.origin))) expect({ name: entry.name, cite: entry.cite }).toEqual({ name: entry.name, cite: undefined });
  });

  it('contains every entry: nothing escapes the allowlists, every control emits exactly its event, every render is non-empty', () => {
    expect(assertContained(CORPUS)).toBe(CORPUS_SIZE);
  });

  it('keeps the request count at zero: the control was seen, and nothing but the control was blocked', async () => {
    expect(violations).toEqual(['http://example.invalid/x.png']);
    await blockedImage('http://example.invalid/sentinel.png');
    expect(violations).toEqual(['http://example.invalid/x.png', 'http://example.invalid/sentinel.png']);
  });
});

describe('the inspector can fail (a corpus that cannot fail proves nothing)', () => {
  const link = CORPUS.find((entry) => entry.name === 'relative link to a listed artifact');
  const paragraph = CORPUS.find((entry) => entry.name === 'script element');
  const image = CORPUS.find((entry) => entry.name === 'remote image');
  if (link === undefined || paragraph === undefined || image === undefined) throw new Error('harness entries are missing');

  const text = (blocks: ResolvedBlock[]): string => JSON.stringify(blocks);

  it('passes the real renderer on the three harness entries (the control)', () => {
    expect(inspect(link)).toEqual([]);
    expect(inspect(paragraph)).toEqual([]);
    expect(inspect(image)).toEqual([]);
  });

  it('reports a link written with an href', () => {
    const bad: Renderer = (blocks) => html`<p><a role="link" tabindex="0" data-md="link" href="http://example.invalid/">${text(blocks)}</a></p>`;
    expect(inspect(link, bad).join(' ')).toMatch(/forbidden attribute href/);
  });

  it('reports an image element for the image node', () => {
    const bad: Renderer = () => html`<p><img src="http://example.invalid/x.png"></p>`;
    expect(inspect(image, bad).join(' ')).toMatch(/element <img>/);
  });

  it('reports a property binding of innerHTML (the element it creates is not allowed)', () => {
    const bad: Renderer = () => html`<p .innerHTML=${paragraph.source}></p>`;
    const found = inspect(paragraph, bad).join(' ');
    expect(found).toMatch(/element <script>/);
  });

  it('reports an empty render and a render that throws', () => {
    const empty: Renderer = () => html``;
    expect(inspect(paragraph, empty).join(' ')).toMatch(/vacuous render/);
    const throws: Renderer = () => {
      throw new Error('boom');
    };
    expect(inspect(paragraph, throws).join(' ')).toMatch(/render threw/);
  });

  it('reports a control that emits twice, none, or on the wrong key', () => {
    const twice: Renderer = (_blocks, handlers) =>
      html`<p><a role="link" tabindex="0" data-md="link" @click=${() => { handlers.openArtifact('docs/b.md', 'spec'); handlers.openArtifact('docs/b.md', 'spec'); }}>x</a><span> opens another artifact</span></p>`;
    expect(inspect(link, twice).join(' ')).toMatch(/click on control 0 emitted/);
    const none: Renderer = () => html`<p><a role="link" tabindex="0" data-md="link">x</a><span> opens another artifact</span></p>`;
    expect(inspect(link, none).join(' ')).toMatch(/click on control 0 emitted \[\]/);
    const anyKey: Renderer = (_blocks, handlers) =>
      html`<p><a role="link" tabindex="0" data-md="link" @click=${() => handlers.openArtifact('docs/b.md', 'spec')} @keydown=${() => handlers.openArtifact('docs/b.md', 'spec')}>x</a><span> opens another artifact</span></p>`;
    expect(inspect(link, anyKey).join(' ')).toMatch(/a key other than Enter/);
  });
});

describe('table scroll boxes and the overflowing set (A11Y-003, A11Y-004)', () => {
  const source = '| a |\n| - |\n| 1 |\n\ntext\n\n| b |\n| - |\n| 2 |';

  function boxes(overflowing: ReadonlySet<number>): Element[] {
    const model = buildMarkdownModel(source);
    if (model.kind !== 'ok') throw new Error('expected a document');
    const container = document.createElement('div');
    render(renderMarkdown(resolveLinks(model.blocks, { openPath: OPEN_PATH, kindOf: LISTING }), recorder(overflowing).handlers), container);
    return Array.from(container.querySelectorAll('div[data-md="table-scroll"]'));
  }

  it('draws a plain div around every table until the set names it (control), then a named region and a tab stop', () => {
    const plain = boxes(new Set());
    expect(plain).toHaveLength(2);
    for (const box of plain) {
      expect(box.getAttribute('role')).toBeNull();
      expect(box.getAttribute('tabindex')).toBeNull();
      expect(box.getAttribute('aria-label')).toBeNull();
    }
    const second = boxes(new Set([2]));
    expect(second).toHaveLength(2);
    expect(second[0]?.getAttribute('role')).toBeNull();
    expect(second[1]?.getAttribute('role')).toBe('region');
    expect(second[1]?.getAttribute('tabindex')).toBe('0');
    expect(second[1]?.getAttribute('aria-label')).toBe('Table 2 of 2');
    const both = boxes(new Set([1, 2]));
    expect(both.map((box) => box.getAttribute('aria-label'))).toEqual(['Table 1 of 2', 'Table 2 of 2']);
  });

  it('keeps document text out of every aria attribute of the box', () => {
    const hostile = '| <script>alert(1)</script> |\n| - |\n| x |';
    const model = buildMarkdownModel(hostile);
    if (model.kind !== 'ok') throw new Error('expected a document');
    const container = document.createElement('div');
    render(renderMarkdown(resolveLinks(model.blocks, { openPath: OPEN_PATH, kindOf: LISTING }), recorder(new Set([1])).handlers), container);
    const box = container.querySelector('div[data-md="table-scroll"]');
    expect(box?.getAttribute('aria-label')).toBe('Table 1 of 1');
    expect(box?.getAttributeNames().sort()).toEqual(['aria-label', 'data-md', 'role', 'tabindex']);
    expect(box?.getAttributeNames().some((name) => name.startsWith('aria-') && !(box.getAttribute(name) ?? '').startsWith('Table '))).toBe(false);
  });
});
