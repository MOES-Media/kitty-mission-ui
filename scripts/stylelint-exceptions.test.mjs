// Scope proofs for the Stylelint exception blocks E-04 and E-08 to E-16 (E-13: one half per screen file).
// Each exception is proven three ways: its allowed CSS passes in its named files only (leak check), anything
// beyond the exception fails inside its named files, and `min-inline-size` is allowed only in E-10's file.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import stylelint from 'stylelint';
import config from '../stylelint.config.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const EL = 'packages/mission-ui/src/elements';

async function problems(file, declarations) {
  const code = `import { css } from 'lit';\nexport const s = css\`\n  .x {\n    ${declarations}\n  }\n\`;\n`;
  const result = await stylelint.lint({ code, codeFilename: join(root, file), config, configBasedir: root });
  return result.results.flatMap((r) => r.warnings.map((w) => `${w.rule}: ${w.text}`));
}

// A file in no exception's scope (a sibling of the Missions screen file, which E-13 does cover).
const OTHER = `${EL}/sk-missions-screen/mission-row-parts.ts`;

// id, files in scope, CSS that passes there, CSS that must still fail there.
const CASES = [
  {
    id: 'E-04',
    files: [`${EL}/sk-phase-bar/sk-phase-bar.ts`],
    allowed: 'background: var(--sk-border-default);',
    stillFails: ['background: #123456;', 'background: red;', 'border-radius: var(--sk-radius-pill);', 'font-size: var(--sk-text-xs);'],
  },
  {
    id: 'E-08',
    files: [`${EL}/sk-pipeline-screen/sk-pipeline-screen.ts`, `${EL}/sk-pipeline-screen/pipeline-parts.ts`],
    allowed: 'flex-basis: 260px;',
    stillFails: ['flex-basis: 300px;', 'inline-size: 260px;', 'min-inline-size: 260px;', 'padding: 4px;'],
  },
  {
    id: 'E-09',
    files: [`${EL}/sk-work-package-board/sk-work-package-board.ts`, `${EL}/sk-work-package-board/card-parts.ts`],
    allowed:
      'background: var(--sk-surface-hero); border: var(--sk-border-width-1) solid var(--sk-border-default); border-radius: var(--sk-radius-sm); font-family: var(--sk-font-mono); font-size: var(--sk-text-xs); text-transform: uppercase; letter-spacing: var(--sk-tracking-wide); color: var(--sk-fg-subtle);',
    stillFails: ['text-transform: capitalize;', 'font-family: monospace;', 'letter-spacing: 0.1em;', 'color: #fff;', 'font-weight: var(--sk-weight-semibold);'],
  },
  {
    id: 'E-10',
    files: [`${EL}/sk-work-package-board/sk-work-package-board.ts`],
    allowed: 'min-inline-size: 90px;',
    stillFails: ['min-inline-size: 96px;', 'min-inline-size: 91px;', 'min-inline-size: 8rem;', 'inline-size: 90px;', 'min-width: 90px;'],
  },
  {
    id: 'E-11',
    files: [`${EL}/sk-work-package-board/card-parts.ts`],
    allowed: 'white-space: normal; overflow-wrap: break-word; word-break: normal; hyphens: manual; text-overflow: ellipsis;',
    stillFails: ['white-space: pre;', 'overflow-wrap: foo;', 'overflow-wrap: anywhere;', 'text-overflow: clip;', 'text-overflow: "…";', 'word-break: break-all;', 'hyphens: auto;'],
  },
  {
    id: 'E-12',
    files: [`${EL}/sk-pipeline-screen/pipeline-parts.ts`],
    allowed:
      'font-family: var(--sk-font-mono); font-size: var(--sk-text-xs); text-transform: uppercase; letter-spacing: var(--sk-tracking-wide); color: var(--sk-fg-subtle); background: var(--sk-surface-hero); border-inline-start: var(--sk-border-width-1) solid var(--sk-border-default); border-block-end: var(--sk-border-width-1) solid var(--sk-border-default); border-radius: 0; white-space: normal; overflow-wrap: break-word; border-block-start: var(--sk-border-width-1) solid var(--sk-border-default); border-inline-end: var(--sk-border-width-1) solid var(--sk-border-default); border-radius: var(--sk-radius-lg);',
    stillFails: [
      'white-space: nowrap;',
      'white-space: pre;',
      'overflow-wrap: anywhere;',
      'text-overflow: ellipsis;',
      'background: #123456;',
      'background: red;',
      'border-inline-start: 1px solid var(--sk-border-default);',
      'border-inline-start: var(--sk-border-width-1) solid #2b313b;',
      'border-inline-start: var(--sk-border-width-1) dashed var(--sk-border-default);',
      'border-block-end: 1px solid var(--sk-border-default);',
      'border-block-end: var(--sk-border-width-1) dotted var(--sk-border-default);',
      'border-radius: 12px;',
      'border-inline-end: 1px solid var(--sk-border-default);',
      'border-block-start: var(--sk-border-width-1) dotted var(--sk-border-default);',
      'border-block-start: 1px solid var(--sk-border-default);',
      'border-inline-end: var(--sk-border-width-1) solid #2b313b;',
      'border-inline-end: var(--sk-border-width-1) dashed var(--sk-border-default);',
      'border-block: var(--sk-border-width-1) solid var(--sk-border-default);',
      'text-transform: lowercase;', 'font-family: serif;', 'box-shadow: var(--sk-shadow-md);', 'font-weight: var(--sk-weight-bold);'],
  },
  {
    id: 'E-13',
    files: [`${EL}/sk-pipeline-screen/sk-pipeline-screen.ts`],
    allowed:
      'background: var(--sk-surface-card); border-radius: var(--sk-radius-lg); border: var(--sk-border-width-1) dashed var(--sk-border-control); font-family: var(--sk-font-display); font-weight: var(--sk-weight-bold);',
    stillFails: [
      'background: #123456;',
      'border: 1px dashed var(--sk-border-control);',
      'border: var(--sk-border-width-1) dotted var(--sk-border-control);',
      'border-style: dashed;',
      'font-family: serif;',
      'font-weight: 700;',
      'box-shadow: var(--sk-shadow-md);',
      'border: var(--sk-border-width-1) dashed red;',
      'border: var(--sk-border-width-1) solid red;',
      'border-radius: 8px;',
      'color: red;',
    ],
  },
  {
    id: 'E-13',
    files: [`${EL}/sk-missions-screen/sk-missions-screen.ts`],
    allowed:
      'background: var(--sk-surface-card); border-radius: var(--sk-radius-lg); border: var(--sk-border-width-1) dashed var(--sk-border-control); font-family: var(--sk-font-display); font-weight: var(--sk-weight-bold);',
    stillFails: [
      'background: #123456;',
      'border: 1px dashed var(--sk-border-control);',
      'border: var(--sk-border-width-1) dotted var(--sk-border-control);',
      'border-style: dashed;',
      'font-family: serif;',
      'font-weight: 700;',
      'box-shadow: var(--sk-shadow-md);',
      'border: var(--sk-border-width-1) dashed red;',
      'border: var(--sk-border-width-1) solid red;',
      'border-radius: 8px;',
      'color: red;',
    ],
  },
  {
    id: 'E-16',
    files: [`${EL}/sk-pipeline-screen/pipeline-parts.ts`],
    allowed:
      'outline-width: var(--sk-border-width-2); outline-style: solid; outline-color: var(--sk-border-focus); outline-offset: calc(-1 * var(--sk-border-width-2)); pointer-events: none; background-image: linear-gradient(to right, var(--sk-surface-hero), transparent); background-image: linear-gradient(to left, var(--sk-surface-hero), transparent);',
    stillFails: [
      'outline-width: 2px;',
      'outline-style: dashed;',
      'outline-color: #f5c518;',
      // token only (gates.md E-16): a named colour and a width keyword are refused
      'outline-color: red;',
      'outline-width: thick;',
      'outline-offset: -2px;',
      'outline-offset: calc(-1 * 2px);',
      'outline-offset: calc(2 * var(--sk-border-width-2));',
      'pointer-events: auto;',
      'background-image: linear-gradient(to right, #fff, transparent);',
      'background-image: linear-gradient(to right, var(--sk-surface-hero), red);',
      'background-image: linear-gradient(90deg, var(--sk-surface-hero), transparent);',
      'background-image: url(x.png);',
      'box-shadow: var(--sk-shadow-1);',
    ],
  },
  {
    id: 'E-14',
    files: [`${EL}/sk-filter-toggle-group/sk-filter-toggle-group.ts`],
    allowed:
      'border-radius: var(--sk-radius-sm) 0 0 var(--sk-radius-sm); border-radius: 0 var(--sk-radius-sm) var(--sk-radius-sm) 0; border-radius: 0; border-inline-start-width: 0;',
    stillFails: [
      'border-radius: 4px;',
      'border-radius: var(--sk-radius-sm) 4px 0 0;',
      'border-inline-start-width: 1px;',
      // the documented value is 0 only: a token width is refused
      'border-inline-start-width: var(--sk-space-9);',
      'border-inline-end-width: 0;',
      'border-color: var(--sk-border-default);',
      'border: var(--sk-border-width-1) solid var(--sk-border-default);',
      'background: var(--sk-bg-pill);',
    ],
  },
];

describe('exception blocks: allowed in scope, absent elsewhere', () => {
  let ran = 0;
  for (const c of CASES) {
    for (const file of c.files) {
      test(`${c.id} passes in ${file}`, async () => {
        assert.deepEqual(await problems(file, c.allowed), []);
        ran += 1;
      });
    }
    // One test per declaration: every declaration of the exception must fail on its own in a file outside its scope, so a single
    // leaking property cannot hide behind the warnings its siblings raise.
    for (const declaration of c.allowed.split(';').map((d) => d.trim()).filter((d) => d !== '')) {
      test(`${c.id} does not leak to a file outside its scope: ${declaration}`, async () => {
        const found = await problems(OTHER, `${declaration};`);
        assert.ok(found.length >= 1, `${c.id} declaration passed in an out-of-scope file: ${declaration}`);
        ran += 1;
      });
    }
    for (const css of c.stillFails) {
      test(`${c.id} still rejects ${css}`, async () => {
        for (const file of c.files) {
          const found = await problems(file, css);
          assert.ok(found.length >= 1, `${css} passed in ${file}`);
        }
        ran += 1;
      });
    }
  }
  test('every case ran', () => {
    const declarations = (c) => c.allowed.split(';').filter((d) => d.trim() !== '').length;
    const expected = CASES.reduce((n, c) => n + c.files.length + declarations(c) + c.stillFails.length, 0);
    assert.equal(ran, expected);
  });
});

describe('cross-scope leaks between neighbouring exceptions', () => {
  test('min-inline-size is allowed only in the E-10 file', async () => {
    const files = [
      `${EL}/sk-work-package-board/card-parts.ts`,
      `${EL}/sk-pipeline-screen/pipeline-parts.ts`,
      `${EL}/sk-pipeline-screen/sk-pipeline-screen.ts`,
      `${EL}/sk-phase-bar/sk-phase-bar.ts`,
    ];
    assert.deepEqual(await problems(`${EL}/sk-work-package-board/sk-work-package-board.ts`, 'min-inline-size: 90px;'), []);
    for (const file of files) {
      assert.ok((await problems(file, 'min-inline-size: 90px;')).length >= 1, file);
    }
  });
  test('E-08 px flex-basis stays out of the board files', async () => {
    assert.ok((await problems(`${EL}/sk-work-package-board/card-parts.ts`, 'flex-basis: 260px;')).length >= 1);
    assert.ok((await problems(`${EL}/sk-work-package-board/sk-work-package-board.ts`, 'flex-basis: 260px;')).length >= 1);
  });
  test('E-12 typography stays out of sk-pipeline-screen.ts (E-08 only)', async () => {
    assert.ok((await problems(`${EL}/sk-pipeline-screen/sk-pipeline-screen.ts`, 'text-transform: uppercase;')).length >= 1);
  });
  test('the E-13 panel exception grants neither E-12 typography and rules, E-09 tracking nor E-10 min-inline-size in either screen file', async () => {
    for (const file of [`${EL}/sk-missions-screen/sk-missions-screen.ts`, `${EL}/sk-pipeline-screen/sk-pipeline-screen.ts`]) {
      for (const css of [
        'text-transform: uppercase;',
        'border-inline-start: var(--sk-border-width-1) solid var(--sk-border-default);',
        'letter-spacing: 0.08em;',
        'min-inline-size: 90px;',
      ]) {
        assert.ok((await problems(file, css)).length >= 1, `${file} ${css}`);
      }
    }
  });
  test('E-11 keywords stay out of the E-09-only board file', async () => {
    assert.ok((await problems(`${EL}/sk-work-package-board/sk-work-package-board.ts`, 'white-space: normal;')).length >= 1);
  });
  test('E-09 pinned letter-spacing 0.08em: allowed in the board file and pipeline-parts.ts only, and only that value', async () => {
    const pinned = [`${EL}/sk-work-package-board/sk-work-package-board.ts`, `${EL}/sk-pipeline-screen/pipeline-parts.ts`];
    for (const file of pinned) assert.deepEqual(await problems(file, 'letter-spacing: 0.08em;'), [], file);
    for (const file of [`${EL}/sk-work-package-board/card-parts.ts`, `${EL}/sk-pipeline-screen/sk-pipeline-screen.ts`, `${EL}/sk-phase-bar/sk-phase-bar.ts`, OTHER]) {
      assert.ok((await problems(file, 'letter-spacing: 0.08em;')).length >= 1, file);
    }
    for (const file of pinned) {
      for (const css of ['letter-spacing: 0.1em;', 'letter-spacing: 0.08rem;', 'letter-spacing: 1px;', 'letter-spacing: 0.080em;', 'margin: 0.08em;', 'gap: 0.08em;']) {
        assert.ok((await problems(file, css)).length >= 1, `${file} ${css}`);
      }
    }
  });
  test('E-12 paint (hero background, left rule, band rule, radius 0) is allowed in pipeline-parts.ts only', async () => {
    const css =
      'background: var(--sk-surface-hero); border-inline-start: var(--sk-border-width-1) solid var(--sk-border-default); border-block-end: var(--sk-border-width-1) solid var(--sk-border-default); border-radius: 0;';
    assert.deepEqual(await problems(`${EL}/sk-pipeline-screen/pipeline-parts.ts`, css), []);
    for (const file of [
      `${EL}/sk-pipeline-screen/sk-pipeline-screen.ts`,
      `${EL}/sk-work-package-board/card-parts.ts`,
      `${EL}/sk-work-package-board/sk-work-package-board.ts`,
      `${EL}/sk-phase-bar/sk-phase-bar.ts`,
      OTHER,
    ]) {
      for (const one of ['border-inline-start: var(--sk-border-width-1) solid var(--sk-border-default);', 'border-block-end: var(--sk-border-width-1) solid var(--sk-border-default);']) {
        assert.ok((await problems(file, one)).length >= 1, `${file} ${one}`);
      }
    }
  });
  test('E-11 text overflow: ellipsis is allowed in the board files only', async () => {
    for (const file of [`${EL}/sk-work-package-board/card-parts.ts`, `${EL}/sk-work-package-board/sk-work-package-board.ts`]) {
      assert.deepEqual(await problems(file, 'text-overflow: ellipsis; overflow-wrap: normal; hyphens: manual;'), [], file);
    }
    for (const file of [`${EL}/sk-pipeline-screen/pipeline-parts.ts`, `${EL}/sk-phase-bar/sk-phase-bar.ts`, OTHER]) {
      assert.ok((await problems(file, 'text-overflow: ellipsis;')).length >= 1, file);
    }
    // The board file's share is the four keywords only.
    for (const css of ['white-space: nowrap;', 'text-overflow: clip;', 'word-break: break-all;', 'hyphens: auto;', 'overflow-wrap: anywhere;']) {
      assert.ok((await problems(`${EL}/sk-work-package-board/sk-work-package-board.ts`, css)).length >= 1, css);
    }
  });
  test('exception keywords are granted per property, not file-wide (PR-EXC-001)', async () => {
    const refused = {
      [`${EL}/sk-pipeline-screen/pipeline-parts.ts`]: [
        'background: solid;', 'color: solid;', 'padding: solid;', 'gap: dashed;', 'padding: dashed;', 'border-inline-start: var(--sk-border-width-1) dashed var(--sk-border-default);',
        'border: var(--sk-border-width-1) solid var(--sk-border-default);', 'font-size: none;', 'outline: none;', 'outline-style: none;', 'border-radius: none;',
      ],
      [`${EL}/sk-work-package-board/sk-work-package-board.ts`]: ['background: none;', 'color: solid;', 'padding: dashed;', 'font-size: none;', 'border-radius: solid;'],
      [`${EL}/sk-work-package-board/card-parts.ts`]: ['background: none;', 'color: solid;', 'padding: dashed;', 'border: var(--sk-border-width-1) none var(--sk-border-default);'],
      [`${EL}/sk-pipeline-screen/sk-pipeline-screen.ts`]: ['background: dashed;', 'padding: solid;', 'gap: dashed;', 'border-radius: solid;', 'font-weight: dashed;', 'font-family: solid;'],
      [`${EL}/sk-missions-screen/sk-missions-screen.ts`]: ['background: dashed;', 'padding: solid;', 'gap: dashed;', 'border-radius: solid;', 'font-weight: dashed;', 'font-family: solid;'],
    };
    for (const [file, list] of Object.entries(refused)) {
      for (const css of list) assert.ok((await problems(file, css)).length >= 1, `${file} ${css}`);
    }
    // Layout properties stay outside the exceptions: display and flex keep `none`.
    for (const file of [`${EL}/sk-pipeline-screen/pipeline-parts.ts`, `${EL}/sk-work-package-board/card-parts.ts`, `${EL}/sk-pipeline-screen/sk-pipeline-screen.ts`]) {
      assert.deepEqual(await problems(file, 'display: none; flex: none;'), [], file);
    }
  });
  test('the shell content-padding property takes one space token, in the shell files only (D-05)', async () => {
    const shell = `${EL}/sk-mission-shell/sk-mission-shell.ts`;
    assert.deepEqual(await problems(shell, '--sk-mission-shell-content-padding: var(--sk-space-6);'), []);
    for (const css of ['--sk-mission-shell-content-padding: 24px;', '--sk-mission-shell-content-padding: var(--sk-fg-subtle);', '--sk-mission-shell-content-padding: calc(1px + 1px);']) {
      assert.ok((await problems(shell, css)).length >= 1, css);
    }
    for (const file of [`${EL}/sk-pipeline-screen/sk-pipeline-screen.ts`, `${EL}/sk-pipeline-screen/pipeline-parts.ts`, OTHER]) {
      assert.ok((await problems(file, '--sk-mission-shell-content-padding: var(--sk-space-6);')).length >= 1, file);
    }
  });
  test('global rules still hold: a plain px padding fails everywhere', async () => {
    assert.ok((await problems(`${EL}/sk-phase-bar/sk-phase-bar.ts`, 'padding: var(--sk-space-1) 4px;')).length >= 1);
  });
});
