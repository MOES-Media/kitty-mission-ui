// Scope proofs for the Stylelint exception blocks E-04, E-08 to E-16 (E-13: one half per screen file), E-18 (narrowed) and
// E-19 (b), and the ESLint `class=` overrides of E-17 with their leak plants.
// Each exception is proven three ways: its allowed CSS passes in its named files only (leak check), anything
// beyond the exception fails inside its named files, and `min-inline-size` is allowed only in E-10's file.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import stylelint from 'stylelint';
import { ESLint } from 'eslint';
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
