import { describe, expect, it } from 'vitest';

// R5-10: the `logic` project must run in Node. If it ever runs in a browser, the first test fails.
describe('logic project environment', () => {
  it('runs without a window', () => {
    expect(typeof window).toBe('undefined');
  });

  it('runs in Node (positive twin)', () => {
    expect(typeof process.versions.node).toBe('string');
  });
});
