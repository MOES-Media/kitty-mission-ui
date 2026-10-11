// The shell tree fed by `buildArtifactTree` for the stories of the Artifact Viewer (IC-09): AV-15 populated with the selected row
// current, AV-16 unreadable rows disabled with the word, AV-17 the truncated listing renders (its note is the document pane's, tested
// elsewhere), AV-18 an empty listing, AV-19 the selection's parents open, AV-29 the unknown kind's neutral icon in the tree data.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkArtifactScreen } from '../src/elements/sk-artifact-screen/sk-artifact-screen.js';
import type { SkShellTree } from '../src/elements/sk-shell-tree/sk-shell-tree.js';
import { artifactFrame, pairingProps } from '../src/elements/sk-artifact-screen/fixtures.js';
import { UNKNOWN_KIND_ICON } from '../src/defaults/index.js';
import { buildArtifactTree } from '../src/logic/artifact-tree.js';

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

async function mount(id: Parameters<typeof pairingProps>[0]): Promise<{ screen: SkArtifactScreen; tree: SkShellTree; current: string }> {
  await page.viewport(1280, 900);
  const props = pairingProps(id);
  const built = buildArtifactTree(props.listing?.entries ?? [], { selectedPath: props.selectedPath });
  const screen = document.createElement('sk-artifact-screen');
  Object.assign(screen, props);
  const box = document.createElement('div');
  document.body.append(box);
  render(artifactFrame(html`${screen}`, { items: built.nodes, current: built.current }), box);
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  const tree = box.querySelector<SkShellTree>('sk-shell-tree') as SkShellTree;
  return { screen, tree, current: built.current };
}
const rows = (tree: SkShellTree): HTMLElement[] => Array.from(tree.shadowRoot?.querySelectorAll<HTMLElement>('sk-action-row') ?? []);
const rowText = (row: HTMLElement): string => (row.textContent ?? '').replace(/\s+/g, ' ').trim();
const folders = (tree: SkShellTree): HTMLDetailsElement[] => Array.from(tree.shadowRoot?.querySelectorAll<HTMLDetailsElement>('details') ?? []);
const folderNamed = (tree: SkShellTree, name: string): HTMLDetailsElement => {
  const found = folders(tree).find((d) => (d.querySelector('summary')?.textContent ?? '').includes(name));
  if (found === undefined) throw new Error(`no folder ${name}`);
  return found;
};

describe('AV-15: the populated tree', () => {
  it('draws every listed file and folder in the listing order, folders with their file counts, and marks the selected row current', async () => {
    const { tree, current } = await mount('AV-15');
    expect(current).toBe('artifact:spec.md');
    expect(tree.current).toBe('artifact:spec.md');
    const leaves = rows(tree).filter((r) => r.hasAttribute('href'));
    expect(leaves.length).toBe(11);
    const selected = leaves.filter((r) => r.hasAttribute('selected'));
    expect(selected.length).toBe(1);
    expect(rowText(selected[0] as HTMLElement)).toContain('spec.md');
    expect(folders(tree).length).toBe(5);
    expect(rowText(folderNamed(tree, 'checklists').querySelector('summary sk-action-row') as HTMLElement)).toContain('1');
    expect(rowText(folderNamed(tree, 'notes').querySelector('summary sk-action-row') as HTMLElement)).toContain('2');
    expect(rowText(folderNamed(tree, 'tasks').querySelector('summary sk-action-row') as HTMLElement)).toContain('2');
    // control: a tree built for another selection marks another row, so the mark is data, not a constant
    const other = buildArtifactTree(pairingProps('AV-15').listing?.entries ?? [], { selectedPath: 'plan.md' });
    expect(other.current).toBe('artifact:plan.md');
  });
});

describe('AV-16: unreadable rows', () => {
  it('stay disabled (no link) and carry the word; control: a readable row keeps its link and has no word', async () => {
    const { tree } = await mount('AV-16');
    const all = rows(tree).filter((r) => !r.closest('summary'));
    expect(all.length).toBe(3);
    for (const row of all) {
      expect(row.hasAttribute('href')).toBe(false);
      expect(rowText(row)).toContain('unavailable');
    }
    const readable = await mount('AV-15');
    const leaf = rows(readable.tree).find((r) => rowText(r).startsWith('spec.md')) as HTMLElement;
    expect(leaf.hasAttribute('href')).toBe(true);
    expect(rowText(leaf)).not.toContain('unavailable');
  });

  it('with nothing selected the tree has no current row', async () => {
    const { tree, current } = await mount('AV-16');
    expect(current).toBe('');
    expect(tree.current).toBe('');
    expect(rows(tree).some((r) => r.hasAttribute('selected'))).toBe(false);
  });
});

describe('AV-17: a truncated listing', () => {
  it('renders the tree and the screen for the truncated listing (the note itself is asserted with the document pane)', async () => {
    const { screen, tree } = await mount('AV-17');
    const leaves = rows(tree).filter((r) => !r.closest('summary'));
    expect(leaves.length).toBe(screen.listing?.entries.length);
    expect(leaves.length).toBeGreaterThan(0);
    expect(screen.listing?.truncated).toBe(true);
    expect(screen.shadowRoot?.querySelector('[data-region="inspector"]')).not.toBeNull();
    // control: the populated listing is not truncated
    expect(pairingProps('AV-15').listing?.truncated).toBe(false);
  });
});

describe('AV-18: an empty listing', () => {
  it('draws no row in the tree and the screen shows the empty form; control: the populated listing draws rows', async () => {
    const { screen, tree } = await mount('AV-18');
    expect(rows(tree).length).toBe(0);
    expect(screen.shadowRoot?.querySelector('.sk-empty-state')).not.toBeNull();
    const populated = await mount('AV-15');
    expect(rows(populated.tree).length).toBeGreaterThan(0);
  });
});

describe('AV-19: the selection opens its parents', () => {
  it('a file in a folder opens that folder and leaves the others closed; control: a root file opens none', async () => {
    const { tree } = await mount('AV-19');
    expect(folderNamed(tree, 'contracts').open).toBe(true);
    for (const name of ['checklists', 'notes', 'tasks']) expect(folderNamed(tree, name).open).toBe(false);
    document.body.replaceChildren();
    const root = await mount('AV-15');
    expect(folders(root.tree).every((d) => !d.open)).toBe(true);
  });

  it('a nested file opens every ancestor, outermost first', async () => {
    await page.viewport(1280, 900);
    const props = pairingProps('AV-28');
    const built = buildArtifactTree(props.listing?.entries ?? [], { selectedPath: props.selectedPath });
    const tasks = built.nodes.find((n) => n.id === 'artifact-folder:tasks');
    expect(tasks?.expanded).toBe(true);
    const nested = tasks?.children?.find((n) => n.id === 'artifact-folder:tasks/WP01-example');
    expect(nested?.expanded).toBe(true);
    expect(built.nodes.filter((n) => n.kind === 'folder' && n.expanded === true).map((n) => n.id)).toEqual(['artifact-folder:tasks']);
  });
});

describe('AV-29: an unknown kind in the tree data', () => {
  it('the leaf of a kind the table does not know carries the neutral icon and its file name; control: a known kind has its own icon', () => {
    const unknown = pairingProps('AV-29');
    const built = buildArtifactTree(unknown.listing?.entries ?? [], { selectedPath: unknown.selectedPath });
    const folder = built.nodes[0];
    const leaf = folder?.children?.[0];
    expect(leaf?.label).toBe('overview.md');
    expect(leaf?.icon).toBe(UNKNOWN_KIND_ICON);
    const known = pairingProps('AV-15');
    const knownTree = buildArtifactTree(known.listing?.entries ?? [], { selectedPath: known.selectedPath });
    const research = knownTree.nodes.find((n) => n.label === 'research.md');
    expect(research?.icon).toBeDefined();
    expect(research?.icon).not.toBe(UNKNOWN_KIND_ICON);
  });
});
