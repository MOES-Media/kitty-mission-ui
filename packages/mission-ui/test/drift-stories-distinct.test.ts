// Every Drift story shows a state of its own (pre-merge squad CONTRACT-007 / TESTS-009): two stories with the same arguments, the
// same frame (tags other than their row id) and the same play step draw byte-identical baselines, so one of them pins nothing.
import { describe, expect, it } from 'vitest';
import * as detail from '../src/elements/sk-drift-screen/sk-drift-screen.detail.stories.js';
import * as list from '../src/elements/sk-drift-screen/sk-drift-screen.list.stories.js';
import * as screen from '../src/elements/sk-drift-screen/sk-drift-screen.screen.stories.js';
import * as states from '../src/elements/sk-drift-screen/sk-drift-screen.states.stories.js';
import * as tiers from '../src/elements/sk-drift-screen/sk-drift-screen.tiers.stories.js';

interface StoryShape {
  tags?: string[];
  args?: unknown;
  play?: unknown;
}
interface Module {
  default: { args?: unknown };
  [name: string]: unknown;
}
const modules: Module[] = [detail, list, screen, states, tiers] as unknown as Module[];

/** What a story draws: its arguments (its own, else the file's), its frame tags without the row id, and its play step. */
function drawn(module: Module, story: StoryShape): string {
  const frame = (story.tags ?? []).filter((tag) => !/^dr-\d/.test(tag));
  return JSON.stringify({ args: story.args ?? module.default.args, frame, play: story.play === undefined ? null : String(story.play) });
}
function stories(): Array<{ id: string; key: string }> {
  const found: Array<{ id: string; key: string }> = [];
  for (const module of modules) {
    for (const [name, value] of Object.entries(module)) {
      if (name === 'default' || typeof value !== 'object' || value === null) continue;
      const story = value as StoryShape;
      found.push({ id: (story.tags ?? []).find((tag) => /^dr-\d/.test(tag)) ?? name, key: drawn(module, story) });
    }
  }
  return found;
}

describe('the Drift stories', () => {
  it('there are 38, and no two draw the same thing', () => {
    const all = stories();
    expect(all).toHaveLength(38);
    const seen = new Map<string, string>();
    const twins: string[] = [];
    for (const { id, key } of all) {
      const first = seen.get(key);
      if (first !== undefined) twins.push(`${first} = ${id}`);
      else seen.set(key, id);
    }
    expect(twins).toEqual([]);
  });

  it('the check sees a twin (positive control)', () => {
    const module: Module = { default: { args: { a: 1 } } };
    expect(drawn(module, { tags: ['dr-01', 'vw-1280'] })).toBe(drawn(module, { tags: ['dr-02', 'vw-1280'] }));
    expect(drawn(module, { tags: ['dr-01', 'vw-1280'] })).not.toBe(drawn(module, { tags: ['dr-01', 'vw-1024'] }));
    expect(drawn(module, { tags: ['dr-01'], args: { a: 2 } })).not.toBe(drawn(module, { tags: ['dr-01'] }));
  });
});
