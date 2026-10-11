// The tree helpers shared by artifact-tree.test.ts and artifact-tree.perf.test.ts (the timing-ceiling test runs in its own vitest project).
import { TREE_ID_PREFIX } from '../../src/defaults/index.js';
import type { TreeNode } from '../../src/shell-types.js';

export const leafId = (path: string): string => `${TREE_ID_PREFIX}${path}`;

export function walk(nodes: readonly TreeNode[], into: TreeNode[] = []): TreeNode[] {
  for (const node of nodes) {
    into.push(node);
    if (node.children) walk(node.children, into);
  }
  return into;
}
