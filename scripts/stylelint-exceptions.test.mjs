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
  const UNLISTED = ['files-parts.ts', 'review-parts.ts', 'chain-parts.ts', 'panel-parts.ts'];
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
    assert.equal(ran, 20);
  });
  test('there is no sk-breadcrumbs row for state-parts.ts', async () => {
    assert.ok((await lintClass('state-parts.ts', 'sk-breadcrumbs')).length >= 1);
    assert.deepEqual(await lintClass('header-parts.ts', 'sk-breadcrumbs'), []);
  });
});
