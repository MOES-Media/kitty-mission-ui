// Known limitations (documented, not gated): the template rules match lit's `html`/`svg` by name and ban every
// non-tag reference to them, but cannot follow markup assembled from plain strings at run time (for example
// `document.createElement('button')` or `innerHTML = ...`), nor a second template library imported under another
// name. Reviewers must catch those; the I/O and hygiene gates do not cover them.
// Local ESLint rules and selectors for the elements-over-CSS contract (R4, R6).
// Consumed by eslint.config.mjs for packages/*/src only.

import { markdownRendererRestrictions, markdownRendererRules } from './markdown-renderer.mjs';

const RAW_ELEMENT = String.raw`/<(button|input|select|textarea)\b/i`;
const CLASS_ATTR = String.raw`/\sclass\s*=/i`;
const STYLE_ATTR = String.raw`/\sstyle\s*=/i`;
// Plain `html`, `svg`, and member forms such as `lit.html` (aliasing and namespace imports are banned below).
const TEMPLATE_TAG = String.raw`/^(html|svg)$/`;
const HTML_TEMPLATE = `TaggedTemplateExpression:matches([tag.name=${TEMPLATE_TAG}], [tag.property.name=${TEMPLATE_TAG}]) > TemplateLiteral > TemplateElement`;

// The selectors read `value.cooked`, the string lit parses: `\x3cbutton` is a button there but not in `value.raw`. A chunk whose
// cooked value is null (an invalid escape in a tagged template) cannot be read at all, so the template is refused.
const UNREADABLE_CHUNK = String.raw`:not([value.cooked=/^[\s\S]*$/])`;

/** `no-restricted-syntax` entries: raw controls, class=, inline style, styleMap, unsafeCSS. */
export const elementSyntaxRestrictions = [
  {
    selector: `${HTML_TEMPLATE}${UNREADABLE_CHUNK}`,
    message: 'An html/svg template with an invalid escape cannot be read by the template rules: remove the escape.',
  },
  {
    selector: `${HTML_TEMPLATE}[value.cooked=${RAW_ELEMENT}]`,
    message: 'Raw <button>/<input>/<select>/<textarea> are forbidden in element templates: use the sk-* elements.',
  },
  {
    selector: `${HTML_TEMPLATE}[value.cooked=${CLASS_ATTR}]`,
    message: 'class= is forbidden in element templates: style through sk-* elements, part and element selectors.',
  },
  {
    selector: `${HTML_TEMPLATE}[value.cooked=${STYLE_ATTR}]`,
    message: 'Inline style= is forbidden in element templates.',
  },
  {
    selector: String.raw`ImportSpecifier[imported.name=/^(html|svg)$/][local.name!=/^(html|svg)$/]`,
    message: 'Do not alias the lit html/svg tags: the template rules match them by name.',
  },
  {
    selector:
      'Identifier[name=/^(html|svg)$/]:not(TaggedTemplateExpression > Identifier.tag):not(TaggedTemplateExpression > MemberExpression.tag > Identifier.property):not(ImportSpecifier > Identifier)',
    message: 'html/svg may only be used as a template tag: no value aliasing, properties or arguments.',
  },
  {
    selector: 'ExportSpecifier[local.name=/^(html|svg)$/]',
    message: 'Do not re-export lit html/svg: the template rules match them by name.',
  },
  {
    selector: String.raw`ImportDeclaration[source.value=/^lit(\/|$)/] > ImportNamespaceSpecifier`,
    message: 'Namespace imports of lit are forbidden: the template rules match html/svg by name.',
  },
  {
    selector: "ImportDeclaration[source.value='lit/static-html.js']",
    message: 'lit/static-html.js builds templates from strings and bypasses the template rules.',
  },
  {
    selector: String.raw`Identifier[name=/^(unsafeHTML|unsafeSVG|unsafeStatic)$/]`,
    message: 'unsafeHTML/unsafeSVG/unsafeStatic are forbidden: raw markup bypasses the template rules.',
  },
  {
    selector: "Identifier[name='styleMap']",
    message: 'styleMap is forbidden: styles come from tokens and elements, not computed inline styles.',
  },
  {
    selector: "Identifier[name='unsafeCSS']",
    message: 'unsafeCSS is forbidden: it bypasses the Stylelint token gate.',
  },
  // R2 and R3 of the markdown renderer (contracts/gates.md): appended here so `withoutClassBan` carries them into every override.
  ...markdownRendererRestrictions,
];

const dispatchCustomEvent = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      shape: "dispatchEvent must be called as dispatchEvent(new CustomEvent('<string literal>', ...)).",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== 'MemberExpression' || callee.computed) return;
        if (callee.property.type !== 'Identifier' || callee.property.name !== 'dispatchEvent') return;
        const arg = node.arguments[0];
        const ok =
          node.arguments.length === 1 &&
          arg !== undefined &&
          arg.type === 'NewExpression' &&
          arg.callee.type === 'Identifier' &&
          arg.callee.name === 'CustomEvent' &&
          arg.arguments[0] !== undefined &&
          arg.arguments[0].type === 'Literal' &&
          typeof arg.arguments[0].value === 'string';
        if (!ok) context.report({ node, messageId: 'shape' });
      },
    };
  },
};

export default {
  meta: { name: 'sk-local' },
  rules: { 'dispatch-custom-event': dispatchCustomEvent, ...markdownRendererRules },
};
