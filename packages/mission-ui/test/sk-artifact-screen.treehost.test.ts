// The host composition of the Artifact Viewer (IC-09): `sk-mission-shell` with the tree fed by `buildArtifactTree` (memoised on
// `entries` and `selectedPath`) and the screen in its slot. EV-4 and EV-9 (one `sk-navigate` and one `sk-tree-toggle`, each
// originating in the shell tree), the toggle that never rebuilds the tree, the host-held `expandedIds`, and the focus rule 8.
// The host below is a TEST host: it owns the open path and the read-only Set of toggled folder ids, and never writes a toggle back.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkArtifactScreen } from '../src/elements/sk-artifact-screen/sk-artifact-screen.js';
import { artifactFrame, contentAt, pairingProps } from '../src/elements/sk-artifact-screen/fixtures.js';
import type { ArtifactScreenProps } from '../src/elements/sk-artifact-screen/fixtures.js';
import { ARTIFACT_HREF_PREFIX } from '../src/defaults/index.js';
import { buildArtifactTree, pathOfArtifactNode } from '../src/logic/artifact-tree.js';
import type { ArtifactTreeResult } from '../src/logic/artifact-tree.js';
import type { SkShellTree } from '../src/elements/sk-shell-tree/sk-shell-tree.js';
import type { ShellNavigateDetail, TreeToggleDetail } from '../src/shell-types.js';

export interface HostOptions {
  /** The pairing row whose props start the host. */
  readonly row: Parameters<typeof pairingProps>[0];
  /** True keeps the Set of toggled folder ids and passes it as `expandedIds` on each rebuild (PLAN-FRESH3-008 (b)). */
  readonly keepExpanded: boolean;
  /** True models a WRONG host: it rebuilds the tree on every toggle (the control of the focus-survival test). */
  readonly rebuildOnToggle?: boolean;
}

export interface TestHost {
  readonly box: HTMLElement;
  readonly screen: SkArtifactScreen;
  readonly expanded: Set<string>;
  /** Counts the tree builds, so a test sees a memo hit or a rebuild. */
  readonly builds: () => number;
  readonly tree: () => SkShellTree;
  select(path: string): Promise<void>;
  settle(): Promise<void>;
}

const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));

/** The content a path has in the registered fixtures, else the markdown fixture moved to the path. */
function contentFor(base: ArtifactScreenProps, path: string): ArtifactScreenProps['content'] {
  const markdown = pairingProps('AV-01').content;
  if (base.listing?.entries.find((entry) => entry.path === path)?.readable === false) return null;
  return markdown === null ? null : contentAt(markdown, path);
}

export async function mountHost(options: HostOptions, width = 1280): Promise<TestHost> {
  await page.viewport(width, 900);
  const props = pairingProps(options.row);
  const box = document.createElement('div');
  document.body.append(box);
  const screen = document.createElement('sk-artifact-screen');
  Object.assign(screen, props);
  const expanded = new Set<string>();
  let builds = 0;
  let memo: { entries: unknown; path: string; result: ArtifactTreeResult } | null = null;
  let path = props.selectedPath;

  const treeFor = (): ArtifactTreeResult => {
    const entries = props.listing?.entries ?? [];
    if (memo !== null && memo.entries === entries && memo.path === path) return memo.result;
    builds += 1;
    const result = buildArtifactTree(entries, { selectedPath: path, expandedIds: options.keepExpanded ? expanded : null });
    memo = { entries, path, result };
    return result;
  };
  const paint = (): void => {
    const tree = treeFor();
    render(artifactFrame(html`${screen}`, { items: tree.nodes, current: tree.current }), box);
  };

  box.addEventListener('sk-navigate', (event) => {
    const detail = (event as CustomEvent<ShellNavigateDetail>).detail;
    const target = pathOfArtifactNode(detail.id);
    if (target !== null) void host.select(target);
  });
  box.addEventListener('sk-tree-toggle', (event) => {
    const detail = (event as CustomEvent<TreeToggleDetail>).detail;
    if (options.keepExpanded) {
      if (detail.expanded) expanded.add(detail.id);
      else expanded.delete(detail.id);
    }
    if (options.rebuildOnToggle === true) {
      memo = null;
      paint();
    }
  });

  const host: TestHost = {
    box,
    screen,
    expanded,
    builds: () => builds,
    tree: () => {
      const found = box.querySelector<SkShellTree>('sk-shell-tree');
      if (found === null) throw new Error('no shell tree');
      return found;
    },
    async select(next) {
      path = next;
      screen.selectedPath = next;
      screen.content = contentFor(props, next);
      screen.contentStatus = screen.content === null ? 'refused' : 'ready';
      screen.refusalCode = screen.content === null ? 'artifact_unreadable' : null;
      paint();
      await host.settle();
    },
    async settle() {
      await screen.updateComplete;
      await frame();
      await frame();
    },
  };
  paint();
  await host.settle();
  return host;
}


// ---- The tests.

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

const treeRoot = (host: TestHost): ShadowRoot => {
  const root = host.tree().shadowRoot;
  if (root === null) throw new Error('no tree root');
  return root;
};
const folderSummary = (host: TestHost, label: string): HTMLElement => {
  const found = Array.from(treeRoot(host).querySelectorAll<HTMLElement>('details > summary')).find((summary) => (summary.textContent ?? '').includes(label));
  if (found === undefined) throw new Error(`no folder ${label}`);
  return found;
};
const folderOpen = (host: TestHost, label: string): boolean => (folderSummary(host, label).parentElement as HTMLDetailsElement).open;
const leafRow = (host: TestHost, label: string): HTMLElement => {
  const found = Array.from(treeRoot(host).querySelectorAll<HTMLElement>('sk-action-row[href]')).find((row) => (row.textContent ?? '').trim().startsWith(label));
  if (found === undefined) throw new Error(`no leaf ${label}`);
  return found;
};
/** An event with its composed path, read while it is dispatched (a path read afterwards is empty). */
type Seen = CustomEvent & { path: EventTarget[] };
const keep = (e: Event): Seen => Object.assign(e as CustomEvent, { path: e.composedPath() });
function listen(host: TestHost): { navigate: Seen[]; toggle: Seen[]; screen: CustomEvent[] } {
  const seen = { navigate: [] as Seen[], toggle: [] as Seen[], screen: [] as CustomEvent[] };
  host.box.addEventListener('sk-navigate', (e) => seen.navigate.push(keep(e)));
  host.box.addEventListener('sk-tree-toggle', (e) => seen.toggle.push(keep(e)));
  // a tree event that the screen host dispatched itself would show here: it is a listener on the screen host only
  host.screen.addEventListener('sk-navigate', (e) => seen.screen.push(e as CustomEvent));
  host.screen.addEventListener('sk-tree-toggle', (e) => seen.screen.push(e as CustomEvent));
  return seen;
}
/** Every match of a selector in a node and in all the shadow roots below it. */
function deepAll(node: ParentNode, selector: string): Element[] {
  const found = Array.from(node.querySelectorAll(selector));
  for (const el of Array.from(node.querySelectorAll('*'))) if (el.shadowRoot !== null) found.push(...deepAll(el.shadowRoot, selector));
  if (node instanceof Element && node.shadowRoot !== null) found.push(...deepAll(node.shadowRoot, selector));
  return found;
}
const frames = async (n = 2): Promise<void> => {
  for (let i = 0; i < n; i += 1) await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
};

describe('EV-4 and EV-9: the tree events in the host composition', () => {
  it('a click on a leaf: the host sees exactly one sk-navigate, from inside the shell tree, and none from the screen host', async () => {
    const host = await mountHost({ row: 'AV-15', keepExpanded: true });
    const seen = listen(host);
    leafRow(host, 'plan.md').click();
    await host.settle();
    expect(seen.navigate.length).toBe(1);
    const event = seen.navigate[0] as Seen;
    expect(event.detail).toEqual({ id: 'artifact:plan.md', href: `${ARTIFACT_HREF_PREFIX}plan.md` });
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
    expect(event.cancelable).toBe(false);
    expect(event.path.includes(host.tree())).toBe(true);
    expect(event.path.includes(host.screen)).toBe(false);
    expect(seen.screen.length).toBe(0);
    // behaviour: the host followed the event, the screen shows the new path and the tree marks the new leaf
    expect(host.screen.selectedPath).toBe('plan.md');
    expect(host.tree().current).toBe('artifact:plan.md');
    expect(seen.toggle.length).toBe(0);
  });

  it('a toggle of a folder: the host sees exactly one sk-tree-toggle, from inside the shell tree, and none from the screen host', async () => {
    const host = await mountHost({ row: 'AV-15', keepExpanded: true });
    const seen = listen(host);
    expect(folderOpen(host, 'contracts')).toBe(false);
    folderSummary(host, 'contracts').click();
    await host.settle();
    expect(seen.toggle.length).toBe(1);
    const event = seen.toggle[0] as Seen;
    expect(event.detail).toEqual({ id: 'artifact-folder:contracts', expanded: true });
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
    expect(event.cancelable).toBe(false);
    expect(event.path.includes(host.tree())).toBe(true);
    expect(event.path.includes(host.screen)).toBe(false);
    expect(seen.screen.length).toBe(0);
    expect(seen.navigate.length).toBe(0);
  });

  it('closing the folder again emits one more toggle with expanded false (the exact payload both ways)', async () => {
    const host = await mountHost({ row: 'AV-15', keepExpanded: true });
    const seen = listen(host);
    folderSummary(host, 'contracts').click();
    await host.settle();
    folderSummary(host, 'contracts').click();
    await host.settle();
    expect(seen.toggle.map((e) => e.detail)).toEqual([
      { id: 'artifact-folder:contracts', expanded: true },
      { id: 'artifact-folder:contracts', expanded: false },
    ]);
  });
});

describe('a toggle never rebuilds the tree: the focused summary survives (PLAN-DESIGN-006)', () => {
  it('toggling a folder keeps the same summary element focused and builds the tree once', async () => {
    const host = await mountHost({ row: 'AV-15', keepExpanded: true });
    const buildsBefore = host.builds();
    const summary = folderSummary(host, 'contracts');
    summary.focus();
    expect(treeRoot(host).activeElement).toBe(summary);
    summary.click();
    await host.settle();
    expect(host.builds()).toBe(buildsBefore);
    expect(summary.isConnected).toBe(true);
    expect(folderSummary(host, 'contracts')).toBe(summary);
    expect(treeRoot(host).activeElement).toBe(summary);
    expect(folderOpen(host, 'contracts')).toBe(true);
  });

  it('control: a host that rebuilds the tree on a toggle loses the focused summary', async () => {
    const host = await mountHost({ row: 'AV-15', keepExpanded: true, rebuildOnToggle: true });
    const summary = folderSummary(host, 'contracts');
    summary.focus();
    summary.click();
    await host.settle();
    expect(summary.isConnected).toBe(false);
    expect(treeRoot(host).activeElement).not.toBe(summary);
  });
});

describe('the host-held expandedIds (PLAN-FRESH3-008 (b))', () => {
  it('an opened sibling folder stays open after a selection elsewhere; the Set holds exactly that id and the shell tree is not written', async () => {
    const host = await mountHost({ row: 'AV-15', keepExpanded: true });
    folderSummary(host, 'contracts').click();
    await host.settle();
    expect(Array.from(host.expanded)).toEqual(['artifact-folder:contracts']);
    expect(folderOpen(host, 'notes')).toBe(false);
    await host.select('notes/with space.md');
    expect(host.tree().current).toBe('artifact:notes/with space.md');
    expect(folderOpen(host, 'notes')).toBe(true); // the selection's parent opens
    expect(folderOpen(host, 'contracts')).toBe(true); // the sibling the user opened stays open
  });

  it('control: the same composition without the Set finds the sibling closed', async () => {
    const host = await mountHost({ row: 'AV-15', keepExpanded: false });
    folderSummary(host, 'contracts').click();
    await host.settle();
    expect(folderOpen(host, 'contracts')).toBe(true);
    await host.select('notes/with space.md');
    expect(folderOpen(host, 'notes')).toBe(true);
    expect(folderOpen(host, 'contracts')).toBe(false);
  });

  it('a folder the user closed again is not kept open', async () => {
    const host = await mountHost({ row: 'AV-15', keepExpanded: true });
    folderSummary(host, 'contracts').click();
    await host.settle();
    folderSummary(host, 'contracts').click();
    await host.settle();
    expect(host.expanded.size).toBe(0);
    await host.select('notes/with space.md');
    expect(folderOpen(host, 'contracts')).toBe(false);
  });
});

describe('the focus rule 8 against the shell tree that re-creates its rows', () => {
  const focusRow = (host: TestHost): HTMLElement => {
    const row = leafRow(host, 'plan.md');
    const inner = row.shadowRoot?.querySelector<HTMLElement>('a, button, [tabindex]') ?? row;
    inner.focus();
    expect(host.box.contains(document.activeElement)).toBe(true);
    return inner;
  };

  it('focus in a tree row, the selection changes and the rows are re-created: focus lands on the pane, never on body', async () => {
    const host = await mountHost({ row: 'AV-15', keepExpanded: true });
    const row = focusRow(host);
    await host.select('research.md');
    await host.screen.updateComplete;
    await frames(1);
    expect(row.isConnected).toBe(false); // the rows were re-created
    expect(document.activeElement).toBe(host.screen);
    const pane = host.screen.shadowRoot?.querySelector('[data-region="document-pane"]');
    expect(pane).not.toBeNull();
    expect(host.screen.shadowRoot?.activeElement).toBe(pane);
    expect(document.activeElement).not.toBe(document.body);
  });

  it('control: an input outside the tree and the pane keeps focus across the same change', async () => {
    const host = await mountHost({ row: 'AV-15', keepExpanded: true });
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    expect(document.activeElement).toBe(input);
    await host.select('research.md');
    await frames(2);
    expect(document.activeElement).toBe(input);
    expect(host.screen.shadowRoot?.activeElement ?? null).toBeNull();
  });

  it('control: with focus on body before the change nothing is moved', async () => {
    const host = await mountHost({ row: 'AV-15', keepExpanded: true });
    (document.activeElement as HTMLElement | null)?.blur();
    expect(document.activeElement).toBe(document.body);
    await host.select('research.md');
    await frames(2);
    expect(document.activeElement).toBe(document.body);
    expect(host.screen.shadowRoot?.activeElement ?? null).toBeNull();
  });
});

describe('an unavailable selected leaf (PLAN-DESIGN-005)', () => {
  it('current is empty, the nav item keeps its mark and the pane shows the refusal; control: a readable leaf sets current', async () => {
    await page.viewport(1280, 900);
    const host = await mountHost({ row: 'AV-15', keepExpanded: true });
    await host.select('notes/big-export.json');
    expect(host.tree().current).toBe('');
    const shell = host.box.querySelector('sk-mission-shell') as HTMLElement;
    const marks = deepAll(shell, '[aria-current="page"]');
    expect(marks.length).toBe(1);
    const hosts: string[] = [];
    for (let node: Node | null = marks[0] ?? null; node !== null; ) {
      const root = node.getRootNode();
      node = root instanceof ShadowRoot ? root.host : null;
      if (node instanceof Element) hosts.push(node.getAttribute('item-id') ?? node.localName);
    }
    expect(hosts).toContain('nav-artifacts');
    expect(host.screen.shadowRoot?.querySelector('[data-refusal]')).not.toBeNull();
    // the unreadable row is disabled and carries the word
    const row = Array.from(treeRoot(host).querySelectorAll<HTMLElement>('sk-action-row')).find((r) => (r.textContent ?? '').includes('big-export.json')) as HTMLElement;
    expect(row.hasAttribute('href')).toBe(false);
    expect(row.textContent).toContain('unavailable');
    // control
    await host.select('spec.md');
    expect(host.tree().current).toBe('artifact:spec.md');
    expect(host.screen.shadowRoot?.querySelector('[data-refusal]')).toBeNull();
  });
});
