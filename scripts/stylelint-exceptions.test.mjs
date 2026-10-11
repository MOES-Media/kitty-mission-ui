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

// ---- Projects screen (mission-ui#9): E-31 to E-34 as ruled at CP-1 (2026-10-08) and the pinned narrow-column grant (DP-22).
// Each grant is proven three ways: its CSS passes in its one file, the same CSS is refused in every sibling part file, in the
// other element's files and in an unrelated file (leak tests), and a different value is refused inside its own file (plants).
describe('Projects screen: E-31 to E-34 and the narrow column, pinned per file, with leak tests and plants', () => {
  const PS = `${EL}/sk-projects-screen`;
  const PD = `${EL}/sk-open-project-dialog`;
  const SCREEN = `${PS}/sk-projects-screen.ts`;
  const HEADER = `${PS}/header-parts.ts`;
  const ROW = `${PS}/row-parts.ts`;
  const STATE = `${PS}/state-parts.ts`;
  const DIALOG = `${PD}/sk-open-project-dialog.ts`;
  const FOLDERS = `${PD}/folder-list-parts.ts`;
  const ALL = [SCREEN, HEADER, ROW, STATE, DIALOG, FOLDERS, OTHER];
  const except = (file) => ALL.filter((candidate) => candidate !== file);
  // The mono family is ruled three times (E-31 (c), E-32 (b), E-34): each of those files may carry it, no other file may.
  // E-32 (c) and E-34 share the eyebrow treatment and the header band's separator: the same declaration is granted in both files.
  const SHARED_E32C = {
    'font-size: var(--sk-text-xs);': [DIALOG],
    'text-transform: uppercase;': [DIALOG],
    'letter-spacing: 0.08em;': [DIALOG],
    'color: var(--sk-fg-subtle);': [DIALOG],
    'border-block-end: var(--sk-border-width-1) solid var(--sk-border-default);': [DIALOG, HEADER],
  };
  // E-31 (c)'s pill border is any token width, `solid` and any token colour, so E-32's border is also valid in row-parts.ts.
  const MONO = [ROW, DIALOG, HEADER, FOLDERS];
  const MONO_SHARED = (file) => ({ 'font-family: var(--sk-font-mono);': MONO.filter((candidate) => candidate !== file) });

  /**
   * Every declaration passes in `file`, and is refused in every other file of ALL except those in `shared` (files whose own ruled
   * grant is the very same declaration: the mono family is ruled for three files). Returns the leak count.
   */
  // Declarations that two ruled grants share (the same pinned value in more than one file): the file list is where each is granted.
  const OVERLAP = {
    'font-weight: var(--sk-weight-bold);': [ROW, STATE],
    'font-weight: var(--sk-weight-normal);': [ROW],
    'font-weight: var(--sk-weight-semibold);': [HEADER, DIALOG],
    'color: var(--sk-fg-default);': [HEADER, FOLDERS],
    'color: var(--sk-fg-muted);': [HEADER, DIALOG, FOLDERS],
    'font-family: var(--sk-font-display);': [HEADER, STATE, DIALOG],
    'font-size: var(--sk-text-sm);': [SCREEN, HEADER, ROW, DIALOG],
    'font-size: var(--sk-text-lg);': [STATE, DIALOG],
    // Union of the two chains: E-34 (c) grants 1.5 on the screen host and 1.2 on the h1; E-32 (e) grants 1.5 in the dialog file; E-31 (d) grants 1.2 in the row and folder-list pill.
    'line-height: 1.5;': [SCREEN, DIALOG],
    'line-height: 1.2;': [HEADER, ROW, FOLDERS],
    'letter-spacing: -0.01em;': [HEADER],
  };
  async function pinned(file, declarations, shared = {}) {
    assert.deepEqual(await problems(file, declarations.join(' ')), [], `${file} ${declarations.join(' ')}`);
    let leaks = 0;
    let skipped = 0;
    let expected = 0;
    for (const other of except(file)) {
      for (const declaration of declarations) {
        expected += 1;
        if ([...(shared[declaration] ?? []), ...(OVERLAP[declaration] ?? [])].includes(other)) {
          skipped += 1;
          continue;
        }
        assert.ok((await problems(other, declaration)).length >= 1, `${other} ${declaration}`);
        leaks += 1;
      }
    }
    assert.equal(expected, declarations.length * 6);
    assert.equal(leaks + skipped, expected);
    return leaks;
  }
  /** Every plant is refused in `file`, also with the file's own grant beside it. Returns the plant count. */
  async function plants(file, own, list) {
    for (const plant of list) {
      assert.ok((await problems(file, plant)).length >= 1, `${file} ${plant}`);
      assert.ok((await problems(file, `${own} ${plant}`)).length >= 1, `${file} own + ${plant}`);
    }
    return list.length;
  }

  test('E-31 (a): the hover paint of the row is two colour properties with token values, in row-parts.ts only', async () => {
    const own = 'border-color: var(--sk-border-control); background-color: var(--sk-surface-input);';
    assert.equal(await pinned(ROW, ['border-color: var(--sk-border-control);', 'background-color: var(--sk-surface-input);']), 12);
    assert.deepEqual(await problems(ROW, own), []);
    assert.equal(
      await plants(ROW, own, ['background-color: #1c1f25;', 'border-color: rgb(129 129 139);', 'background-color: red;', 'border-color: 1px;', 'background: var(--sk-surface-input);', 'box-shadow: var(--sk-shadow-md);', 'outline-color: var(--sk-border-control);']),
      7,
    );
  });
  test('E-31 (b): nowrap and ellipsis on the pill and the version text, in row-parts.ts only, and only those values', async () => {
    const own = 'white-space: nowrap; text-overflow: ellipsis;';
    assert.equal(await pinned(ROW, ['white-space: nowrap;', 'text-overflow: ellipsis;']), 12);
    assert.equal(await plants(ROW, own, ['white-space: pre;', 'white-space: normal;', 'text-overflow: clip;', 'text-overflow: "…";', 'overflow-wrap: anywhere;', 'word-break: break-all;']), 6);
  });
  test('E-31 (c): the pill border (token width, solid, token colour) and the mono family, in row-parts.ts only', async () => {
    const own = 'border: var(--sk-border-width-1) solid var(--sk-on-status-success); font-family: var(--sk-font-mono);';
    // Extended at WP07: the dialog's "valid project" pill carries the same outline and mono face, so folder-list-parts.ts is the one other file that passes both.
    assert.equal(
      await pinned(ROW, ['border: var(--sk-border-width-1) solid var(--sk-on-status-success);', 'font-family: var(--sk-font-mono);'], {
        ...MONO_SHARED(ROW),
        'border: var(--sk-border-width-1) solid var(--sk-on-status-success);': [FOLDERS],
      }),
      8,
    );
    assert.equal(
      await plants(ROW, own, [
        'border: 2px solid var(--sk-on-status-success);',
        'border: var(--sk-border-width-1) dashed var(--sk-on-status-success);',
        'border: var(--sk-border-width-1) solid red;',
        'font-family: monospace;',
        'font-family: var(--sk-font-display);',
        'font-weight: var(--sk-weight-semibold);',
        'border-radius: var(--sk-radius-md);',
      ]),
      7,
    );
    // `solid` is a border word only: it stays refused on every other property of the file.
    for (const css of ['background-color: solid;', 'color: solid;', 'padding: solid;', 'font-family: solid;']) assert.ok((await problems(ROW, css)).length >= 1, css);
  });
  test('E-31 dropped parts stay refused: the card chrome, the minimum height and the raw button have no grant in row-parts.ts', async () => {
    let ran = 0;
    for (const css of ['background: var(--sk-surface-card);', 'border-radius: var(--sk-radius-md);', 'min-height: 82px;', 'min-block-size: var(--sk-space-8);']) {
      assert.ok((await problems(ROW, css)).length >= 1, css);
      ran += 1;
    }
    assert.equal(ran, 4);
  });

  test('E-34 (c): the screen host takes the 14px base and the 1.5 line, in the screen file only', async () => {
    const own = ['font-size: var(--sk-text-sm);', 'line-height: 1.5;'];
    assert.ok((await pinned(SCREEN, own)) > 0);
    assert.equal(
      await plants(SCREEN, own.join(' '), ['font-size: 14px;', 'font-size: var(--sk-text-lg);', 'font-size: 0.875rem;', 'line-height: 1.6;', 'line-height: 21px;', 'line-height: 1.2;', 'color: var(--sk-fg-muted);', 'font-weight: var(--sk-weight-bold);']),
      8,
    );
  });
  test('E-34 (c): the h1, the muted copy, the eyebrow weight and the count size are pinned values in header-parts.ts only', async () => {
    const own = [
      'font-family: var(--sk-font-display);',
      'color: var(--sk-fg-default);',
      'color: var(--sk-fg-muted);',
      'letter-spacing: -0.01em;',
      'line-height: 1.2;',
      'font-weight: var(--sk-weight-semibold);',
      'font-size: var(--sk-text-sm);',
    ];
    assert.ok((await pinned(HEADER, own, SHARED_E32C)) > 0);
    assert.equal(
      await plants(HEADER, own.join(' '), ['letter-spacing: -0.02em;', 'letter-spacing: -1px;', 'line-height: 1.3;', 'line-height: 28.8px;', 'font-weight: 700;', 'font-weight: var(--sk-weight-extrabold);', 'color: #ffffff;', 'font-size: var(--sk-text-base);', 'font-size: 14px;']),
      9,
    );
  });
  test('E-34 (d): the "Open project" button minimum block size is one pinned token calc, in header-parts.ts only', async () => {
    const own = 'min-block-size: calc(var(--sk-space-8) + var(--sk-space-1));';
    assert.equal(await pinned(HEADER, [own]), 6);
    assert.equal(await plants(HEADER, own, ['min-block-size: 44px;', 'min-block-size: 2.75rem;', 'min-block-size: calc(var(--sk-space-8) + var(--sk-space-2));', 'min-block-size: calc(40px + 4px);', 'min-block-size: var(--sk-space-8);']), 5);
  });
  test('E-34 (c): the row text size, the bold name and the regular pill are pinned values in row-parts.ts only', async () => {
    const own = ['font-size: var(--sk-text-sm);', 'font-weight: var(--sk-weight-bold);', 'font-weight: var(--sk-weight-normal);'];
    assert.ok((await pinned(ROW, own)) > 0);
    assert.equal(
      await plants(ROW, own.join(' '), ['font-size: var(--sk-text-base);', 'font-size: 14px;', 'font-weight: 700;', 'font-weight: var(--sk-weight-medium);', 'font-weight: bold;', 'line-height: 1.5;', 'color: var(--sk-fg-muted);']),
      7,
    );
  });
  test('E-33 (b) addendum: the panel heading size token is granted in state-parts.ts only', async () => {
    assert.ok((await pinned(STATE, ['font-size: var(--sk-text-lg);'])) > 0);
    assert.equal(await plants(STATE, 'font-size: var(--sk-text-lg);', ['font-size: var(--sk-text-xl);', 'font-size: 18px;', 'font-size: var(--sk-text-sm);']), 3);
  });

  test('E-32: the dialog chrome is pinned value by value, in the dialog file only', async () => {
    const own = [
      'width: min(680px, calc(100vw - 32px));',
      'max-height: min(720px, calc(100vh - 32px));',
      'border: var(--sk-border-width-1) solid var(--sk-border-control);',
      'border-radius: var(--sk-radius-lg);',
      'background: var(--sk-surface-card);',
      'color: var(--sk-fg-body);',
      'box-shadow: 0 24px 80px rgb(0 0 0 / 0.48);',
      'background: rgb(3 6 10 / 0.72);',
      'font-family: var(--sk-font-mono);',
    ];
    assert.ok((await pinned(DIALOG, own, { ...MONO_SHARED(DIALOG), 'border: var(--sk-border-width-1) solid var(--sk-border-control);': [ROW, FOLDERS], 'background: var(--sk-surface-card);': [STATE], 'border-radius: var(--sk-radius-lg);': [STATE] })) > 0);
    assert.equal(
      await plants(DIALOG, own.join(' '), [
        'width: min(700px, calc(100vw - 32px));',
        'width: 680px;',
        'width: min(680px, 100vw);',
        'max-height: min(720px, calc(100vh - 20px));',
        'max-height: 720px;',
        'border: 2px solid var(--sk-border-control);',
        'border: var(--sk-border-width-1) dashed var(--sk-border-control);',
        'border-radius: var(--sk-radius-md);',
        'background: var(--sk-surface-input);',
        'background: rgb(3 6 10 / 0.5);',
        'background: #030a0e;',
        'color: rgb(3 6 10 / 0.72);',
        'box-shadow: 0 24px 80px rgb(0 0 0 / 0.5);',
        'box-shadow: 0 8px 80px rgb(0 0 0 / 0.48);',
        'box-shadow: var(--sk-shadow-md);',
        'font-family: monospace;',
        'border-color: rgb(3 6 10 / 0.72);',
        'backdrop-filter: blur(4px);',
      ]),
      18,
    );
  });
  test('E-32: viewport units and rgb() are not opened up for the rest of the dialog file', async () => {
    let ran = 0;
    for (const css of ['padding: 10vw;', 'margin: 1vh;', 'gap: 4px;', 'min-width: 100vw;', 'height: 100vh;', 'font-size: 14px;']) {
      assert.ok((await problems(DIALOG, css)).length >= 1, css);
      ran += 1;
    }
    assert.equal(ran, 6);
    // And not opened up anywhere else: rgb() and vw/vh are refused by the base rules.
    for (const file of except(DIALOG)) {
      assert.ok((await problems(file, 'background: rgb(3 6 10 / 0.72);')).length >= 1, file);
      assert.ok((await problems(file, 'width: min(680px, calc(100vw - 32px));')).length >= 1, file);
      ran += 2;
    }
    assert.equal(ran, 18);
  });

  test('E-33: the folder option paint is three pinned values, in folder-list-parts.ts only', async () => {
    const own = ['background: var(--sk-surface-pill);', 'color: var(--sk-fg-default);', 'border: var(--sk-border-width-1) solid currentColor;'];
    assert.ok((await pinned(FOLDERS, own)) > 0);
    assert.equal(
      await plants(FOLDERS, own.join(' '), [
        'background: var(--sk-surface-card);',
        'background: #212830;',
        'color: #fff;',
        'border: 2px solid currentColor;',
        'border: var(--sk-border-width-1) dashed currentColor;',
        'box-shadow: var(--sk-shadow-md);',
      ]),
      6,
    );
    // The reset words of any strict property stay allowed (a raw button needs them); a dashed or solid word elsewhere does not.
    assert.deepEqual(await problems(FOLDERS, 'background: transparent; color: inherit;'), []);
    for (const css of ['padding: solid;', 'gap: dashed;']) assert.ok((await problems(FOLDERS, css)).length >= 1, css);
  });

  test('E-33 (c): the option reset and the listbox frame, token values only, in folder-list-parts.ts only', async () => {
    const own = [
      'border: 0;',
      'border-radius: var(--sk-radius-sm);',
      'border-radius: var(--sk-radius-md);',
      'font: inherit;',
      'text-align: start;',
      'color: var(--sk-fg-muted);',
      'background: var(--sk-surface-page);',
      'outline: var(--sk-border-width-2) solid var(--sk-border-focus);',
      'outline-offset: var(--sk-border-width-2);',
    ];
    assert.ok((await pinned(FOLDERS, own, { 'color: var(--sk-fg-muted);': [DIALOG] })) > 0);
    assert.equal(
      await plants(FOLDERS, own.join(' '), [
        'border: 1px solid currentColor;',
        'border: var(--sk-border-width-1) dotted var(--sk-border-default);',
        'border-radius: var(--sk-radius-lg);',
        'border-radius: 4px;',
        'font: 14px Arial;',
        'font-size: var(--sk-text-sm);',
        'text-align: center;',
        'color: var(--sk-fg-subtle);',
        'background: var(--sk-surface-card);',
        'background: #0d0e11;',
        'outline: var(--sk-border-width-1) solid var(--sk-border-focus);',
        'outline: 2px solid red;',
        'outline-offset: 4px;',
        'outline-offset: var(--sk-border-width-1);',
      ]),
      14,
    );
    // The minimum block sizes are token calcs and need no entry; a px or rem literal and `min-block-size` stay refused.
    for (const css of ['min-height: calc(var(--sk-space-9) - var(--sk-border-width-2));', 'min-height: calc(var(--sk-space-10) + var(--sk-space-10) + var(--sk-space-10) + var(--sk-space-6) + var(--sk-space-1));']) {
      assert.deepEqual(await problems(FOLDERS, css), [], css);
    }
    for (const css of ['min-height: 46px;', 'min-height: 2.875rem;', 'min-height: 220px;', 'min-block-size: calc(var(--sk-space-9) - var(--sk-border-width-2));']) {
      assert.ok((await problems(FOLDERS, css)).length >= 1, css);
    }
    // `start` is a text-align word only.
    for (const css of ['padding: start;', 'gap: start;']) assert.ok((await problems(FOLDERS, css)).length >= 1, css);
  });
  test('E-31 (c) extended: the dialog pill gets the outline and the mono face in folder-list-parts.ts, with token padding that needs no entry', async () => {
    const own = 'border: var(--sk-border-width-1) solid var(--sk-on-status-success); font-family: var(--sk-font-mono);';
    assert.deepEqual(await problems(FOLDERS, own), []);
    assert.deepEqual(await problems(FOLDERS, 'padding: var(--sk-space-1) var(--sk-space-2);'), []);
    assert.equal(
      await plants(FOLDERS, own, ['border: 2px solid var(--sk-on-status-success);', 'border: var(--sk-border-width-1) solid red;', 'font-family: monospace;', 'font-family: var(--sk-font-display);', 'padding: 4px 8px;']),
      5,
    );
  });
  test('E-32 (e): the dialog line-heights 1.5 and 1.3 are pinned in the dialog file only', async () => {
    const own = ['line-height: 1.5;', 'line-height: 1.3;'];
    assert.ok((await pinned(DIALOG, own)) > 0);
    assert.equal(await plants(DIALOG, own.join(' '), ['line-height: 1.4;', 'line-height: 20px;', 'line-height: 150%;', 'line-height: 1.5em;', 'padding: 1.5;', 'gap: 1.3;']), 6);
  });
  test('E-31 (d): the pill line-height 1.2 is pinned in row-parts.ts and folder-list-parts.ts only', async () => {
    const own = 'line-height: 1.2;';
    for (const file of [ROW, FOLDERS]) assert.deepEqual(await problems(file, own), [], file);
    // The header file also grants 1.2 (E-34 (c), the h1 line): the same declaration, granted twice, so it is not a leak there.
    assert.deepEqual(await problems(HEADER, own), []);
    let leaks = 0;
    for (const file of except(ROW).filter((f) => f !== FOLDERS && f !== HEADER)) {
      assert.ok((await problems(file, own)).length >= 1, file);
      leaks += 1;
    }
    assert.equal(leaks, 4);
    let plants = 0;
    for (const file of [ROW, FOLDERS]) {
      for (const plant of ['line-height: 1.5;', 'line-height: 1.3;', 'line-height: 1.1;', 'line-height: 17px;', 'line-height: 120%;', 'padding: 1.2;']) {
        assert.ok((await problems(file, plant)).length >= 1, `${file} ${plant}`);
        assert.ok((await problems(file, `${own} ${plant}`)).length >= 1, `${file} own + ${plant}`);
        plants += 1;
      }
    }
    assert.equal(plants, 12);
  });
  test('E-32 (f): the Cancel pill border is one pinned value in the dialog file only', async () => {
    const own = 'border: var(--sk-border-width-1) solid var(--sk-border-default);';
    assert.deepEqual(await problems(DIALOG, own), []);
    assert.deepEqual(await problems(DIALOG, 'min-height: calc(var(--sk-space-8) + var(--sk-space-1)); padding: var(--sk-space-2) var(--sk-space-4); margin-block: 0 var(--sk-space-1);'), []);
    // Granted elsewhere by other rulings: row-parts.ts (E-31 (c) regex), folder-list-parts.ts (same) and state-parts.ts (E-33 (b)); refused in the rest.
    let refused = 0;
    for (const file of [SCREEN, HEADER, OTHER]) {
      assert.ok((await problems(file, own)).length >= 1, file);
      refused += 1;
    }
    assert.equal(refused, 3);
    assert.equal(
      await plants(DIALOG, own, ['border: 2px solid var(--sk-border-default);', 'border: var(--sk-border-width-1) dashed var(--sk-border-default);', 'border: var(--sk-border-width-1) solid var(--sk-border-strong);', 'min-height: 44px;']),
      4,
    );
  });
  test('E-34: the header typography is five properties on header-parts.ts, pinned where the ruling names a value', async () => {
    const own = [
      'font-size: var(--sk-text-2xl);',
      'font-size: var(--sk-text-xs);',
      'font-family: var(--sk-font-mono);',
      'text-transform: uppercase;',
      'letter-spacing: 0.08em;',
      'color: var(--sk-fg-subtle);',
    ];
    assert.ok((await pinned(HEADER, own, { ...MONO_SHARED(HEADER), ...SHARED_E32C })) > 0);
    assert.equal(
      await plants(HEADER, own.join(' '), [
        'font-size: var(--sk-text-3xl);',
        'font-size: 24px;',
        'font-size: 1.5rem;',
        'font-family: monospace;',
        'font-family: var(--sk-font-sans);',
        'text-transform: capitalize;',
        'text-transform: lowercase;',
        'letter-spacing: 0.1em;',
        'letter-spacing: 1px;',
        'letter-spacing: var(--sk-tracking-wide);',
        'color: #fff;',
        'color: rgb(255 255 255);',
        'color: var(--sk-fg-body);',
        'color: var(--sk-fg-strong);',
        'font-weight: var(--sk-weight-bold);',
        'background: var(--sk-surface-card);',
      ]),
      16,
    );
  });
  test('E-34: the 0.08em literal is a letter-spacing value only: em stays refused on every other property', async () => {
    let ran = 0;
    for (const css of ['padding: 0.08em;', 'gap: 0.08em;', 'margin: 0.08em;', 'width: 0.08em;', 'font-size: 0.08em;']) {
      assert.ok((await problems(HEADER, css)).length >= 1, css);
      ran += 1;
    }
    assert.equal(ran, 5);
  });

  test('E-32 (c): the dialog chrome typography, separators and muted text, pinned, in the dialog file only', async () => {
    const own = [
      'font-size: var(--sk-text-xs);',
      'text-transform: uppercase;',
      'letter-spacing: 0.08em;',
      'color: var(--sk-fg-subtle);',
      'color: var(--sk-fg-muted);',
      'border-block-end: var(--sk-border-width-1) solid var(--sk-border-default);',
      'border-block-start: var(--sk-border-width-1) solid var(--sk-border-default);',
    ];
    const shared = {
      'color: var(--sk-fg-muted);': [FOLDERS],
      'font-size: var(--sk-text-xs);': [HEADER],
      'text-transform: uppercase;': [HEADER],
      'letter-spacing: 0.08em;': [HEADER],
      'color: var(--sk-fg-subtle);': [HEADER],
      'border-block-end: var(--sk-border-width-1) solid var(--sk-border-default);': [HEADER],
    };
    assert.ok((await pinned(DIALOG, own, shared)) > 0);
    assert.equal(
      await plants(DIALOG, own.join(' '), [
        'font-size: var(--sk-text-2xl);',
        'font-size: 12px;',
        'text-transform: capitalize;',
        'letter-spacing: 0.1em;',
        'letter-spacing: 1px;',
        'color: var(--sk-fg-default);',
        'color: #888;',
        'border-block-end: 2px solid var(--sk-border-default);',
        'border-block-end: var(--sk-border-width-1) dashed var(--sk-border-default);',
        'border-block-end: var(--sk-border-width-1) solid var(--sk-border-control);',
        'border-block-start: var(--sk-border-width-1) solid var(--sk-border-control);',
        'border-inline-start: var(--sk-border-width-1) solid var(--sk-border-default);',
      ]),
      12,
    );
  });
  test('E-32 (d): the dialog type scale (base 14px, 18px display title, 600 label) is pinned, in the dialog file only', async () => {
    const own = [
      'font-size: var(--sk-text-sm);',
      'font-size: var(--sk-text-lg);',
      'font-family: var(--sk-font-display);',
      'font-weight: var(--sk-weight-semibold);',
    ];
    const shared = { 'font-family: var(--sk-font-display);': [STATE] };
    assert.ok((await pinned(DIALOG, own, shared)) > 0);
    assert.equal(
      await plants(DIALOG, own.join(' '), [
        'font-size: var(--sk-text-base);',
        'font-size: var(--sk-text-2xl);',
        'font-size: 14px;',
        'font-size: 18px;',
        'font-family: var(--sk-font-sans);',
        'font-family: Arial;',
        'font-weight: var(--sk-weight-bold);',
        'font-weight: 600;',
        'font-weight: bold;',
        'line-height: var(--sk-leading-normal);',
      ]),
      10,
    );
  });
  test('E-34 (b): the header band border is one pinned value in header-parts.ts only; the 76px minimum is a token calc that needs no entry', async () => {
    const border = 'border-block-end: var(--sk-border-width-1) solid var(--sk-border-default);';
    assert.ok((await pinned(HEADER, [border], { [border]: [DIALOG] })) > 0);
    assert.equal(
      await plants(HEADER, border, [
        'border-block-end: 2px solid var(--sk-border-default);',
        'border-block-end: var(--sk-border-width-1) dashed var(--sk-border-default);',
        'border-block-end: var(--sk-border-width-1) solid var(--sk-border-control);',
        'border-block-start: var(--sk-border-width-1) solid var(--sk-border-default);',
      ]),
      4,
    );
    // The probe: `min-height` with a calc of two space tokens (64px + 12px = 76px) is already lint-clean everywhere; `min-block-size`
    // is not an allowed property, and a px or rem literal is refused, so no entry was added.
    const calc = 'min-height: calc(var(--sk-space-10) + var(--sk-space-3));';
    let clean = 0;
    for (const file of ALL) {
      assert.deepEqual(await problems(file, calc), [], file);
      clean += 1;
    }
    assert.equal(clean, 7);
    for (const css of ['min-height: 76px;', 'min-height: 4.75rem;', 'min-block-size: calc(var(--sk-space-10) + var(--sk-space-3));', 'min-block-size: 76px;']) {
      assert.ok((await problems(HEADER, css)).length >= 1, css);
    }
  });
  test('E-33 (b): the whole-list state panel mirrors the Missions screen panel (E-13), pinned, in state-parts.ts only', async () => {
    const own = [
      'background: var(--sk-surface-card);',
      'border: var(--sk-border-width-1) dashed var(--sk-border-control);',
      'border: var(--sk-border-width-1) solid var(--sk-border-default);',
      'border-radius: var(--sk-radius-lg);',
      'font-weight: var(--sk-weight-bold);',
      'font-family: var(--sk-font-display);',
    ];
    const shared = { 'font-family: var(--sk-font-display);': [DIALOG], 'background: var(--sk-surface-card);': [DIALOG], 'border-radius: var(--sk-radius-lg);': [DIALOG], 'border: var(--sk-border-width-1) solid var(--sk-border-default);': [ROW, FOLDERS, DIALOG] };
    assert.ok((await pinned(STATE, own, shared)) > 0);
    assert.deepEqual(await problems(STATE, 'padding-inline: var(--sk-space-9);'), []);
    assert.equal(
      await plants(STATE, own.join(' '), [
        'background: var(--sk-surface-input);',
        'border: var(--sk-border-width-1) dashed var(--sk-border-default);',
        'border: var(--sk-border-width-1) solid var(--sk-border-control);',
        'border: var(--sk-border-width-1) dotted var(--sk-border-control);',
        'border: 2px dashed var(--sk-border-control);',
        'border-radius: var(--sk-radius-md);',
        'font-weight: var(--sk-weight-semibold);',
        'font-family: var(--sk-font-mono);',
        'padding-inline: 48px;',
        'color: dashed;',
        'letter-spacing: 0.08em;',
      ]),
      11,
    );
  });

  test('narrow column (DP-22): max-inline-size has no lint-clean form, so ONE pinned grant exists: width min(900px, 100%) in the screen file', async () => {
    // The probe: every max-inline-size spelling (and its token calc) is refused in the screen file, so the pinned grant is needed.
    let probed = 0;
    for (const css of ['max-inline-size: 900px;', 'max-inline-size: 56.25rem;', 'max-inline-size: min(900px, 100%);', 'max-inline-size: calc(var(--sk-layout-context-sidebar-width) * 3.75);', 'max-width: 56.25rem;']) {
      assert.ok((await problems(SCREEN, css)).length >= 1, css);
      probed += 1;
    }
    assert.equal(probed, 5);
    assert.equal(await pinned(SCREEN, ['width: min(900px, 100%);']), 6);
    assert.equal(
      await plants(SCREEN, 'width: min(900px, 100%);', ['width: min(901px, 100%);', 'width: min(900px, 90%);', 'width: 900px;', 'max-width: 900px;', 'inline-size: min(900px, 100%);', 'min-width: 900px;', 'padding: 900px;']),
      7,
    );
  });
  test('the container query lengths of the screen need no exception (the 800px and 620px thresholds pass everywhere)', async () => {
    const code = "import { css } from 'lit';\nexport const s = css`\n  @container (max-width: 800px) { .x { display: block; } }\n  @container (max-width: 620px) { .x { display: block; } }\n`;\n";
    let ran = 0;
    for (const file of ALL) {
      const result = await stylelint.lint({ code, codeFilename: join(root, file), config, configBasedir: root });
      assert.deepEqual(result.results.flatMap((r) => r.warnings), [], file);
      ran += 1;
    }
    assert.equal(ran, 7);
  });
});

// E-33 (ESLint half): the raw `<button type="button" role="option">` of the folder listbox, in folder-list-parts.ts only.
// The only class= grant is the sk-progress prefix of the row and state parts (WP06 ruling); every other file keeps the ban.
describe('Projects screen: E-33 raw option button and the class= ban, with leak plants', () => {
  const eslint = new ESLint({ cwd: root });
  const lint = async (file, markup) => {
    const code = `import { html } from 'lit';\nexport const t = html\`${markup}\`;\n`;
    const [result] = await eslint.lintText(code, { filePath: join(root, file) });
    return (result?.messages ?? []).filter((m) => m.ruleId === 'no-restricted-syntax').map((m) => m.message);
  };
  const FOLDERS = `${EL}/sk-open-project-dialog/folder-list-parts.ts`;
  const OTHERS = [
    `${EL}/sk-projects-screen/sk-projects-screen.ts`,
    `${EL}/sk-projects-screen/header-parts.ts`,
    `${EL}/sk-projects-screen/row-parts.ts`,
    `${EL}/sk-projects-screen/state-parts.ts`,
    `${EL}/sk-open-project-dialog/sk-open-project-dialog.ts`,
  ];
  const OPTION = '<button type="button" role="option" aria-selected="false">x</button>';

  test('the option button passes in folder-list-parts.ts and is refused in every other file of both elements', async () => {
    assert.deepEqual(await lint(FOLDERS, OPTION), []);
    let ran = 0;
    for (const file of OTHERS) {
      assert.ok((await lint(file, OPTION)).some((m) => /Raw <button>/.test(m)), file);
      ran += 1;
    }
    assert.equal(ran, 5);
  });
  test('plants: any other raw control, or a button with other attributes first, is refused in folder-list-parts.ts', async () => {
    let ran = 0;
    for (const markup of [
      '<button>x</button>',
      '<button type="button">x</button>',
      '<button type="submit" role="option">x</button>',
      '<button role="option" type="button">x</button>',
      '<button type="button" role="tab">x</button>',
      '<input type="text">',
      '<select></select>',
      '<textarea></textarea>',
    ]) {
      assert.ok((await lint(FOLDERS, markup)).some((m) => /raw|Raw/.test(m)), markup);
      ran += 1;
    }
    assert.equal(ran, 8);
  });
  test('class= is forbidden in every file of both elements except the sk-progress classes of the row and state parts (WP06 ruling)', async () => {
    const GRANTED = [`${EL}/sk-projects-screen/row-parts.ts`, `${EL}/sk-projects-screen/state-parts.ts`];
    let ran = 0;
    for (const file of [FOLDERS, ...OTHERS]) {
      const refused = (await lint(file, '<div class="sk-empty-state"></div>')).some((m) => /class= is only allowed|class= is forbidden/.test(m));
      assert.ok(refused, file);
      if (!GRANTED.includes(file)) assert.ok((await lint(file, '<div class="sk-progress"></div>')).some((m) => /class= is forbidden/.test(m)), `${file} sk-progress leak`);
      ran += 1;
    }
    assert.equal(ran, 6);
  });
  test('the sk-progress classes pass in row-parts.ts and state-parts.ts only, and only the progress family (plants)', async () => {
    let ran = 0;
    for (const file of [`${EL}/sk-projects-screen/row-parts.ts`, `${EL}/sk-projects-screen/state-parts.ts`]) {
      assert.deepEqual(await lint(file, '<div class="sk-progress sk-progress--indeterminate sk-progress--compact"><progress class="sk-progress__bar"></progress></div>'), [], file);
      for (const plant of ['<div class="sk-empty-state"></div>', '<div class="sk-progress other"></div>', '<div class="x sk-progress"></div>', '<div class="${y}"></div>', '<div class="sk-progressive"></div>', '<div class="sk-progressx"></div>', '<div class="sk-notice"></div>']) {
        assert.ok((await lint(file, plant)).length >= 1, `${file} ${plant}`);
        ran += 1;
      }
    }
    assert.equal(ran, 14);
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

// ---------------------------------------------------------------------------------------------------------------------
// The Drift screen (mission-ui#10), CP-1 confirmed 2026-10-10: E-35, E-36, E-37 (reused for the fidelity grants G-1 to G-8 and
// the pinned 44 px button height), E-38 (re-scoped), E-39 and the E-18 extension. One row is ONE declaration with the exact set
// of files that may carry it. The matrix test proves the whole table in both directions (the declaration passes in exactly the
// files of its row and fails in every other file of the screen, in the Missions and Work Package files and in a file outside
// the directory), and the value plants of a row are refused in every file that carries the declaration.
// ---------------------------------------------------------------------------------------------------------------------
const DRIFT_DIR = `${EL}/sk-drift-screen`;
const DF = {
  screen: `${DRIFT_DIR}/sk-drift-screen.ts`,
  header: `${DRIFT_DIR}/header-parts.ts`,
  list: `${DRIFT_DIR}/list-parts.ts`,
  state: `${DRIFT_DIR}/state-parts.ts`,
  detail: `${DRIFT_DIR}/detail-parts.ts`,
  table: `${DRIFT_DIR}/table-parts.ts`,
  resolution: `${DRIFT_DIR}/resolution-parts.ts`,
  panel: `${DRIFT_DIR}/panel-parts.ts`,
};
const DRIFT_KEYS = Object.keys(DF);
// Two files outside the directory, neither under any exception, that must never gain a Drift grant.
const OUTSIDE = [OTHER, `${EL}/sk-work-package-screen/state-parts.ts`];

// [grant, declaration, the files that carry it, value plants refused in each of those files (unless that file grants the plant itself)]
const DRIFT_ROWS = [
  ['E-35', 'grid-template-columns: 420px minmax(0, 1fr);', ['screen'], ['grid-template-columns: 421px minmax(0, 1fr);', 'grid-template-columns: 420px 1fr;', 'grid-template-columns: 420px;', 'grid-template-columns: minmax(420px, 1fr) minmax(0, 1fr);', 'grid-template-columns: 420px minmax(0, 1fr) 8px;', 'inline-size: 420px;', 'width: 420px;', 'min-inline-size: 420px;', 'flex-basis: 420px;']],
  ['E-35', 'border-inline-end: var(--sk-border-width-1) solid var(--sk-border-default);', ['screen'], ['border-inline-end: 1px solid var(--sk-border-default);', 'border-inline-end: var(--sk-border-width-1) dashed var(--sk-border-default);', 'border-inline-end: var(--sk-border-width-1) solid #2b313b;', 'border-inline-end: var(--sk-border-width-1) solid red;', 'border-inline-start: var(--sk-border-width-1) solid var(--sk-border-default);']],
  ['E-35', 'border-inline-end: 0;', ['screen'], ['border-inline-end: 1px;', 'border-inline-end: none;']],
  ['E-36', 'border: 0;', ['list'], ['border: 1px;']],
  ['E-36', 'background: transparent;', ['list'], ['background: red;', 'background: #123456;']],
  ['E-36', 'background: var(--sk-surface-pill);', ['list'], ['background: #123456;', 'background: none;']],
  ['E-36', 'background: var(--sk-surface-card);', ['list'], ['background: rgb(1 2 3);']],
  ['E-36', 'color: inherit;', ['list'], ['color: red;', 'color: initial;']],
  ['E-36', 'font: inherit;', ['list'], ['font: 14px serif;', 'font: initial;']],
  ['E-36 / E-37 Mission link', 'text-align: start;', ['list', 'detail'], ['text-align: center;', 'text-align: left;', 'text-align: right;', 'text-align: end;']],
  ['E-36', 'inline-size: 100%;', ['list'], ['inline-size: 50%;', 'inline-size: 300px;', 'width: 100%;', 'max-width: 100%;']],
  ['E-36 / G-5', 'border-block-end: var(--sk-border-width-1) solid var(--sk-border-default);', ['list', 'header'], ['border-block-end: 1px solid var(--sk-border-default);', 'border-block-end: var(--sk-border-width-1) dotted var(--sk-border-default);', 'border-block-end: var(--sk-border-width-1) solid red;', 'border-block-start: var(--sk-border-width-1) solid var(--sk-border-default);']],
  ['E-36', 'border-inline-start: var(--sk-border-width-2) solid transparent;', ['list'], ['border-inline-start: 2px solid transparent;', 'border-inline-start: var(--sk-border-width-2) dashed transparent;', 'border-inline-start: var(--sk-border-width-2) solid red;']],
  ['E-36', 'border-inline-start-color: var(--sk-border-selected);', ['list'], ['border-inline-start-color: red;', 'border-inline-start-color: #fff;', 'border-inline-end-color: var(--sk-border-selected);']],
  ['E-36', 'border-inline-start-color: Highlight;', ['list'], ['border-inline-start-color: HighlightText;', 'border-inline-start-color: Canvas;', 'border-inline-start-color: blue;']],
  ['E-37 G-1 / G-7', 'font-size: var(--sk-text-sm);', ['screen', 'header', 'detail', 'resolution'], ['font-size: 14px;', 'font-size: 0.875rem;', 'font-size: var(--sk-text-3xl);', 'font-size: var(--sk-text-base);']],
  ['E-37 G-1', 'line-height: 1.5;', ['screen'], ['line-height: 1.4;', 'line-height: 1.6;', 'line-height: 24px;', 'line-height: 150%;', 'line-height: var(--sk-leading-normal);']],
  ['E-37 G-2 / G-3 / G-4 / G-5 / G-6 / table', 'font-family: var(--sk-font-mono);', ['header', 'list', 'detail', 'table', 'resolution', 'panel'], ['font-family: var(--sk-font-sans);', 'font-family: monospace;', 'font-family: serif;']],
  ['E-37 G-2 / review addendum', 'color: var(--sk-fg-muted);', ['header', 'list', 'detail', 'resolution'], ['color: red;', 'color: #999;', 'color: var(--sk-fg-on-accent);']],
  ['E-37 review addendum / table cells', 'color: var(--sk-fg-body);', ['header', 'table', 'resolution'], ['color: #ddd;', 'color: var(--sk-fg-on-accent);', 'color: rgb(214 214 218);']],
  ['E-37 review addendum', 'min-block-size: 1.5em;', ['resolution'], ['min-block-size: 1.4em;', 'min-block-size: 2em;', 'min-block-size: 1.5rem;', 'min-block-size: 24px;', 'min-block-size: 1.50em;', 'min-height: 1.5em;', 'block-size: 1.5em;']],
  ['E-37 G-3', 'font-size: var(--sk-text-xs);', ['list', 'detail', 'table', 'resolution', 'panel'], ['font-size: 12px;', 'font-size: 0.75rem;']],
  ['E-37 G-3', 'font-weight: var(--sk-weight-semibold);', ['header', 'list', 'detail', 'resolution', 'panel'], ['font-weight: 600;', 'font-weight: var(--sk-weight-medium);']],
  ['E-37 G-3', 'letter-spacing: 0.08em;', ['list', 'detail', 'resolution', 'panel'], ['letter-spacing: 0.1em;', 'letter-spacing: 1px;', 'letter-spacing: 0.080em;', 'letter-spacing: 0.08rem;']],
  ['E-37 G-3 / table', 'text-transform: uppercase;', ['list', 'detail', 'table', 'resolution', 'panel'], ['text-transform: capitalize;', 'text-transform: lowercase;', 'text-transform: none;']],
  ['E-37 G-3 / table', 'color: var(--sk-fg-subtle);', ['list', 'detail', 'table', 'resolution', 'panel'], ['color: red;', 'color: #888;', 'color: var(--sk-fg-on-accent);']],
  ['E-37 table', 'letter-spacing: 0.06em;', ['table'], ['letter-spacing: 0.08em;', 'letter-spacing: 0.05em;', 'letter-spacing: 1px;', 'letter-spacing: 0.060em;']],
  ['E-37 G-4 / G-8', 'font-weight: var(--sk-weight-normal);', ['list', 'detail'], ['font-weight: 400;', 'font-weight: var(--sk-weight-medium);']],
  ['E-37 G-4', 'border: var(--sk-border-width-1) solid currentColor;', ['list'], ['border: 1px solid currentColor;', 'border: var(--sk-border-width-1) dashed currentColor;', 'border: var(--sk-border-width-1) solid red;', 'border: var(--sk-border-width-2) solid currentColor;', 'border-style: solid;']],
  ['E-37 G-4 / G-5', 'line-height: 1.2;', ['header', 'list'], ['line-height: 1.1;', 'line-height: 1.20;', 'line-height: 1.25;']],
  ['E-37 G-5 / G-6', 'font-family: var(--sk-font-display);', ['header', 'detail'], ['font-family: serif;', 'font-family: var(--sk-font-mono-display);']],
  ['E-37 G-5', 'font-size: var(--sk-text-2xl);', ['header'], ['font-size: 24px;', 'font-size: 1.5rem;']],
  ['E-37 G-5', 'letter-spacing: -0.01em;', ['header'], ['letter-spacing: 0.01em;', 'letter-spacing: -0.02em;', 'letter-spacing: -1px;', 'letter-spacing: -0.010em;']],
  ['E-37 G-5 / G-6', 'color: var(--sk-fg-default);', ['header', 'detail'], ['color: red;', 'color: #fff;']],
  ['E-37 G-6', 'font-size: var(--sk-text-lg);', ['detail'], ['font-size: 18px;']],
  ['E-37 G-6', 'font-weight: var(--sk-weight-bold);', ['detail'], ['font-weight: 700;', 'font-weight: bold;']],
  ['E-37 G-6', 'line-height: 1.3;', ['detail'], ['line-height: 1.30;', 'line-height: 1.35;']],
  // F-3: `min-block-size` is the form the config accepts (the E-10 precedent). `min-height`, the rem form and a neighbouring px are refused.
  ['E-37 F-3', 'min-block-size: 44px;', ['header', 'resolution'], ['min-block-size: 43px;', 'min-block-size: 45px;', 'min-block-size: 2.75rem;', 'min-block-size: 48px;', 'min-height: 44px;', 'block-size: 44px;', 'height: 44px;', 'min-inline-size: 44px;']],
  ['E-37 G-9', 'padding-inline-start: var(--sk-space-7);', ['header'], ['padding-inline-start: var(--sk-space-6);', 'padding-inline-start: var(--sk-space-8);', 'padding-inline-start: 32px;', 'padding-inline-start: 2rem;', 'padding-left: var(--sk-space-7);']],
  // G-10: the authority pill wraps. The keyword is granted in detail-parts.ts only; every other white-space word is refused there.
  ['E-37 G-10', 'white-space: normal;', ['detail'], ['white-space: nowrap;', 'white-space: pre;', 'white-space: pre-wrap;', 'white-space: break-spaces;', 'white-space: pre-line;']],
  ['E-38', 'border: var(--sk-border-width-1) solid var(--sk-border-default);', ['resolution'], ['border: 1px solid var(--sk-border-default);', 'border: var(--sk-border-width-1) dashed var(--sk-border-default);', 'border: var(--sk-border-width-1) solid red;', 'border: var(--sk-border-width-2) solid var(--sk-border-default);']],
  ['E-38 / E-18 extension', 'border-radius: var(--sk-radius-md);', ['resolution', 'panel'], ['border-radius: 12px;', 'border-radius: var(--sk-radius-lg);', 'border-radius: var(--sk-radius-pill);']],
  ['E-38', 'background: var(--sk-surface-muted);', ['resolution'], ['background: #262c36;', 'background: red;']],
  ['E-39 / E-38', 'overflow-wrap: anywhere;', ['header', 'list', 'resolution', 'detail'], ['overflow-wrap: break-word;', 'overflow-wrap: normal;', 'overflow-wrap: foo;', 'word-break: break-all;', 'text-overflow: ellipsis;', 'white-space: nowrap;', 'hyphens: auto;']],
  ['E-18 extension', 'border-width: var(--sk-border-width-1);', ['panel'], ['border-width: 1px;', 'border-width: var(--sk-border-width-2);', 'border-style: dashed;']],
];
// Layout properties already allowed in every file; the extension only PINS their token in panel-parts.ts.
const DRIFT_PINNED_LAYOUT = [
  ['E-18 extension', 'padding: var(--sk-space-5);', ['padding: var(--sk-space-7);', 'padding: 20px;', 'padding: var(--sk-space-4);']],
  ['E-18 extension', 'margin-block: 0;', ['margin-block: 0 var(--sk-space-2);', 'margin-block: var(--sk-space-4);', 'margin-block: 0 var(--sk-space-4);', 'margin-block: 0 16px;']],
  ['E-18 extension', 'row-gap: 0;', ['row-gap: var(--sk-space-2);', 'row-gap: 8px;']],
];
// What no Drift file may ever carry: not granted anywhere.
const DRIFT_NEVER = ['box-shadow: var(--sk-shadow-md);', 'opacity: 0.5;', 'outline-width: var(--sk-border-width-2);', 'background-image: linear-gradient(to right, var(--sk-surface-hero), transparent);', 'font-style: italic;', 'text-overflow: ellipsis;', 'word-break: break-all;', 'cursor: pointer;'];

const carries = (key, css) => DRIFT_ROWS.some(([, decl, files]) => decl === css && files.includes(key));
const declsOf = (key) => DRIFT_ROWS.filter(([, , files]) => files.includes(key)).map(([, decl]) => decl);
const uniqueDecls = [...new Set(DRIFT_ROWS.map(([, decl]) => decl))];

describe('Drift exceptions (E-35 to E-39, the E-37 grants, the E-18 extension): the matrix, in both directions', () => {
  test('the table has the expected shape', () => {
    assert.equal(DRIFT_KEYS.length, 8);
    assert.equal(DRIFT_ROWS.length, 45);
    assert.equal(uniqueDecls.length, 45);
    assert.equal(DRIFT_PINNED_LAYOUT.length, 3);
    // a declaration repeated in two rows names the same files only through the union: the rows of one declaration agree
    for (const decl of uniqueDecls) {
      const sets = DRIFT_ROWS.filter(([, d]) => d === decl).map(([, , files]) => files.join(','));
      assert.equal(new Set(sets).size, 1, decl);
    }
  });

  test('every declaration passes in exactly the files of its row, and fails in every other file of the screen and outside it', async () => {
    let passed = 0;
    let refused = 0;
    for (const decl of uniqueDecls) {
      for (const key of DRIFT_KEYS) {
        const found = await problems(DF[key], decl);
        if (carries(key, decl)) {
          assert.deepEqual(found, [], `${decl} must pass in ${key}`);
          passed += 1;
        } else {
          assert.ok(found.length >= 1, `${decl} leaked into ${key}`);
          refused += 1;
        }
      }
      for (const file of OUTSIDE) {
        assert.ok((await problems(file, decl)).length >= 1, `${decl} leaked into ${file}`);
        refused += 1;
      }
    }
    const expectedPassed = DRIFT_ROWS.reduce((n, [, decl, files], i) => (DRIFT_ROWS.findIndex(([, d]) => d === decl) === i ? n + files.length : n), 0);
    assert.equal(passed, expectedPassed);
    assert.equal(refused, uniqueDecls.length * (DRIFT_KEYS.length + OUTSIDE.length) - expectedPassed);
  });

  test('value plants are refused in every file that carries the declaration (a plant another grant makes legal in that file is skipped and proven legal)', async () => {
    let refused = 0;
    let legal = 0;
    let expected = 0;
    for (const [, decl, files, plants] of DRIFT_ROWS) {
      for (const key of files) {
        for (const plant of plants) {
          expected += 1;
          if (carries(key, plant)) {
            assert.deepEqual(await problems(DF[key], plant), [], `${plant} is legal in ${key}`);
            legal += 1;
          } else {
            assert.ok((await problems(DF[key], plant)).length >= 1, `${plant} passed in ${key} (plant of ${decl})`);
            refused += 1;
          }
        }
      }
    }
    assert.equal(refused + legal, expected);
    assert.equal(legal, 0);
    assert.equal(refused, 295);
  });

  test('all the declarations of one file pass together, and a never-granted property fails beside them', async () => {
    let ran = 0;
    for (const key of DRIFT_KEYS) {
      const all = declsOf(key);
      if (all.length === 0) {
        assert.equal(key, 'state');
        continue;
      }
      assert.deepEqual(await problems(DF[key], all.join(' ')), [], `${key} together`);
      for (const never of DRIFT_NEVER) {
        assert.ok((await problems(DF[key], `${all.join(' ')} ${never}`)).length >= 1, `${key} ${never}`);
        ran += 1;
      }
    }
    assert.equal(ran, 7 * DRIFT_NEVER.length);
  });

  test('state-parts.ts carries no grant: every declaration of the table fails there and a layout-only rule passes (positive control)', async () => {
    assert.deepEqual(await problems(DF.state, 'display: grid; gap: var(--sk-space-4); padding: var(--sk-space-5);'), []);
    let ran = 0;
    for (const decl of uniqueDecls) {
      assert.ok((await problems(DF.state, decl)).length >= 1, decl);
      ran += 1;
    }
    assert.equal(ran, 45);
  });

  test('the E-18 extension pins three layout tokens in panel-parts.ts only: other values fail there and pass in the siblings (positive control)', async () => {
    let pinned = 0;
    for (const [, decl, plants] of DRIFT_PINNED_LAYOUT) {
      assert.deepEqual(await problems(DF.panel, decl), [], decl);
      for (const key of DRIFT_KEYS.filter((k) => k !== 'panel')) assert.deepEqual(await problems(DF[key], decl), [], `${key} ${decl}`);
      for (const plant of plants) {
        assert.ok((await problems(DF.panel, plant)).length >= 1, plant);
        pinned += 1;
      }
    }
    assert.equal(pinned, 9);
    // the sibling accepts a different token (the token is only pinned in panel-parts.ts)
    assert.deepEqual(await problems(DF.header, 'padding: var(--sk-space-7);'), []);
    // the Work Package panel's own five (E-18) are not widened: its title size still passes there and not in the Drift panel
    assert.deepEqual(await problems(`${EL}/sk-work-package-screen/panel-parts.ts`, 'font-size: var(--sk-text-lg); font-weight: var(--sk-weight-bold);'), []);
    assert.ok((await problems(DF.panel, 'font-size: var(--sk-text-lg);')).length >= 1);
    assert.ok((await problems(DF.panel, 'font-weight: var(--sk-weight-bold);')).length >= 1);
  });

  test('the container queries and the shell-mobile state need no exception (probe, as E-19 (a))', async () => {
    const code = "import { css } from 'lit';\nexport const s = css`\n  @container (max-width: 799px) { .x { grid-template-columns: minmax(0, 1fr); } }\n  :host(:state(shell-mobile)) .x { grid-template-columns: minmax(0, 1fr); }\n`;\n";
    for (const key of DRIFT_KEYS) {
      const result = await stylelint.lint({ code, codeFilename: join(root, DF[key]), config, configBasedir: root });
      assert.deepEqual(result.results.flatMap((r) => r.warnings), [], key);
    }
  });

  test('the existing exceptions are untouched: the board, pipeline and Work Package files gain nothing from a Drift grant', async () => {
    // the E-09 pinned tracking still passes in its two files and the new 0.06em / -0.01em values do not
    for (const file of [`${EL}/sk-work-package-board/sk-work-package-board.ts`, `${EL}/sk-pipeline-screen/pipeline-parts.ts`]) {
      assert.deepEqual(await problems(file, 'letter-spacing: 0.08em;'), [], file);
      for (const css of ['letter-spacing: 0.06em;', 'letter-spacing: -0.01em;']) assert.ok((await problems(file, css)).length >= 1, `${file} ${css}`);
    }
  });
});

// ESLint: E-36 (the raw option button) and the class= rows of the adopted families, per file, with leak plants.
describe('Drift ESLint overrides: E-36 raw option button, and class= per adopted family', () => {
  const eslint = new ESLint({ cwd: root });
  const lintTemplate = async (file, markup) => {
    const code = `import { html } from 'lit';\nexport const t = html\`${markup}\`;\n`;
    const [result] = await eslint.lintText(code, { filePath: join(root, file) });
    return (result?.messages ?? []).filter((m) => m.ruleId === 'no-restricted-syntax').map((m) => m.message);
  };
  const OPTION = '<button type="button" role="option" aria-selected="true" tabindex="0">x</button>';

  test('the raw option button passes in list-parts.ts only', async () => {
    assert.deepEqual(await lintTemplate(DF.list, OPTION), []);
    let ran = 0;
    for (const key of DRIFT_KEYS.filter((k) => k !== 'list')) {
      assert.ok((await lintTemplate(DF[key], OPTION)).some((m) => /Raw <button>/.test(m)), key);
      ran += 1;
    }
    for (const file of [`${EL}/sk-work-package-screen/state-parts.ts`, `${EL}/sk-pipeline-screen/pipeline-parts.ts`, `${EL}/sk-filter-toggle-group/sk-filter-toggle-group.ts`]) {
      assert.ok((await lintTemplate(file, OPTION)).length >= 1, file);
      ran += 1;
    }
    assert.equal(ran, 10);
  });

  test('in list-parts.ts only the option button is raw: other buttons, inputs, selects and a different role are refused', async () => {
    let ran = 0;
    for (const markup of [
      '<button type="button">x</button>',
      '<button type="submit" role="option">x</button>',
      '<button role="option" type="button">x</button>',
      '<button type="button" role="tab">x</button>',
      '<button type="button" role="option" class="x">x</button>',
      '<input type="text">',
      '<select></select>',
      '<textarea></textarea>',
    ]) {
      assert.ok((await lintTemplate(DF.list, markup)).length >= 1, markup);
      ran += 1;
    }
    assert.equal(ran, 8);
    assert.ok((await lintTemplate(DF.list, '<div class="plain"></div>')).some((m) => /class= is forbidden/.test(m)));
    assert.ok((await lintTemplate(DF.list, '<div style="color: red"></div>')).some((m) => /Inline style/.test(m)));
  });

  // file key, the prefixes its row grants
  const CLASS_ROWS = [
    ['table', ['sk-data-table']],
    ['detail', ['sk-facts']],
    ['state', ['sk-empty-state', 'sk-progress']],
  ];
  const ALL_PREFIXES = ['sk-data-table', 'sk-facts', 'sk-empty-state', 'sk-progress'];
  test('a granted prefix passes in its own file, and the leak plants are refused', async () => {
    let granted = 0;
    let leaked = 0;
    for (const [key, prefixes] of CLASS_ROWS) {
      for (const prefix of prefixes) {
        assert.deepEqual(await lintTemplate(DF[key], `<div class="${prefix}__part ${prefix}"></div>`), [], `${key} ${prefix}`);
        granted += 1;
      }
      assert.ok((await lintTemplate(DF[key], '<div class="plain-class"></div>')).length >= 1, `${key} plain`);
      assert.ok((await lintTemplate(DF[key], `<div class="${prefixes[0]} plain-class"></div>`)).length >= 1, `${key} mixed`);
      for (const other of ALL_PREFIXES.filter((p) => !prefixes.includes(p))) {
        assert.ok((await lintTemplate(DF[key], `<div class="${other}"></div>`)).length >= 1, `${key} ${other}`);
        leaked += 1;
      }
    }
    assert.equal(granted, 4);
    assert.equal(leaked, 3 + 3 + 2);
  });

  test('the other Drift files carry no class at all, whatever the prefix', async () => {
    let ran = 0;
    for (const key of ['screen', 'header', 'list', 'resolution', 'panel']) {
      for (const prefix of ALL_PREFIXES) {
        assert.ok((await lintTemplate(DF[key], `<div class="${prefix}"></div>`)).some((m) => /class= is forbidden/.test(m)), `${key} ${prefix}`);
        ran += 1;
      }
    }
    assert.equal(ran, 20);
  });
});
