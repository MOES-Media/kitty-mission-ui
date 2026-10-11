import { describe, expect, it } from 'vitest';
import { MARKDOWN_BUDGET } from '../src/defaults/index.js';
import { classifyLink, resolveLinks, type LinkTarget } from '../src/logic/markdown/links.js';
import { buildMarkdownModel, type Block } from '../src/logic/markdown/model.js';

const OPEN = 'specs/a.md';
const KINDS: ReadonlyMap<string, string> = new Map([
  ['specs/a.md', 'spec'],
  ['specs/sub/b.md', 'research'],
  ['specs/my file.md', 'note'],
  ['top.md', 'plan'],
  ['specs/dir', 'folder-entry'],
]);

type Bare = { kind: 'artifact'; path: string; entryKind: string } | { kind: 'external'; href: string } | { kind: 'inert' };

/** The target without its title, which has its own tests. */
function strip(target: LinkTarget): Bare {
  if (target.kind === 'artifact') return target;
  if (target.kind === 'external') return { kind: 'external', href: target.href };
  return { kind: 'inert' };
}

const longHttps = (length: number): string => `https://e.example/${'a'.repeat(length - 'https://e.example/'.length)}`;

const rows: Array<[string, string, Bare]> = [
  // artifact rows (row 8)
  ['sibling by name', 'sub/b.md', { kind: 'artifact', path: 'specs/sub/b.md', entryKind: 'research' }],
  ['dot segment dropped', './sub/b.md', { kind: 'artifact', path: 'specs/sub/b.md', entryKind: 'research' }],
  ['parent pop to the root', '../top.md', { kind: 'artifact', path: 'top.md', entryKind: 'plan' }],
  ['fragment stripped', 'sub/b.md#section', { kind: 'artifact', path: 'specs/sub/b.md', entryKind: 'research' }],
  ['query stripped', 'sub/b.md?x=1', { kind: 'artifact', path: 'specs/sub/b.md', entryKind: 'research' }],
  ['self link', 'a.md', { kind: 'artifact', path: 'specs/a.md', entryKind: 'spec' }],
  ['a space in a decoded path', 'my%20file.md', { kind: 'artifact', path: 'specs/my file.md', entryKind: 'note' }],
  ['percent-encoded parent', '%2e%2e/top.md', { kind: 'artifact', path: 'top.md', entryKind: 'plan' }],
  ['an entry of any kind', 'dir', { kind: 'artifact', path: 'specs/dir', entryKind: 'folder-entry' }],
  // inert, row 8 and rows 1 to 4
  ['not in the listing', 'missing.md', { kind: 'inert' }],
  ['.. above the root', '../../top.md', { kind: 'inert' }],
  ['percent-encoded .. above the root', '%2e%2e/%2e%2e/x.md', { kind: 'inert' }],
  ['double encoding stays literal', '%252e%252e/x.md', { kind: 'inert' }],
  ['double-encoded separator', 'sub%252Fb.md', { kind: 'inert' }],
  ['an empty segment', 'sub//b.md', { kind: 'inert' }],
  ['a trailing slash', 'sub/', { kind: 'inert' }],
  ['a dot only', '.', { kind: 'inert' }],
  ['empty', '', { kind: 'inert' }],
  ['a query only', '?x=1', { kind: 'inert' }],
  ['malformed percent escape', '%E0%A4%A', { kind: 'inert' }],
  ['decoded NUL', 'sub%00b.md', { kind: 'inert' }],
  ['decoded newline', 'sub%0Ab.md', { kind: 'inert' }],
  ['decoded backslash', 'sub%5Cb.md', { kind: 'inert' }],
  ['decoded DEL', 'sub%7Fb.md', { kind: 'inert' }],
  ['decoded C1 control', 'sub%C2%80b.md', { kind: 'inert' }],
  ['entity-encoded tab form', 'java%09script:x', { kind: 'inert' }],
  ['raw control character', 'sub/b\u0001.md', { kind: 'inert' }],
  ['raw DEL', 'sub/b\u007f.md', { kind: 'inert' }],
  ['raw NUL', 'sub/b\u0000.md', { kind: 'inert' }],
  ['raw space', 'sub/b .md', { kind: 'inert' }],
  ['raw tab', 'sub/\tb.md', { kind: 'inert' }],
  ['raw backslash', 'sub\\b.md', { kind: 'inert' }],
  ['fragment only', '#section', { kind: 'inert' }],
  ['protocol relative', '//host/x', { kind: 'inert' }],
  ['unc path', '\\\\host\\share', { kind: 'inert' }],
  ['root relative', '/abs/x.md', { kind: 'inert' }],
  // schemes, rows 5 to 7
  ['javascript', 'javascript:alert(1)', { kind: 'inert' }],
  ['mixed-case javascript', 'JaVaScRiPt:alert(1)', { kind: 'inert' }],
  ['data html', 'data:text/html,x', { kind: 'inert' }],
  ['data image survives layer 1, inert by row 7', 'data:image/png;base64,AAA', { kind: 'inert' }],
  ['vbscript', 'vbscript:x', { kind: 'inert' }],
  ['file', 'file:///etc/hosts', { kind: 'inert' }],
  ['blob', 'blob:https://x/y', { kind: 'inert' }],
  ['tel', 'tel:123', { kind: 'inert' }],
  ['an unknown scheme', 'x:y', { kind: 'inert' }],
  ['http with no host', 'http://', { kind: 'inert' }],
  ['http with no slashes', 'http:/x', { kind: 'inert' }],
  ['https with no slashes', 'https:x', { kind: 'inert' }],
  ['userinfo', 'http://a@b/', { kind: 'inert' }],
  ['userinfo spoof', 'http://github.com@evil.example/', { kind: 'inert' }],
  ['userinfo after a path is only a path', 'http://b.example/p@q', { kind: 'external', href: 'http://b.example/p@q' }],
  ['mailto with a query', 'mailto:a@b.example?subject=x', { kind: 'inert' }],
  ['mailto with no address', 'mailto:?bcc=x&body=y', { kind: 'inert' }],
  ['mailto with a fragment', 'mailto:a@b.example#x', { kind: 'inert' }],
  ['mailto with two at signs', 'mailto:a@b@c.example', { kind: 'inert' }],
  ['mailto with no at sign', 'mailto:abc', { kind: 'inert' }],
  ['bare mailto', 'mailto:', { kind: 'inert' }],
  ['mailto with an encoded at sign and a second address after a comma', 'mailto:a%40x.example,b@y.example', { kind: 'inert' }],
  ['mailto with an encoded CRLF and a Bcc header', 'mailto:a@b.example%0D%0ABcc:c%40d.example', { kind: 'inert' }],
  ['mailto with an encoded comma and a second address', 'mailto:a@b.example%2Cc%40d.example', { kind: 'inert' }],
  ['mailto with a comma and an encoded second address', 'mailto:a@b.example,c%40d.example', { kind: 'inert' }],
  ['mailto that does not decode', 'mailto:a@b.example%ZZ', { kind: 'inert' }],
  ['mailto with a comma and a bare second part', 'mailto:a@b.example,c', { kind: 'inert' }],
  ['mailto with an encoded comma and a bare second part', 'mailto:a@b.example%2Cc', { kind: 'inert' }],
  ['mailto with an encoded CRLF and a Subject header', 'mailto:a@b.example%0D%0ASubject:x', { kind: 'inert' }],
  ['over-long https', longHttps(2049), { kind: 'inert' }],
  ['a 3000 character https', longHttps(3000), { kind: 'inert' }],
  // external
  ['http', 'http://example.com/p', { kind: 'external', href: 'http://example.com/p' }],
  ['https with query and fragment', 'https://example.com/p?q=1#f', { kind: 'external', href: 'https://example.com/p?q=1#f' }],
  ['upper-case scheme keeps its case', 'HTTP://EXAMPLE.COM/p', { kind: 'external', href: 'HTTP://EXAMPLE.COM/p' }],
  ['host only', 'https://example.com', { kind: 'external', href: 'https://example.com' }],
  ['mailto', 'mailto:me@example.com', { kind: 'external', href: 'mailto:me@example.com' }],
  ['upper-case mailto', 'MAILTO:me@example.com', { kind: 'external', href: 'MAILTO:me@example.com' }],
  ['mailto with one encoded at sign', 'mailto:me%40example.com', { kind: 'external', href: 'mailto:me%40example.com' }],
  ['exactly the destination limit', longHttps(2048), { kind: 'external', href: longHttps(2048) }],
];

describe('classifyLink: the N-Q12 table', () => {
  it('classifies every row as the contract says', () => {
    let ran = 0;
    for (const [name, destination, expected] of rows) {
      expect(strip(classifyLink(destination, OPEN, KINDS)), `${name}: ${JSON.stringify(destination).slice(0, 60)}`).toEqual(expected);
      ran += 1;
    }
    expect(ran).toBe(rows.length);
    expect(rows.length).toBe(75);
  });

  it('is not a constant: the rows contain every one of the three outcomes (positive control)', () => {
    const kinds = new Set(rows.map(([, , expected]) => expected.kind));
    expect([...kinds].sort()).toEqual(['artifact', 'external', 'inert']);
    expect(rows.filter(([, , e]) => e.kind === 'artifact').length).toBe(9);
    expect(rows.filter(([, , e]) => e.kind === 'external').length).toBe(9);
  });

  it('resolves against the directory of the open artifact, at the root too', () => {
    expect(strip(classifyLink('top.md', 'top.md', KINDS))).toEqual({ kind: 'artifact', path: 'top.md', entryKind: 'plan' });
    expect(strip(classifyLink('sub/b.md', 'top.md', KINDS))).toEqual({ kind: 'inert' });
    expect(strip(classifyLink('../top.md', 'top.md', KINDS))).toEqual({ kind: 'inert' });
    expect(strip(classifyLink('b.md', 'specs/sub/c.md', KINDS))).toEqual({ kind: 'artifact', path: 'specs/sub/b.md', entryKind: 'research' });
  });

  it('matches the listing byte for byte (case and normalisation)', () => {
    expect(strip(classifyLink('SUB/b.md', OPEN, KINDS))).toEqual({ kind: 'inert' });
    expect(strip(classifyLink('sub/b.md', OPEN, new Map()))).toEqual({ kind: 'inert' });
  });

  it('honours an explicit budget: the destination limit and the title limit are data', () => {
    const budget = { ...MARKDOWN_BUDGET, maxDestinationChars: 20, titleMax: 8 };
    expect(strip(classifyLink('https://e.example/x', OPEN, KINDS, budget))).toEqual({ kind: 'external', href: 'https://e.example/x' });
    expect(strip(classifyLink('https://e.example/xyz', OPEN, KINDS, budget))).toEqual({ kind: 'inert' });
    expect(classifyLink('https://e.example/x', OPEN, KINDS, budget)).toEqual({ kind: 'external', href: 'https://e.example/x', title: 'https://' });
  });

  it('carries the truncated destination in the title of an external or an inert link, never of an artifact link (A-8b)', () => {
    const external = classifyLink(longHttps(600), OPEN, KINDS);
    expect(external).toEqual({ kind: 'external', href: longHttps(600), title: longHttps(600).slice(0, MARKDOWN_BUDGET.titleMax) });
    const refused = classifyLink(longHttps(3000), OPEN, KINDS);
    expect(refused).toEqual({ kind: 'inert', title: longHttps(3000).slice(0, MARKDOWN_BUDGET.titleMax) });
    expect(classifyLink('javascript:1', OPEN, KINDS)).toEqual({ kind: 'inert', title: 'javascript:1' });
    expect(classifyLink('sub/b.md', OPEN, KINDS)).toEqual({ kind: 'artifact', path: 'specs/sub/b.md', entryKind: 'research' });
  });

  it('never cuts a surrogate pair in a title', () => {
    const budget = { ...MARKDOWN_BUDGET, titleMax: 3 };
    const target = classifyLink('x:\u{1F600}', OPEN, KINDS, budget);
    expect(target).toEqual({ kind: 'inert', title: 'x:' });
  });
});

function blocksOf(source: string): Block[] {
  const result = buildMarkdownModel(source);
  if (result.kind !== 'ok') throw new Error('fallback');
  return result.blocks;
}

describe('resolveLinks: the resolved tree', () => {
  const context = { openPath: OPEN, kindOf: KINDS };

  it('gives every link and image a target and leaves the rest as it was', () => {
    const blocks = blocksOf('# t\n\n[a](sub/b.md) [b](https://example.com/) [c](nope.md) ![i](https://r.example/p.png) ![j](sub/b.md)');
    const resolved = resolveLinks(blocks, context);
    expect(resolved.length).toBe(2);
    const inline = (resolved[1] as { inline: Array<{ kind: string; target?: LinkTarget }> }).inline;
    const targets = inline.filter((n) => n.kind === 'link' || n.kind === 'image').map((n) => strip(n.target as LinkTarget));
    expect(targets).toEqual([
      { kind: 'artifact', path: 'specs/sub/b.md', entryKind: 'research' },
      { kind: 'external', href: 'https://example.com/' },
      { kind: 'inert' },
      { kind: 'external', href: 'https://r.example/p.png' },
      { kind: 'artifact', path: 'specs/sub/b.md', entryKind: 'research' },
    ]);
    expect(resolved[0]).toEqual(blocks[0]);
  });

  it('reaches links in headings, quotes, lists, table cells and nested emphasis, and does not mutate its input', () => {
    const source = '## [h](sub/b.md)\n\n> [q](sub/b.md)\n\n- [l](sub/b.md)\n\n| [t](sub/b.md) |\n|---|\n| *[e](sub/b.md)* |';
    const blocks = blocksOf(source);
    const before = JSON.stringify(blocks);
    const resolved = resolveLinks(blocks, context);
    expect(JSON.stringify(blocks)).toBe(before);
    const text = JSON.stringify(resolved);
    expect((text.match(/"target":/g) ?? []).length).toBe(5);
    expect((text.match(/"entryKind":"research"/g) ?? []).length).toBe(5);
    expect(resolved.length).toBe(4);
  });

  it('re-resolves against a different listing without re-reading the model (the same blocks, another map)', () => {
    const blocks = blocksOf('[a](sub/b.md)');
    const one = JSON.stringify(resolveLinks(blocks, context));
    const two = JSON.stringify(resolveLinks(blocks, { openPath: OPEN, kindOf: new Map() }));
    expect(one).toContain('"artifact"');
    expect(two).not.toContain('"artifact"');
  });
});
