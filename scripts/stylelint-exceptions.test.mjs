// Scope proofs for the Stylelint exception blocks E-04, E-08 to E-16 (E-13: one half per screen file), E-18 (narrowed) and
// E-19 (b), and the ESLint `class=` overrides of E-17 with their leak plants.
// Each exception is proven three ways: its allowed CSS passes in its named files only (leak check), anything
// beyond the exception fails inside its named files, and `min-inline-size` is allowed only in E-10's file.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import stylelint from 'stylelint';
import { ESLint, Linter } from 'eslint';
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
  {
    // E-18 (CP-1, narrowed; sunset spec-kitty-design#516): the declarations that no other file may write. Padding and the title
    // gap are layout properties and are proven separately below.
    id: 'E-18',
    files: [`${EL}/sk-work-package-screen/panel-parts.ts`],
    allowed: 'border-width: var(--sk-border-width-1); border-radius: var(--sk-radius-md); font-size: var(--sk-text-lg); font-weight: var(--sk-weight-bold);',
    stillFails: [
      'border-width: 1px;',
      'border-width: var(--sk-border-width-2);',
      'border-radius: 12px;',
      'border-radius: var(--sk-radius-lg);',
      'font-size: 18px;',
      'font-size: var(--sk-text-xl);',
      'font-weight: 700;',
      'font-weight: var(--sk-weight-semibold);',
      'padding: var(--sk-space-7);',
      'padding: 20px;',
      'margin-block: 0 var(--sk-space-2);',
      'row-gap: var(--sk-space-2);',
      // a sixth property is refused
      'letter-spacing: var(--sk-tracking-wide);',
      'letter-spacing: 0.08em;',
      'background: var(--sk-surface-hero);',
      'color: var(--sk-fg-subtle);',
      'border-style: dashed;',
      'border-color: var(--sk-border-default);',
      'box-shadow: var(--sk-shadow-md);',
      'font-family: var(--sk-font-mono);',
      'text-transform: uppercase;',
    ],
  },
  {
    // E-19 (b): the track minimums of the prototype grid, as lengths in `grid-template-columns` of the screen file only.
    id: 'E-19 (b)',
    files: [`${EL}/sk-work-package-screen/sk-work-package-screen.ts`],
    allowed:
      'grid-template-columns: minmax(220px, .8fr) minmax(320px, 1.3fr) minmax(220px, .8fr); grid-template-columns: minmax(220px, .8fr) minmax(320px, 1.2fr);',
    stillFails: [
      'grid-template-columns: minmax(300px, 1fr);',
      'grid-template-columns: minmax(220px, .8fr) minmax(321px, 1.3fr) minmax(220px, .8fr);',
      'grid-template-columns: repeat(3, minmax(220px, 1fr));',
      'grid-template-columns: 220px 320px;',
      'width: 220px;',
      'min-width: 320px;',
      'gap: 20px;',
      'flex-basis: 220px;',
      'grid-template-rows: minmax(220px, 1fr);',
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
  test('E-21: text-overflow ellipsis in header-parts.ts only, overflow-wrap break-word in facts-parts.ts only, and only those values', async () => {
    const header = `${EL}/sk-work-package-screen/header-parts.ts`;
    const facts = `${EL}/sk-work-package-screen/facts-parts.ts`;
    assert.deepEqual(await problems(header, 'text-overflow: ellipsis;'), []);
    assert.deepEqual(await problems(facts, 'overflow-wrap: break-word;'), []);
    // refused in a sibling and across the pair
    for (const [file, css] of [
      [`${EL}/sk-work-package-screen/panel-parts.ts`, 'text-overflow: ellipsis;'],
      [`${EL}/sk-work-package-screen/panel-parts.ts`, 'overflow-wrap: break-word;'],
      [`${EL}/sk-work-package-screen/state-parts.ts`, 'text-overflow: ellipsis;'],
      [facts, 'text-overflow: ellipsis;'],
      [header, 'overflow-wrap: break-word;'],
      [OTHER, 'text-overflow: ellipsis;'],
    ]) {
      assert.ok((await problems(file, css)).length >= 1, `${file} ${css}`);
    }
    // other values refused
    for (const css of ['text-overflow: clip;', 'text-overflow: "…";', 'white-space: nowrap;', 'word-break: break-all;']) {
      assert.ok((await problems(header, css)).length >= 1, `header ${css}`);
    }
    for (const css of ['overflow-wrap: foo;', 'word-break: break-all;', 'hyphens: auto;', 'text-overflow: ellipsis;']) {
      assert.ok((await problems(facts, css)).length >= 1, `facts ${css}`);
    }
  });
  test('E-21 pill rule (operator ruling during WP09, pills ellipsize): one shared file carries it; review-parts adds break-word for text values', async () => {
    const shared = `${EL}/sk-work-package-screen/shared-parts.ts`;
    const review = `${EL}/sk-work-package-screen/review-parts.ts`;
    const rule = 'max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
    assert.deepEqual(await problems(shared, rule), []);
    assert.deepEqual(await problems(review, 'overflow-wrap: break-word;'), []);
    let refused = 0;
    for (const file of [`${EL}/sk-work-package-screen/header-parts.ts`, `${EL}/sk-work-package-screen/facts-parts.ts`, review, `${EL}/sk-work-package-screen/work-parts.ts`, `${EL}/sk-work-package-screen/history-parts.ts`, OTHER]) {
      for (const css of ['max-width: 100%;', 'white-space: nowrap;']) {
        assert.ok((await problems(file, css)).length >= 1, `${file} ${css}`);
        refused += 1;
      }
    }
    assert.equal(refused, 12);
    let values = 0;
    for (const css of ['white-space: normal;', 'white-space: pre;', 'overflow: auto;', 'overflow: scroll;', 'text-overflow: clip;', 'max-width: 50%;', 'max-width: 300px;', 'overflow-wrap: anywhere;', 'word-break: break-all;']) {
      assert.ok((await problems(shared, css)).length >= 1, `shared ${css}`);
      values += 1;
    }
    assert.equal(values, 9);
    for (const css of ['overflow-wrap: anywhere;', 'white-space: normal;']) {
      assert.ok((await problems(review, css)).length >= 1, `review ${css}`);
    }
  });
  test('E-21 (third file, derived from the CP-1 ruling): overflow-wrap break-word and text-align start in chain-parts.ts only, and only those values', async () => {
    const chain = `${EL}/sk-work-package-screen/chain-parts.ts`;
    const header = `${EL}/sk-work-package-screen/header-parts.ts`;
    const facts = `${EL}/sk-work-package-screen/facts-parts.ts`;
    assert.deepEqual(await problems(chain, 'overflow-wrap: break-word;'), []);
    assert.deepEqual(await problems(chain, 'text-align: start;'), []);
    assert.deepEqual(await problems(chain, 'overflow-wrap: break-word; text-align: start;'), []);
    // refused in the siblings, in the other E-21 files (text-align) and elsewhere
    let refused = 0;
    for (const [file, css] of [
      [`${EL}/sk-work-package-screen/panel-parts.ts`, 'text-align: start;'],
      [`${EL}/sk-work-package-screen/panel-parts.ts`, 'overflow-wrap: break-word;'],
      [`${EL}/sk-work-package-screen/work-parts.ts`, 'overflow-wrap: break-word;'],
      [`${EL}/sk-work-package-screen/work-parts.ts`, 'text-align: start;'],
      [header, 'text-align: start;'],
      [header, 'overflow-wrap: break-word;'],
      [facts, 'text-align: start;'],
      [OTHER, 'text-align: start;'],
      [OTHER, 'overflow-wrap: break-word;'],
      // the other files' E-21 property is not granted here
      [chain, 'text-overflow: ellipsis;'],
    ]) {
      assert.ok((await problems(file, css)).length >= 1, `${file} ${css}`);
      refused += 1;
    }
    assert.equal(refused, 10);
    // other values refused in the chain file
    let values = 0;
    for (const css of ['overflow-wrap: anywhere;', 'overflow-wrap: foo;', 'word-break: break-all;', 'hyphens: auto;', 'white-space: nowrap;', 'text-align: center;', 'text-align: left;', 'text-align: right;', 'text-align: end;', 'text-align: justify;']) {
      assert.ok((await problems(chain, css)).length >= 1, `chain ${css}`);
      values += 1;
    }
    assert.equal(values, 10);
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

describe('E-18 narrowed: exactly the five properties, token values only, in panel-parts.ts only', () => {
  const PANEL = `${EL}/sk-work-package-screen/panel-parts.ts`;
  const FIVE =
    'border-width: var(--sk-border-width-1); border-radius: var(--sk-radius-md); padding: var(--sk-space-5); font-size: var(--sk-text-lg); font-weight: var(--sk-weight-bold); margin-block: 0 var(--sk-space-4); row-gap: 0;';
  test('the five pass in panel-parts.ts', async () => {
    assert.deepEqual(await problems(PANEL, FIVE), []);
  });
  test('the paint of the five is refused in every other file of the screen, and in the two other part files', async () => {
    let ran = 0;
    for (const file of [
      `${EL}/sk-work-package-screen/sk-work-package-screen.ts`,
      `${EL}/sk-work-package-screen/header-parts.ts`,
      `${EL}/sk-work-package-screen/state-parts.ts`,
      OTHER,
    ]) {
      for (const css of ['border-width: var(--sk-border-width-1);', 'border-radius: var(--sk-radius-md);', 'font-size: var(--sk-text-lg);', 'font-weight: var(--sk-weight-bold);']) {
        assert.ok((await problems(file, css)).length >= 1, `${file} ${css}`);
        ran += 1;
      }
    }
    assert.equal(ran, 16);
  });
  test('a sixth property is refused in panel-parts.ts, with the five beside it', async () => {
    let ran = 0;
    for (const sixth of ['letter-spacing: var(--sk-tracking-wide);', 'background: var(--sk-surface-hero);', 'box-shadow: var(--sk-shadow-md);', 'color: var(--sk-fg-subtle);']) {
      assert.ok((await problems(PANEL, `${FIVE} ${sixth}`)).length >= 1, sixth);
      ran += 1;
    }
    assert.equal(ran, 4);
  });
  test('no E-18 property is granted for the Missions and Pipeline screens', async () => {
    for (const file of [`${EL}/sk-pipeline-screen/pipeline-parts.ts`, `${EL}/sk-missions-screen/mission-row-parts.ts`]) {
      assert.ok((await problems(file, 'border-width: var(--sk-border-width-1);')).length >= 1, file);
    }
  });
});

describe('E-19 (b): the track minimums in the screen file only; the container lengths need no exception (E-19 (a) deleted)', () => {
  const SCREEN = `${EL}/sk-work-package-screen/sk-work-package-screen.ts`;
  test('the three explicit-track recipes without a pixel length pass in the screen file', async () => {
    assert.deepEqual(await problems(SCREEN, 'grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-columns: minmax(0, 1fr);'), []);
  });
  test('the pixel minimums are refused in every other file of the screen', async () => {
    let ran = 0;
    for (const file of [`${EL}/sk-work-package-screen/panel-parts.ts`, `${EL}/sk-work-package-screen/chain-parts.ts`, OTHER]) {
      assert.ok((await problems(file, 'grid-template-columns: minmax(220px, .8fr) minmax(320px, 1.2fr);')).length >= 1, file);
      ran += 1;
    }
    assert.equal(ran, 3);
  });
  test('a container query with pixel lengths passes everywhere (no exception was needed)', async () => {
    const code = "import { css } from 'lit';\nexport const s = css`\n  @container (min-width: 848px) { .x { display: grid; } }\n  @container (max-width: 688px) { .x { display: block; } }\n`;\n";
    for (const file of [`${EL}/sk-work-package-screen/sk-work-package-screen.ts`, OTHER]) {
      const result = await stylelint.lint({ code, codeFilename: join(root, file), config, configBasedir: root });
      assert.deepEqual(result.results.flatMap((r) => r.warnings), [], file);
    }
  });
  test('E-20 is dropped: nothing in the screen directory is granted for a raw button, and the ESLint config has no allowance for chain-parts.ts', async () => {
    const eslint = new ESLint({ cwd: root });
    const [result] = await eslint.lintText("import { html } from 'lit';\nexport const t = html`<button type=\"button\">x</button>`;\n", {
      filePath: join(root, `${EL}/sk-work-package-screen/chain-parts.ts`),
    });
    assert.ok((result?.messages ?? []).some((m) => m.ruleId === 'no-restricted-syntax' && /Raw <button>/.test(m.message)));
  });
});

// E-17: one `classOnly` override per listed file, each with a leak plant (a class outside the file's prefixes is refused).
// The plants live here with the stylelint scope proofs: #4 proved E-01 to E-03 by the gate-proof plants, which are not a test file.
describe('E-17: the class= overrides of the Work Package screen, per file, with leak plants', () => {
  const eslint = new ESLint({ cwd: root });
  const lintClass = async (file, classes) => {
    const code = `import { html } from 'lit';\nexport const t = html\`<div class="${classes}"></div>\`;\n`;
    const [result] = await eslint.lintText(code, { filePath: join(root, `${EL}/sk-work-package-screen/${file}`) });
    return (result?.messages ?? []).filter((m) => m.ruleId === 'no-restricted-syntax').map((m) => m.message);
  };
  // file, the prefixes its row grants, one class of each
  const ROWS = [
    ['history-parts.ts', ['sk-event-timeline']],
    ['facts-parts.ts', ['sk-facts']],
    ['work-parts.ts', ['sk-facts', 'sk-progress']],
    ['header-parts.ts', ['sk-breadcrumbs']],
    ['state-parts.ts', ['sk-empty-state', 'sk-progress']],
  ];
  const UNLISTED = ['files-parts.ts', 'review-parts.ts', 'chain-parts.ts', 'panel-parts.ts', 'sk-work-package-screen.ts'];
  const ALL_PREFIXES = ['sk-event-timeline', 'sk-facts', 'sk-progress', 'sk-breadcrumbs', 'sk-empty-state'];

  test('a granted prefix passes, in its own file only', async () => {
    let ran = 0;
    for (const [file, prefixes] of ROWS) {
      for (const prefix of prefixes) {
        assert.deepEqual(await lintClass(file, `${prefix}__part ${prefix}`), [], `${file} ${prefix}`);
        ran += 1;
      }
    }
    assert.equal(ran, 7);
  });
  test('leak plant: a class outside the file\'s prefixes is refused, including another file\'s granted prefix', async () => {
    let ran = 0;
    for (const [file, prefixes] of ROWS) {
      assert.ok((await lintClass(file, 'plain-class')).length >= 1, `${file} plain-class`);
      assert.ok((await lintClass(file, `${prefixes[0]} plain-class`)).length >= 1, `${file} mixed`);
      for (const other of ALL_PREFIXES.filter((p) => !prefixes.includes(p))) {
        assert.ok((await lintClass(file, other)).length >= 1, `${file} ${other}`);
        ran += 1;
      }
      ran += 2;
    }
    assert.equal(ran, 5 * 2 + 4 + 4 + 3 + 4 + 3);
  });
  test('the files the table does not list carry no class at all, whatever the prefix', async () => {
    let ran = 0;
    for (const file of UNLISTED) {
      for (const prefix of ALL_PREFIXES) {
        assert.ok((await lintClass(file, prefix)).some((m) => /class= is forbidden/.test(m)), `${file} ${prefix}`);
        ran += 1;
      }
    }
    assert.equal(ran, 25);
  });
  test('there is no sk-breadcrumbs row for state-parts.ts', async () => {
    assert.ok((await lintClass('state-parts.ts', 'sk-breadcrumbs')).length >= 1);
    assert.deepEqual(await lintClass('header-parts.ts', 'sk-breadcrumbs'), []);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------
// Artifact Viewer (mission-ui#7, IC-06a): the `ch` grant, E-23, E-25, E-26 (paint), E-28, and the ESLint overrides E-26, E-27, E-29
// with the R4 options schema. Values are the CP-1 rulings of 2026-10-07 (spec.md Clarifications). The pins are on DECLARATIONS
// (E-22 discipline of #5), not only on files: each granted value is asserted allowed, and its near neighbours refused.
// The part files of the screen are stubs written by IC-06b, so the lint scope is proved by path, not by a file that exists.
// ---------------------------------------------------------------------------------------------------------------------------
const AV = `${EL}/sk-artifact-screen`;
const AV_PARTS = ['prose-styles.ts', 'source-parts.ts', 'tab-parts.ts', 'toolbar-parts.ts', 'inspector-parts.ts', 'state-parts.ts', 'refusal-parts.ts', 'document-parts.ts', 'sk-artifact-screen.ts'];
const avFile = (name) => `${AV}/${name}`;
const siblingsOf = (...names) => [...AV_PARTS.filter((name) => !names.includes(name)).map(avFile), OTHER];
const rulesOf = (messages) => messages.map((message) => message.split(':')[0]);

describe('the ch grant (chProperties): allowed in the granted file on the granted property only', () => {
  const PROSE = avFile('prose-styles.ts');
  test('68ch passes on max-width in prose-styles.ts', async () => {
    assert.deepEqual(await problems(PROSE, 'max-width: 68ch;'), []);
  });
  test('68ch is refused in every sibling file, on the unit rule', async () => {
    let ran = 0;
    for (const file of siblingsOf('prose-styles.ts')) {
      const found = await problems(file, 'max-width: 68ch;');
      assert.ok(rulesOf(found).includes('unit-allowed-list'), `${file}: ${found.join(' | ')}`);
      ran += 1;
    }
    assert.equal(ran, AV_PARTS.length);
  });
  test('68ch is refused on a property without the grant, inside the granted file', async () => {
    let ran = 0;
    for (const property of ['min-width', 'width', 'inline-size', 'max-inline-size', 'padding-inline-start', 'margin', 'gap', 'line-height']) {
      const found = await problems(PROSE, `${property}: 68ch;`);
      assert.ok(found.length >= 1, property);
      ran += 1;
    }
    assert.equal(ran, 8);
    assert.ok(rulesOf(await problems(PROSE, 'width: 68ch;')).includes('declaration-property-unit-disallowed-list'));
  });
  test('only ch is granted with the pinned values: 68em, 68px, 67ch and 100ch are refused on max-width', async () => {
    let ran = 0;
    for (const value of ['68em', '68px', '67ch', '100ch', '68rem', '68vw']) {
      assert.ok((await problems(PROSE, `max-width: ${value};`)).length >= 1, value);
      ran += 1;
    }
    assert.equal(ran, 6);
  });
  test('the ch grant is not general: a file with only a px grant refuses ch (E-28 toolbar, E-08 flex-basis)', async () => {
    assert.ok((await problems(avFile('toolbar-parts.ts'), 'min-height: 68ch;')).length >= 1);
    assert.ok((await problems(`${EL}/sk-pipeline-screen/pipeline-parts.ts`, 'flex-basis: 260ch;')).length >= 1);
  });
});

describe('E-23: the prose entry equals the CP-1 ruling property for property, in prose-styles.ts only', () => {
  const PROSE = avFile('prose-styles.ts');
  // The ruling, copied from contracts/gates.md "E-23 as an EXCEPTIONS entry".
  const RULED_PROPERTIES = ['color', 'font-family', 'font-size', 'font-weight', 'font-style', 'background', 'border', 'border-radius',
    'border-inline-start', 'border-collapse', 'padding-inline-start', 'text-align', 'vertical-align', 'white-space',
    'overflow-wrap', 'list-style-type', 'text-decoration', 'cursor',
    'outline-width', 'outline-style', 'outline-color', 'outline-offset', 'max-width', 'line-height',
    'text-transform', 'letter-spacing']; // the last two: WP09 extension (eyebrow), operator ruling 2026-10-08
  const TOKEN = '/^var\\(--sk-[a-z0-9-]+\\)$/';
  const RULED_VALUES = {
    'max-width': ['68ch', '30ch'], 'line-height': ['1.65', '1.2'], 'text-transform': [TOKEN, 'uppercase'], 'letter-spacing': ['0.08em'],
    width: ['max-content'], // WP13 extension: the table sizes to its content, pinned
    'font-style': [TOKEN, 'italic', 'normal'], 'border-collapse': [TOKEN, 'collapse'], 'text-align': [TOKEN, 'left', 'center', 'right'],
    'vertical-align': [TOKEN, 'top'], 'white-space': [TOKEN, 'pre', 'pre-wrap'], 'overflow-wrap': [TOKEN, 'break-word'],
    'list-style-type': [TOKEN, 'disc', 'decimal', 'none'], 'text-decoration': ['underline', 'none'], cursor: ['pointer'],
    'outline-width': [TOKEN], 'outline-color': [TOKEN], 'outline-style': [TOKEN, 'solid'],
    'outline-offset': [TOKEN, '/^calc\\(-1 \\* var\\(--sk-border-width-[0-9]+\\)\\)$/'],
  };
  const block = () => config.overrides.find((o) => o.files.includes(`**/src/elements/sk-artifact-screen/prose-styles.ts`));

  test('the property list is the layout list plus exactly the ruled properties; letter-spacing and text-wrap are absent', () => {
    const allowed = block().rules['property-allowed-list'];
    for (const property of RULED_PROPERTIES) assert.ok(allowed.includes(property), property);
    for (const property of ['text-wrap', 'box-shadow', 'background-color']) assert.ok(!allowed.includes(property), property);
    const base = config.rules['property-allowed-list'];
    assert.deepEqual(allowed.filter((property) => !base.includes(property)).sort(), RULED_PROPERTIES.filter((property) => !base.includes(property)).sort());
  });
  test('the value lists are the ruled ones, token form added except where pinned', () => {
    const values = block().rules['declaration-property-value-allowed-list'];
    assert.deepEqual(Object.keys(values).sort(), Object.keys(RULED_VALUES).sort());
    for (const [property, list] of Object.entries(RULED_VALUES)) assert.deepEqual([...values[property]].sort(), [...list].sort(), property);
  });
  test('units: px and ch only, and the unit rules partition max-width to px and ch', () => {
    assert.deepEqual(block().rules['unit-allowed-list'], ['%', 'fr', 'px', 'em', 'ch']);
    const strict = block().rules['scale-unlimited/declaration-strict-value'][0];
    for (const property of ['font-family', 'font-weight', 'border-inline-start', 'padding-inline-start']) assert.ok(strict.includes(property), `${property} is token-only`);
    for (const property of ['max-width', 'line-height', 'width']) assert.ok(!strict.includes(property), `${property} is unstrict (pinned)`);
  });
  test('the whole ruled declaration set passes in prose-styles.ts', async () => {
    const css =
      'color: var(--sk-fg-default); font-family: var(--sk-font-mono); font-size: var(--sk-text-sm); font-weight: var(--sk-weight-bold); font-style: italic; font-style: normal; ' +
      'background: var(--sk-surface-hero); border: var(--sk-border-width-1) solid var(--sk-border-default); border-radius: var(--sk-radius-sm); ' +
      'border-inline-start: var(--sk-border-width-2) solid var(--sk-border-default); border-collapse: collapse; padding-inline-start: var(--sk-space-5); ' +
      'text-align: left; text-align: center; text-align: right; vertical-align: top; white-space: pre; white-space: pre-wrap; overflow-wrap: break-word; ' +
      'list-style-type: disc; list-style-type: decimal; list-style-type: none; text-decoration: underline; text-decoration: none; cursor: pointer; ' +
      'outline-width: var(--sk-border-width-2); outline-style: solid; outline-color: var(--sk-border-focus); outline-offset: calc(-1 * var(--sk-border-width-2)); ' +
      'max-width: 68ch; line-height: 1.65; padding: var(--sk-space-4); margin: 0; gap: var(--sk-space-2); overflow-x: auto;';
    assert.deepEqual(await problems(PROSE, css), []);
  });
  test('every ruled literal has refused neighbours: the declarations are pinned, not only the properties', async () => {
    let ran = 0;
    for (const css of [
      'max-width: 800px;', 'max-width: 801px;', 'max-width: 640px;', 'max-width: 70ch;', 'max-width: 50%;', 'line-height: 1.5;', 'line-height: 24px;', 'line-height: 1.65em;',
      'text-decoration: line-through;', 'text-decoration: var(--sk-fg-default);', 'cursor: text;', 'cursor: grab;',
      'font-family: serif;', 'font-family: monospace;', 'font-weight: 700;', 'padding-inline-start: 2rem;', 'padding-inline-start: 24px;',
      'border-inline-start: 3px solid var(--sk-border-default);', 'border-inline-start: var(--sk-border-width-2) dashed var(--sk-border-default);',
      'border: var(--sk-border-width-1) dotted var(--sk-border-default);', 'border: 1px solid var(--sk-border-default);', 'border-radius: 6px;',
      'color: #123456;', 'color: red;', 'background: #123456;', 'font-size: 15px;', 'font-style: oblique;', 'border-collapse: separate;',
      'white-space: nowrap;', 'overflow-wrap: anywhere;', 'list-style-type: square;', 'vertical-align: middle;',
      'outline-width: 2px;', 'outline-style: dashed;', 'outline-color: red;', 'outline-offset: -2px;',
      'letter-spacing: 0.01em;', 'text-wrap: balance;', 'text-wrap: pretty;', 'text-transform: lowercase;', 'box-shadow: var(--sk-shadow-md);', 'background-color: var(--sk-surface-hero);',
    ]) {
      assert.ok((await problems(PROSE, css)).length >= 1, css);
      ran += 1;
    }
    assert.equal(ran, 42);
  });
  test('leak: the ruled typography is refused in every sibling file', async () => {
    let ran = 0;
    for (const file of siblingsOf('prose-styles.ts', 'source-parts.ts')) {
      for (const css of ['font-style: italic;', 'text-decoration: underline;', 'cursor: pointer;', 'max-width: 800px;', 'line-height: 1.65;', 'list-style-type: disc;', 'border-collapse: collapse;']) {
        if (css === 'cursor: pointer;' && file.endsWith('inspector-parts.ts')) continue; // E-29 grants the pointer there (WP11 ruling)
        assert.ok((await problems(file, css)).length >= 1, `${file} ${css}`);
        ran += 1;
      }
    }
    assert.equal(ran, 7 * (AV_PARTS.length - 2 + 1) - 1);
  });
});

describe('E-25: the raw and escaped-source block, source-parts.ts only', () => {
  const SOURCE = avFile('source-parts.ts');
  const RING = 'outline-width: var(--sk-border-width-2); outline-style: solid; outline-color: var(--sk-border-focus); outline-offset: calc(-1 * var(--sk-border-width-2));';
  test('pre-wrap, the mono token, size and colour tokens and the ring pass (no measure: the block takes its pane)', async () => {
    assert.deepEqual(
      await problems(SOURCE, `white-space: pre-wrap; font-family: var(--sk-font-mono); font-size: var(--sk-text-sm); color: var(--sk-fg-default); ${RING} overflow-x: auto; padding: var(--sk-space-4); margin: 0;`),
      [],
    );
  });
  test('no overflow-wrap grant, no box paint, no other measure, no other white-space', async () => {
    let ran = 0;
    for (const css of [
      'overflow-wrap: break-word;', 'overflow-wrap: anywhere;', 'overflow-wrap: normal;', 'word-break: break-all;',
      'border: var(--sk-border-width-1) solid var(--sk-border-default);', 'border-radius: var(--sk-radius-sm);', 'background: var(--sk-surface-hero);',
      'max-width: 900px;', 'max-width: 901px;', 'max-width: 800px;', 'max-width: 68ch;', 'max-width: 100%;', 'width: min(900px, 100%);',
      'white-space: pre;', 'white-space: nowrap;', 'white-space: normal;', 'white-space: var(--sk-x);',
      'font-family: monospace;', 'font-size: 13px;', 'color: #123456;', 'outline-width: 2px;', 'letter-spacing: 0.01em;',
    ]) {
      assert.ok((await problems(SOURCE, css)).length >= 1, css);
      ran += 1;
    }
    assert.equal(ran, 22);
  });
  test('leak: the source block paint is refused in every sibling file', async () => {
    let ran = 0;
    for (const file of siblingsOf('source-parts.ts')) {
      // prose-styles.ts (E-23) legitimately holds `pre-wrap` and the mono token; its own grant never reaches 900px.
      const prose = file === avFile('prose-styles.ts');
      // toolbar-parts.ts holds the mono token under its own pinned grant (WP09 grant 3).
      const toolbar = file === avFile('toolbar-parts.ts');
      // state-parts.ts and refusal-parts.ts hold the mono token under E-45.
      const card = file === avFile('state-parts.ts') || file === avFile('refusal-parts.ts');
      for (const css of prose ? ['max-width: 900px;'] : toolbar || card ? ['white-space: pre-wrap;', 'max-width: 900px;'] : ['white-space: pre-wrap;', 'max-width: 900px;', 'font-family: var(--sk-font-mono);']) {
        assert.ok((await problems(file, css)).length >= 1, `${file} ${css}`);
        ran += 1;
      }
    }
    assert.equal(ran, 3 * (AV_PARTS.length - 1) + 1 - 1 - 2);
  });
  test('the 900px measure is a refused plant (CONTRACT-002 ruling (a): DA-39 superseded), in any unit or property', async () => {
    assert.ok((await problems(SOURCE, 'max-width: 900px;')).length >= 1);
    assert.ok((await problems(SOURCE, 'min-width: 900px;')).length >= 1);
    assert.ok((await problems(SOURCE, 'max-width: 900em;')).length >= 1);
  });
});

describe('E-26: the tablist PAINT entry, tab-parts.ts only', () => {
  const TAB = avFile('tab-parts.ts');
  test('token border-color, background and color pass; Highlight and CanvasText pass on border-color', async () => {
    assert.deepEqual(await problems(TAB, 'border-color: var(--sk-border-focus); background: var(--sk-surface-hero); color: var(--sk-fg-default);'), []);
    assert.deepEqual(await problems(TAB, 'border-color: Highlight; border-color: CanvasText;'), []);
  });
  test('inside @media (forced-colors: active) a Highlight border passes', async () => {
    const code = "import { css } from 'lit';\nexport const s = css`\n  .t[aria-selected='true'] { border-color: Highlight; }\n  @media (forced-colors: active) { .t { border-color: CanvasText; } .t[aria-selected='true'] { border-color: Highlight; } }\n`;\n";
    const result = await stylelint.lint({ code, codeFilename: join(root, TAB), config, configBasedir: root });
    assert.deepEqual(result.results.flatMap((r) => r.warnings), []);
  });
  test('the paint is pinned: literal colours, other keywords and other paint properties are refused', async () => {
    let ran = 0;
    for (const css of [
      'border-color: red;', 'border-color: #123456;', 'border-color: ButtonText;', 'border-color: Canvas;', 'border-color: LinkText;',
      'background: Highlight;', 'color: Highlight;', 'color: CanvasText;', 'background: red;', 'color: #fff;',
      'border: var(--sk-border-width-1) solid var(--sk-border-default);', 'border-radius: var(--sk-radius-md);', 'background-color: var(--sk-surface-hero);',
      'font-weight: var(--sk-weight-bold);', 'font-size: var(--sk-text-sm);', 'box-shadow: var(--sk-shadow-md);', 'text-decoration: underline;',
    ]) {
      assert.ok((await problems(TAB, css)).length >= 1, css);
      ran += 1;
    }
    assert.equal(ran, 17);
  });
  test('leak: the paint (and Highlight) is refused in every sibling file', async () => {
    let ran = 0;
    for (const file of siblingsOf('tab-parts.ts')) {
      for (const css of ['border-color: var(--sk-border-focus);', 'border-color: Highlight;', 'border-color: CanvasText;']) {
        assert.ok((await problems(file, css)).length >= 1, `${file} ${css}`);
        ran += 1;
      }
    }
    assert.equal(ran, 3 * AV_PARTS.length);
  });
});

describe('E-28: the 270px track and the 68px toolbar min-height, both pinned', () => {
  const SCREEN = avFile('sk-artifact-screen.ts');
  const TOOLBAR = avFile('toolbar-parts.ts');
  test('the track recipes pass in the screen file', async () => {
    assert.deepEqual(await problems(SCREEN, 'grid-template-columns: minmax(0, 1fr) 270px; grid-template-columns: minmax(0, 1fr);'), []);
  });
  test('the track is pinned: other lengths, units and shapes are refused in the screen file', async () => {
    let ran = 0;
    for (const css of [
      'grid-template-columns: minmax(0, 1fr) 271px;', 'grid-template-columns: minmax(0, 1fr) 260px;', 'grid-template-columns: 270px minmax(0, 1fr);',
      'grid-template-columns: 270px;', 'grid-template-columns: minmax(270px, 1fr) 270px;', 'grid-template-columns: minmax(0, 1fr) 270em;',
      'grid-template-columns: minmax(0, 1fr) 270ch;', 'grid-template-columns: minmax(0, 1fr) 17rem;', 'grid-template-columns: minmax(0, 1fr) var(--sk-space-8);',
      'flex-basis: 270px;', 'min-inline-size: 270px;', 'width: 270px;', 'min-height: 68px;',
    ]) {
      assert.ok((await problems(SCREEN, css)).length >= 1, css);
      ran += 1;
    }
    assert.equal(ran, 13);
  });
  test('the toolbar band min-height 68px passes in toolbar-parts.ts and nothing else is granted there', async () => {
    assert.deepEqual(await problems(TOOLBAR, 'min-height: 68px;'), []);
    let ran = 0;
    for (const css of ['min-height: 69px;', 'min-height: 67px;', 'min-height: 4.25rem;', 'min-height: 68em;', 'min-height: 68ch;', 'min-height: var(--sk-space-8);', 'height: 68px;', 'min-block-size: 68px;', 'grid-template-columns: minmax(0, 1fr) 270px;']) {
      assert.ok((await problems(TOOLBAR, css)).length >= 1, css);
      ran += 1;
    }
    assert.equal(ran, 9);
  });
  test('leak: 270px and 68px are refused in every other file', async () => {
    let ran = 0;
    for (const file of siblingsOf('sk-artifact-screen.ts')) {
      assert.ok((await problems(file, 'grid-template-columns: minmax(0, 1fr) 270px;')).length >= 1, file);
      ran += 1;
    }
    for (const file of siblingsOf('toolbar-parts.ts')) {
      assert.ok((await problems(file, 'min-height: 68px;')).length >= 1, file);
      ran += 1;
    }
    assert.equal(ran, 2 * AV_PARTS.length);
  });
  test('container-query lengths in rem need no entry (the probe passed for #5)', async () => {
    const code = "import { css } from 'lit';\nexport const s = css`\n  @container (min-width: 45rem) { .x { display: grid; } }\n  @container (max-width: 38.75rem) { .x { display: block; } }\n`;\n";
    for (const file of [SCREEN, OTHER]) {
      const result = await stylelint.lint({ code, codeFilename: join(root, file), config, configBasedir: root });
      assert.deepEqual(result.results.flatMap((r) => r.warnings), [], file);
    }
  });
});

describe('E-29, E-27: no Stylelint entry for inspector-parts.ts, state-parts.ts, refusal-parts.ts or document-parts.ts (ESLint-only; the layout rule stands)', () => {
  test('paint is refused in those files', async () => {
    let ran = 0;
    for (const name of ['inspector-parts.ts', 'state-parts.ts', 'refusal-parts.ts', 'document-parts.ts']) {
      for (const css of ['border-color: var(--sk-border-focus);', 'white-space: pre-wrap;', 'max-width: 900px;', 'min-height: 68px;']) {
        assert.ok((await problems(avFile(name), css)).length >= 1, `${name} ${css}`);
        ran += 1;
      }
    }
    assert.equal(ran, 16);
  });
});

describe('E-30: the panel paint (inspector and toolbar band), token-only and pinned, in three files', () => {
  const GRANTED = ['sk-artifact-screen.ts', 'inspector-parts.ts', 'toolbar-parts.ts'];
  const RULE = 'var(--sk-border-width-1) solid var(--sk-border-default)';
  test('the three borders and the two backgrounds pass in each granted file', async () => {
    let ran = 0;
    for (const name of GRANTED) {
      const css = `border-inline-start: ${RULE}; border-block-start: ${RULE}; border-block-end: ${RULE}; background: var(--sk-surface-hero); background: var(--sk-surface-card);`;
      assert.deepEqual(await problems(avFile(name), css), [], name);
      ran += 1;
    }
    assert.equal(ran, 3);
  });
  test('each declaration is pinned: literals, other words, other sides and other paint properties are refused in each granted file', async () => {
    let ran = 0;
    for (const name of GRANTED) {
      for (const css of [
        'border-inline-start: 1px solid var(--sk-border-default);', `border-inline-start: ${RULE.replace('solid', 'dashed')};`, 'border-inline-start: var(--sk-border-width-2) solid var(--sk-border-default);',
        'border-inline-start: var(--sk-border-width-1) solid red;', 'border-inline-start: none;', 'border-block-end: 2px solid var(--sk-border-default);',
        'border-block-start: var(--sk-border-width-1) double var(--sk-border-default);', 'border-inline-end: var(--sk-border-width-1) solid var(--sk-border-default);',
        `border: ${RULE};`, 'border-color: var(--sk-border-default);', 'border-radius: var(--sk-radius-md);', 'border-width: var(--sk-border-width-1);',
        'background: red;', 'background: #123456;', 'background: var(--sk-surface-page);', 'background: linear-gradient(red, blue);', 'background-color: var(--sk-surface-hero);',
        'background-image: url(x.png);', 'box-shadow: var(--sk-shadow-md);',
      ]) {
        assert.ok((await problems(avFile(name), css)).length >= 1, `${name} ${css}`);
        ran += 1;
      }
    }
    assert.equal(ran, 3 * 19);
  });
  test('leak: the paint is refused in every sibling file and in a file outside the screen', async () => {
    let ran = 0;
    for (const file of siblingsOf(...GRANTED)) {
      // Skipped pairs are other exceptions' own grants: E-23 (prose-styles.ts: `border-inline-start`, `background`) and E-26 (tab-parts.ts: `background`).
      for (const css of [`border-inline-start: ${RULE};`, `border-block-start: ${RULE};`, `border-block-end: ${RULE};`, 'background: var(--sk-surface-hero);']) {
        const own = (file.endsWith('prose-styles.ts') && (css.startsWith('border-inline-start') || css.startsWith('background'))) || (file.endsWith('tab-parts.ts') && css.startsWith('background'));
        if (own) continue;
        assert.ok((await problems(file, css)).length >= 1, `${file} ${css}`);
        ran += 1;
      }
    }
    assert.equal(ran, 4 * (AV_PARTS.length - GRANTED.length + 1) - 3);
  });
});

describe('E-45: the refusal and state card look, token-only and pinned, in two files', () => {
  const GRANTED = ['state-parts.ts', 'refusal-parts.ts'];
  const RECIPES = [
    'border: var(--sk-border-width-1) dashed var(--sk-border-control);',
    'background: var(--sk-surface-card);',
    'border-radius: var(--sk-radius-lg);',
    'text-transform: uppercase;',
    'font-family: var(--sk-font-mono);',
    'font-size: var(--sk-text-2xl);',
    'font-size: var(--sk-text-xs);',
    'color: var(--sk-fg-subtle);',
    'font-weight: var(--sk-weight-semibold);',
    'letter-spacing: 0.08em;',
    'font-family: var(--sk-font-display);',
    'font-weight: var(--sk-weight-bold);',
    'letter-spacing: -0.01em;',
    'font-size: var(--sk-text-sm);',
    'line-height: 1.5;',
    'line-height: 1.2;',
  ];
  test('the sixteen recipes pass in each granted file', async () => {
    let ran = 0;
    for (const name of GRANTED) {
      for (const css of RECIPES) {
        assert.deepEqual(await problems(avFile(name), css), [], `${name} ${css}`);
        ran += 1;
      }
    }
    assert.equal(ran, 32);
  });
  test('each declaration is pinned: literals, other words, other tokens and neighbouring paint are refused in each granted file', async () => {
    let ran = 0;
    for (const name of GRANTED) {
      for (const css of [
        'border: 1px dashed var(--sk-border-control);', 'border: var(--sk-border-width-1) solid var(--sk-border-control);', 'border: var(--sk-border-width-2) dashed var(--sk-border-control);',
        'border: var(--sk-border-width-1) dotted var(--sk-border-control);', 'border: var(--sk-border-width-1) dashed red;', 'border: var(--sk-border-width-1) dashed var(--sk-border-default);',
        'border: none;', 'border-color: var(--sk-border-control);', 'border-style: dashed;', 'border-inline-start: var(--sk-border-width-1) dashed var(--sk-border-control);',
        'background: red;', 'background: #123456;', 'background: var(--sk-surface-hero);', 'background-color: var(--sk-surface-card);', 'background: linear-gradient(red, blue);',
        'border-radius: 8px;', 'border-radius: var(--sk-radius-md);', 'border-radius: var(--sk-radius-pill);',
        'text-transform: lowercase;', 'text-transform: capitalize;',
        'font-family: monospace;', 'font-family: var(--sk-font-sans);', 'font-family: Georgia;',
        'font-size: 24px;', 'font-size: 12px;', 'font-size: 14px;', 'font-size: var(--sk-text-xl);', 'font-size: var(--sk-text-base);',
        'letter-spacing: 0.1em;', 'letter-spacing: 0.05em;', 'letter-spacing: 1px;', 'letter-spacing: -0.02em;', 'letter-spacing: -0.24px;', 'letter-spacing: normal;',
        'color: red;', 'color: #888;', 'color: var(--sk-fg-default);', 'color: var(--sk-fg-muted);',
        'font-weight: 600;', 'font-weight: 700;', 'font-weight: bold;', 'font-weight: var(--sk-weight-medium);',
        'line-height: 1.4;', 'line-height: 1.6;', 'line-height: 1.65;', 'line-height: 1.50;', 'line-height: 21px;', 'line-height: 150%;', 'line-height: normal;', 'line-height: var(--sk-leading-normal);',
        'box-shadow: var(--sk-shadow-md);',
      ]) {
        assert.ok((await problems(avFile(name), css)).length >= 1, `${name} ${css}`);
        ran += 1;
      }
    }
    assert.equal(ran, 2 * 51);
  });
  test('leak: the sixteen recipes are refused in every sibling file and in a file outside the screen, except where another entry grants the same recipe', async () => {
    // Pairs another entry grants on its own, found by running every recipe through every sibling: E-23 (prose-styles.ts), E-25
    // (source-parts.ts), E-26 (tab-parts.ts), E-21 (toolbar-parts.ts) and E-30 (the card fill in the three paint files).
    const OWN = new Set([
      'prose-styles.ts|background: var(--sk-surface-card);', 'prose-styles.ts|border-radius: var(--sk-radius-lg);', 'prose-styles.ts|text-transform: uppercase;', 'prose-styles.ts|font-family: var(--sk-font-mono);', 'prose-styles.ts|font-size: var(--sk-text-2xl);', 'prose-styles.ts|font-size: var(--sk-text-xs);', 'prose-styles.ts|color: var(--sk-fg-subtle);', 'prose-styles.ts|font-weight: var(--sk-weight-semibold);', 'prose-styles.ts|letter-spacing: 0.08em;', 'prose-styles.ts|font-family: var(--sk-font-display);', 'prose-styles.ts|font-weight: var(--sk-weight-bold);', 'prose-styles.ts|font-size: var(--sk-text-sm);', 'prose-styles.ts|line-height: 1.2;', 'source-parts.ts|font-family: var(--sk-font-mono);', 'source-parts.ts|font-size: var(--sk-text-2xl);', 'source-parts.ts|font-size: var(--sk-text-xs);', 'source-parts.ts|color: var(--sk-fg-subtle);', 'source-parts.ts|font-family: var(--sk-font-display);', 'source-parts.ts|font-size: var(--sk-text-sm);', 'source-parts.ts|line-height: 1.5;', 'tab-parts.ts|background: var(--sk-surface-card);', 'tab-parts.ts|color: var(--sk-fg-subtle);', 'toolbar-parts.ts|background: var(--sk-surface-card);', 'toolbar-parts.ts|font-family: var(--sk-font-mono);', 'inspector-parts.ts|background: var(--sk-surface-card);', 'sk-artifact-screen.ts|background: var(--sk-surface-card);'
    ]);
    let ran = 0;
    let skipped = 0;
    for (const file of siblingsOf(...GRANTED)) {
      for (const css of RECIPES) {
        const key = `${file.split('/').pop()}|${css}`;
        const problemsHere = await problems(file, css);
        if (OWN.has(key)) {
          skipped += 1;
          continue;
        }
        assert.ok(problemsHere.length >= 1, `${file} ${css}`);
        ran += 1;
      }
    }
    assert.equal(ran + skipped, 16 * (AV_PARTS.length - GRANTED.length + 1));
    assert.ok(ran >= 50, `ran ${ran}`);
  });
});

describe('E-29: the pill ellipsis (overflow hidden, text-overflow ellipsis, white-space nowrap, max-width 100%), pinned, in inspector-parts.ts only', () => {
  const INSPECTOR = avFile('inspector-parts.ts');
  const RULE = 'max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border: 0; cursor: pointer;';
  test('the four declarations and the button reset pass in inspector-parts.ts', async () => {
    assert.deepEqual(await problems(INSPECTOR, RULE), []);
  });
  test('each declaration is pinned: other values and other properties are refused', async () => {
    let ran = 0;
    for (const css of [
      'max-width: 50%;', 'max-width: 300px;', 'max-width: 20rem;', 'max-width: none;', 'text-overflow: clip;', 'text-overflow: "x";',
      'white-space: normal;', 'white-space: pre;', 'white-space: pre-wrap;', 'overflow-wrap: anywhere;', 'word-break: break-all;',
      'text-wrap: balance;', 'min-width: 100%;', 'width: 100%;', 'letter-spacing: 0.08em;',
      'border: 1px solid red;', 'border: none;', 'border: var(--sk-border-width-1) solid var(--sk-border-default);', 'border-width: 0;', 'border-radius: 0;',
      'cursor: default;', 'cursor: grab;', 'cursor: not-allowed;', 'cursor: url(x.cur), pointer;',
    ]) {
      assert.ok((await problems(INSPECTOR, css)).length >= 1, css);
      ran += 1;
    }
    assert.equal(ran, 24);
  });
  test('leak: text-overflow, white-space nowrap and max-width 100% are refused in every sibling file (other exceptions keep their own grants)', async () => {
    // The merge of chains X and Y: E-21 grants these same three declarations in toolbar-parts.ts, so that file's pairs are E-21's own.
    let ran = 0;
    let skipped = 0;
    for (const file of siblingsOf('inspector-parts.ts')) {
      for (const css of ['text-overflow: ellipsis;', 'white-space: nowrap;', 'max-width: 100%;']) {
        // E-23 (prose-styles.ts) and E-25 (source-parts.ts) grant `white-space` for other keywords (pre, pre-wrap), not `nowrap`.
        if (file.endsWith('toolbar-parts.ts')) {
          assert.deepEqual(await problems(file, css), [], `${file} ${css}`);
          skipped += 1;
          continue;
        }
        assert.ok((await problems(file, css)).length >= 1, `${file} ${css}`);
        ran += 1;
      }
    }
    assert.equal(skipped, 3);
    assert.equal(ran + skipped, 3 * (AV_PARTS.length));
  });
  test('leak: cursor pointer is refused in every sibling file except prose-styles.ts (E-23 grants it there)', async () => {
    let ran = 0;
    for (const file of siblingsOf('inspector-parts.ts')) {
      if (file.endsWith('prose-styles.ts')) continue;
      assert.ok((await problems(file, 'cursor: pointer;')).length >= 1, file);
      ran += 1;
    }
    assert.equal(ran, AV_PARTS.length - 1);
  });
});

describe('E-44: the inspector group headings, font-size var(--sk-text-base) and line-height 1.35, pinned, in inspector-parts.ts only', () => {
  const INSPECTOR = avFile('inspector-parts.ts');
  test('both declarations pass in inspector-parts.ts', async () => {
    assert.deepEqual(await problems(INSPECTOR, 'font-size: var(--sk-text-base); line-height: 1.35;'), []);
  });
  test('each is pinned: other tokens, literals and neighbouring properties are refused', async () => {
    let ran = 0;
    for (const css of ['font-size: var(--sk-text-lg);', 'font-size: var(--sk-text-sm);', 'font-size: 16px;', 'font-size: 1rem;', 'font-size: larger;', 'line-height: 1.5;', 'line-height: 1.34;', 'line-height: 22px;', 'line-height: var(--sk-leading-normal);', 'font-weight: var(--sk-weight-bold);', 'font-family: var(--sk-font-display);', 'letter-spacing: 0.08em;', 'text-transform: uppercase;']) {
      assert.ok((await problems(INSPECTOR, css)).length >= 1, css);
      ran += 1;
    }
    assert.equal(ran, 13);
  });
  test('leak: both are refused in every sibling file, except where E-23 and E-25 grant font-size and line-height of their own', async () => {
    let ran = 0;
    for (const file of siblingsOf('inspector-parts.ts')) {
      for (const css of ['font-size: var(--sk-text-base);', 'line-height: 1.35;']) {
        const own = (file.endsWith('prose-styles.ts') && true) || (file.endsWith('source-parts.ts') && css.startsWith('font-size'));
        if (own) continue;
        assert.ok((await problems(file, css)).length >= 1, `${file} ${css}`);
        ran += 1;
      }
    }
    assert.ok(ran >= 14, String(ran));
  });
});

// E-26, E-27, E-29: the ESLint overrides of the Artifact Viewer, with leak plants. The part files are stubs written by IC-06b, so the
// check runs the REAL configuration's `no-restricted-syntax` value (ESLint.calculateConfigForFile) through a bare Linter on code held
// in memory: it needs no file on disk, and a dropped or mis-scoped override turns it red.
describe('E-26, E-27, E-29: the class= and raw-button overrides of the Artifact Viewer, per file, with leak plants', () => {
  const eslint = new ESLint({ cwd: root });
  const linter = new Linter({ configType: 'flat' });
  const syntaxMessages = async (file, markup) => {
    const path = join(root, `${EL}/sk-artifact-screen/${file}`);
    const rule = (await eslint.calculateConfigForFile(path))?.rules?.['no-restricted-syntax'];
    assert.ok(Array.isArray(rule), `${file}: no-restricted-syntax is configured`);
    const code = `import { html } from 'lit';\nexport const t = html\`${markup}\`;\n`;
    return linter
      .verify(code, [{ files: ['**/*.js'], rules: { 'no-restricted-syntax': rule } }], { filename: path.replace(/\.ts$/, '.js') })
      .map((m) => m.message);
  };
  const classCase = (file, classes) => syntaxMessages(file, `<div class="${classes}"></div>`);

  // file, the prefixes its E-27 row grants
  const ROWS = [
    ['inspector-parts.ts', ['sk-facts', 'sk-pill-tag']],
    ['state-parts.ts', ['sk-empty-state', 'sk-progress']],
    ['refusal-parts.ts', ['sk-empty-state']],
  ];
  const NONE = ['tab-parts.ts', 'sk-artifact-screen.ts', 'toolbar-parts.ts', 'document-parts.ts', 'source-parts.ts', 'prose-styles.ts'];
  const ALL_PREFIXES = ['sk-facts', 'sk-pill-tag', 'sk-empty-state', 'sk-progress'];

  test('control: a class in a file with no row is reported (the harness sees the base ban)', async () => {
    assert.ok((await classCase('toolbar-parts.ts', 'sk-facts')).some((m) => /class= is forbidden/.test(m)));
  });
  test('E-27: a granted prefix passes, in its own file only', async () => {
    let ran = 0;
    for (const [file, prefixes] of ROWS) {
      for (const prefix of prefixes) {
        assert.deepEqual(await classCase(file, `${prefix}__part ${prefix}`), [], `${file} ${prefix}`);
        ran += 1;
      }
    }
    assert.equal(ran, 5);
  });
  test('E-27 leak plant: a class outside the file\'s prefixes is refused, including another file\'s granted prefix', async () => {
    let ran = 0;
    for (const [file, prefixes] of ROWS) {
      assert.ok((await classCase(file, 'plain-class')).length >= 1, `${file} plain-class`);
      assert.ok((await classCase(file, `${prefixes[0]} plain-class`)).length >= 1, `${file} mixed`);
      ran += 2;
      for (const other of ALL_PREFIXES.filter((p) => !prefixes.includes(p))) {
        assert.ok((await classCase(file, other)).length >= 1, `${file} ${other}`);
        ran += 1;
      }
    }
    assert.equal(ran, 4 + 4 + 5);
  });
  test('E-27: sk-segmented-choice has no row anywhere in the screen (the tab is a paint entry, E-26)', async () => {
    let ran = 0;
    for (const file of [...ROWS.map(([f]) => f), ...NONE]) {
      assert.ok((await classCase(file, 'sk-segmented-choice__item')).length >= 1, file);
      ran += 1;
    }
    assert.equal(ran, 9);
  });
  test('E-27: the files the table does not list carry no class at all, whatever the prefix', async () => {
    let ran = 0;
    for (const file of NONE) {
      for (const prefix of ALL_PREFIXES) {
        assert.ok((await classCase(file, prefix)).some((m) => /class= is forbidden/.test(m)), `${file} ${prefix}`);
        ran += 1;
      }
    }
    assert.equal(ran, 24);
  });

  const TAB_BUTTON = '<button type="button" role="tab" aria-selected="true">x</button>';
  test('E-26: the raw tab button passes in tab-parts.ts, with other attributes after the pair', async () => {
    assert.deepEqual(await syntaxMessages('tab-parts.ts', TAB_BUTTON), []);
    assert.deepEqual(await syntaxMessages('tab-parts.ts', '<button type="button" role="tab" aria-selected=${"x"} @click=${"y"}>x</button>'), []);
  });
  test('E-26 leak plant: a raw button without exactly that shape is refused in tab-parts.ts', async () => {
    let ran = 0;
    for (const markup of [
      '<button>x</button>', '<button type="button">x</button>', '<button type="submit" role="tab">x</button>', '<button role="tab" type="button">x</button>',
      '<button type="button" role="button">x</button>', '<button type="button" role="tabpanel">x</button>', '<button type="button" role="tabs">x</button>',
      '<button type="button" class="sk-pill-tag">x</button>', '<button type="button" role="tab" class="x">x</button>',
      '<button type="button" role="tab" class="sk-segmented-choice__item">x</button>', '<input type="text">', '<select></select>', '<textarea></textarea>',
    ]) {
      assert.ok((await syntaxMessages('tab-parts.ts', markup)).length >= 1, markup);
      ran += 1;
    }
    assert.equal(ran, 13);
  });
  test('E-26 leak plant: the raw tab button is refused in every other file of the screen', async () => {
    let ran = 0;
    for (const file of ['inspector-parts.ts', 'state-parts.ts', 'refusal-parts.ts', ...NONE.filter((f) => f !== 'tab-parts.ts')]) {
      assert.ok((await syntaxMessages(file, TAB_BUTTON)).some((m) => /Raw <button>|only <button|Only <button/i.test(m)), file);
      ran += 1;
    }
    assert.equal(ran, 8);
  });

  const PILL = '<button type="button" class="sk-pill-tag" title="x">x</button>';
  test('E-29: the raw pill button passes in inspector-parts.ts only', async () => {
    assert.deepEqual(await syntaxMessages('inspector-parts.ts', PILL), []);
    assert.deepEqual(await syntaxMessages('inspector-parts.ts', '<button type="button" class="sk-pill-tag" @click=${"x"}>x</button>'), []);
  });
  test('E-29 leak plant: any other raw button is refused in inspector-parts.ts', async () => {
    let ran = 0;
    for (const markup of [
      '<button>x</button>', '<button type="button">x</button>', '<button type="button" class="sk-facts">x</button>', '<button type="button" class="sk-pill-tag extra">x</button>',
      '<button type="button" role="tab">x</button>', '<button class="sk-pill-tag" type="button">x</button>', '<button type="submit" class="sk-pill-tag">x</button>',
      '<input type="text" class="sk-pill-tag">',
    ]) {
      assert.ok((await syntaxMessages('inspector-parts.ts', markup)).length >= 1, markup);
      ran += 1;
    }
    assert.equal(ran, 8);
  });
  test('E-29 leak plant: the raw pill button is refused in every other file of the screen and elsewhere', async () => {
    let ran = 0;
    for (const file of ['tab-parts.ts', 'state-parts.ts', 'refusal-parts.ts', ...NONE.filter((f) => f !== 'tab-parts.ts')]) {
      assert.ok((await syntaxMessages(file, PILL)).length >= 1, file);
      ran += 1;
    }
    assert.equal(ran, 8);
    const sibling = await eslint.calculateConfigForFile(join(root, `${EL}/sk-work-package-screen/state-parts.ts`));
    const rule = sibling?.rules?.['no-restricted-syntax'];
    const code = `import { html } from 'lit';\nexport const t = html\`${PILL}\`;\n`;
    const found = linter.verify(code, [{ files: ['**/*.js'], rules: { 'no-restricted-syntax': rule } }], { filename: 'x.js' });
    assert.ok(found.length >= 1);
  });
  test('the overrides keep the other element restrictions: inline style, unsafeHTML and R2/R3 stay reported in every overridden file', async () => {
    let ran = 0;
    for (const file of ['inspector-parts.ts', 'state-parts.ts', 'refusal-parts.ts', 'tab-parts.ts']) {
      assert.ok((await syntaxMessages(file, '<div style="x"></div>')).some((m) => /style=/.test(m)), `${file} style`);
      const rule = (await eslint.calculateConfigForFile(join(root, `${EL}/sk-artifact-screen/${file}`)))?.rules?.['no-restricted-syntax'];
      const text = JSON.stringify(rule);
      for (const marker of ['markdown-renderer: R2', 'markdown-renderer: R3', 'unsafeHTML']) assert.ok(text.includes(marker), `${file} ${marker}`);
      ran += 1;
    }
    assert.equal(ran, 4);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------
// Artifact Viewer (mission-ui#7, WP09 rework): the five grants of the operator ruling of 2026-10-08, each a narrow pinned value, with
// allowed cases, refused neighbours and a leak plant in every sibling file. (1) E-26 extension, tab-parts.ts: the pill tray.
// (2) E-23 extension, prose-styles.ts: the eyebrow's uppercase and tracking. (3) toolbar-parts.ts: the mono token and the E-21
// ellipsis declarations. (4) E-25 extension, source-parts.ts: line-height 1.5. (5) E-23, prose-styles.ts: heading line-height 1.2.
// ---------------------------------------------------------------------------------------------------------------------------
describe('WP09 grant 1, E-26 extension: the pill tray in tab-parts.ts only', () => {
  const TAB = avFile('tab-parts.ts');
  const ALLOWED = ['border-radius: var(--sk-radius-pill);', 'border-width: var(--sk-border-width-1);', 'border-style: solid;', 'font: inherit;'];
  test('the four pinned declarations pass', async () => {
    for (const css of ALLOWED) assert.deepEqual(await problems(TAB, css), [], css);
  });
  test('near neighbours are refused: other radii, widths, styles, fonts and the border shorthand', async () => {
    let ran = 0;
    for (const css of [
      'border-radius: 6px;', 'border-radius: var(--sk-radius-md);', 'border-radius: 50%;', 'border-width: 1px;', 'border-width: var(--sk-border-width-2);',
      'border-style: dashed;', 'border-style: none;', 'border-style: outset;', 'font: 14px Inter;', 'font: var(--sk-font-mono);', 'font: bold inherit;',
      'font-family: var(--sk-font-mono);', 'font-size: var(--sk-text-sm);', 'font-weight: var(--sk-weight-bold);',
      'border: var(--sk-border-width-1) solid var(--sk-border-default);', 'box-shadow: var(--sk-shadow-md);',
    ]) {
      assert.ok((await problems(TAB, css)).length >= 1, css);
      ran += 1;
    }
    assert.equal(ran, 16);
  });
  test('leak plant: each declaration is refused in every sibling file', async () => {
    let ran = 0;
    for (const file of siblingsOf('tab-parts.ts')) {
      for (const css of ALLOWED) {
        // prose-styles.ts (E-23) grants a token `border-radius` of its own (and the pill token is a token): that pair is E-23's.
        if (file.endsWith('prose-styles.ts') && css.startsWith('border-radius')) continue;
        assert.ok((await problems(file, css)).length >= 1, `${file} ${css}`);
        ran += 1;
      }
    }
    assert.equal(ran, 4 * AV_PARTS.length - 1);
  });
});

describe('WP09 grants 2 and 5, E-23 extension: eyebrow typography and heading line-height in prose-styles.ts only', () => {
  const PROSE = avFile('prose-styles.ts');
  const ALLOWED = ['text-transform: uppercase;', 'letter-spacing: 0.08em;', 'line-height: 1.2;', 'line-height: 1.65;'];
  test('uppercase, 0.08em tracking and the two pinned line heights pass', async () => {
    for (const css of ALLOWED) assert.deepEqual(await problems(PROSE, css), [], css);
  });
  test('near neighbours are refused (the CP-1 drop of other letter-spacing and of text-wrap still applies)', async () => {
    let ran = 0;
    for (const css of [
      'text-transform: lowercase;', 'text-transform: capitalize;', 'letter-spacing: 0.1em;', 'letter-spacing: 0.08rem;', 'letter-spacing: 1px;', 'letter-spacing: -0.01em;',
      'letter-spacing: var(--sk-space-1);', 'line-height: 1.3;', 'line-height: 1.5;', 'line-height: 1.2em;', 'line-height: 20px;', 'text-wrap: balance;',
    ]) {
      assert.ok((await problems(PROSE, css)).length >= 1, css);
      ran += 1;
    }
    assert.equal(ran, 12);
  });
  test('the 0.08em literal is granted on letter-spacing only (em stays refused elsewhere in the file)', async () => {
    assert.ok((await problems(PROSE, 'max-width: 0.08em;')).length >= 1);
    assert.ok((await problems(PROSE, 'font-size: 0.08em;')).length >= 1);
  });
  test('leak plant: each declaration is refused in every sibling file (source-parts.ts keeps only its own line-height 1.5)', async () => {
    let ran = 0;
    for (const file of siblingsOf('prose-styles.ts')) {
      for (const css of ALLOWED) {
        // state-parts.ts and refusal-parts.ts hold `text-transform: uppercase` and `letter-spacing: 0.08em` under E-45.
        if ((file.endsWith('state-parts.ts') || file.endsWith('refusal-parts.ts')) && (css.startsWith('text-transform') || css.startsWith('letter-spacing') || css === 'line-height: 1.2;')) continue;
        assert.ok((await problems(file, css)).length >= 1, `${file} ${css}`);
        ran += 1;
      }
    }
    assert.equal(ran, 4 * AV_PARTS.length - 6);
  });
});

describe('WP09 grant 3: the toolbar file name in toolbar-parts.ts only (the mono token and the E-21 ellipsis declarations)', () => {
  const TOOLBAR = avFile('toolbar-parts.ts');
  const ALLOWED = ['font-family: var(--sk-font-mono);', 'overflow: hidden;', 'text-overflow: ellipsis;', 'white-space: nowrap;', 'max-width: 100%;'];
  test('the pinned declarations pass', async () => {
    for (const css of ALLOWED) assert.deepEqual(await problems(TOOLBAR, css), [], css);
  });
  test('near neighbours are refused', async () => {
    let ran = 0;
    for (const css of [
      'font-family: monospace;', 'font-family: var(--sk-font-sans);', 'text-overflow: clip;', 'white-space: normal;', 'white-space: pre;', 'white-space: pre-wrap;',
      'max-width: 99%;', 'max-width: 900px;', 'overflow: scroll;', 'overflow: auto;', 'overflow-wrap: anywhere;', 'letter-spacing: 0.08em;', 'font-size: var(--sk-text-sm);',
    ]) {
      assert.ok((await problems(TOOLBAR, css)).length >= 1, css);
      ran += 1;
    }
    assert.equal(ran, 13);
  });
  test('leak plant: the ellipsis declarations are refused in every sibling file (the mono token is E-23 and E-25 own in their files)', async () => {
    // `overflow: hidden` is a layout declaration everywhere, so it is refused as a VALUE only where a pin exists; here the plant covers
    // the three that are refused in every sibling, and overflow is asserted on its pinned values in the granted file.
    // The merge of chains X and Y: E-29 grants these same three declarations in inspector-parts.ts, so that file's pairs are E-29's own.
    let ran = 0;
    let skipped = 0;
    for (const file of siblingsOf('toolbar-parts.ts')) {
      for (const css of ['text-overflow: ellipsis;', 'white-space: nowrap;', 'max-width: 100%;']) {
        if (file.endsWith('inspector-parts.ts')) {
          assert.deepEqual(await problems(file, css), [], `${file} ${css}`);
          skipped += 1;
          continue;
        }
        assert.ok((await problems(file, css)).length >= 1, `${file} ${css}`);
        ran += 1;
      }
    }
    assert.equal(skipped, 3);
    assert.equal(ran + skipped, 3 * AV_PARTS.length);
    for (const css of ['overflow: scroll;', 'overflow: auto;', 'overflow: visible;']) assert.ok((await problems(TOOLBAR, css)).length >= 1, css);
  });
  test('leak plant: the mono token is refused in every sibling file that has no grant of its own for it', async () => {
    // Grantors of the mono token by another exception: E-23 (prose-styles.ts), E-25 (source-parts.ts) and E-45 (state-parts.ts, refusal-parts.ts).
    const GRANTORS = ['prose-styles.ts', 'source-parts.ts', 'state-parts.ts', 'refusal-parts.ts'].map(avFile);
    let refused = 0;
    let granted = 0;
    for (const file of siblingsOf('toolbar-parts.ts')) {
      const found = await problems(file, 'font-family: var(--sk-font-mono);');
      if (GRANTORS.includes(file)) {
        assert.deepEqual(found, [], file);
        granted += 1;
      } else {
        assert.ok(found.length >= 1, file);
        refused += 1;
      }
    }
    assert.equal(granted, GRANTORS.length);
    assert.equal(refused, AV_PARTS.length - 1 - GRANTORS.length + 1);
    // The near neighbours stay refused in the granted file as well as in the siblings.
    for (const file of siblingsOf('toolbar-parts.ts')) assert.ok((await problems(file, 'font-family: monospace;')).length >= 1, file);
  });
});

describe('WP09 grant 4, E-25 extension: the raw block line-height 1.5 in source-parts.ts only', () => {
  const SOURCE = avFile('source-parts.ts');
  test('1.5 passes', async () => {
    assert.deepEqual(await problems(SOURCE, 'line-height: 1.5;'), []);
  });
  test('near neighbours are refused', async () => {
    let ran = 0;
    for (const css of ['line-height: 1.4;', 'line-height: 1.65;', 'line-height: 1.2;', 'line-height: 1.5em;', 'line-height: 24px;', 'line-height: 150%;', 'line-height: normal;']) {
      assert.ok((await problems(SOURCE, css)).length >= 1, css);
      ran += 1;
    }
    assert.equal(ran, 7);
  });
  test('leak plant: line-height 1.5 is refused in every sibling file', async () => {
    let ran = 0;
    for (const file of siblingsOf('source-parts.ts')) {
      // state-parts.ts and refusal-parts.ts hold the unitless line heights 1.5 and 1.2 under E-45.
      if (file.endsWith('state-parts.ts') || file.endsWith('refusal-parts.ts')) continue;
      assert.ok((await problems(file, 'line-height: 1.5;')).length >= 1, file);
      ran += 1;
    }
    assert.equal(ran, AV_PARTS.length - 2);
  });
});

describe('WP13 extension, E-23: the table sizes to its content (`width: max-content`, cell `max-width: 30ch`) in prose-styles.ts only', () => {
  const PROSE = avFile('prose-styles.ts');
  test('width max-content and max-width 30ch pass in prose-styles.ts', async () => {
    assert.deepEqual(await problems(PROSE, 'width: max-content; max-width: 30ch;'), []);
  });
  test('the old floor and neighbours are refused: min-width 12ch (the WP12 floor, withdrawn), other widths and other ch values', async () => {
    let ran = 0;
    for (const css of ['min-width: 12ch;', 'min-width: 30ch;', 'width: min-content;', 'width: fit-content;', 'width: 100%;', 'width: 30ch;', 'width: 800px;',
      'max-width: 29ch;', 'max-width: 31ch;', 'max-width: 35ch;', 'max-width: 40ch;', 'max-width: 30px;', 'max-width: 30em;', 'max-width: max-content;']) {
      assert.ok((await problems(PROSE, css)).length >= 1, css);
      ran += 1;
    }
    assert.equal(ran, 14);
  });
  test('leak: both declarations are refused in every sibling part file', async () => {
    let ran = 0;
    for (const file of siblingsOf('prose-styles.ts')) {
      for (const css of ['width: max-content;', 'max-width: 30ch;', 'min-width: 12ch;']) {
        assert.ok((await problems(file, css)).length >= 1, `${file} ${css}`);
        ran += 1;
      }
    }
    assert.equal(ran, 3 * AV_PARTS.length);
  });
});
