// The structural walker of the hostile-corpus test: the stated proof of NFR-005 (assertions 1 to 3 of
// contracts/markdown-renderer.md). It walks a rendered subtree, descending into open shadow roots, and reports every
// element outside the renderer's element allowlist and every attribute outside its attribute allowlist or on the
// forbidden list. It returns the number of elements it visited, so a caller can refuse a vacuous render (R-08).

/** The elements `render.ts` may write (contracts/markdown-renderer.md "What the renderer may write into the DOM"). */
export const ALLOWED_ELEMENTS: ReadonlySet<string> = new Set([
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'hr', 'pre', 'code', 'em', 'strong', 's',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'br', 'a', 'span', 'div',
]);

/** Library elements of the screen's compositions: allowed as leaves, and their slotted children are still walked. */
export const LIBRARY_LEAVES: ReadonlySet<string> = new Set(['sk-notice', 'sk-button']);

/** The attributes `render.ts` may write; the listener names `@click` and `@keydown` are never attributes in the DOM. */
export const ALLOWED_ATTRIBUTES: ReadonlySet<string> = new Set([
  'role', 'tabindex', 'title', 'scope', 'start', 'data-align', 'data-md', 'aria-label', 'aria-hidden',
]);

/** Never present in a rendered document, on any element, a library leaf included. */
const FORBIDDEN_ATTRIBUTES: ReadonlySet<string> = new Set([
  'href', 'src', 'srcset', 'srcdoc', 'style', 'class', 'action', 'formaction', 'xlink:href', 'poster', 'data', 'background', 'ping',
]);

const EVENT_HANDLER = /^on/i;

export interface WalkResult {
  /** Elements visited below the root (the root itself is not counted). */
  visited: number;
  /** One line per violation, in document order. */
  violations: string[];
}

function describe(element: Element): string {
  return `<${element.localName}>`;
}

function checkAttributes(element: Element, leaf: boolean, violations: string[]): void {
  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name.toLowerCase();
    if (FORBIDDEN_ATTRIBUTES.has(name) || EVENT_HANDLER.test(name)) violations.push(`${describe(element)} has the forbidden attribute ${name}`);
    else if (!leaf && !ALLOWED_ATTRIBUTES.has(name)) violations.push(`${describe(element)} has the unlisted attribute ${name}`);
  }
}

/** Walks `root` (an element or an open shadow root) and everything below it. */
export function walkAllowed(root: Element | ShadowRoot): WalkResult {
  const result: WalkResult = { visited: 0, violations: [] };
  const stack: Array<Element | ShadowRoot> = [root];
  for (let node = stack.pop(); node !== undefined; node = stack.pop()) {
    // Reverse push keeps the report in document order; the shadow root is walked after the light children of its host.
    const children: Array<Element | ShadowRoot> = [];
    if (node instanceof Element && node.shadowRoot !== null) children.push(node.shadowRoot);
    for (const child of Array.from(node.children)) children.push(child);
    for (const child of children.reverse()) stack.push(child);
    if (node instanceof Element && node !== root) {
      result.visited += 1;
      const name = node.localName;
      const leaf = LIBRARY_LEAVES.has(name);
      if (!leaf && !ALLOWED_ELEMENTS.has(name)) result.violations.push(`element ${describe(node)} is not on the allowlist`);
      checkAttributes(node, leaf, result.violations);
    }
  }
  return result;
}
