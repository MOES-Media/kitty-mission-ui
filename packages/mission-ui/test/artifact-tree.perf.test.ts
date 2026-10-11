import { describe, expect, it } from 'vitest';
import { BULK_LISTING_SIZE, makeArtifactListing } from '../src/contract/bulk.js';
import { buildArtifactTree } from '../src/logic/artifact-tree.js';
import { leafId, walk } from './support/artifact-tree-harness.js';

describe('buildArtifactTree: the 1000-entry listing', () => {
  it('builds it under the 500 ms ceiling, best of three after a warm-up, and the pinned shape holds', () => {
    const listing = makeArtifactListing(BULK_LISTING_SIZE, { truncated: true, include: ['spec.md'] });
    expect(listing.entries.length).toBe(1000);
    const options = { selectedPath: 'spec.md' };
    const warm = buildArtifactTree(listing.entries, options);
    expect(walk(warm.nodes).filter((n) => n.kind === 'leaf').length).toBe(1000);
    expect(warm.current).toBe(leafId('spec.md'));
    const times: number[] = [];
    for (let run = 0; run < 3; run += 1) {
      const start = performance.now();
      buildArtifactTree(listing.entries, options);
      times.push(performance.now() - start);
    }
    expect(times.length).toBe(3);
    expect(Math.min(...times)).toBeLessThan(500);
  });
});
