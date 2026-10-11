import { render } from 'lit';
import { afterEach, describe, expect, it } from 'vitest';
import { renderIcon } from '../src/shell-icons.js';
import type { ShellIcon } from '../src/shell-types.js';

afterEach(() => document.body.replaceChildren());

// Paths copied from the prototype's glyphs (05-artifact.html lines 23 and 24), written out here independently.
const ADDED: ReadonlyArray<readonly [ShellIcon, string]> = [
  ['magnifier', '<circle cx="11" cy="11" r="6"></circle><path d="m16 16 4 4"></path>'],
  ['table', '<path d="M5 5h14v14H5zM5 10h14"></path>'],
];
// One existing glyph per kind of path, unchanged: the additions touch no existing path (FR-037).
const EXISTING: ReadonlyArray<readonly [ShellIcon, string]> = [
  ['file', '<path d="M6 3h8l4 4v14H6zM14 3v5h5"></path>'],
  ['folder', '<path d="M3 7h7l2 2h9v10H3z"></path>'],
  ['missions', '<circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="3"></circle>'],
];

function drawn(name: ShellIcon): SVGElement {
  const host = document.createElement('div');
  document.body.append(host);
  render(renderIcon(name), host);
  return host.querySelector('svg') as SVGElement;
}

describe('the two additive shell icons', () => {
  it('draws the magnifier and the table as decorative inline SVG with the prototype paths', () => {
    let ran = 0;
    for (const [name, inner] of ADDED) {
      const svg = drawn(name);
      expect(svg.getAttribute('aria-hidden'), name).toBe('true');
      expect(svg.getAttribute('focusable'), name).toBe('false');
      expect(svg.getAttribute('viewBox'), name).toBe('0 0 24 24');
      expect(svg.getAttribute('stroke'), name).toBe('currentColor');
      expect(svg.innerHTML.replace(/<!--.*?-->/g, ''), name).toBe(inner);
      ran += 1;
    }
    expect(ran).toBe(2);
  });

  it('leaves the existing glyph paths byte-identical (positive control: the same helper reads them)', () => {
    let ran = 0;
    for (const [name, inner] of EXISTING) {
      expect(drawn(name).innerHTML.replace(/<!--.*?-->/g, ''), name).toBe(inner);
      ran += 1;
    }
    expect(ran).toBe(3);
  });

  it('draws nothing for a name that is not a glyph (positive control for the two above)', () => {
    expect(drawn('missing' as ShellIcon).innerHTML.replace(/<!--.*?-->/g, '')).toBe('');
  });
});
