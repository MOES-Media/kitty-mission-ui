// Lint rules R1 to R5 for the markdown renderer (research D-06, contracts/gates.md "Lint rules for the renderer"). Every message
// begins `markdown-renderer: R<n>`, so a plant can name the literal. They apply to `packages/*/src/**`; tests are out of scope.
// The self-test is gates/markdown-lint.selftest.ts, run by `pnpm test:no-io`.
//
//   R1  `markdown-it` is importable only by src/logic/markdown/parse.ts           (local rule sk/markdown-it-import-home)
//   R2  no render, renderInline, renderToken, renderAttrs member call, no .renderer access  (no-restricted-syntax selectors)
//   R3  no DOMParser, createContextualFragment, setHTML, setHTMLUnsafe, parseHTMLUnsafe, createHTMLDocument, insertAdjacentElement,
//       Range, template element (createElement or createElementNS), document.write and writeln, execCommand, innerHTML, outerHTML,
//       setAttribute, setAttributeNS and toggleAttribute with an `on*` name (an event-handler attribute written at run time)
//   R4  html templates use an ALLOWLIST of attribute names and no property or boolean binding (local rule
//       sk/markdown-template-attributes)
//   R5  no import() and no new URL() under logic/markdown/                           (no-restricted-syntax selectors)
//
// Known limits (static analysis): a name built at run time ('inner' + 'HTML', a variable holding it) escapes R3; the corpus walk is
// the dynamic backstop. R2 is a name-based selector, so md.render.call(md, x) and `const { render } = md; render(x)` escape it;
// the guarantee there is structural: parse.ts exports only parseTokens and never the parser instance, R1 confines the import
// of markdown-it to that file, and an export-shape test asserts the single export, so no instance exists to call or destructure.
//
// Why R1 and R4 are rules of their own and not selectors: a per-file override of `no-restricted-syntax` or
// `no-restricted-imports` REPLACES the earlier array in flat config, so a selector would be silently dropped for every file an
// exception (E-xx) re-declares. A rule with its own id cannot be replaced by those overrides.

/** The one file that may import `markdown-it`, as a path suffix. */
export const MARKDOWN_IT_HOME = 'src/logic/markdown/parse.ts';

const CALL_NAMES = '(render|renderInline|renderToken|renderAttrs)';
const DOM_NAMES = '(DOMParser|createContextualFragment|setHTML|setHTMLUnsafe|parseHTMLUnsafe|createHTMLDocument|insertAdjacentElement|insertAdjacentHTML|createRange|Range|innerHTML|outerHTML|execCommand)';

const DOM_MESSAGE = 'markdown-renderer: R3 DOMParser, createContextualFragment, setHTML, setHTMLUnsafe, parseHTMLUnsafe, createHTMLDocument, insertAdjacentElement, insertAdjacentHTML, Range, document.write, document.writeln, document.execCommand, innerHTML and outerHTML are forbidden: no string is ever parsed as markup.';
const DOCUMENT_WRITE_MESSAGE = 'markdown-renderer: R3 document.write and document.writeln are forbidden: no string is ever parsed as markup.';
const HANDLER_MESSAGE = 'markdown-renderer: R3 setAttribute, setAttributeNS and toggleAttribute with an on* name are forbidden: no event-handler attribute is ever written.';
const TEMPLATE_MESSAGE = 'markdown-renderer: R3 creating a template element is forbidden: no string is ever parsed as markup.';

/** R2 and R3: appended to `elementSyntaxRestrictions`, so `withoutClassBan` carries them into every per-file override. */
export const markdownRendererRestrictions = [
  {
    selector: `CallExpression > MemberExpression.callee[computed=false][property.name=/^${CALL_NAMES}$/]`,
    message: 'markdown-renderer: R2 render, renderInline, renderToken and renderAttrs member calls are forbidden: the parser output is a token stream, never a markup string.',
  },
  {
    selector: `CallExpression > MemberExpression.callee[computed=true][property.value=/^${CALL_NAMES}$/]`,
    message: 'markdown-renderer: R2 render, renderInline, renderToken and renderAttrs member calls are forbidden: the parser output is a token stream, never a markup string.',
  },
  {
    selector: "MemberExpression[computed=false][property.name='renderer']",
    message: 'markdown-renderer: R2 the .renderer of the parser is never touched.',
  },
  {
    selector: "MemberExpression[computed=true][property.value='renderer']",
    message: 'markdown-renderer: R2 the .renderer of the parser is never touched.',
  },
  {
    selector: `Identifier[name=/^${DOM_NAMES}$/]`,
    message: DOM_MESSAGE,
  },
  // The names as string-literal and template-literal keys and arguments ("in any form"): el['innerHTML'], el[`innerHTML`],
  // { 'outerHTML': x }, { [`outerHTML`]: x }, Reflect.set(el, 'innerHTML', x), globalThis[`DOMParser`]. A string equal to one of
  // the names is refused wherever it stands: no legitimate renderer code needs one. Computed names built at run time
  // ('inner' + 'HTML') are a static limit, covered by the corpus walk.
  {
    selector: `Literal[value=/^${DOM_NAMES}$/]`,
    message: DOM_MESSAGE,
  },
  {
    selector: `TemplateLiteral[expressions.length=0][quasis.0.value.cooked=/^${DOM_NAMES}$/]`,
    message: DOM_MESSAGE,
  },
  // A template element, by any spelling of the call: createElement('template'), createElement(`template`), ['createElement'](...).
  {
    selector: "CallExpression[callee.property.name='createElement'][arguments.0.value=/^template$/i]",
    message: TEMPLATE_MESSAGE,
  },
  {
    selector: "CallExpression[callee.property.name='createElement'][arguments.0.type='TemplateLiteral'][arguments.0.expressions.length=0][arguments.0.quasis.0.value.cooked=/^template$/i]",
    message: TEMPLATE_MESSAGE,
  },
  {
    selector: "CallExpression[callee.computed=true][callee.property.value='createElement'][arguments.0.value=/^template$/i]",
    message: TEMPLATE_MESSAGE,
  },
  {
    selector: "CallExpression[callee.computed=true][callee.property.value='createElement'][arguments.0.type='TemplateLiteral'][arguments.0.expressions.length=0][arguments.0.quasis.0.value.cooked=/^template$/i]",
    message: TEMPLATE_MESSAGE,
  },
  // createElementNS(namespace, 'template'): the namespace is the first argument, the name the second.
  {
    selector: "CallExpression[callee.property.name='createElementNS'][arguments.1.value=/^template$/i]",
    message: TEMPLATE_MESSAGE,
  },
  {
    selector: "CallExpression[callee.property.name='createElementNS'][arguments.1.type='TemplateLiteral'][arguments.1.expressions.length=0][arguments.1.quasis.0.value.cooked=/^template$/i]",
    message: TEMPLATE_MESSAGE,
  },
  {
    selector: "CallExpression[callee.computed=true][callee.property.value='createElementNS'][arguments.1.value=/^template$/i]",
    message: TEMPLATE_MESSAGE,
  },
  {
    selector: "CallExpression[callee.computed=true][callee.property.value='createElementNS'][arguments.1.type='TemplateLiteral'][arguments.1.expressions.length=0][arguments.1.quasis.0.value.cooked=/^template$/i]",
    message: TEMPLATE_MESSAGE,
  },
  // An event-handler attribute written at run time: the name is the first argument (setAttribute, toggleAttribute) or the second
  // (setAttributeNS), as a string or a template literal, in any case; the computed spelling of the method is covered as well.
  {
    selector: "CallExpression[callee.computed=false][callee.property.name=/^(setAttribute|toggleAttribute)$/]:matches([arguments.0.value=/^on/i], [arguments.0.quasis.0.value.cooked=/^on/i])",
    message: HANDLER_MESSAGE,
  },
  {
    selector: "CallExpression[callee.computed=true][callee.property.value=/^(setAttribute|toggleAttribute)$/]:matches([arguments.0.value=/^on/i], [arguments.0.quasis.0.value.cooked=/^on/i])",
    message: HANDLER_MESSAGE,
  },
  {
    selector: "CallExpression[callee.computed=false][callee.property.name='setAttributeNS']:matches([arguments.1.value=/^on/i], [arguments.1.quasis.0.value.cooked=/^on/i])",
    message: HANDLER_MESSAGE,
  },
  {
    selector: "CallExpression[callee.computed=true][callee.property.value='setAttributeNS']:matches([arguments.1.value=/^on/i], [arguments.1.quasis.0.value.cooked=/^on/i])",
    message: HANDLER_MESSAGE,
  },
  // document.write and document.writeln parse a string as markup. `write` is an everyday method name (a stream, a writer), so only a
  // read on `document` (or on an ownerDocument or contentDocument) is refused; the computed spellings are covered by the literal rule.
  {
    selector: ":matches(MemberExpression[object.name='document'], MemberExpression[object.property.name=/^(ownerDocument|contentDocument)$/])[computed=false][property.name=/^(write|writeln)$/]",
    message: DOCUMENT_WRITE_MESSAGE,
  },
  {
    selector: ":matches(MemberExpression[object.name='document'], MemberExpression[object.property.name=/^(ownerDocument|contentDocument)$/])[computed=true][property.value=/^(write|writeln)$/]",
    message: DOCUMENT_WRITE_MESSAGE,
  },
];

/** R5, for the block that covers `logic/markdown/**` (declared next to the R2 and R3 entries, as the block replaces the array). */
export const markdownImportRestrictions = [
  {
    selector: 'ImportExpression',
    message: 'markdown-renderer: R5 import() is forbidden under logic/markdown/.',
  },
  {
    selector: "NewExpression[callee.name='URL']",
    message: 'markdown-renderer: R5 new URL() is forbidden under logic/markdown/.',
  },
];

// --- R1 ---------------------------------------------------------------------------------------------------------------

// --- R4 options schema (the element files' reviewed named lists) ------------------------------------------------------------------

/** A case-insensitive JSON-schema `pattern` source for a literal alternative list (schema patterns carry no flags). */
const insensitive = (word) => word.replace(/[a-z]/gi, (letter) => `[${letter.toLowerCase()}${letter.toUpperCase()}]`);
const NEVER_ATTRIBUTE_NAMES = ['href', 'src', 'srcset', 'srcdoc', 'style', 'action', 'formaction', 'xlink:href', 'poster', 'data', 'background', 'ping'];
const NEVER_BINDING_PROPS = ['innerHTML', 'outerHTML', 'href', 'src', 'srcset', 'srcdoc', 'style', 'textContent', 'innerText', 'onclick'];
const alternatives = (words) => words.map(insensitive).join('|');
const ON_STAR = '[oO][nN][a-zA-Z-]+';
const ATTRIBUTE_NAME = '^[A-Za-z][A-Za-z0-9:_-]*$';
const NEVER_ATTRIBUTE_NAME = `^(${alternatives(NEVER_ATTRIBUTE_NAMES)}|${ON_STAR})$`;
const BINDING_NAME = '^[.?][A-Za-z][A-Za-z0-9_-]*$';
const NEVER_BINDING_NAME = `^[.?](${alternatives([...NEVER_BINDING_PROPS, ...NEVER_ATTRIBUTE_NAMES])}|${ON_STAR})$`;
const TAG_NAME = '^[a-z][a-z0-9-]*$';
const LISTENER_NAME = '^@[A-Za-z][A-Za-z0-9:_-]*$';

/** One entry of a named list: `{ name, reason }`, the reason being a real one-line sentence; `never` names are refused. */
const namedEntry = (allowed, never) => ({
  type: 'object',
  properties: {
    name: never === undefined ? { type: 'string', pattern: allowed } : { type: 'string', pattern: allowed, not: { pattern: never } },
    reason: { type: 'string', minLength: 12, maxLength: 200, pattern: '^[^\\n\\r]+$' },
  },
  required: ['name', 'reason'],
  additionalProperties: false,
});

const isMarkdownIt = (value) => typeof value === 'string' && (value === 'markdown-it' || value.startsWith('markdown-it/'));
const literalValue = (node) => (node !== null && node !== undefined && node.type === 'Literal' ? node.value : undefined);

const markdownItImportHome = {
  meta: {
    type: 'problem',
    schema: [{ type: 'object', properties: { home: { type: 'string' } }, additionalProperties: false }],
    messages: {
      home: 'markdown-renderer: R1 markdown-it is importable only by {{home}}: the parser instance never leaves that file.',
    },
  },
  create(context) {
    const home = context.options[0]?.home ?? MARKDOWN_IT_HOME;
    const file = context.filename.replaceAll('\\', '/');
    if (file === home || file.endsWith(`/${home}`)) return {};
    const report = (node) => context.report({ node, messageId: 'home', data: { home } });
    const check = (node, specifier) => {
      if (isMarkdownIt(literalValue(specifier))) report(node);
    };
    return {
      ImportDeclaration: (node) => check(node, node.source),
      ExportNamedDeclaration: (node) => check(node, node.source),
      ExportAllDeclaration: (node) => check(node, node.source),
      ImportExpression: (node) => check(node, node.source),
      TSImportType: (node) => check(node, node.source),
      TSExternalModuleReference: (node) => check(node, node.expression),
      CallExpression: (node) => {
        if (node.callee.type === 'Identifier' && node.callee.name === 'require') check(node, node.arguments[0]);
      },
    };
  },
};

// --- R4 ---------------------------------------------------------------------------------------------------------------

/** The attribute names a markdown template may write, and the two listeners. Every other name is a violation. */
export const MARKDOWN_ATTRIBUTES = ['role', 'tabindex', 'title', 'scope', 'start', 'data-align', 'data-md', 'aria-label', 'aria-hidden'];
export const MARKDOWN_LISTENERS = ['@click', '@keydown'];

/** Never allowed, whatever the options say: a name here is a violation even when a list names it. */
const NEVER = /^(href|src|srcset|srcdoc|style|action|formaction|xlink:href|poster|data|background|ping|on[a-z]+)$/;
const NEVER_BINDING = /^[.?](innerhtml|outerhtml|href|src|srcset|srcdoc|style|textcontent|innertext|onclick)$/;

/** The elements a markdown template may write (contracts/markdown-renderer.md "Elements"); `a` never carries an href (the attribute rule). */
export const MARKDOWN_TAGS = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'hr', 'pre', 'code', 'em', 'strong', 's', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'br', 'a', 'span', 'div'];

const isSpace = (ch) => ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f';
const RAW_TEXT = new Set(['script', 'style', 'textarea', 'title']);

/**
 * Walks the static chunks of one template with a small tag and attribute state machine (not a whitespace-prefixed regex) and
 * calls `on` for every tag name, every attribute name and every expression that sits where a name, an element or a tag should be, or
 * inside a raw-text element (`<style>${x}</style>`: the hole is text the browser reads as CSS, script or an RCDATA body).
 * `chunks` are the COOKED strings between the `${}` holes (what lit parses), so a hole is between chunk i and chunk i + 1.
 */
export function scanTemplate(chunks, on) {
  let state = 'text';
  let name = '';
  let tag = '';
  let rawEnd = '';
  const finishName = () => {
    if (name !== '') on({ type: 'name', name });
  };
  const finishTag = () => {
    if (tag !== '') on({ type: 'tag', name: tag });
  };
  const hole = (index) => {
    if (state === 'text' && rawEnd !== '') on({ type: 'raw-hole', index });
    // A name that ends at a hole (`<a href${x}>`) is a name all the same.
    if (state === 'attr-name' || state === 'after-name') finishName();
    // An expression in a place that is not text, a quoted or unquoted value.
    if (state === 'tag-name') finishTag();
    if (state === 'tag-open' || state === 'tag-name') on({ type: 'dynamic-tag', index });
    else if (state === 'in-tag' || state === 'attr-name' || state === 'after-name' || state === 'in-tag-after-value') on({ type: 'dynamic-name', index });
    else if (state === 'value-dq' || state === 'value-sq' || state === 'value-bare' || state === 'before-value') on({ type: 'value', name, index });
    // An expression that follows a bare `=` is the value of that attribute.
    if (state === 'before-value') state = 'value-bare';
  };
  chunks.forEach((chunk, index) => {
    let at = 0;
    if (index > 0) hole(index - 1);
    while (at < chunk.length) {
      const ch = chunk[at];
      switch (state) {
        case 'text':
          if (rawEnd !== '') {
            // Case-insensitive search from `at` on the chunk itself: lower-casing a copy can change its length (U+0130), which shifts every index.
            const pattern = new RegExp(rawEnd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            pattern.lastIndex = at;
            const end = pattern.exec(chunk)?.index ?? -1;
            if (end < 0) {
              at = chunk.length;
              continue;
            }
            at = end;
            rawEnd = '';
            continue;
          }
          if (ch === '<') {
            if (chunk.startsWith('<!--', at)) {
              at += 4;
              // `<!-->` and `<!--->` are complete comments (the browser ends them at once).
              if (!(chunk.startsWith('>', at) || chunk.startsWith('->', at))) state = 'comment';
              else at += chunk[at] === '>' ? 1 : 2;
              continue;
            }
            state = 'tag-open';
            tag = '';
          }
          break;
        case 'comment': {
          const end = chunk.indexOf('-->', at);
          if (end < 0) {
            at = chunk.length;
            continue;
          }
          state = 'text';
          at = end + 3;
          continue;
        }
        case 'tag-open':
          if (ch === '/') state = 'close-tag';
          else if (ch === '!' || ch === '?') state = 'skip-tag';
          else if (/[A-Za-z]/.test(ch)) {
            state = 'tag-name';
            tag = ch;
          } else {
            // `a < b`: a less-than sign that starts no tag is text.
            state = 'text';
            continue;
          }
          break;
        case 'close-tag':
        case 'skip-tag':
          if (ch === '>') state = 'text';
          break;
        case 'tag-name':
          if (isSpace(ch)) {
            finishTag();
            state = 'in-tag';
          } else if (ch === '>') {
            finishTag();
            state = 'text';
            if (RAW_TEXT.has(tag.toLowerCase())) rawEnd = `</${tag.toLowerCase()}`;
          } else if (ch === '/') {
            finishTag();
            state = 'in-tag';
          } else tag += ch;
          break;
        case 'in-tag':
          if (ch === '>') {
            state = 'text';
            if (RAW_TEXT.has(tag.toLowerCase())) rawEnd = `</${tag.toLowerCase()}`;
          } else if (!isSpace(ch) && ch !== '/') {
            state = 'attr-name';
            name = ch;
          }
          break;
        case 'attr-name':
          if (ch === '=') {
            finishName();
            state = 'before-value';
          } else if (isSpace(ch)) state = 'after-name';
          else if (ch === '>') {
            finishName();
            state = 'text';
            if (RAW_TEXT.has(tag.toLowerCase())) rawEnd = `</${tag.toLowerCase()}`;
          } else if (ch === '/') {
            finishName();
            state = 'in-tag';
          } else name += ch;
          break;
        case 'after-name':
          if (ch === '=') {
            finishName();
            state = 'before-value';
          } else if (ch === '>') {
            finishName();
            state = 'text';
            if (RAW_TEXT.has(tag.toLowerCase())) rawEnd = `</${tag.toLowerCase()}`;
          } else if (!isSpace(ch)) {
            // A new attribute starts: the previous name had no value.
            finishName();
            state = 'attr-name';
            name = ch;
          }
          break;
        case 'before-value':
          if (ch === '"') state = 'value-dq';
          else if (ch === "'") state = 'value-sq';
          else if (ch === '>') {
            state = 'text';
            if (RAW_TEXT.has(tag.toLowerCase())) rawEnd = `</${tag.toLowerCase()}`;
          } else if (!isSpace(ch)) state = 'value-bare';
          break;
        case 'value-dq':
          if (ch === '"') state = 'in-tag-after-value';
          break;
        case 'value-sq':
          if (ch === "'") state = 'in-tag-after-value';
          break;
        case 'value-bare':
          if (isSpace(ch)) state = 'in-tag';
          else if (ch === '>') {
            state = 'text';
            if (RAW_TEXT.has(tag.toLowerCase())) rawEnd = `</${tag.toLowerCase()}`;
          }
          break;
        case 'in-tag-after-value':
          // `role="link"href=` : the HTML parser reads `href` as the next attribute, so so does this scanner.
          state = 'in-tag';
          continue;
        default:
          break;
      }
      at += 1;
    }
    // A name that ends exactly at a hole (`<a href${x}>`) is finished by the hole handler's report; nothing to do here.
    if (state === 'attr-name' && index === chunks.length - 1) finishName();
    if (state === 'tag-name' && index === chunks.length - 1) finishTag();
  });
}

const markdownTemplateAttributes = {
  meta: {
    type: 'problem',
    schema: [
      {
        type: 'object',
        properties: {
          // Property and boolean bindings (`.x=`, `?x=`): all refused (clause (a), under logic/markdown/) or only the named ones.
          strictBindings: { type: 'boolean' },
          // The reviewed named lists of the element files (IC-06a lands the schema and EMPTY lists; IC-06b derives the entries). Every
          // entry is `{ name, reason }` with a one-line reason, and a name that is never allowed (a URL, a style, a frame source, an
          // event handler, `.innerHTML` and its kin) is refused by the schema itself, so no list can grant it.
          allowBindings: { type: 'array', items: namedEntry(BINDING_NAME, NEVER_BINDING_NAME) },
          allowAttributes: { type: 'array', items: namedEntry(ATTRIBUTE_NAME, NEVER_ATTRIBUTE_NAME) },
          allowListeners: { type: 'array', items: namedEntry(LISTENER_NAME) },
          // The tags of the element files (clause (b)): `{ name, reason }`, a lower-case element name. Under logic/markdown/ the list is
          // MARKDOWN_TAGS and this option is not read. A tag a list does not name is a violation, so no frame, script or style
          // element can enter a template unreviewed.
          allowTags: { type: 'array', items: namedEntry(TAG_NAME) },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      binding: 'markdown-renderer: R4 property and boolean bindings are forbidden here: {{name}}.',
      unnamedBinding: 'markdown-renderer: R4 the binding {{name}} is not on the reviewed list of named bindings.',
      attribute: 'markdown-renderer: R4 the attribute {{name}} is not on the allowlist.',
      never: 'markdown-renderer: R4 the attribute {{name}} is never allowed (a URL, a style, a frame source or an event handler).',
      dynamic: 'markdown-renderer: R4 an expression where a tag or an attribute name belongs is forbidden.',
      rawText: 'markdown-renderer: R4 an expression inside a raw-text element (script, style, textarea, title) is forbidden: the browser reads it as code, not text.',
      tag: 'markdown-renderer: R4 the element {{name}} is not on the list of reviewed elements.',
      cooked: 'markdown-renderer: R4 a template with an invalid escape cannot be read by the template rules: remove the escape.',
      listener: 'markdown-renderer: R4 the listener {{name}} is not on the allowlist.',
    },
  },
  create(context) {
    const options = context.options[0] ?? {};
    const strict = options.strictBindings !== false;
    const names = (list) => (list ?? []).map((entry) => entry.name);
    const bindings = new Set(names(options.allowBindings).map((entry) => entry.toLowerCase()));
    const attributes = new Set([...MARKDOWN_ATTRIBUTES, ...names(options.allowAttributes)].map((entry) => entry.toLowerCase()));
    const listeners = new Set([...MARKDOWN_LISTENERS, ...names(options.allowListeners)].map((entry) => entry.toLowerCase()));
    const tags = new Set((strict ? MARKDOWN_TAGS : names(options.allowTags)).map((entry) => entry.toLowerCase()));
    return {
      TaggedTemplateExpression(node) {
        const tag = node.tag;
        const tagName = tag.type === 'Identifier' ? tag.name : tag.type === 'MemberExpression' && tag.property.type === 'Identifier' ? tag.property.name : '';
        if (tagName !== 'html' && tagName !== 'svg') return;
        // lit parses the COOKED strings: `\x3ca href=${x}` is an anchor there and not in the raw text. A null cooked value (an invalid
        // escape) cannot be read, so the template is refused.
        const chunks = node.quasi.quasis.map((quasi) => quasi.value.cooked);
        if (chunks.some((chunk) => typeof chunk !== 'string')) {
          context.report({ node, messageId: 'cooked' });
          return;
        }
        scanTemplate(chunks, (found) => {
          if (found.type === 'raw-hole') {
            context.report({ node: node.quasi.expressions[found.index] ?? node, messageId: 'rawText' });
            return;
          }
          if (found.type === 'tag') {
            if (!tags.has(found.name.toLowerCase())) context.report({ node, messageId: 'tag', data: { name: found.name } });
            return;
          }
          if (found.type === 'dynamic-tag' || found.type === 'dynamic-name') {
            context.report({ node: node.quasi.expressions[found.index] ?? node, messageId: 'dynamic' });
            return;
          }
          if (found.type !== 'name') return;
          const lower = found.name.toLowerCase();
          const here = node;
          if (lower.startsWith('.') || lower.startsWith('?')) {
            if (NEVER_BINDING.test(lower) || NEVER.test(lower.slice(1))) context.report({ node: here, messageId: 'binding', data: { name: found.name } });
            else if (strict) context.report({ node: here, messageId: 'binding', data: { name: found.name } });
            else if (!bindings.has(lower)) context.report({ node: here, messageId: 'unnamedBinding', data: { name: found.name } });
          } else if (lower.startsWith('@')) {
            if (!listeners.has(lower)) context.report({ node: here, messageId: 'listener', data: { name: found.name } });
          } else if (NEVER.test(lower)) {
            context.report({ node: here, messageId: 'never', data: { name: found.name } });
          } else if (!attributes.has(lower)) {
            context.report({ node: here, messageId: 'attribute', data: { name: found.name } });
          }
        });
      },
    };
  },
};

export const markdownRendererRules = {
  'markdown-it-import-home': markdownItImportHome,
  'markdown-template-attributes': markdownTemplateAttributes,
};
