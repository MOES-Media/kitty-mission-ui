import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

const FIXTURE_DIR = fileURLToPath(new URL('./fixtures/no-io/', import.meta.url));
const CONFIG_URL = new URL('../eslint.no-io.config.mjs', import.meta.url).href;
const FILENAME = 'packages/sample/src/fixture.ts';

// One fixture per rule: fixture name -> fragment of the message that rule must report.
const EXPECTED: Readonly<Record<string, string>> = {
  fetch: 'fetch is forbidden',
  xhr: 'XMLHttpRequest is forbidden',
  websocket: 'WebSocket is forbidden',
  eventsource: 'EventSource is forbidden',
  'send-beacon': 'navigator.sendBeacon is forbidden',
  'local-storage': 'localStorage is forbidden',
  'session-storage': 'sessionStorage is forbidden',
  'indexed-db': 'indexedDB is forbidden',
  'document-cookie': 'document.cookie is forbidden',
  'tauri-global': '__TAURI__ is forbidden',
  'tauri-import': '@tauri-apps packages are forbidden',
  'node-http': 'node network modules are forbidden',
  'window-fetch': 'bare window/globalThis/self is forbidden',
  'globalthis-fetch': 'bare window/globalThis/self is forbidden',
  'self-fetch': 'bare window/globalThis/self is forbidden',
  'window-computed': 'computed member access on a global object is forbidden',
  'reflect-get': 'Reflect.get is forbidden',
  'new-function': 'Function constructor is forbidden',
  eval: 'eval is forbidden',
  'new-image': 'new Image is forbidden',
  'create-script': 'creating a script element is forbidden',
  'default-view': 'defaultView is forbidden',
  'default-view-owner': 'defaultView is forbidden',
  'eval-alias': 'eval is forbidden, including aliases',
  'eval-indirect': 'eval is forbidden, including aliases',
  'create-script-concat': 'non-literal tag name is forbidden',
  'create-script-upper': 'creating a script element is forbidden',
  'create-element-dynamic': 'non-literal tag name is forbidden',
  'create-img': 'resource-loading element is forbidden',
  'inner-html': 'innerHTML/outerHTML/src/srcdoc/href is forbidden',
  'assign-src': 'innerHTML/outerHTML/src/srcdoc/href is forbidden',
  'insert-adjacent-html': 'insertAdjacentHTML/setHTMLUnsafe is forbidden',
  'document-write': 'document.write is forbidden',
  'new-audio': 'Audio is forbidden',
  'service-worker': 'serviceWorker is forbidden',
  'location-href': 'location is forbidden',
  'set-timeout-string': 'string setTimeout/setInterval is forbidden',
  'function-constructor-alias': '.constructor access and FunctionConstructor are forbidden',
  'navigator-alias': 'aliasing navigator, document or Reflect is forbidden',
  'document-alias': 'aliasing navigator, document or Reflect is forbidden',
  'cast-document-cookie': 'casting document/navigator/window/globalThis/self hides member access',
  'cast-navigator-beacon': 'casting document/navigator/window/globalThis/self hides member access',
  'cast-document-write': 'casting document/navigator/window/globalThis/self hides member access',
  'cast-nonnull': 'casting document/navigator/window/globalThis/self hides member access',
  'cast-assertion': 'casting document/navigator/window/globalThis/self hides member access',
  'cast-satisfies': 'casting document/navigator/window/globalThis/self hides member access',
  'document-computed-key': 'computed member access on document/navigator is forbidden',
  'top-fetch': 'top is forbidden',
  'parent-storage': 'parent is forbidden',
  'frames-fetch': 'frames is forbidden',
  'opener-fetch': 'opener is forbidden',
  'default-view-destructure': 'defaultView is forbidden',
  'function-prototype-ctor': 'Function is forbidden, every reference',
  'proto-constructor': '.constructor access and FunctionConstructor are forbidden',
  'cast-constructor-call': '.constructor access and FunctionConstructor are forbidden',
  'function-constructor-type': '.constructor access and FunctionConstructor are forbidden',
  'image-alias': 'Image is forbidden, every reference',
  'image-extends': 'Image is forbidden, every reference',
  'set-attribute-src': 'setAttribute of src/href/srcdoc/action/data is forbidden',
  'reflect-alias': 'aliasing navigator, document or Reflect is forbidden',
  worker: 'Worker and SharedWorker are forbidden',
  'dynamic-import-url': 'import() of a non-relative specifier or URL is forbidden',
};

const CLEAN = `import { LitElement } from 'lit';
export class Clean extends LitElement {
  connectedCallback(): void {
    super.connectedCallback();
    if (!customElements.get('sk-clean')) customElements.define('sk-clean', Clean);
    if (!window.customElements.get('sk-clean-2')) window.customElements.define('sk-clean-2', class extends HTMLElement {});
    const holder = { window: 1, self: 2 };
    void holder.window;
    this.dispatchEvent(new CustomEvent('sk-clean-done', { bubbles: true, composed: true }));
  }
}
`;

async function lint(code: string, filename: string = FILENAME): Promise<string[]> {
  const loaded = (await import(CONFIG_URL)) as { default: Linter.Config[] };
  const linter = new Linter({ configType: 'flat' });
  return linter.verify(code, loaded.default, { filename }).map((m) => m.message);
}

const fixtures = readdirSync(FIXTURE_DIR).filter((f) => f.endsWith('.ts.txt'));

describe('no-io gate self-test', () => {
  it('has exactly one expectation per fixture', () => {
    const names = fixtures.map((f) => f.replace(/\.ts\.txt$/, '')).sort();
    expect(names).toEqual(Object.keys(EXPECTED).sort());
  });

  for (const [name, fragment] of Object.entries(EXPECTED)) {
    it(`flags ${name}`, async () => {
      const messages = await lint(readFileSync(`${FIXTURE_DIR}${name}.ts.txt`, 'utf8'));
      expect(messages.some((m) => m.includes(fragment))).toBe(true);
    });
  }

  for (const ext of ['js', 'mjs', 'mts', 'tsx', 'jsx']) {
    it(`lints .${ext} files too`, async () => {
      const messages = await lint(`export const f = () => fetch('/x');\n`, `packages/sample/src/fixture.${ext}`);
      expect(messages.some((m) => m.includes('fetch is forbidden'))).toBe(true);
    });
  }

  it('reports nothing on a clean element sample', async () => {
    expect(await lint(CLEAN)).toEqual([]);
  });
});
