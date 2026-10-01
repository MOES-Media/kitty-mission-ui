// Which custom elements are "screens" and therefore owe the screen contract (a `status` property). Shared by
// scripts/check-manifest.mjs and its test. Plain Node, no dependencies.

const SCREEN_PATH = /^src\/screens\//;
// A JSDoc line `@screen` (alone on its line, after the asterisk) anywhere in the module source.
const SCREEN_MARKER = /^[ \t]*\*[ \t]*@screen[ \t]*$/m;

/**
 * True when the element is a screen: its module lives under `src/screens/` of the package, or its source carries an
 * explicit `@screen` JSDoc marker. Other elements (reusable widgets) are not required to declare `status`.
 * @param {string} modulePath module path as recorded in custom-elements.json (relative to the package root)
 * @param {string} sourceText the module source
 */
export function isScreen(modulePath, sourceText) {
  return SCREEN_PATH.test(modulePath) || SCREEN_MARKER.test(sourceText);
}
