import { describe, expect, it } from 'vitest';
import { joinHandles } from '../src/logic/wp-actor.js';
import type { Actor } from '../src/contract/types.js';

const actor = (tool: string | null, role: string | null, profile: string | null): Actor => ({ tool, role, profile });

describe('joinHandles', () => {
  const cases: Array<[string, Actor | null, string | null]> = [
    ['all three handles', actor('spec-kitty', 'implementer', 'ivan'), 'spec-kitty:implementer:ivan'],
    ['tool only', actor('spec-kitty', null, null), 'spec-kitty'],
    ['role only', actor(null, 'implementer', null), 'implementer'],
    ['profile only', actor(null, null, 'ivan'), 'ivan'],
    ['a null in the middle is skipped, not joined empty', actor('spec-kitty', null, 'ivan'), 'spec-kitty:ivan'],
    ['no handles at all', actor(null, null, null), null],
    ['no actor', null, null],
  ];
  it('runs every case and joins the non-null handles in the order tool, role, profile', () => {
    let ran = 0;
    for (const [name, input, want] of cases) {
      expect(joinHandles(input), name).toBe(want);
      ran += 1;
    }
    expect(ran).toBe(7);
  });

  it('keeps a foreign or empty handle value as given and never writes undefined', () => {
    expect(joinHandles(actor('x:y', '', 'z'))).toBe('x:y::z');
    expect(joinHandles(actor('tool', 'role', 'profile'))).not.toContain('undefined');
  });

  it('does not read a missing property as a handle (a host that omits the key)', () => {
    expect(joinHandles({ tool: 'spec-kitty' } as unknown as Actor)).toBe('spec-kitty');
  });
});
