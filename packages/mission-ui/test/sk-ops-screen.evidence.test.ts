// T027 and NFR-005 / SC-004: the evidence is inert by construction. For EVERY evidence fixture, hostile ones included, the
// rendered shadow tree is walked and holds no anchor, image or other loadable element, and no `src`, `href` or `srcset`
// attribute. The walker has a positive control (a built anchor is found), and an anti-vacuity floor: the number of fixtures
// and the number of nodes visited are asserted with equality.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import type { SkOpsScreen } from '../src/elements/sk-ops-screen/sk-ops-screen.js';
import { OPS_INVOCATION_FIXTURES, opsRowProps } from '../src/elements/sk-ops-screen/fixtures.js';
import type { OpsInvocationFixtureName } from '../src/elements/sk-ops-screen/fixtures.js';

afterEach(() => {
  document.body.replaceChildren();
});

async function mount(fixture: OpsInvocationFixtureName): Promise<SkOpsScreen> {
  await page.viewport(1280, 900);
  const screen = document.createElement('sk-ops-screen');
  Object.assign(screen, opsRowProps(fixture));
  document.body.append(screen);
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  return screen;
}

/** The evidence fixtures: every invocation fixture that carries evidence (eighteen in all). */
const EVIDENCE_FIXTURES = (Object.keys(OPS_INVOCATION_FIXTURES) as OpsInvocationFixtureName[]).filter((name) => OPS_INVOCATION_FIXTURES[name].evidence !== null);
const HOSTILE: OpsInvocationFixtureName[] = ['opsEvidenceMarkup', 'opsEvidenceJavascriptUrl', 'opsEvidenceBidi', 'opsEvidenceUnbroken512'];

const LOADABLE = new Set(['A', 'AREA', 'IMG', 'PICTURE', 'SOURCE', 'IFRAME', 'FRAME', 'EMBED', 'OBJECT', 'VIDEO', 'AUDIO', 'TRACK', 'LINK', 'SCRIPT', 'STYLE', 'FORM', 'INPUT', 'BUTTON', 'BASE', 'IMAGE', 'USE']);
const LOADING_ATTRIBUTES = ['src', 'href', 'srcset', 'xlink:href', 'data', 'poster', 'action', 'formaction', 'background'];

interface Walk {
  visited: number;
  loadable: string[];
  attributes: string[];
}

/** Walks `from` and every open shadow root below it; records loadable elements and loading attributes. */
function walk(from: Element | ShadowRoot): Walk {
  const found: Walk = { visited: 0, loadable: [], attributes: [] };
  const visit = (node: Element): void => {
    found.visited += 1;
    if (LOADABLE.has(node.tagName.toUpperCase())) found.loadable.push(node.tagName);
    for (const name of LOADING_ATTRIBUTES) if (node.hasAttribute(name)) found.attributes.push(`${node.tagName}[${name}]`);
    for (const child of node.children) visit(child);
    if (node.shadowRoot !== null) for (const child of node.shadowRoot.children) visit(child);
  };
  const start = from instanceof ShadowRoot ? [...from.children] : [from];
  for (const child of start) visit(child);
  return found;
}

describe('the walker (positive control)', () => {
  it('finds a deliberately built anchor, image and src in a scratch element, and nothing in a clean one', () => {
    const dirty = document.createElement('div');
    dirty.innerHTML = '<p><a href="https://example.test/">x</a><img src="x.png"><span title="t">y</span></p>';
    const hit = walk(dirty);
    expect(hit.loadable).toEqual(['A', 'IMG']);
    expect(hit.attributes).toEqual(['A[href]', 'IMG[src]']);
    expect(hit.visited).toBe(5);
    const clean = document.createElement('div');
    clean.innerHTML = '<p><span title="t">y</span></p>';
    expect(walk(clean)).toEqual({ visited: 3, loadable: [], attributes: [] });
  });
});

describe('every evidence fixture draws inert text', () => {
  it('has eighteen evidence fixtures, among them the four hostile ones', () => {
    expect(EVIDENCE_FIXTURES).toHaveLength(18);
    for (const name of HOSTILE) expect(EVIDENCE_FIXTURES).toContain(name);
  });

  it('finds no anchor, image, loadable element or loading attribute in any row', async () => {
    let screens = 0;
    let visited = 0;
    for (const name of EVIDENCE_FIXTURES) {
      document.body.replaceChildren();
      const screen = await mount(name);
      const rows = screen.shadowRoot?.querySelectorAll('li[data-row-id]') ?? [];
      expect(rows, name).toHaveLength(1);
      const found = walk(rows[0] as Element);
      // The row itself holds only the library pill (its own shadow content is the library's, and is walked by the same walker).
      expect(found.loadable, name).toEqual([]);
      expect(found.attributes, name).toEqual([]);
      expect(found.visited, name).toBe(EXPECTED_VISITED[name]);
      visited += found.visited;
      screens += 1;
    }
    expect(screens).toBe(18);
    expect(visited).toBe(905);
    expect(Object.values(EXPECTED_VISITED).reduce((sum, count) => sum + count, 0)).toBe(905);
  });

  it('draws exactly the counted number of elements for the markup fixture (anti-vacuity floor)', async () => {
    const screen = await mount('opsEvidenceMarkup');
    const row = screen.shadowRoot?.querySelector('li[data-row-id]') as Element;
    const own = row.querySelectorAll('*').length;
    expect(own).toBe(EXPECTED_ELEMENTS_MARKUP);
  });

  it('shows the hostile values as text: the markup is characters, the address is characters, the 512-character token is whole', async () => {
    const cases = HOSTILE.map((name) => [name, OPS_INVOCATION_FIXTURES[name].evidence?.value ?? ''] as const);
    let ran = 0;
    for (const [name, value] of cases) {
      document.body.replaceChildren();
      const screen = await mount(name);
      const span = screen.shadowRoot?.querySelector('[data-ops-evidence]') as HTMLElement;
      expect(span.textContent, name).toBe(value);
      expect(span.children, name).toHaveLength(1);
      expect(span.firstElementChild?.tagName, name).toBe('BDI');
      expect(span.firstElementChild?.children, name).toHaveLength(0);
      ran += 1;
    }
    expect(ran).toBe(4);
    expect(OPS_INVOCATION_FIXTURES.opsEvidenceMarkup.evidence?.value).toMatch(/</);
    expect(OPS_INVOCATION_FIXTURES.opsEvidenceJavascriptUrl.evidence?.value).toMatch(/javascript:/);
    expect(OPS_INVOCATION_FIXTURES.opsEvidenceUnbroken512.evidence?.value).toHaveLength(512);
  });

  it('keeps a bidirectional override inside its bdi: the neighbours keep their order and the row does not move', async () => {
    const screen = await mount('opsEvidenceBidi');
    const row = screen.shadowRoot?.querySelector('li[data-row-id]') as HTMLElement;
    const bdi = row.querySelector('[data-ops-evidence] bdi') as HTMLElement;
    expect(getComputedStyle(bdi).unicodeBidi).toBe('isolate');
    expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
    const label = row.querySelector('[data-ops-evidence-class]') as HTMLElement;
    expect(label.getBoundingClientRect().right).toBeLessThanOrEqual(row.getBoundingClientRect().right);
  });

  it('wraps the 512-character unbroken token inside the row at 1280 and at 390', async () => {
    let ran = 0;
    for (const width of [1280, 390]) {
      document.body.replaceChildren();
      await page.viewport(width, 900);
      const screen = document.createElement('sk-ops-screen');
      Object.assign(screen, opsRowProps('opsEvidenceUnbroken512'));
      document.body.append(screen);
      await screen.updateComplete;
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      const row = screen.shadowRoot?.querySelector('li[data-row-id]') as HTMLElement;
      const span = row.querySelector('[data-ops-evidence]') as HTMLElement;
      expect(row.scrollWidth, String(width)).toBeLessThanOrEqual(row.clientWidth);
      expect(span.getBoundingClientRect().right, String(width)).toBeLessThanOrEqual(row.getBoundingClientRect().right);
      expect(span.getClientRects().length + span.getBoundingClientRect().height, String(width)).toBeGreaterThan(0);
      ran += 1;
    }
    expect(ran).toBe(2);
  });
});

// Counted by hand from the template: head div, strong, bdi, pill, bdi (5); dl (1); nine fact pairs of div, dt, dd (27); inside the
// values: three bdi (Profile, Action, Actor), two times with a bdi each (4), the evidence span, bdi, class label and bdi (4), and
// three bdi (Mission, Work Package, Mode). 5 + 1 + 27 + 3 + 4 + 4 + 3 = 47.
const EXPECTED_ELEMENTS_MARKUP = 47;

// The walker's count per evidence fixture: the row itself (1), its light elements (47 for the markup fixture above; 43 for a swept
// Op, which has no Mission or Work Package; 48 when the value is redacted, which adds the changed span; 51 for an unknown closer,
// which adds the Closed by pair of div, dt, dd and a bdi) and the two elements inside the library pill's shadow root (2).
const EXPECTED_VISITED: Record<string, number> = {
  opsClosedByAgent: 50,
  opsClosedBySweep: 46,
  opsEvidenceRepoPath: 50,
  opsEvidenceUrl: 50,
  opsEvidenceUrlRedacted: 51,
  opsEvidenceText: 50,
  opsEvidenceTextRedacted: 51,
  opsFailed: 50,
  opsRedactedMarkers: 51,
  opsEvidence512: 51,
  opsEvidenceMarkup: 50,
  opsEvidenceJavascriptUrl: 50,
  opsEvidenceUnbroken512: 51,
  opsEvidenceBidi: 50,
  opsUnknownOutcome: 50,
  opsUnknownCloser: 54,
  opsUnknownMode: 50,
  opsUnknownEvidenceKind: 50,
};
