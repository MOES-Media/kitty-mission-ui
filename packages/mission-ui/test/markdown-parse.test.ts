import { describe, expect, it } from 'vitest';
import * as parseModule from '../src/logic/markdown/parse.js';
import { parseTokens } from '../src/logic/markdown/parse.js';

/** Every token type of the flattened stream, inline children included. */
function flatTypes(source: string): string[] {
  const types: string[] = [];
  for (const token of parseTokens(source)) {
    types.push(token.type);
    for (const child of token.children ?? []) types.push(child.type);
  }
  return types;
}

describe('parse.ts is the one parser seam', () => {
  it('exports exactly one runtime name, parseTokens, so no instance can be configured elsewhere', () => {
    expect(Object.keys(parseModule)).toEqual(['parseTokens']);
    expect(typeof parseModule.parseTokens).toBe('function');
  });

  it('counts its calls on the function itself, once per call, so a cache can be proved by equality', () => {
    const before = parseTokens.calls;
    parseTokens('one');
    expect(parseTokens.calls).toBe(before + 1);
    parseTokens('two');
    parseTokens('three');
    expect(parseTokens.calls).toBe(before + 3);
  });
});

describe('the parser options of contracts/markdown-renderer.md', () => {
  it('turns raw HTML into text, block and inline (html: false, the html rules disabled)', () => {
    const types = flatTypes('<div>x</div>\n\ntext <b>bold</b> <script>alert(1)</script>');
    expect(types).not.toContain('html_block');
    expect(types).not.toContain('html_inline');
    const first = parseTokens('<div>x</div>')[1];
    expect(first?.type).toBe('inline');
    expect(first?.children?.map((c) => c.type)).toEqual(['text']);
    expect(first?.children?.[0]?.content).toBe('<div>x</div>');
  });

  it('does not linkify a bare address, positive control: an explicit link is a link_open', () => {
    expect(flatTypes('see https://example.com/x and www.example.com')).not.toContain('link_open');
    expect(flatTypes('see [x](https://example.com/x)')).toContain('link_open');
  });

  it('does not apply the typographer (quotes and (c) stay literal)', () => {
    const inline = parseTokens('"quoted" (c) -- ...')[1];
    expect(inline?.children?.map((c) => c.content).join('')).toBe('"quoted" (c) -- ...');
  });

  it('keeps tables and strikethrough (the default preset), positive control for the disabled set', () => {
    const types = flatTypes('| a |\n|---|\n| b |\n\n~~gone~~');
    expect(types).toContain('table_open');
    expect(types).toContain('s_open');
  });

  it('layer 1 of N-Q12 (A-8a): a javascript:, vbscript:, file: or data: destination yields no link_open, with a positive control', () => {
    const blocked = ['javascript:1', 'JaVaScRiPt:1', 'vbscript:1', 'file:///x', 'data:text/html,x'];
    let ran = 0;
    for (const destination of blocked) {
      const types = flatTypes(`[x](${destination})`);
      expect(types, destination).not.toContain('link_open');
      expect(parseTokens(`[x](${destination})`)[1]?.children?.map((c) => c.content).join(''), destination).toBe(`[x](${destination})`);
      ran += 1;
    }
    expect(ran).toBe(5);
    expect(flatTypes('[x](a.md)')).toContain('link_open');
    expect(flatTypes('![x](javascript:x)')).not.toContain('image');
  });

  it('lets the entity-encoded tab form through to layer 2 as a relative link, with the href normalised', () => {
    const inline = parseTokens('[x](java&#9;script:x)')[1];
    const open = inline?.children?.find((c) => c.type === 'link_open');
    expect(open).toBeDefined();
    expect(open?.attrGet('href')).toBe('java%09script:x');
  });
});
