// The pieces shared by markdown-corpus.test.ts and markdown-corpus.perf.test.ts (the timing-ceiling tests run in their own vitest project).
import type { LinkHandlers } from '../../src/logic/markdown/render.js';
import { CORPUS, type Activation } from './markdown-corpus-entries.js';

/** The entry count the corpus holds; a loop that runs fewer times than this is a failure, not a pass. */
export const CORPUS_SIZE = CORPUS.length;

export interface Recorder {
  events: Activation[];
  handlers: LinkHandlers;
}

export function recorder(overflowing: ReadonlySet<number> = new Set()): Recorder {
  const events: Activation[] = [];
  return {
    events,
    handlers: {
      openArtifact: (path, kind) => events.push({ artifact: { path, kind } }),
      openExternal: (href) => events.push({ external: href }),
      overflowing,
    },
  };
}
