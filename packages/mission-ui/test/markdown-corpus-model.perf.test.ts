import { describe, expect, it } from 'vitest';
import { resolveLinks } from '../src/logic/markdown/links.js';
import { buildMarkdownModel } from '../src/logic/markdown/model.js';
import { CORPUS, KIB, LISTING, OPEN_PATH } from './support/markdown-corpus-entries.js';

describe('the corpus on the model', () => {
  it('builds every model inside its ceiling (model only, best of three after a warm-up)', () => {
    const slow: string[] = [];
    for (const entry of CORPUS) {
      const ceiling = entry.ceilingMs ?? (entry.source.length >= 100 * KIB ? 500 : 200);
      buildMarkdownModel(entry.source);
      let best = Infinity;
      for (let run = 0; run < 3; run += 1) {
        const start = performance.now();
        const result = buildMarkdownModel(entry.source);
        if (result.kind === 'ok') resolveLinks(result.blocks, { openPath: OPEN_PATH, kindOf: LISTING });
        best = Math.min(best, performance.now() - start);
      }
      if (best > ceiling) slow.push(`${entry.name}: ${best.toFixed(0)} ms over ${ceiling} ms`);
    }
    expect(slow.length, slow.join(' | ')).toBeLessThanOrEqual(0);
  });
});
