// The finding detail: kicker, title, explanation, authority panel and Facts (DR-02, DR-07a, DR-07b, DR-08, DR-10, DR-13, DR-32).
// Revert check for this file: in `detail-parts.ts` render `view.title` as `view.key.kind` and "title" fails.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkDriftScreen } from '../src/elements/sk-drift-screen/sk-drift-screen.js';
import { driftFrame, pairReport, reportProps } from '../src/elements/sk-drift-screen/fixtures.js';
import type { DriftScreenProps } from '../src/elements/sk-drift-screen/fixtures.js';
import { reportPopulated } from '../src/contract/fixtures.generated.js';
import type { DriftReportView } from '../src/contract/types.js';

afterEach(() => {
  document.body.replaceChildren();
});

async function mount(props: Partial<DriftScreenProps>): Promise<SkDriftScreen> {
  await page.viewport(1280, 800);
  const screen = document.createElement('sk-drift-screen');
  Object.assign(screen, props);
  const box = document.createElement('div');
  document.body.append(box);
  render(driftFrame(html`${screen}`), box);
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  return screen;
}
const root = (el: Element): ShadowRoot => {
  if (el.shadowRoot === null) throw new Error('no shadow root');
  return el.shadowRoot;
};
const text = (screen: SkDriftScreen, selector: string): string | null => root(screen).querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? null;
const detail = (screen: SkDriftScreen): HTMLElement => {
  const found = root(screen).querySelector<HTMLElement>('[data-region="detail"]');
  if (found === null) throw new Error('no detail');
  return found;
};
const detailText = (screen: SkDriftScreen): string => (detail(screen).textContent ?? '').replace(/\s+/g, ' ');
const facts = (screen: SkDriftScreen): Array<[string, string]> => {
  const out: Array<[string, string]> = [];
  for (const dt of root(screen).querySelectorAll('[data-region="facts"] dt')) out.push([dt.textContent?.trim() ?? '', dt.nextElementSibling?.textContent?.replace(/\s+/g, ' ').trim() ?? '']);
  return out;
};

describe('kicker, title, explanation (DR-02)', () => {
  it('title: the contract summary is the h2, the kicker holds the severity word with its tone and the kind word', async () => {
    const screen = await mount(reportProps('reportPopulated', { select: 1 }));
    const h2 = detail(screen).querySelector('h2');
    expect(h2?.textContent?.trim()).toBe('The status snapshot disagrees with the event log.');
    expect(detail(screen).querySelectorAll('h2')).toHaveLength(1);
    const pill = root(screen).querySelector('[data-kicker] sk-pill-tag');
    expect(pill?.getAttribute('status')).toBe('danger');
    expect(pill?.textContent?.trim()).toBe('error');
    expect(text(screen, '[data-kicker] [data-kind]')).toBe('Snapshot disagrees');
  });

  it('explanation: the sentence of the kind and source code; none for an unknown kind (positive control above)', async () => {
    const known = await mount(reportProps('reportPopulated', { select: 1 }));
    expect(text(known, '[data-explanation]')).toBe("status.json differs from what the event log gives when it is replayed at the snapshot's own generation.");
    const unknown = await mount(reportProps('reportUnknownKind', { select: 0 }));
    expect(root(unknown).querySelector('[data-explanation]')).toBeNull();
  });

  it('DR-10: an unknown kind shows the raw kind word in the kicker, the summary as title and no command', async () => {
    const screen = await mount(reportProps('reportUnknownKind', { select: 0 }));
    expect(text(screen, '[data-kicker] [data-kind]')).toBe('derived_view_stale');
    expect(text(screen, 'h2')).toBe('An expected lane or Mission branch has no local branch.');
    expect(root(screen).querySelector('[data-copy]')).toBeNull();
  });

  it('DR-10: an unknown severity shows the raw word in the neutral tone', async () => {
    const screen = await mount(reportProps('reportUnknownSeverity', { select: 2 }));
    const pill = root(screen).querySelector('[data-kicker] sk-pill-tag');
    expect(pill?.textContent?.trim()).toBe('info');
    expect(pill?.getAttribute('status')).toBe('neutral');
  });

  it('DR-32: the source code is a quiet mono tag under the title when there is one, and absent when the code is null', async () => {
    const withCode = await mount(reportProps('reportPopulated', { select: 1 }));
    expect(text(withCode, '[data-source-code]')).toBe('SNAPSHOT_DRIFT');
    const title = withCode.shadowRoot?.querySelector('h2');
    const tag = withCode.shadowRoot?.querySelector('[data-source-code]');
    expect(title !== null && tag !== null && (title?.compareDocumentPosition(tag as Node) ?? 0) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const without = await mount(reportProps('reportPopulated', { select: 0 }));
    expect(root(without).querySelector('[data-source-code]')).toBeNull();
  });

  it('an unknown source code keeps the finding, shows the raw code and no explanation', async () => {
    const screen = await mount(reportProps('reportUnknownSourceCode', { select: 2 }));
    expect(text(screen, '[data-source-code]')).toBe('SNAPSHOT_DRIFT_FUTURE');
    expect(root(screen).querySelector('[data-explanation]')).toBeNull();
    expect(text(screen, 'h2')).not.toBeNull();
  });
});

describe('authority panel and Facts (DR-02, DR-08, DR-13)', () => {
  it('authority: a labelled section named by its eyebrow, the authority word in a neutral pill, nothing editable', async () => {
    const screen = await mount(reportProps('reportPopulated', { select: 1 }));
    const section = root(screen).querySelector('[data-region="authority"] section');
    const labelId = section?.getAttribute('aria-labelledby') ?? '';
    expect(labelId).not.toBe('');
    expect(root(screen).getElementById(labelId)?.textContent?.trim()).toBe('Authoritative side');
    const pill = root(screen).querySelector('[data-region="authority"] sk-pill-tag');
    expect(pill?.textContent?.trim()).toBe("The Mission's status event log");
    expect(pill?.getAttribute('status')).toBe('neutral');
    expect(root(screen).querySelectorAll('[data-region="authority"]')).toHaveLength(1);
  });

  it('DR-10: an unknown authority shows the raw word, still neutral, and the finding stays', async () => {
    const screen = await mount(reportProps('reportUnknownAuthority', { select: 3 }));
    expect(text(screen, '[data-region="authority"] sk-pill-tag')).toBe('operator');
    expect(text(screen, 'h2')).not.toBeNull();
  });

  it('Facts: Mission link with the slug, the file in mono, the derived side word, in that order', async () => {
    const screen = await mount(reportProps('reportPopulated', { select: 1 }));
    expect(facts(screen)).toEqual([
      ['Mission', 'sample-slug-01'],
      ['File', 'status.json'],
      ['Derived side', 'status.json (the status snapshot)'],
    ]);
    expect(root(screen).querySelector('[data-region="facts"] section')?.getAttribute('aria-labelledby')).not.toBeNull();
  });

  it('DR-13: an unlisted Mission shows its id in the Mission row and no link, while the other rows stay', async () => {
    const screen = await mount(reportProps('reportMissionUnlisted', { select: 0 }));
    expect(facts(screen).map(([label]) => label)).toEqual(['Mission', 'File', 'Derived side']);
    expect(facts(screen)[0]?.[1]).toBe('01JZCB3H8J9KMNPQRSTVWXYZ01');
    expect(root(screen).querySelector('[data-mission-link]')).toBeNull();
  });

  it('DR-08: the branch finding names no branch anywhere and shows the git authority word and the lane manifest', async () => {
    const screen = await mount(reportProps('reportPopulated', { select: 0 }));
    expect(text(screen, '[data-region="authority"] sk-pill-tag')).toBe('Local git branches');
    expect(facts(screen)[2]).toEqual(['Derived side', 'lanes.json (the lane manifest)']);
    const all = detailText(screen);
    expect(all).not.toMatch(/kitty\/|mission-|lane-[a-z]\b|refs\/|origin\//);
    expect(root(screen).querySelector('[data-region="resolution"]')).toBeNull();
  });
});

describe('the Mission link is plain mono text, not a 44 px Copy-style button (scoped button rules)', () => {
  it('its inner button has no 44 px floor, no start padding, regular weight and the mono face; Copy keeps its 44 px (positive control)', async () => {
    const screen = await mount(reportProps('reportPopulated', { select: 1 }));
    const inner = (selector: string): HTMLElement => {
      const button = root(screen).querySelector(selector)?.shadowRoot?.querySelector('button');
      if (!(button instanceof HTMLElement)) throw new Error(`no button in ${selector}`);
      return button;
    };
    const link = getComputedStyle(inner('[data-mission-link]'));
    expect(link.paddingLeft).toBe('0px');
    expect(link.fontWeight).toBe('400');
    expect(link.fontFamily).toMatch(/mono/i);
    expect(link.color).toBe(getComputedStyle(root(screen).querySelector('[data-region="facts"] dd.sk-facts__value:not(:has(sk-button))') ?? document.body).color);
    // Heights come from the computed floor and a relation, never from a glyph-dependent pixel literal (the fallback mono face differs per machine).
    const copy = getComputedStyle(inner('[data-copy]'));
    expect(link.minBlockSize).not.toBe('44px');
    expect(copy.minBlockSize).toBe('44px');
    expect(inner('[data-copy]').getBoundingClientRect().height).toBeGreaterThanOrEqual(parseFloat(copy.minBlockSize));
    expect(inner('[data-mission-link]').getBoundingClientRect().height).toBeLessThan(inner('[data-copy]').getBoundingClientRect().height);
  });
});

describe('DR-07a and DR-07b: the missing-file finding makes no claim about which file is missing', () => {
  const missing = (artifactPath: string, remedy: string | null): DriftReportView => {
    const base = reportPopulated.findings[4];
    if (base === undefined) throw new Error('fixture');
    return { ...reportPopulated, findings: [{ ...base, artifactPath, remedy }] };
  };
  it('DR-07a: with a remedy the command and Copy are there, and no sentence says a file is missing or names the event log as the missing one', async () => {
    const screen = await mount(pairReport(missing('status.json', 'materialize_status'), { select: 0 }));
    expect(root(screen).querySelector('[data-copy]')).not.toBeNull();
    const all = detailText(screen);
    expect(all).toContain('One of status.json and status.events.jsonl is missing.');
    const sentences = [text(screen, 'h2'), text(screen, '[data-explanation]'), text(screen, '[data-kind]')];
    expect(sentences.every((sentence) => sentence !== null)).toBe(true);
    // Everything but the summary, the explanation and the kind word says nothing of a missing file.
    const rest = sentences.reduce<string>((left, sentence) => left.replace(sentence ?? '', ''), all);
    expect(rest).not.toMatch(/missing|absent|not found/i);
  });
  it('DR-07b: no remedy draws no resolution region (the DR-07a pairing is the positive control)', async () => {
    const withRemedy = await mount(pairReport(missing('status.json', 'materialize_status'), { select: 0 }));
    expect(root(withRemedy).querySelector('[data-region="resolution"]')).not.toBeNull();
    const screen = await mount(pairReport(missing('status.events.jsonl', null), { select: 0 }));
    expect(root(screen).querySelector('[data-region="resolution"]')).toBeNull();
    expect(facts(screen)[1]).toEqual(['File', 'status.events.jsonl']);
  });
});

describe('the detail is one region of siblings, in order', () => {
  it('the blocks of the status finding come in the order kicker, title, explanation, authority, facts, lanes, resolution', async () => {
    const screen = await mount(reportProps('reportPopulated', { select: 1 }));
    const order = [...detail(screen).children].map((child) => child.getAttribute('data-block') ?? child.getAttribute('data-region') ?? '');
    expect(order).toEqual(['kicker', 'title', 'explanation', 'authority', 'facts', 'lanes', 'resolution']);
    expect(order).toHaveLength(7);
  });
});

// TESTS-004: the tests above run at the two-pane tier (the stories' tier), not at the 414 px default, which is the shell's mobile tier.
describe('the tier of this file', () => {
  it('mounts at the two-pane tier: the list and the detail sit side by side (positive control: at 414 px they stack)', async () => {
    const screen = await mount(reportProps('reportPopulated', { select: 1 }));
    const layout = (screen.shadowRoot as ShadowRoot).querySelector('[data-layout]') as HTMLElement;
    expect(window.innerWidth).toBe(1280);
    expect(getComputedStyle(layout).gridTemplateColumns.split(' ')).toHaveLength(2);
    await page.viewport(414, 800);
    expect(getComputedStyle(layout).gridTemplateColumns.split(' ')).toHaveLength(1);
  });
});
