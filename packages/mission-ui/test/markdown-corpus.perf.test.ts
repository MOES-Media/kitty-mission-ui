import { render } from 'lit';
import { describe, expect, it } from 'vitest';
import { resolveLinks } from '../src/logic/markdown/links.js';
import { buildMarkdownModel } from '../src/logic/markdown/model.js';
import { renderMarkdown } from '../src/logic/markdown/render.js';
import { CORPUS, KIB, LISTING, OPEN_PATH, type CorpusEntry } from './support/markdown-corpus-entries.js';
import { CORPUS_SIZE, recorder } from './support/markdown-corpus-harness.js';

describe('the whole pipeline stays inside the ceilings of NFR-006, measured in Chromium', () => {
  /** Best of three runs, after a warm-up run, of the model, the link resolution and the render into a fresh container. */
  function bestOfThree(entry: CorpusEntry): number {
    const once = (): number => {
      const container = document.createElement('div');
      const start = performance.now();
      const model = buildMarkdownModel(entry.source);
      if (model.kind === 'ok') render(renderMarkdown(resolveLinks(model.blocks, { openPath: OPEN_PATH, kindOf: LISTING }), recorder().handlers), container);
      return performance.now() - start;
    };
    once();
    return Math.min(once(), once(), once());
  }

  it('runs every entry under its ceiling (500 ms from 100 KiB of source, 200 ms below)', () => {
    const slow: string[] = [];
    let ran = 0;
    for (const entry of CORPUS) {
      const ceiling = entry.ceilingMs ?? (entry.source.length >= 100 * KIB ? 500 : 200);
      const took = bestOfThree(entry);
      if (took > ceiling) slow.push(`${entry.name}: ${took.toFixed(0)} ms over ${ceiling} ms`);
      ran += 1;
    }
    expect(ran).toBe(CORPUS_SIZE);
    expect(slow.length, slow.join(' | ')).toBeLessThanOrEqual(0);
  });
});
