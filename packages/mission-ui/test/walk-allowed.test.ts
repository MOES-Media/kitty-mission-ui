import { afterEach, describe, expect, it } from 'vitest';
import { ALLOWED_ATTRIBUTES, ALLOWED_ELEMENTS, LIBRARY_LEAVES, walkAllowed } from './support/walk-allowed.js';

const mounted: HTMLElement[] = [];

/** A container holding `markup`, attached to the document so a shadow root and a custom element behave as in a screen. */
function mount(markup: string): HTMLElement {
  const host = document.createElement('div');
  // The test builds hostile subtrees on purpose; the string is a literal of this file, never document text.
  host.innerHTML = markup;
  document.body.append(host);
  mounted.push(host);
  return host;
}

afterEach(() => {
  while (mounted.length > 0) mounted.pop()?.remove();
});

describe('walkAllowed: a clean subtree', () => {
  it('visits every element below the root, reports no violation, and counts them', () => {
    const root = mount('<p data-md="p">a <em>b</em> <a role="link" tabindex="0" data-md="link" title="t">c</a></p><ul><li>x</li></ul>');
    const result = walkAllowed(root);
    expect(result.violations).toEqual([]);
    expect(result.visited).toBe(5);
  });

  it('allows exactly the contract attributes, and the element list has no img, script, style, iframe or svg', () => {
    expect([...ALLOWED_ATTRIBUTES].sort()).toEqual(['aria-hidden', 'aria-label', 'data-align', 'data-md', 'role', 'scope', 'start', 'tabindex', 'title']);
    for (const name of ['img', 'picture', 'source', 'svg', 'script', 'style', 'link', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'video', 'audio', 'template', 'slot']) {
      expect(ALLOWED_ELEMENTS.has(name)).toBe(false);
    }
    expect([...LIBRARY_LEAVES].sort()).toEqual(['sk-button', 'sk-notice']);
  });
});

describe('walkAllowed: every disallowed construct is reported (the walker itself can fail)', () => {
  const cases: Array<[string, string, RegExp]> = [
    ['img', '<p><img alt="x"></p>', /element <img>/],
    ['a[href]', '<p><a href="https://example.invalid/">x</a></p>', /attribute href/],
    ['script', '<p>x</p><script></script>', /element <script>/],
    ['style element', '<style></style>', /element <style>/],
    ['iframe', '<iframe></iframe>', /element <iframe>/],
    ['svg', '<svg></svg>', /element <svg>/],
    ['onclick', '<p onclick="void 0">x</p>', /attribute onclick/],
    ['class', '<p class="x">x</p>', /attribute class/],
    ['style attribute', '<p style="color: red">x</p>', /attribute style/],
    ['src', '<p src="x">x</p>', /attribute src/],
    ['srcset', '<p srcset="x">x</p>', /attribute srcset/],
    ['srcdoc', '<p srcdoc="x">x</p>', /attribute srcdoc/],
    ['an unlisted attribute', '<p id="x">x</p>', /attribute id/],
    ['an unlisted element', '<p><marquee>x</marquee></p>', /element <marquee>/],
  ];
  for (const [name, markup, pattern] of cases) {
    it(`reports ${name}`, () => {
      const result = walkAllowed(mount(markup));
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.join('\n')).toMatch(pattern);
    });
  }

  it('reports a violation inside an open shadow root (the walk descends)', () => {
    const root = mount('<div data-md="host"></div>');
    const host = root.firstElementChild as HTMLElement;
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<p>clean</p><img alt="x">';
    const result = walkAllowed(root);
    expect(result.violations.join('\n')).toMatch(/element <img>/);
    expect(result.visited).toBe(3);
  });

  it('cannot see into a closed shadow root (the renderer never makes one; the open case above is the control)', () => {
    const root = mount('<div data-md="host"></div>');
    const host = root.firstElementChild as HTMLElement;
    host.attachShadow({ mode: 'closed' }).innerHTML = '<img alt="x">';
    expect(walkAllowed(root).violations).toEqual([]);
  });
});

describe('walkAllowed: library leaves', () => {
  it('allows sk-notice and sk-button as leaves and still walks their slotted children', () => {
    const clean = walkAllowed(mount('<sk-notice tone="info">text <em>x</em></sk-notice><sk-button>go</sk-button>'));
    expect(clean.violations).toEqual([]);
    expect(clean.visited).toBe(3);
    const dirty = walkAllowed(mount('<sk-notice tone="info"><img alt="x"></sk-notice>'));
    expect(dirty.violations.join('\n')).toMatch(/element <img>/);
  });

  it('allows the library attributes of a leaf but never the forbidden names on it', () => {
    expect(walkAllowed(mount('<sk-notice tone="info" heading="h">x</sk-notice>')).violations).toEqual([]);
    expect(walkAllowed(mount('<sk-button href="https://example.invalid/">x</sk-button>')).violations.join('\n')).toMatch(/attribute href/);
    expect(walkAllowed(mount('<sk-button onclick="void 0">x</sk-button>')).violations.join('\n')).toMatch(/attribute onclick/);
  });

  it('refuses a library element that is not a listed leaf', () => {
    expect(walkAllowed(mount('<sk-other>x</sk-other>')).violations.join('\n')).toMatch(/element <sk-other>/);
  });
});

describe('walkAllowed: the visited count', () => {
  it('is 0 for an empty root, so a vacuous render cannot pass a "count above 0" check', () => {
    expect(walkAllowed(mount('')).visited).toBe(0);
  });

  it('counts the same subtree the same way twice', () => {
    const root = mount('<ol start="3"><li>a</li><li>b</li></ol>');
    expect(walkAllowed(root).visited).toBe(3);
    expect(walkAllowed(root).visited).toBe(3);
  });
});
