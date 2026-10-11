// no-io gate (FR-012): element packages perform no network, desktop-bridge or browser-storage I/O.
// Kept apart from the general eslint job so it has its own named check. Rule messages are distinct
// and name the violation; gates/no-io.selftest.ts asserts one fixture per rule.
// Known limitations (a lint gate cannot be complete; recorded after the final fix round):
//  - Lit html`` template attributes that load URLs (<img src=${url}>, <link href>, <iframe>) are not analysed.
//  - CSS @import or url() inside css`` text is not analysed (stylelint owns CSS).
//  - setAttribute is only checked for a literal src/href/srcdoc/action/formaction/data name.
//  - Aliases of objects other than navigator/document/Reflect, or objects reached through helper
//    functions or other modules' exports, are not followed (no data-flow analysis).
//  - Identifier-based rules assume no local shadowing of the banned names; shadowing is itself reported.
//  - Only files under packages/*/src are linted; code outside it is out of scope.
//  - Inline eslint-disable comments are ignored (noInlineConfig), so there is no in-source escape hatch.
import tseslint from 'typescript-eslint';

const GLOBAL_OBJECTS = '(window|globalThis|self)';

const restrictedGlobal = (name, message) => ({ name, message });

const restrictedGlobals = [
  restrictedGlobal('fetch', 'no-io: fetch is forbidden (network I/O)'),
  restrictedGlobal('XMLHttpRequest', 'no-io: XMLHttpRequest is forbidden (network I/O)'),
  restrictedGlobal('WebSocket', 'no-io: WebSocket is forbidden (network I/O)'),
  restrictedGlobal('EventSource', 'no-io: EventSource is forbidden (network I/O)'),
  restrictedGlobal('localStorage', 'no-io: localStorage is forbidden (browser storage)'),
  restrictedGlobal('sessionStorage', 'no-io: sessionStorage is forbidden (browser storage)'),
  restrictedGlobal('indexedDB', 'no-io: indexedDB is forbidden (browser storage)'),
  restrictedGlobal('caches', 'no-io: caches is forbidden (browser storage)'),
  restrictedGlobal('BroadcastChannel', 'no-io: BroadcastChannel is forbidden (cross-context I/O)'),
  restrictedGlobal('Function', 'no-io: Function is forbidden, every reference (dynamic code)'),
  restrictedGlobal('Image', 'no-io: Image is forbidden, every reference (network I/O via src)'),
  restrictedGlobal('Worker', 'no-io: Worker is forbidden, every reference (script loading)'),
  restrictedGlobal('SharedWorker', 'no-io: SharedWorker is forbidden, every reference (script loading)'),
  restrictedGlobal('top', 'no-io: top is forbidden (global-object aliasing)'),
  restrictedGlobal('parent', 'no-io: parent is forbidden (global-object aliasing)'),
  restrictedGlobal('frames', 'no-io: frames is forbidden (global-object aliasing)'),
  restrictedGlobal('opener', 'no-io: opener is forbidden (global-object aliasing)'),
  restrictedGlobal('location', 'no-io: location is forbidden (navigation I/O)'),
  restrictedGlobal('Audio', 'no-io: Audio is forbidden (network I/O via src)'),
  restrictedGlobal('__TAURI__', 'no-io: __TAURI__ is forbidden (desktop bridge)'),
  restrictedGlobal('__TAURI_INTERNALS__', 'no-io: __TAURI_INTERNALS__ is forbidden (desktop bridge)'),
];

const restrictedProperties = [
  { object: 'navigator', property: 'sendBeacon', message: 'no-io: navigator.sendBeacon is forbidden (network I/O)' },
  { object: 'document', property: 'cookie', message: 'no-io: document.cookie is forbidden (browser storage)' },
  { object: 'document', property: 'write', message: 'no-io: document.write is forbidden (markup injection)' },
  { object: 'document', property: 'writeln', message: 'no-io: document.writeln is forbidden (markup injection)' },
  { property: 'cookie', message: 'no-io: cookie access is forbidden, through any object (browser storage)' },
  { property: 'sendBeacon', message: 'no-io: sendBeacon is forbidden, through any object (network I/O)' },
  { property: 'write', message: 'no-io: write is forbidden, through any object (markup injection)' },
  { property: 'writeln', message: 'no-io: writeln is forbidden, through any object (markup injection)' },
  { property: 'serviceWorker', message: 'no-io: serviceWorker is forbidden (network I/O)' },
];

const restrictedSyntax = [
  {
    // Bare global-object identifiers (alias route to fetch & co). `customElements` is the only
    // permitted member of the global object, through the dedicated `window.customElements` form.
    selector: `Identifier[name=/^${GLOBAL_OBJECTS}$/]:not(MemberExpression[computed=false][property.name='customElements'] > Identifier.object):not(MemberExpression[computed=false] > Identifier.property):not(Property[computed=false] > Identifier.key)`,
    message: 'no-io: bare window/globalThis/self is forbidden (global-object aliasing); only customElements may be reached through it',
  },
  {
    selector: `MemberExpression[computed=true][object.name=/^${GLOBAL_OBJECTS}$/]`,
    message: 'no-io: computed member access on a global object is forbidden (dynamic global lookup)',
  },
  {
    selector: "MemberExpression[object.name='Reflect'][property.name='get']",
    message: 'no-io: Reflect.get is forbidden (dynamic global lookup)',
  },
  {
    selector: "MemberExpression[object.name='Reflect'][computed=true]",
    message: 'no-io: computed Reflect access is forbidden (dynamic global lookup)',
  },
  {
    selector: "NewExpression[callee.name='Function'], CallExpression[callee.name='Function']",
    message: 'no-io: Function constructor is forbidden (dynamic code)',
  },
  {
    selector: "Identifier[name='eval']:not(MemberExpression[computed=false] > Identifier.property):not(Property[computed=false] > Identifier.key)",
    message: 'no-io: eval is forbidden, including aliases (dynamic code)',
  },
  {
    selector: "Identifier[name='defaultView'], Literal[value='defaultView']",
    message: 'no-io: defaultView is forbidden (global-object aliasing)',
  },
  {
    selector: "MemberExpression[property.name='constructor']:not([object.type='ThisExpression']), MemberExpression[property.value='constructor'], CallExpression[callee.expression.property.name='constructor'], TSTypeReference[typeName.name='FunctionConstructor']",
    message: 'no-io: .constructor access and FunctionConstructor are forbidden (Function constructor alias)',
  },
  {
    selector: "TSAsExpression[expression.name=/^(document|navigator|window|globalThis|self|Reflect)$/], TSTypeAssertion[expression.name=/^(document|navigator|window|globalThis|self|Reflect)$/], TSNonNullExpression[expression.name=/^(document|navigator|window|globalThis|self|Reflect)$/], TSSatisfiesExpression[expression.name=/^(document|navigator|window|globalThis|self|Reflect)$/]",
    message: 'no-io: casting document/navigator/window/globalThis/self hides member access (type-cast evasion)',
  },
  {
    selector: "MemberExpression[computed=true][object.name=/^(document|navigator)$/]:not([property.type='Literal']), MemberExpression[computed=true][object.expression.name=/^(document|navigator)$/]:not([property.type='Literal'])",
    message: 'no-io: computed member access on document/navigator is forbidden (dynamic lookup)',
  },
  {
    selector: "CallExpression[callee.property.name='setAttribute'][arguments.0.value=/^(src|href|srcdoc|action|formaction|data)$/i]",
    message: 'no-io: setAttribute of src/href/srcdoc/action/data is forbidden (URL loading)',
  },
  {
    selector: "VariableDeclarator[init.name=/^(navigator|document|Reflect)$/], AssignmentExpression[right.name=/^(navigator|document|Reflect)$/]",
    message: 'no-io: aliasing navigator, document or Reflect is forbidden (evades member checks)',
  },
  {
    selector: "AssignmentExpression[left.property.name=/^(innerHTML|outerHTML|src|srcdoc|href)$/]",
    message: 'no-io: assigning innerHTML/outerHTML/src/srcdoc/href is forbidden (markup or URL loading)',
  },
  {
    selector: "CallExpression[callee.property.name=/^(insertAdjacentHTML|setHTMLUnsafe)$/]",
    message: 'no-io: insertAdjacentHTML/setHTMLUnsafe is forbidden (markup injection)',
  },
  {
    selector: "CallExpression[callee.name=/^(setTimeout|setInterval)$/][arguments.0.type=/^(Literal|TemplateLiteral|BinaryExpression)$/]",
    message: 'no-io: string setTimeout/setInterval is forbidden (dynamic code)',
  },
  {
    selector: "NewExpression[callee.name='Image']",
    message: 'no-io: new Image is forbidden (network I/O via src)',
  },
  {
    selector: "NewExpression[callee.name=/^(Worker|SharedWorker)$/]",
    message: 'no-io: Worker and SharedWorker are forbidden (script loading)',
  },
  {
    selector: "CallExpression[callee.property.name='createElement'][arguments.0.value=/^script$/i]",
    message: 'no-io: creating a script element is forbidden (script loading)',
  },
  {
    selector: "CallExpression[callee.property.name='createElement'][arguments.0.value=/^(img|iframe|link|object|embed|audio|video|source)$/i]",
    message: 'no-io: creating a resource-loading element is forbidden (network I/O)',
  },
  {
    selector: "CallExpression[callee.property.name='createElement']:not([arguments.0.type='Literal'])",
    message: 'no-io: createElement with a non-literal tag name is forbidden (hides script creation)',
  },
  {
    selector: "ImportExpression:not([source.value=/^\\./])",
    message: 'no-io: import() of a non-relative specifier or URL is forbidden (network I/O)',
  },
];

// NFR-005 (no timers): a screen waits for nothing. Any setTimeout/setInterval call, whatever its arguments, is banned under
// `src/elements/`; queueMicrotask and requestAnimationFrame are not timers and stay allowed.
const timerSyntax = {
  selector: "CallExpression[callee.name=/^(setTimeout|setInterval)$/], CallExpression[callee.property.name=/^(setTimeout|setInterval)$/]",
  message: 'no-io: setTimeout/setInterval is forbidden in a screen (NFR-005, no timers)',
};

export default [
  {
    files: ['**/*.{ts,mts,cts,tsx,js,mjs,cjs,jsx}'],
    languageOptions: { parser: tseslint.parser, sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } },
    // E-07 (P-10): an inline eslint-disable comment must not silence this gate (reproduced: it did).
    linterOptions: { noInlineConfig: true },
    rules: {
      'no-restricted-globals': ['error', ...restrictedGlobals],
      'no-restricted-properties': ['error', ...restrictedProperties],
      'no-restricted-syntax': ['error', ...restrictedSyntax],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@tauri-apps/*'], message: 'no-io: @tauri-apps packages are forbidden (desktop bridge)' },
            { group: ['node:http*', 'node:net'], message: 'no-io: node network modules are forbidden (network I/O)' },
          ],
        },
      ],
    },
  },
  {
    // A later block replaces the rule's options, so it repeats the list above and adds the timer ban.
    files: ['packages/*/src/elements/**/*.{ts,mts,cts,tsx,js,mjs,cjs,jsx}'],
    rules: { 'no-restricted-syntax': ['error', ...restrictedSyntax, timerSyntax] },
  },
];
