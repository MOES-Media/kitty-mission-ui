// Evidence chain and Dependency chain (IC-06, T041, T042): the bodies of the `evidence-chain` and `dependency-chain` panels.
// Drawn alone (the views are built by hand) and through the screen (which owns the panels and builds the views from the
// fixtures). Every absence test is paired with its present sibling; every loop asserts its count.
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkWorkPackageScreen } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import { renderDependencyChain, renderEvidenceChain } from '../src/elements/sk-work-package-screen/chain-parts.js';
import type { DependencyChainView, DependencyNodeView } from '../src/elements/sk-work-package-screen/chain-parts.js';
import { DETAIL_FIXTURES, WORK_PACKAGE_FIXTURES, pairDetail, pairingProps, sampleMission, workPackageFrame } from '../src/elements/sk-work-package-screen/fixtures.js';
import type { PairingId, WpScreenProps } from '../src/elements/sk-work-package-screen/fixtures.js';
import { BLOCKED_TEXT, NOT_STARTED_BADGE, NO_DEPENDENCIES_TEXT, READY_TEXT, SATISFIED_TEXT, STATE_BADGES, UNSATISFIED_TEXT, dependencyNodeLabel } from '../src/defaults/index.js';

afterEach(() => {
  document.body.replaceChildren();
});

const node = (wpId: string, title: string, laneWord: string, unsatisfied = false): DependencyNodeView => ({ wpId, title, laneWord, unsatisfied });
const chainView = (nodes: DependencyNodeView[], flags: Partial<DependencyChainView> = {}): DependencyChainView => ({
  nodes,
  satisfied: true,
  readyToStart: false,
  inert: false,
  ...flags,
});

function draw(template: ReturnType<typeof renderDependencyChain>): HTMLElement {
  const box = document.createElement('div');
  document.body.append(box);
  render(template, box);
  return box;
}
const buttons = (scope: ParentNode): HTMLElement[] => [...scope.querySelectorAll<HTMLElement>('sk-button')];
const text = (scope: Element): string => (scope.textContent ?? '').replace(/\s+/g, ' ').trim();

async function mount(id: PairingId, props: Partial<WpScreenProps> = {}): Promise<SkWorkPackageScreen> {
  await page.viewport(1280, 900);
  const screen = document.createElement('sk-work-package-screen');
  Object.assign(screen, { ...pairingProps(id), ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(workPackageFrame(html`${screen}`), box);
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  return screen;
}
function region(screen: SkWorkPackageScreen, id: string): HTMLElement {
  const found = screen.shadowRoot?.querySelector<HTMLElement>(`[data-region="${id}"]`);
  if (found === null || found === undefined) throw new Error(`no region ${id}`);
  return found;
}

describe('Evidence chain (T041)', () => {
  const badge = STATE_BADGES['in_progress'] ?? NOT_STARTED_BADGE;
  const view = { missionLabel: 'Sample mission', wpId: 'WP04', stateBadge: badge };

  it('is a native ordered list of three pills (Mission, Work Package, state word) with decorative arrows and no control', () => {
    const box = draw(renderEvidenceChain(view));
    const list = box.querySelectorAll('ol');
    expect(list).toHaveLength(1);
    const items = [...box.querySelectorAll('ol > li')];
    expect(items).toHaveLength(3);
    const pills = [...box.querySelectorAll('sk-pill-tag')];
    expect(pills.map((p) => text(p))).toEqual(['Sample mission', 'WP04', badge.label]);
    expect(pills[2]?.getAttribute('status')).toBe(badge.tone);
    const arrows = [...box.querySelectorAll('[aria-hidden="true"]')];
    expect(arrows).toHaveLength(2);
    expect(arrows.every((a) => text(a) === '→')).toBe(true);
    // No control and no tab stop; the positive control is the dependency chain, which has both.
    expect(box.querySelectorAll('button, a, sk-button, [tabindex], input')).toHaveLength(0);
    const deps = draw(renderDependencyChain(chainView([node('WP01', 'First', 'queued')]), () => undefined));
    expect(buttons(deps)).toHaveLength(1);
  });

  it('through the screen: a null lane gives the not-started word, an unknown lane shows raw, never undefined', async () => {
    const stated = await mount('WP-01');
    expect([...region(stated, 'evidence-chain').querySelectorAll('sk-pill-tag')].map((p) => text(p))).toEqual([sampleMission.name, WORK_PACKAGE_FIXTURES.wpPopulated.wpId, badge.label]);
    document.body.replaceChildren();

    const noEvents = await mount('WP-10');
    const words = [...region(noEvents, 'evidence-chain').querySelectorAll('sk-pill-tag')].map((p) => text(p));
    expect(words).toHaveLength(3);
    expect(words[2]).toBe(NOT_STARTED_BADGE.label);
    document.body.replaceChildren();

    const unknown = await mount('WP-45');
    const raw = [...region(unknown, 'evidence-chain').querySelectorAll('sk-pill-tag')].map((p) => text(p));
    expect(raw).toHaveLength(3);
    expect(raw[2]).toBe(WORK_PACKAGE_FIXTURES.wpUnknownLane.statusLane);
    expect(region(unknown, 'evidence-chain').textContent).not.toContain('undefined');
  });
});

describe('Dependency chain: the node (T042)', () => {
  const nodes = [node('WP01', 'Define the data model', 'queued'), node('WP02', 'Build the list view', 'coding')];

  it('is a list of ghost sk-button nodes, each named by dependencyNodeLabel, with its three texts in ONE slot element and no raw button', () => {
    const box = draw(renderDependencyChain(chainView(nodes), () => undefined));
    expect(box.querySelectorAll('ul')).toHaveLength(1);
    const found = buttons(box);
    expect(found).toHaveLength(2);
    let checked = 0;
    found.forEach((button, index) => {
      const n = nodes[index] as DependencyNodeView;
      expect(button.getAttribute('variant')).toBe('ghost');
      expect(button.getAttribute('label')).toBe(dependencyNodeLabel(n.wpId, n.title, n.laneWord));
      expect(button.children).toHaveLength(1);
      const slotted = button.children[0] as HTMLElement;
      expect(slotted.hasAttribute('slot')).toBe(false);
      expect(text(slotted)).toContain(n.wpId);
      expect(text(slotted)).toContain(n.title);
      expect(text(slotted)).toContain(n.laneWord);
      checked += 1;
    });
    expect(checked).toBe(2);
    // No raw button and no anchor in the light DOM of the chain (the library element owns its inner button).
    expect(box.querySelectorAll('button, a')).toHaveLength(0);
    // The arrows between the nodes are decorative: one fewer than the nodes.
    const arrows = [...box.querySelectorAll('[aria-hidden="true"]')];
    expect(arrows).toHaveLength(1);
    expect(text(arrows[0] as Element)).toBe('→');
  });

  it('shows a title equal to the id once and passes the activated id to the handler (one node per dependency)', () => {
    const calls: string[] = [];
    const box = draw(renderDependencyChain(chainView([node('WP03', 'WP03', NOT_STARTED_BADGE.label), node('WP05', 'Other', 'coding')]), (id) => calls.push(id)));
    const [first, second] = buttons(box);
    const slotted = (first as HTMLElement).children[0] as HTMLElement;
    expect(text(slotted).split('WP03')).toHaveLength(2);
    expect(text(slotted)).toContain(NOT_STARTED_BADGE.label);
    (first as HTMLElement).click();
    (second as HTMLElement).click();
    expect(calls).toEqual(['WP03', 'WP05']);
  });

  it('draws the nodes inert while there is no Mission, paired with the live sibling', () => {
    const inert = draw(renderDependencyChain(chainView(nodes, { inert: true }), () => undefined));
    const live = draw(renderDependencyChain(chainView(nodes), () => undefined));
    expect(buttons(inert).map((b) => b.hasAttribute('disabled'))).toEqual([true, true]);
    expect(buttons(live).map((b) => b.hasAttribute('disabled'))).toEqual([false, false]);
  });

  it('a lane word the tables do not know is shown as given, and a very long title stays in the node text', () => {
    const long = 'Supercalifragilistic '.repeat(12).trim();
    const box = draw(renderDependencyChain(chainView([node('WP09', long, 'quarantined')]), () => undefined));
    const slotted = (buttons(box)[0] as HTMLElement).children[0] as HTMLElement;
    expect(text(slotted)).toContain('quarantined');
    expect(text(slotted)).toContain(long);
    expect(box.textContent).not.toContain('undefined');
  });

  it('through the screen: ONE unbroken long title wraps inside its node and is not clipped (E-21, CP-1 ruling), paired with a title of short words', async () => {
    const unbroken = 'U'.repeat(160);
    const base = pairingProps('WP-11');
    const detail = base.detail;
    if (detail === null) throw new Error('fixture has no detail');
    const withTitle = (title: string): Partial<WpScreenProps> => ({
      detail: { ...detail, dependencies: [{ wpId: 'WP01', title, statusLane: 'planned' }] },
    });
    const measure = async (title: string): Promise<{ lines: number; clipped: boolean; boxRight: number; textRight: number }> => {
      const screen = await mount('WP-11', withTitle(title));
      const button = region(screen, 'dependency-chain').querySelector<HTMLElement>('ul sk-button');
      const wrap = button?.querySelector<HTMLElement>('[data-node-text]');
      const span = [...(wrap?.children ?? [])].find((c) => (c.textContent ?? '').includes(title.slice(0, 5))) as HTMLElement | undefined;
      if (button === null || button === undefined || wrap === null || wrap === undefined || span === undefined) throw new Error('no node');
      const range = document.createRange();
      range.selectNodeContents(span);
      const rects = [...range.getClientRects()];
      return {
        lines: new Set(rects.map((r) => Math.round(r.top))).size,
        clipped: wrap.scrollWidth > wrap.clientWidth,
        boxRight: button.getBoundingClientRect().right,
        textRight: Math.max(...rects.map((r) => r.right)),
      };
    };
    const long = await measure(unbroken);
    expect(long.lines).toBeGreaterThan(1);
    expect(long.clipped).toBe(false);
    expect(long.textRight).toBeLessThanOrEqual(long.boxRight);
    document.body.replaceChildren();
    // Positive control: a title of short words also fits, on its own measurement.
    const short = await measure('Short words only');
    expect(short.clipped).toBe(false);
    expect(short.textRight).toBeLessThanOrEqual(short.boxRight);
  });

  it('through the screen: no two controls of the column share an accessible name (WP-13)', async () => {
    const screen = await mount('WP-13');
    const names = buttons(region(screen, 'dependency-chain')).map((b) => b.getAttribute('label'));
    expect(names).toHaveLength(2);
    expect(new Set(names).size).toBe(2);
    const dependencies = DETAIL_FIXTURES.detailDepsBlocked.dependencies;
    expect(dependencies).toHaveLength(2);
    expect(names).toEqual(dependencies.map((d) => dependencyNodeLabel(d.wpId, d.title, STATE_BADGES[d.statusLane ?? '']?.label ?? '')));
    // The whole column holds exactly these controls: one per dependency and nothing else in the evidence chain.
    expect(region(screen, 'evidence-chain').querySelectorAll('sk-button')).toHaveLength(0);
  });

  it('through the screen: each node is ONE tab stop, in order (positive control: focus lands on the first node)', async () => {
    const screen = await mount('WP-13');
    const found = buttons(region(screen, 'dependency-chain'));
    expect(found).toHaveLength(2);
    (found[0] as HTMLElement).focus();
    expect(screen.shadowRoot?.activeElement).toBe(found[0]);
    await userEvent.tab();
    expect(screen.shadowRoot?.activeElement).toBe(found[1]);
  });
});

describe('Dependency chain: readiness in words (T042 step 2; the three D1 cases)', () => {
  const nodes = [node('WP01', 'One', 'queued', true), node('WP02', 'Two', 'coding', true)];

  it('blocked (satisfied false): the waiting words and the unsatisfied ids marked in words, no satisfied and no ready words', () => {
    const box = draw(renderDependencyChain(chainView(nodes, { satisfied: false, readyToStart: false }), () => undefined));
    const body = text(box);
    expect(body).toContain(BLOCKED_TEXT);
    expect(body).not.toContain(SATISFIED_TEXT);
    expect(body).not.toContain(READY_TEXT);
    const marks = [...box.querySelectorAll('[data-unsatisfied]')];
    expect(marks).toHaveLength(2);
    expect(marks.every((m) => text(m) === UNSATISFIED_TEXT)).toBe(true);
  });

  it('ready (satisfied and readyToStart): satisfied and ready words, no waiting words, no unsatisfied mark', () => {
    const box = draw(renderDependencyChain(chainView([node('WP01', 'One', 'approved')], { satisfied: true, readyToStart: true }), () => undefined));
    const body = text(box);
    expect(body).toContain(SATISFIED_TEXT);
    expect(body).toContain(READY_TEXT);
    expect(body).not.toContain(BLOCKED_TEXT);
    expect(box.querySelectorAll('[data-unsatisfied]')).toHaveLength(0);
  });

  it('started or finished (satisfied, not readyToStart): the satisfied words ALONE: neither ready nor waiting', () => {
    const box = draw(renderDependencyChain(chainView([node('WP01', 'One', 'approved')], { satisfied: true, readyToStart: false }), () => undefined));
    const body = text(box);
    expect(body).toContain(SATISFIED_TEXT);
    expect(body).not.toContain(READY_TEXT);
    expect(body).not.toContain(BLOCKED_TEXT);
  });

  it('the waiting words follow satisfied alone: an unsatisfied chain never reads ready, even if readyToStart says so', () => {
    const box = draw(renderDependencyChain(chainView(nodes, { satisfied: false, readyToStart: true }), () => undefined));
    expect(text(box)).toContain(BLOCKED_TEXT);
    expect(text(box)).not.toContain(READY_TEXT);
  });

  it('no dependencies: only the empty form, with no readiness word and no list, paired with a chain that draws its list', () => {
    const none = draw(renderDependencyChain(chainView([]), () => undefined));
    expect(text(none)).toBe(NO_DEPENDENCIES_TEXT);
    expect(none.querySelectorAll('ul')).toHaveLength(0);
    const some = draw(renderDependencyChain(chainView([node('WP01', 'One', 'queued')]), () => undefined));
    expect(some.querySelectorAll('ul')).toHaveLength(1);
    expect(text(some)).not.toContain(NO_DEPENDENCIES_TEXT);
  });

  it('through the screen: WP-13 blocked, WP-14 ready, WP-11 started (the three cases), WP-15 none', async () => {
    const blocked = region(await mount('WP-13'), 'dependency-chain');
    expect(text(blocked)).toContain(BLOCKED_TEXT);
    expect(text(blocked)).not.toContain(READY_TEXT);
    expect(blocked.querySelectorAll('[data-unsatisfied]')).toHaveLength(2);
    document.body.replaceChildren();

    const ready = region(await mount('WP-14'), 'dependency-chain');
    expect(text(ready)).toContain(SATISFIED_TEXT);
    expect(text(ready)).toContain(READY_TEXT);
    expect(text(ready)).not.toContain(BLOCKED_TEXT);
    document.body.replaceChildren();

    const started = region(await mount('WP-11'), 'dependency-chain');
    expect(text(started)).toContain(SATISFIED_TEXT);
    expect(text(started)).not.toContain(READY_TEXT);
    expect(text(started)).not.toContain(BLOCKED_TEXT);
    document.body.replaceChildren();

    const none = region(await mount('WP-15'), 'dependency-chain');
    expect(text(none)).toContain(NO_DEPENDENCIES_TEXT);
    expect(none.querySelectorAll('sk-button')).toHaveLength(0);
  });

  it('through the screen: a dependency with a null lane reads the not-started word and a title equal to the id shows once (WP-16)', async () => {
    const dep = DETAIL_FIXTURES.detailDepNullLane.dependencies[0];
    expect(dep?.title).toBe(dep?.wpId);
    const chain = region(await mount('WP-16'), 'dependency-chain');
    const found = buttons(chain);
    expect(found).toHaveLength(1);
    const slotted = (found[0] as HTMLElement).children[0] as HTMLElement;
    expect(text(slotted).split(dep?.wpId ?? '?')).toHaveLength(2);
    expect(text(slotted)).toContain(NOT_STARTED_BADGE.label);
  });

  it('through the screen: markers in a dependency title are shown verbatim and never parsed (WP-50), paired with a plain title', async () => {
    const screen = await mount('WP-50');
    const dep = DETAIL_FIXTURES.detailRedaction.dependencies[0];
    const title = dep?.title ?? '';
    expect(title).toContain('[path]');
    const found = buttons(region(screen, 'dependency-chain'));
    expect(found).toHaveLength(1);
    const slotted = (found[0] as HTMLElement).children[0] as HTMLElement;
    expect(text(slotted)).toContain(title);
    expect(found[0]?.getAttribute('label')).toBe(dependencyNodeLabel(dep?.wpId ?? '', title, STATE_BADGES[dep?.statusLane ?? '']?.label ?? ''));
    // Nothing was made from the marker: no link, no mail address, no element beyond the three text spans.
    expect(slotted.querySelectorAll('a, [href]')).toHaveLength(0);
    expect(region(screen, 'dependency-chain').innerHTML).not.toContain('mailto:');
    document.body.replaceChildren();

    const plain = await mount('WP-11');
    const plainTitle = DETAIL_FIXTURES.detailPopulated.dependencies[0]?.title ?? '';
    expect(plainTitle).not.toContain('[');
    expect(text(region(plain, 'dependency-chain'))).toContain(plainTitle);
  });

  it('a Work Package paired with a detail for another Work Package shows the bare dependency ids only', async () => {
    const wp = WORK_PACKAGE_FIXTURES.wpPopulated;
    const other = { ...pairDetail(wp, DETAIL_FIXTURES.detailPopulated), wpId: 'WP99' };
    const screen = await mount('WP-11', { detail: other });
    const found = buttons(region(screen, 'dependency-chain'));
    expect(found).toHaveLength(wp.dependencies.length);
    expect(text(found[0] as HTMLElement)).not.toContain(DETAIL_FIXTURES.detailPopulated.dependencies[0]?.title ?? '?');
  });
});

describe('Dependency chain: keyed nodes (TESTS-002)', () => {
  const nodesIn = (box: ParentNode): HTMLElement[] => [...box.querySelectorAll<HTMLElement>('ul[data-chain] > li')];
  const idsIn = (box: ParentNode): string[] => nodesIn(box).map((li) => text(li.querySelector('[data-node-text] > span') as Element));

  it('keeps the node of every dependency that stays when one is inserted in front', () => {
    const box = document.createElement('div');
    document.body.append(box);
    render(renderDependencyChain(chainView([node('WP02', 'Two', 'queued'), node('WP03', 'Three', 'queued')]), () => undefined), box);
    const before = nodesIn(box);
    render(renderDependencyChain(chainView([node('WP01', 'One', 'queued'), node('WP02', 'Two', 'queued'), node('WP03', 'Three', 'queued')]), () => undefined), box);
    const after = nodesIn(box);
    expect(after).toHaveLength(3);
    expect(after[1]).toBe(before[0]);
    expect(after[2]).toBe(before[1]);
    expect(before.includes(after[0] as HTMLElement)).toBe(false);
  });

  it('draws a duplicated dependency id once per entry, in input order (pinning the current output)', () => {
    const box = draw(renderDependencyChain(chainView([node('WP02', 'Two', 'queued'), node('WP02', 'Two', 'queued'), node('WP03', 'Three', 'queued')]), () => undefined));
    expect(idsIn(box)).toEqual(['WP02', 'WP02', 'WP03']);
  });
});
