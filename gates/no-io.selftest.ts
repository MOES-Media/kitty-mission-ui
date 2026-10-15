import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

const FIXTURE_DIR = fileURLToPath(new URL('./fixtures/no-io/', import.meta.url));
const CONFIG_URL = new URL('../eslint.no-io.config.mjs', import.meta.url).href;
const FILENAME = 'packages/sample/src/fixture.ts';
const ELEMENT_FILENAME = 'packages/sample/src/elements/sk-sample/fixture.ts';
// The shell (FR-007, C-001): its .ts files and its .svelte components are linted as package sources.
const SHELL_TS_FILENAME = 'packages/mission-shell/src/client/fixture.ts';
const SHELL_SVELTE_FILENAME = 'packages/mission-shell/src/Fixture.svelte';
// The fixtures linted under a shell file name, each with the fragment it must report, or none for the positive control.
const SHELL_FIXTURES: Readonly<Record<string, { filename: string; fragment: string | null }>> = {
  'svelte-fetch.svelte.txt': { filename: SHELL_SVELTE_FILENAME, fragment: 'no-io: fetch is forbidden (network I/O)' },
  'svelte-template-fetch.svelte.txt': { filename: SHELL_SVELTE_FILENAME, fragment: 'no-io: fetch is forbidden (network I/O)' },
  'svelte-clean.svelte.txt': { filename: SHELL_SVELTE_FILENAME, fragment: null },
  'shell-eventsource.ts.txt': { filename: SHELL_TS_FILENAME, fragment: 'no-io: EventSource is forbidden (network I/O)' },
};

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
  // NFR-005 (no timers): the three `timer-` fixtures are linted as a screen file under `src/elements/`.
  'timer-set-timeout': 'setTimeout/setInterval is forbidden in a screen',
  'timer-set-interval': 'setTimeout/setInterval is forbidden in a screen',
  'timer-member': 'setTimeout/setInterval is forbidden in a screen',
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

const fixtures = readdirSync(FIXTURE_DIR).filter((f) => f.endsWith('.ts.txt') && !(f in SHELL_FIXTURES));

describe('no-io gate self-test', () => {
  it('has exactly one expectation per fixture', () => {
    const names = fixtures.map((f) => f.replace(/\.ts\.txt$/, '')).sort();
    expect(names).toEqual(Object.keys(EXPECTED).sort());
  });

  for (const [name, fragment] of Object.entries(EXPECTED)) {
    it(`flags ${name}`, async () => {
      const messages = await lint(readFileSync(`${FIXTURE_DIR}${name}.ts.txt`, 'utf8'), name.startsWith('timer-') ? ELEMENT_FILENAME : FILENAME);
      expect(messages.some((m) => m.includes(fragment))).toBe(true);
    });
  }

  for (const ext of ['js', 'mjs', 'mts', 'tsx', 'jsx']) {
    it(`lints .${ext} files too`, async () => {
      const messages = await lint(`export const f = () => fetch('/x');\n`, `packages/sample/src/fixture.${ext}`);
      expect(messages.some((m) => m.includes('fetch is forbidden'))).toBe(true);
    });
  }

  it('bans the timers in a screen only, and leaves queueMicrotask and requestAnimationFrame alone (NFR-005)', async () => {
    const timer = 'export const f = () => setTimeout(() => undefined, 0);\n';
    expect((await lint(timer, ELEMENT_FILENAME)).some((m) => m.includes('forbidden in a screen'))).toBe(true);
    expect((await lint(timer, 'packages/sample/src/elements/sk-sample/deep/part-parts.ts')).some((m) => m.includes('forbidden in a screen'))).toBe(true);
    expect(await lint(timer)).toEqual([]);
    expect(await lint('export const f = () => { queueMicrotask(() => undefined); requestAnimationFrame(() => undefined); };\n', ELEMENT_FILENAME)).toEqual([]);
  });

  it('reports nothing on a clean element sample', async () => {
    expect(await lint(CLEAN)).toEqual([]);
  });
});

describe('no-io gate self-test: the shell, .svelte and .ts (FR-007, C-001)', () => {
  it('has exactly the four shell fixtures on disk, and no other non-.ts fixture', () => {
    const onDisk = readdirSync(FIXTURE_DIR).filter((f) => !f.endsWith('.ts.txt') || f in SHELL_FIXTURES).sort();
    expect(onDisk).toEqual(Object.keys(SHELL_FIXTURES).sort());
    expect(onDisk.length).toBe(4);
  });

  for (const [name, { filename, fragment }] of Object.entries(SHELL_FIXTURES)) {
    it(fragment === null ? `reports nothing on ${name} (positive control)` : `flags ${name} as a shell source`, async () => {
      const messages = await lint(readFileSync(`${FIXTURE_DIR}${name}`, 'utf8'), filename);
      if (fragment === null) expect(messages).toEqual([]);
      else expect(messages.filter((m) => m.includes(fragment)).length).toBe(1);
    });
  }

  it('lints the generated element typings of the shell like every other source (E-46 withdrawn 2026-10-15)', async () => {
    const messages = await lint("export declare const f: typeof fetch;\nfetch('x');\n", 'packages/mission-shell/src/generated/elements.d.ts');
    expect(messages.filter((m) => m.includes('no-io: fetch is forbidden')).length).toBe(1);
  });

  it('parses a .svelte file: a syntax error is a fatal parse message, not a rule message (the plant cannot pass on it)', async () => {
    const messages = await lint('<script lang="ts">const = ;</script>\n', SHELL_SVELTE_FILENAME);
    expect(messages.length).toBe(1);
    expect(messages[0]?.startsWith('no-io:')).toBe(false);
    // positive control: the same file, well formed and with fetch, is reported by the rule
    expect(await lint("<script lang=\"ts\">fetch('x');</script>\n", SHELL_SVELTE_FILENAME)).toEqual(['Unexpected use of \'fetch\'. no-io: fetch is forbidden (network I/O)']);
  });
});
