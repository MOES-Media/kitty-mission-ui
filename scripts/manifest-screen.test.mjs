import assert from 'node:assert/strict';
import test from 'node:test';
import { isScreen } from './manifest-screen.mjs';

test('a module under src/screens/ is a screen', () => {
  assert.equal(isScreen('src/screens/mission-list/mission-list.ts', 'class X {}'), true);
});

test('a module with an @screen JSDoc marker is a screen wherever it lives', () => {
  assert.equal(isScreen('src/elements/a/a.ts', '/**\n * Does a thing.\n *\n * @screen\n * @fires x\n */\nclass A {}'), true);
});

test('a reusable widget (no marker, not under screens) is not a screen', () => {
  assert.equal(isScreen('src/elements/w/w.ts', '/** A widget. */\nclass W {}'), false);
});

test('@screen inside other words or code does not count', () => {
  assert.equal(isScreen('src/elements/w/w.ts', "const a = '@screen';\n// @screenshot\n * @screens"), false);
});

// End to end: plant an untracked, status-less element and run the real gate (the gate lists untracked sources).
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PKG_SRC = join(ROOT, 'packages/mission-ui/src');
const gate = () => spawnSync('node', ['scripts/check-manifest.mjs'], { cwd: ROOT, encoding: 'utf8' });
const element = (tag, cls, jsdoc) =>
  `import { LitElement } from 'lit';\n\n/**\n${jsdoc} * @element ${tag}\n */\nexport class ${cls} extends LitElement {}\n`;

function withPlant(relDir, file, text, check) {
  const dir = join(PKG_SRC, relDir);
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, file), text);
    check(gate());
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('gate: a status-less element under src/screens/ fails', () => {
  withPlant('screens/zz-plant', 'sk-zz-screen.ts', element('sk-zz-screen', 'SkZzScreen', ' * A plant.\n'), (r) => {
    assert.notEqual(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stderr, /SkZzScreen: screen-contract element must declare a 'status' property/);
  });
});

test('gate: a status-less element with the @screen marker outside src/screens/ fails', () => {
  withPlant('elements/zz-plant', 'sk-zz-marked.ts', element('sk-zz-marked', 'SkZzMarked', ' * A plant.\n * @screen\n'), (r) => {
    assert.notEqual(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stderr, /SkZzMarked: screen-contract element must declare a 'status' property/);
  });
});

test('gate: an unmarked widget under src/elements/ is not asked for status (only manifest drift is reported)', () => {
  withPlant('elements/zz-plant', 'sk-zz-widget.ts', element('sk-zz-widget', 'SkZzWidget', ' * A plant.\n'), (r) => {
    assert.doesNotMatch(r.stderr, /screen-contract element must declare/);
    assert.match(r.stderr, /manifest drift/);
  });
});
