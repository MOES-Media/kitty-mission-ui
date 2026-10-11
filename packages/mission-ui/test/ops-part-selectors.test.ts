// The Ops screen's selector scoping, which Stylelint cannot express (it scopes by file, not by selector). Three rules:
//  (a) E-40 badge clause: a `::part` rule in sk-ops-screen/*.ts exists only under the badge data attribute in ops-row-parts.ts, and
//      in ops-page-parts.ts for exactly three selectors (Ops G-3 and the 588 px stack): the `tag` part of the badge pills (the "Read only" and
//      count pills), and the layout-only `action` and `header` parts of the section header (the alignment of the count pill; the stack).
//  (c) Ops G-3 properties: in ops-page-parts.ts the five granted properties (border, font-family, font-weight, font-variant-numeric,
//      line-height) appear only in the rule whose selector is exactly the badge `::part(tag)`; the `::part(action)` rule holds only grid-row and justify-self, and the `::part(header)` rule only grid-template-columns and grid-template-areas.
//  (b) E-43: `overflow-wrap: anywhere` exists only in ops-row-parts.ts, under the id or the evidence data attribute.
// The attribute names are PINNED here: WP05's row template must carry exactly these, and a rename needs a ruling first.
import { describe, expect, it } from 'vitest';

type Glob = (pattern: string, options: { query: string; import: string; eager: boolean }) => Record<string, string>;
const sources = (import.meta as unknown as { glob: Glob }).glob('../src/elements/sk-ops-screen/*.ts', { query: '?raw', import: 'default', eager: true });

/** The data attributes of the Ops row (WP05 renders them; the rules below key on them). */
const OPS_BADGE_ATTR = 'data-ops-badge';
/** BOUNDARY-005: the page pills have their own attribute, so that the row badge rules and the page pill rules never reach each other's pills. */
const OPS_PAGE_BADGE_ATTR = 'data-ops-page-badge';
const OPS_ID_ATTR = 'data-ops-id';
const OPS_EVIDENCE_ATTR = 'data-ops-evidence';
const OPS_SECTION_HEAD_ATTR = 'data-ops-section-head';

const ROW_FILE = 'ops-row-parts.ts';
const PAGE_FILE = 'ops-page-parts.ts';

interface Rule {
  selectors: string[];
  declarations: string[];
}

/** Splits a selector list at the commas outside parentheses and brackets (`:nth-child(2 of A, B)` stays one selector). */
function splitTopLevel(list: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < list.length; i += 1) {
    const ch = list[i];
    if (ch === '(' || ch === '[') depth += 1;
    else if (ch === ')' || ch === ']') depth -= 1;
    else if (ch === ',' && depth === 0) {
      parts.push(list.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(list.slice(start));
  return parts;
}

/** Every `selector { declarations }` block of the source, comments removed, whitespace collapsed, one entry per selector list. */
function rules(source: string): Rule[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const found: Rule[] = [];
  for (const rule of code.matchAll(/([^{}`;]+)\{([^{}]*)\}/g)) {
    found.push({
      selectors: splitTopLevel(rule[1] ?? '').map((selector) => selector.replace(/\s+/g, ' ').trim()).filter((selector) => selector !== ''),
      declarations: (rule[2] ?? '').split(';').map((declaration) => declaration.replace(/\s+/g, ' ').trim()).filter((declaration) => declaration !== ''),
    });
  }
  return found;
}

/** A declaration's value with `!important` removed and case folded: CSS keywords are case-insensitive and the flag does not change the value. */
const declarationValue = (declaration: string): string =>
  declaration.slice(declaration.indexOf(':') + 1).replace(/!\s*important\s*$/i, '').trim().toLowerCase();
const declarationName = (declaration: string): string => declaration.slice(0, Math.max(declaration.indexOf(':'), 0)).trim().toLowerCase();

/**
 * The properties a declaration can set, shorthands counted as their longhands (TESTS-008): `font` sets the family, weight, numeric
 * variant, size and line height; every `border-*` side/width/style/colour form sets the border; a radius form the radius; a `background-*`
 * form the background; `gap`, `row-gap`, `column-gap` and `grid-gap` the gap. Any other name stands for itself.
 */
function touches(property: string): string[] {
  const name = property.toLowerCase();
  if (name === 'font') return ['font', 'font-family', 'font-weight', 'font-variant-numeric', 'font-size', 'line-height'];
  if (/^border(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-(width|style|color))?$/.test(name)) return ['border'];
  if (/^border(-(top|bottom|start|end)(-(left|right|start|end))?)?-radius$/.test(name)) return ['border-radius'];
  if (/^background(-|$)/.test(name)) return ['background'];
  if (/^(grid-)?(row-|column-)?gap$/.test(name)) return ['gap'];
  return [name];
}

/** A selector with every `:not(...)` group (balanced) and every quoted string removed. */
function withoutNot(selector: string): string {
  let text = selector.replace(/"[^"]*"|'[^']*'/g, '""');
  for (;;) {
    const start = text.indexOf(':not(');
    if (start < 0) return text;
    let depth = 0;
    let end = start + 4;
    for (; end < text.length; end += 1) {
      if (text[end] === '(') depth += 1;
      else if (text[end] === ')' && --depth === 0) break;
    }
    text = text.slice(0, start) + text.slice(end + 1);
  }
}

/**
 * F-3: the attribute counts only when it sits on the LAST compound selector (the subject: the text after the last combinator) and
 * outside `:not()`. An earlier compound (`[data-ops-id] ~ [data-ops-facts] dd`) or a negation (`:not([data-ops-id])`) does not
 * confine the rule to the element, and a selector that hides a combinator in `:is()`, `:where()` or `:has()` is never accepted.
 */
const hasAttr = (selector: string, attribute: string): boolean => {
  const plain = withoutNot(selector);
  if (/:(?:is|where|has|matches|-webkit-any|-moz-any)\(/i.test(plain)) return false;
  // A comma inside parentheses (`:nth-child(n of A, B)`) hides a second selector: never accepted.
  if (/\([^)]*,/.test(plain)) return false;
  const subject = plain.trim().split(/\s*[>+~]\s*|\s+/).pop() ?? '';
  return new RegExp(`\\[${attribute}(?:[=\\]~|^$*])`).test(subject);
};

/** Whether `selector` is one of the three `::part` selectors the page file may hold (Ops G-3, and the exact `header` stack selector). */
const pageAllowed = (selector: string): boolean =>
  (hasAttr(selector, OPS_PAGE_BADGE_ATTR) && selector.endsWith('::part(tag)') && selector.split('::part(').length === 2) ||
  (hasAttr(selector, OPS_SECTION_HEAD_ATTR) && selector.endsWith('::part(action)') && selector.split('::part(').length === 2) ||
  // WP08 (CP-1, S-O2): the stacked section heading at a cell width of 588 px re-lays out the library's `header` grid. EXACT, as the badge is.
  selector === HEADER_SELECTOR;

/** (a) Each `::part` selector that is not allowed in its file: under the badge attribute in the row file, the two pinned forms in the page file, none elsewhere. */
function partViolations(name: string, source: string): string[] {
  const out: string[] = [];
  for (const rule of rules(source)) {
    for (const selector of rule.selectors) {
      if (!selector.includes('::part(')) continue;
      const allowed = (name === ROW_FILE && hasAttr(selector, OPS_BADGE_ATTR)) || (name === PAGE_FILE && pageAllowed(selector));
      if (!allowed) out.push(selector);
    }
  }
  return out;
}

/** (b) Each selector list that carries `overflow-wrap: anywhere` and is not entirely under the id or evidence attribute in the row part file. */
function wrapViolations(name: string, source: string): string[] {
  const out: string[] = [];
  for (const rule of rules(source)) {
    if (!rule.declarations.some((declaration) => declarationName(declaration) === 'overflow-wrap' && declarationValue(declaration) === 'anywhere')) continue;
    for (const selector of rule.selectors) {
      // Ops G-5 (WP07 fix round 1): the one other place is the empty-look profile in the state file (the only edit to this block).
      const profile = name === 'ops-state-parts.ts' && hasAttr(selector, 'data-empty-profile');
      if (!profile && !(name === ROW_FILE && (hasAttr(selector, OPS_ID_ATTR) || hasAttr(selector, OPS_EVIDENCE_ATTR)))) out.push(selector);
    }
  }
  return out;
}

const GRANTED = ['border', 'font-family', 'font-weight', 'font-variant-numeric', 'line-height'];
const HEADER_SELECTOR = `sk-section-header[${OPS_SECTION_HEAD_ATTR}]::part(header)`;
const BADGE_SELECTOR = `sk-pill-tag[${OPS_PAGE_BADGE_ATTR}]::part(tag)`;
const ACTION_SELECTOR = `sk-section-header[${OPS_SECTION_HEAD_ATTR}]::part(action)`;

/** (c) Each `selector: property` where a granted property sits outside the exact badge rule, or the action rule holds more than grid-row and justify-self, or the header rule more than the two grid-template properties. Page file only. */
function grantViolations(name: string, source: string): string[] {
  if (name !== PAGE_FILE) return [];
  const out: string[] = [];
  for (const rule of rules(source)) {
    const list = rule.selectors.join(', ');
    const exactBadge = rule.selectors.length === 1 && rule.selectors[0] === BADGE_SELECTOR;
    const exactAction = rule.selectors.length === 1 && rule.selectors[0] === ACTION_SELECTOR;
    const exactHeader = rule.selectors.length === 1 && rule.selectors[0] === HEADER_SELECTOR;
    for (const declaration of rule.declarations) {
      const property = declarationName(declaration);
      if (exactAction && property !== 'grid-row' && property !== 'justify-self') out.push(`${list}: ${property}`);
      else if (exactHeader && property !== 'grid-template-columns' && property !== 'grid-template-areas') out.push(`${list}: ${property}`);
      else if (!exactBadge && touches(property).some((longhand) => GRANTED.includes(longhand))) out.push(`${list}: ${property}`);
    }
  }
  return out;
}

const files = Object.entries(sources)
  .filter(([path]) => !path.endsWith('.stories.ts'))
  .map(([path, source]) => [path.split('/').pop() as string, source] as const);

describe('the pinned data-attribute names', () => {
  it('are the names WP05 must render', () => {
    expect([OPS_BADGE_ATTR, OPS_PAGE_BADGE_ATTR, OPS_ID_ATTR, OPS_EVIDENCE_ATTR, OPS_SECTION_HEAD_ATTR]).toEqual([
      'data-ops-badge',
      'data-ops-page-badge',
      'data-ops-id',
      'data-ops-evidence',
      'data-ops-section-head',
    ]);
  });
});

describe('(a) a ::part rule lives under the badge attribute in ops-row-parts.ts and in three pinned forms in ops-page-parts.ts (E-40 badge clause, Ops G-3)', () => {
  it('detects a planted violation (positive control) and accepts the allowed form', () => {
    const badge = `[${OPS_BADGE_ATTR}]::part(tag) { border: 1px; }`;
    expect(partViolations(ROW_FILE, 'sk-pill-tag::part(tag) { color: red; }')).toEqual(['sk-pill-tag::part(tag)']);
    expect(partViolations(ROW_FILE, `.row sk-pill-tag::part(tag), ${badge}`)).toEqual(['.row sk-pill-tag::part(tag)']);
    expect(partViolations(ROW_FILE, `sk-pill-tag[${OPS_BADGE_ATTR}]::part(tag) { color: red; }`)).toEqual([]);
    expect(partViolations(ROW_FILE, `sk-pill-tag[${OPS_ID_ATTR}]::part(tag) { color: red; }`)).toEqual([`sk-pill-tag[${OPS_ID_ATTR}]::part(tag)`]);
    expect(partViolations(ROW_FILE, '/* a::part(x) { } */ // b::part(y) {\n.k { display: block; }')).toEqual([]);
  });

  it('the page file accepts exactly the three pinned forms and refuses every other (plants with positive controls)', () => {
    const tag = `sk-pill-tag[${OPS_PAGE_BADGE_ATTR}]::part(tag)`;
    const action = `sk-section-header[${OPS_SECTION_HEAD_ATTR}]::part(action)`;
    expect(partViolations(PAGE_FILE, `${tag} { color: red; }`)).toEqual([]);
    expect(partViolations(PAGE_FILE, `${action} { grid-row: title; }`)).toEqual([]);
    const header = `sk-section-header[${OPS_SECTION_HEAD_ATTR}]::part(header)`;
    expect(partViolations(PAGE_FILE, `${header} { grid-template-columns: 1fr; }`)).toEqual([]);
    expect(partViolations(PAGE_FILE, 'sk-section-header::part(header) { grid-template-columns: 1fr; }')).toEqual(['sk-section-header::part(header)']);
    // The header selector is EXACT: a prefix, a different element or a list member is refused.
    const wideHeader = `.x ${header}`;
    expect(partViolations(PAGE_FILE, `${wideHeader} { grid-template-columns: 1fr; }`)).toEqual([wideHeader]);
    const otherHeader = `div[${OPS_SECTION_HEAD_ATTR}]::part(header)`;
    expect(partViolations(PAGE_FILE, `${otherHeader} { grid-template-columns: 1fr; }`)).toEqual([otherHeader]);
    expect(partViolations('ops-row-parts.ts', `${header} { grid-template-columns: 1fr; }`)).toEqual([header]);
    expect(partViolations(PAGE_FILE, 'sk-pill-tag::part(tag) { color: red; }')).toEqual(['sk-pill-tag::part(tag)']);
    expect(partViolations(PAGE_FILE, `sk-pill-tag[${OPS_ID_ATTR}]::part(tag) { color: red; }`)).toEqual([`sk-pill-tag[${OPS_ID_ATTR}]::part(tag)`]);
    expect(partViolations(PAGE_FILE, `sk-pill-tag[${OPS_PAGE_BADGE_ATTR}]::part(label) { color: red; }`)).toEqual([`sk-pill-tag[${OPS_PAGE_BADGE_ATTR}]::part(label)`]);
    // The row badge's attribute is refused in the page file: the page pills must not borrow the row rule's name (BOUNDARY-005).
    expect(partViolations(PAGE_FILE, `sk-pill-tag[${OPS_BADGE_ATTR}]::part(tag) { color: red; }`)).toEqual([`sk-pill-tag[${OPS_BADGE_ATTR}]::part(tag)`]);
    expect(partViolations(ROW_FILE, `sk-pill-tag[${OPS_PAGE_BADGE_ATTR}]::part(tag) { color: red; }`)).toEqual([`sk-pill-tag[${OPS_PAGE_BADGE_ATTR}]::part(tag)`]);
    expect(partViolations(PAGE_FILE, `sk-section-header[${OPS_SECTION_HEAD_ATTR}]::part(title) { color: red; }`)).toEqual([`sk-section-header[${OPS_SECTION_HEAD_ATTR}]::part(title)`]);
    expect(partViolations(PAGE_FILE, 'sk-section-header::part(action) { grid-row: title; }')).toEqual(['sk-section-header::part(action)']);
    expect(partViolations(PAGE_FILE, `${tag}::part(x) { color: red; }`)).toEqual([`${tag}::part(x)`]);
    // The same two forms are refused in every other Ops file.
    for (const other of ['ops-state-parts.ts', 'sk-ops-screen.ts', 'fixtures.ts']) {
      expect(partViolations(other, `${tag} { color: red; }`)).toEqual([tag]);
      expect(partViolations(other, `${action} { grid-row: title; }`)).toEqual([action]);
    }
  });

  it('the page file holds exactly those ::part selectors today (the badge, the action, and the two of the 588 px stack)', () => {
    const source = files.find(([name]) => name === PAGE_FILE)?.[1] ?? '';
    const found = rules(source).flatMap((rule) => rule.selectors).filter((selector) => selector.includes('::part('));
    expect(found).toEqual([
      `sk-pill-tag[${OPS_PAGE_BADGE_ATTR}]::part(tag)`,
      `sk-section-header[${OPS_SECTION_HEAD_ATTR}]::part(action)`,
      `sk-section-header[${OPS_SECTION_HEAD_ATTR}]::part(header)`,
      `sk-section-header[${OPS_SECTION_HEAD_ATTR}]::part(action)`,
    ]);
  });

  it('holds no violation in any current Ops file, and it scanned all five', () => {
    expect(files.map(([name]) => name).sort()).toEqual(['fixtures.ts', 'ops-page-parts.ts', 'ops-row-parts.ts', 'ops-state-parts.ts', 'sk-ops-screen.ts']);
    let scanned = 0;
    for (const [name, source] of files) {
      expect(partViolations(name, source), name).toEqual([]);
      scanned += 1;
    }
    expect(scanned).toBe(5);
  });
});

describe('(b) overflow-wrap: anywhere lives under the id or evidence attribute in ops-row-parts.ts only (E-43)', () => {
  it('detects a planted violation (positive control) and accepts the allowed forms', () => {
    expect(wrapViolations(ROW_FILE, '.title { overflow-wrap: anywhere; }')).toEqual(['.title']);
    expect(wrapViolations(ROW_FILE, `[${OPS_ID_ATTR}], .title { overflow-wrap: anywhere; }`)).toEqual(['.title']);
    expect(wrapViolations('ops-page-parts.ts', `[${OPS_ID_ATTR}] { overflow-wrap: anywhere; }`)).toEqual([`[${OPS_ID_ATTR}]`]);
    expect(wrapViolations(ROW_FILE, `[${OPS_BADGE_ATTR}] { overflow-wrap: anywhere; }`)).toEqual([`[${OPS_BADGE_ATTR}]`]);
    expect(wrapViolations(ROW_FILE, `[${OPS_ID_ATTR}] { overflow-wrap: anywhere; }`)).toEqual([]);
    expect(wrapViolations(ROW_FILE, `[${OPS_EVIDENCE_ATTR}] { color: red; overflow-wrap: anywhere }`)).toEqual([]);
    expect(wrapViolations(ROW_FILE, '.title { overflow-wrap: break-word; }')).toEqual([]);
  });

  it('holds no violation in any current Ops file, and it scanned all five', () => {
    let scanned = 0;
    for (const [name, source] of files) {
      expect(wrapViolations(name, source), name).toEqual([]);
      scanned += 1;
    }
    expect(scanned).toBe(5);
  });
});

describe('(c) the Ops G-3 granted properties live only in the exact badge ::part(tag) rule of ops-page-parts.ts', () => {
  const plant = '[data-ops-cell] { border: var(--sk-border-width-1) solid var(--sk-border-default); font-family: var(--sk-font-mono); line-height: 1.2; }';

  it('detects planted violations (positive controls) and accepts the two real forms', () => {
    expect(grantViolations(PAGE_FILE, plant)).toEqual(['[data-ops-cell]: border', '[data-ops-cell]: font-family', '[data-ops-cell]: line-height']);
    expect(grantViolations(PAGE_FILE, `${BADGE_SELECTOR} { border: 1px solid; font-weight: 400; font-variant-numeric: tabular-nums; line-height: 1.2; }`)).toEqual([]);
    expect(grantViolations(PAGE_FILE, `${ACTION_SELECTOR} { grid-row: title; }`)).toEqual([]);
    expect(grantViolations(PAGE_FILE, `${ACTION_SELECTOR} { grid-row: action; justify-self: start; }`)).toEqual([]);
    // The badge selector must be exact: a list or a wider selector does not inherit the grant.
    expect(grantViolations(PAGE_FILE, `${BADGE_SELECTOR}, li { font-weight: 400; }`)).toEqual([`${BADGE_SELECTOR}, li: font-weight`]);
    expect(grantViolations(PAGE_FILE, `.x ${BADGE_SELECTOR} { font-weight: 400; }`)).toEqual([`.x ${BADGE_SELECTOR}: font-weight`]);
    // The action rule holds only grid-row and justify-self (the 588 px stack).
    expect(grantViolations(PAGE_FILE, `${ACTION_SELECTOR} { grid-row: title; line-height: 1.2; color: red; }`)).toEqual([`${ACTION_SELECTOR}: line-height`, `${ACTION_SELECTOR}: color`]);
    // The header rule holds only grid-template-columns and grid-template-areas (the 588 px stack).
    expect(grantViolations(PAGE_FILE, `${HEADER_SELECTOR} { grid-template-columns: 1fr; grid-template-areas: 'a'; }`)).toEqual([]);
    expect(grantViolations(PAGE_FILE, `${HEADER_SELECTOR} { grid-template-columns: 1fr; color: red; font-size: 2rem; background: blue; }`)).toEqual([
      `${HEADER_SELECTOR}: color`,
      `${HEADER_SELECTOR}: font-size`,
      `${HEADER_SELECTOR}: background`,
    ]);
    // Other properties elsewhere are not this check's business (control), and other files are not scanned.
    expect(grantViolations(PAGE_FILE, '[data-ops-cell] { display: grid; }')).toEqual([]);
    expect(grantViolations('ops-state-parts.ts', plant)).toEqual([]);
  });

  it('the real page file yields the empty set, and the scan reaches both rules', () => {
    const source = files.find(([name]) => name === PAGE_FILE)?.[1] ?? '';
    expect(grantViolations(PAGE_FILE, source)).toEqual([]);
    const scanned = rules(source).filter((rule) => rule.selectors.length === 1 && (rule.selectors[0] === BADGE_SELECTOR || rule.selectors[0] === ACTION_SELECTOR));
    expect(scanned).toHaveLength(3);
    expect(rules(source).flatMap((rule) => rule.declarations).filter((d) => GRANTED.includes(d.split(':')[0]?.trim() ?? ''))).toHaveLength(5);
  });
});

// ---- WP07 fix round 1 (append-only): the Ops G-4 state card, confined to the empty and loading selectors of ops-state-parts.ts ----
const STATE_FILE = 'ops-state-parts.ts';
const CARD_SELECTOR = '[data-ops-state] > .sk-empty-state';
const CARD_BUSY_SELECTOR = "[data-ops-state][aria-busy='true'] > .sk-empty-state";
const CARD_PROPERTIES = ['border', 'border-radius', 'background'];

/** Each `selector: property` where a card property (border, border-radius, background) sits in the state file outside the two card rules. Other files are not scanned. */
function cardViolations(name: string, source: string): string[] {
  if (name !== STATE_FILE) return [];
  const out: string[] = [];
  for (const rule of rules(source)) {
    const list = rule.selectors.join(', ');
    const exact = rule.selectors.length === 1 && (rule.selectors[0] === CARD_SELECTOR || rule.selectors[0] === CARD_BUSY_SELECTOR);
    for (const declaration of rule.declarations) {
      const property = declarationName(declaration);
      if (!exact && touches(property).some((longhand) => CARD_PROPERTIES.includes(longhand))) out.push(`${list}: ${property}`);
    }
  }
  return out;
}

describe('(d) Ops G-4: the card properties live only in the two exact card rules of ops-state-parts.ts (no card on the error look)', () => {
  const plant = '[data-ops-state] > sk-notice { border: var(--sk-border-width-1) solid var(--sk-border-default); border-radius: var(--sk-radius-lg); background: var(--sk-surface-card); }';

  it('detects planted violations (positive controls) and accepts the two real forms', () => {
    expect(cardViolations(STATE_FILE, plant)).toEqual(['[data-ops-state] > sk-notice: border', '[data-ops-state] > sk-notice: border-radius', '[data-ops-state] > sk-notice: background']);
    expect(cardViolations(STATE_FILE, `${CARD_SELECTOR} { border: 1px dashed; border-radius: 1rem; background: red; }`)).toEqual([]);
    expect(cardViolations(STATE_FILE, `${CARD_BUSY_SELECTOR} { border: 1px solid; }`)).toEqual([]);
    // The selector must be exact: a list, a wider selector or the bare panel does not inherit the grant.
    expect(cardViolations(STATE_FILE, `${CARD_SELECTOR}, li { border: 1px dashed; }`)).toEqual([`${CARD_SELECTOR}, li: border`]);
    expect(cardViolations(STATE_FILE, '[data-ops-state] { background: red; }')).toEqual(['[data-ops-state]: background']);
    expect(cardViolations(STATE_FILE, `.x ${CARD_SELECTOR} { border-radius: 1rem; }`)).toEqual([`.x ${CARD_SELECTOR}: border-radius`]);
    // Other properties are not this check's business, and other files are not scanned.
    expect(cardViolations(STATE_FILE, '[data-ops-state] { display: grid; }')).toEqual([]);
    expect(cardViolations('ops-row-parts.ts', plant)).toEqual([]);
  });

  it('the real state file yields the empty set, and the scan reaches both card rules and all four card declarations', () => {
    const source = files.find(([name]) => name === STATE_FILE)?.[1] ?? '';
    expect(cardViolations(STATE_FILE, source)).toEqual([]);
    const card = rules(source).filter((rule) => rule.selectors.length === 1 && (rule.selectors[0] === CARD_SELECTOR || rule.selectors[0] === CARD_BUSY_SELECTOR));
    expect(card).toHaveLength(2);
    expect(card.flatMap((rule) => rule.declarations).filter((d) => CARD_PROPERTIES.includes(d.split(':')[0]?.trim() ?? ''))).toHaveLength(4);
  });
});

describe('(e) Ops G-5: overflow-wrap: anywhere in ops-state-parts.ts sits only on the empty-look profile', () => {
  it('detects planted violations (positive controls) and accepts the profile selector', () => {
    expect(wrapViolations(STATE_FILE, '[data-ops-state] code[data-empty-profile] { overflow-wrap: anywhere; }')).toEqual([]);
    expect(wrapViolations(STATE_FILE, '[data-ops-state] code { overflow-wrap: anywhere; }')).toEqual(['[data-ops-state] code']);
    expect(wrapViolations(STATE_FILE, '[data-ops-state] > .sk-empty-state__body { overflow-wrap: anywhere; }')).toEqual(['[data-ops-state] > .sk-empty-state__body']);
    expect(wrapViolations(STATE_FILE, 'code[data-empty-profile], li { overflow-wrap: anywhere; }')).toEqual(['li']);
    // The profile selector is not a pass in the other files.
    expect(wrapViolations(PAGE_FILE, 'code[data-empty-profile] { overflow-wrap: anywhere; }')).toEqual(['code[data-empty-profile]']);
  });

  it('the real state file holds exactly one such rule, on the profile, and it uses the keyword', () => {
    const source = files.find(([name]) => name === STATE_FILE)?.[1] ?? '';
    const wrapping = rules(source).filter((rule) => rule.declarations.includes('overflow-wrap: anywhere'));
    expect(wrapping.map((rule) => rule.selectors)).toEqual([['[data-ops-state] code[data-empty-profile]']]);
    expect(wrapViolations(STATE_FILE, source)).toEqual([]);
  });
});

// ---- Ops G-6: the empty-look typography, confined to the empty-state heading and body selectors of ops-state-parts.ts ----
const EMPTY_LOOK = "[data-ops-state]:not([aria-busy='true'])";
const LOADING_LOOK = "[data-ops-state][aria-busy='true']";
const G6_SELECTORS: Record<string, string[]> = {
  'font-weight': [`${EMPTY_LOOK} .sk-empty-state__heading`],
  'line-height': [`${EMPTY_LOOK} > .sk-empty-state`, `${LOADING_LOOK} > .sk-empty-state`, `${EMPTY_LOOK} .sk-empty-state__heading`],
  gap: [`${EMPTY_LOOK} > .sk-empty-state`],
};

/** Each `selector: property` where font-weight, line-height or gap sits in the state file outside its own exact selector. Other files are not scanned. */
function typographyViolations(name: string, source: string): string[] {
  if (name !== STATE_FILE) return [];
  const out: string[] = [];
  for (const rule of rules(source)) {
    const list = rule.selectors.join(', ');
    for (const declaration of rule.declarations) {
      const property = declarationName(declaration);
      const only = rule.selectors.length === 1 ? (rule.selectors[0] ?? '') : '';
      const value = declarationValue(declaration);
      for (const longhand of touches(property)) {
        const allowed = G6_SELECTORS[longhand];
        // A shorthand (`font`) can set the pinned properties, so it has no home in the state file at all.
        const wrongValue = longhand === 'line-height' && property === 'line-height' && only !== '' && value !== LH_VALUE(only);
        if (allowed !== undefined && (!allowed.includes(only) || wrongValue || property !== longhand)) {
          out.push(`${list}: ${property}`);
          break;
        }
      }
    }
  }
  return out;
}

const [EMPTY_CARD, LOADING_CARD] = G6_SELECTORS['line-height'] as [string, string, string];
const HEADING = G6_SELECTORS['font-weight']?.[0] ?? '';
/** The one value each line-height selector may carry: 1.5 on the cards, 1.3 on the empty heading. */
const LH_VALUE = (selector: string): string => (selector === HEADING ? '1.3' : '1.5');

describe('(f) Ops G-6: font-weight, line-height and gap live only in their exact selectors of ops-state-parts.ts', () => {
  it('detects planted violations (positive controls) and accepts the real forms', () => {
    expect(typographyViolations(STATE_FILE, `${HEADING} { font-weight: var(--sk-weight-bold); }`)).toEqual([]);
    expect(typographyViolations(STATE_FILE, `${EMPTY_CARD} { line-height: 1.5; }`)).toEqual([]);
    expect(typographyViolations(STATE_FILE, `${LOADING_CARD} { line-height: 1.5; }`)).toEqual([]);
    expect(typographyViolations(STATE_FILE, `${EMPTY_CARD} { gap: 0; }`)).toEqual([]);
    // Line-height leaks: the bare body, the progress label, the notice, a list, and the heading.
    for (const leak of ['.sk-empty-state__body', '.sk-progress__label', '[data-ops-state] > sk-notice', `${EMPTY_CARD}, li`]) {
      expect(typographyViolations(STATE_FILE, `${leak} { line-height: 1.5; }`)).toEqual([`${leak}: line-height`]);
    }
    // The heading carries exactly 1.3 and the cards exactly 1.5; 1.3 on the body, the loading label or a card, or 1.5 on the heading, fails.
    expect(typographyViolations(STATE_FILE, `${HEADING} { line-height: 1.3; }`)).toEqual([]);
    expect(typographyViolations(STATE_FILE, `${HEADING} { line-height: 1.5; }`)).toEqual([`${HEADING}: line-height`]);
    for (const leak of ['.sk-empty-state__body', `${EMPTY_LOOK} .sk-empty-state__body`, '.sk-progress__label', `${LOADING_LOOK} .sk-progress__label`, EMPTY_CARD, LOADING_CARD]) {
      expect(typographyViolations(STATE_FILE, `${leak} { line-height: 1.3; }`)).toEqual([`${leak}: line-height`]);
    }
    // Other properties on the wrong selectors.
    expect(typographyViolations(STATE_FILE, '[data-ops-state][aria-busy="true"] .sk-empty-state__heading { font-weight: 700; }')).toEqual(['[data-ops-state][aria-busy="true"] .sk-empty-state__heading: font-weight']);
    expect(typographyViolations(STATE_FILE, '[data-ops-state] > sk-notice { gap: 0; }')).toEqual(['[data-ops-state] > sk-notice: gap']);
    expect(typographyViolations(STATE_FILE, `${LOADING_CARD} { gap: 0; }`)).toEqual([`${LOADING_CARD}: gap`]);
    expect(typographyViolations(STATE_FILE, `${HEADING}, li { font-weight: 700; }`)).toEqual([`${HEADING}, li: font-weight`]);
    expect(typographyViolations(STATE_FILE, `${EMPTY_CARD} { font-weight: 700; }`)).toEqual([`${EMPTY_CARD}: font-weight`]);
    // Other properties are not this check's business, and other files are not scanned.
    expect(typographyViolations(STATE_FILE, `${EMPTY_CARD} { display: grid; }`)).toEqual([]);
    expect(typographyViolations('ops-row-parts.ts', '.x { line-height: 1.5; gap: 0; }')).toEqual([]);
  });

  it('the real state file yields the empty set, and the scan finds exactly the five expected declarations', () => {
    const source = files.find(([name]) => name === STATE_FILE)?.[1] ?? '';
    expect(typographyViolations(STATE_FILE, source)).toEqual([]);
    const found = rules(source).flatMap((rule) => rule.declarations.map((d) => `${rule.selectors.join(', ')}: ${d.split(':')[0]?.trim() ?? ''}`)).filter((entry) => /: (font-weight|line-height|gap)$/.test(entry));
    expect(found).toEqual([`${LOADING_CARD}: line-height`, `${EMPTY_CARD}: gap`, `${EMPTY_CARD}: line-height`, `${HEADING}: font-weight`, `${HEADING}: line-height`]);
  });
});

describe('(g) Ops G-2: the badge tag part pins its line height and block padding under the badge attribute', () => {
  const lineHeightRules = (source: string): Rule[] =>
    rules(source).filter((rule) => rule.declarations.some((declaration) => declarationName(declaration) === 'line-height' && declarationValue(declaration) === '1.2'));
  it('detects a line-height 1.2 rule outside the badge part (positive control)', () => {
    expect(lineHeightRules(`.k { line-height: 1.2; } [${OPS_BADGE_ATTR}]::part(tag) { line-height: 1.2; }`).map((rule) => rule.selectors)).toEqual([['.k'], [`[${OPS_BADGE_ATTR}]::part(tag)`]]);
  });
  it('the row file has exactly one line-height 1.2 rule, on the badge tag part, with padding-block of one space token', () => {
    const found = lineHeightRules(sources['../src/elements/sk-ops-screen/ops-row-parts.ts'] as string);
    expect(found).toHaveLength(1);
    expect(found[0]?.selectors).toEqual([`[${OPS_BADGE_ATTR}]::part(tag)`]);
    expect(found[0]?.declarations).toContain('padding-block: var(--sk-space-1)');
    // The page part holds the same 1.2 on the same exact badge selector (Ops G-3), and nowhere else; every other file holds none.
    for (const [name, source] of files) {
      if (name === ROW_FILE) continue;
      if (name === PAGE_FILE) expect(lineHeightRules(source).map((rule) => rule.selectors), name).toEqual([[`sk-pill-tag[${OPS_PAGE_BADGE_ATTR}]::part(tag)`]]);
      else expect(lineHeightRules(source), name).toEqual([]);
    }
  });
});

describe('(h) E-40: every granted property lives only under its pinned selectors in ops-row-parts.ts', () => {
  const BADGE = '[data-ops-badge]::part(tag)';
  const BADGE_PARTS = [BADGE, ...['success', 'danger', 'attention', 'info', 'recovery'].map((status) => `[data-ops-badge][status='${status}']::part(tag)`)];
  const ROW = '[data-ops-row]';
  const DIVIDER = ['[data-ops-facts] > div', '[data-ops-facts] > div:last-child'];
  const TERM = '[data-ops-facts] dt';
  const VALUE = '[data-ops-facts] dd';
  const LABELS = ['[data-ops-evidence-class]', '[data-ops-changed]'];
  /** The exact selectors each granted property may appear under (badge clause, divider, row frame and typography). */
  const ALLOWED: Record<string, string[]> = {
    border: [ROW, ...BADGE_PARTS],
    'border-radius': [ROW],
    'border-block-end': DIVIDER,
    background: [ROW],
    color: [ROW, '[data-ops-id]', TERM, VALUE, '[data-ops-quiet]', ...LABELS],
    'font-family': [ROW, '[data-ops-mono]', BADGE],
    'font-variant-numeric': ['[data-ops-mono]', BADGE],
    'font-weight': [BADGE],
    'font-size': [ROW, ...LABELS],
    'line-height': [ROW, BADGE],
  };
  /** Any declaration in a granted family (border*, font*, background*, line-height, color) is held to ALLOWED; an unlisted name has no home. */
  const FAMILY = /^(border|font|background|line-height|color)/;
  const GRANTED_RULES = 15;
  const TOTAL_RULES = 23;

  const propertyName = (declaration: string): string => declaration.slice(0, Math.max(declaration.indexOf(':'), 0)).trim();
  /** Each `property @ selector` where a granted-family property sits outside its pinned selectors. */
  function leaks(source: string, allowed: Record<string, string[]>): string[] {
    const out: string[] = [];
    for (const rule of rules(source)) {
      for (const declaration of rule.declarations) {
        const name = propertyName(declaration);
        if (!FAMILY.test(name)) continue;
        for (const selector of rule.selectors) if (!(allowed[name] ?? []).includes(selector)) out.push(`${name} @ ${selector}`);
      }
    }
    return out;
  }
  const grantedRuleCount = (source: string): number => rules(source).filter((rule) => rule.declarations.some((declaration) => FAMILY.test(propertyName(declaration)))).length;
  const fullRowSource = sources['../src/elements/sk-ops-screen/ops-row-parts.ts'] as string;
  /** Only the `css` template: the rest of the file is TypeScript and html, whose braces are not rules. */
  const rowSource = fullRowSource.slice(fullRowSource.indexOf('css`') + 4, fullRowSource.indexOf('`;', fullRowSource.indexOf('css`')));

  it('reports each granted property planted on [data-ops-head] (positive control)', () => {
    for (const declaration of ['border-block-end: 1px solid red', 'border: 1px solid red', 'font-family: monospace', 'font-variant-numeric: tabular-nums', 'line-height: 1.5', 'line-height: 1.2', 'font-weight: bold', 'color: red', 'background: red', 'border-radius: 4px', 'font-size: 1px']) {
      expect(leaks(`${rowSource}\n[data-ops-head] { ${declaration}; }`, ALLOWED), declaration).toEqual([`${propertyName(declaration)} @ [data-ops-head]`]);
    }
    expect(leaks(`${BADGE} { border-block-end: 1px solid red; }`, ALLOWED)).toEqual([`border-block-end @ ${BADGE}`]);
    expect(leaks(`${DIVIDER[0]} { font-family: mono; }`, ALLOWED)).toEqual([`font-family @ ${DIVIDER[0]}`]);
    expect(leaks(`${ROW} { border-top: 1px solid red; }`, ALLOWED)).toEqual([`border-top @ ${ROW}`]);
    expect(leaks(`${ROW} { display: grid; }`, ALLOWED)).toEqual([]);
  });

  it('the real row file holds no leak, and it scanned the pinned number of rules', () => {
    expect(leaks(rowSource, ALLOWED)).toEqual([]);
    expect(rules(rowSource).length).toBe(TOTAL_RULES);
    expect(grantedRuleCount(rowSource)).toBe(GRANTED_RULES);
    // Positive control for the pins: every selector listed is really used (a stale entry would hide a rename).
    const used = new Set(rules(rowSource).flatMap((rule) => rule.selectors));
    for (const [name, selectors] of Object.entries(ALLOWED)) for (const selector of selectors) expect(used.has(selector), `${name} @ ${selector}`).toBe(true);
  });

  it('no other Ops file but ops-page-parts.ts and ops-state-parts.ts (confined by WP06, WP07) carries any granted property', () => {
    expect(leaks('.k { color: red; }', {})).toEqual(['color @ .k']);
    let scanned = 0;
    for (const [name, source] of files) {
      if (name === ROW_FILE || name === 'ops-page-parts.ts' || name === STATE_FILE) continue;
      expect(leaks(source, {}), name).toEqual([]);
      scanned += 1;
    }
    expect(scanned).toBe(2);
  });
});

// ---- Fail-closed scanning (TESTS-006, TESTS-007, TESTS-008): the scanners above read rules out of the source with a regular
// expression, so anything that hides a rule from that regular expression must be refused outright, not skipped. ----
const PART_FILES = [ROW_FILE, PAGE_FILE, STATE_FILE];

/** The bodies of the `css` tagged templates of a source, comments removed first (a comment may name the tag in backticks). */
function cssTemplates(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const found: string[] = [];
  const tag = /(?<![\w$.])css`/g;
  for (let match = tag.exec(code); match !== null; match = tag.exec(code)) {
    let end = match.index + match[0].length;
    while (end < code.length && code[end] !== '`') end += code[end] === '\\' ? 2 : 1;
    found.push(code.slice(match.index + match[0].length, end));
    tag.lastIndex = end + 1;
  }
  return found;
}

/** Each Ops part file must hold exactly ONE `css` template, with no `${` inside it: a second template or an interpolated fragment would be invisible to `rules()`. */
function templateViolations(name: string, source: string): string[] {
  if (!PART_FILES.includes(name)) return [];
  const templates = cssTemplates(source);
  const out: string[] = [];
  if (templates.length !== 1) out.push(`${name}: ${templates.length} css templates (exactly one is allowed)`);
  for (const template of templates) if (template.includes('${')) out.push(`${name}: an interpolation inside a css template`);
  return out;
}

describe('(i) each Ops part file holds exactly one css template without interpolation (fail closed)', () => {
  const ONE = 'const a = css`\n  [data-ops-head] { display: flex; }\n`;\n';

  it('detects the planted interpolated fragment, the planted second template and an empty file (positive controls)', () => {
    const interpolated = 'const OPS_BOLD = css`font-weight: var(--sk-weight-bold); line-height: 1.2;`;\nexport const s = css`[data-ops-cell] h2 { ${OPS_BOLD} }`;\n';
    for (const name of PART_FILES) {
      expect(templateViolations(name, ONE), name).toEqual([]);
      expect(templateViolations(name, interpolated), name).toEqual([`${name}: 2 css templates (exactly one is allowed)`, `${name}: an interpolation inside a css template`]);
      expect(templateViolations(name, `${ONE}const b = css\`[data-ops-head] { color: red; font-weight: bold; }\`;\n`), name).toEqual([`${name}: 2 css templates (exactly one is allowed)`]);
      expect(templateViolations(name, 'export const nothing = 1;\n'), name).toEqual([`${name}: 0 css templates (exactly one is allowed)`]);
    }
    expect(templateViolations(ROW_FILE, 'const a = css`[x] { color: ${red}; }`;\n')).toEqual([`${ROW_FILE}: an interpolation inside a css template`]);
    // The screen and the fixtures are not part files (the screen's own styles hold one interpolation by design).
    expect(templateViolations('sk-ops-screen.ts', interpolated)).toEqual([]);
    // A comment that names the tag in backticks is not a template.
    expect(templateViolations(PAGE_FILE, `// the \`css\` template below\n${ONE}`)).toEqual([]);
    expect(templateViolations(PAGE_FILE, `/* a \`css\` mention */\n${ONE}`)).toEqual([]);
  });

  it('the real part files hold exactly one css template each, none interpolated', () => {
    let scanned = 0;
    for (const [name, source] of files) {
      if (!PART_FILES.includes(name)) continue;
      expect(templateViolations(name, source), name).toEqual([]);
      expect(cssTemplates(source), name).toHaveLength(1);
      scanned += 1;
    }
    expect(scanned).toBe(3);
  });
});

describe('(j) value matching tolerates !important and letter case, and shorthands count as their longhands', () => {
  it('(b) overflow-wrap: anywhere is found with !important and in capitals (plants), and allowed under the id as before', () => {
    expect(wrapViolations(ROW_FILE, '[data-ops-head] { overflow-wrap: anywhere !important; }')).toEqual(['[data-ops-head]']);
    expect(wrapViolations(ROW_FILE, '[data-ops-head] { overflow-wrap: ANYWHERE; }')).toEqual(['[data-ops-head]']);
    expect(wrapViolations(ROW_FILE, '[data-ops-head] { OVERFLOW-WRAP: Anywhere ! important; }')).toEqual(['[data-ops-head]']);
    expect(wrapViolations(ROW_FILE, `[${OPS_ID_ATTR}] { overflow-wrap: anywhere !important; }`)).toEqual([]);
    expect(wrapViolations(ROW_FILE, '[data-ops-head] { overflow-wrap: break-word !important; }')).toEqual([]);
  });

  it('(c) the granted properties are found as shorthands: font and the border sides on the page file (plants)', () => {
    expect(grantViolations(PAGE_FILE, '[data-ops-cell] { font: 12px monospace; }')).toEqual(['[data-ops-cell]: font']);
    expect(grantViolations(PAGE_FILE, '[data-ops-cell] { border-top: 1px solid red; }')).toEqual(['[data-ops-cell]: border-top']);
    expect(grantViolations(PAGE_FILE, '[data-ops-cell] { border-color: red; border-style: solid; border-width: 1px; }')).toEqual([
      '[data-ops-cell]: border-color',
      '[data-ops-cell]: border-style',
      '[data-ops-cell]: border-width',
    ]);
    expect(grantViolations(PAGE_FILE, '[data-ops-cell] { LINE-HEIGHT: 1.2 !important; }')).toEqual(['[data-ops-cell]: line-height']);
    expect(grantViolations(PAGE_FILE, `${BADGE_SELECTOR} { font: 12px monospace; border-top: 1px solid red; }`)).toEqual([]);
    expect(grantViolations(PAGE_FILE, '[data-ops-cell] { border-radius: 4px; display: grid; }')).toEqual([]);
  });

  it('(d) the card properties are found as longhands and shorthands on the state file (plants)', () => {
    expect(cardViolations(STATE_FILE, '[data-ops-state] > sk-notice { border-top: 1px solid red; }')).toEqual(['[data-ops-state] > sk-notice: border-top']);
    expect(cardViolations(STATE_FILE, '[data-ops-state] > sk-notice { background-color: red; }')).toEqual(['[data-ops-state] > sk-notice: background-color']);
    expect(cardViolations(STATE_FILE, '[data-ops-state] > sk-notice { border-top-left-radius: 1rem; }')).toEqual(['[data-ops-state] > sk-notice: border-top-left-radius']);
    expect(cardViolations(STATE_FILE, `${CARD_SELECTOR} { border-top: 1px dashed; background-color: red; }`)).toEqual([]);
  });

  it('(f) the pinned typography is found as the font shorthand, with !important and in capitals on the state file (plants)', () => {
    expect(typographyViolations(STATE_FILE, `${HEADING} { font: 700 1rem monospace; }`)).toEqual([`${HEADING}: font`]);
    expect(typographyViolations(STATE_FILE, '.x { font: 1rem monospace; }')).toEqual(['.x: font']);
    expect(typographyViolations(STATE_FILE, '.x { ROW-GAP: 0; }')).toEqual(['.x: row-gap']);
    expect(typographyViolations(STATE_FILE, `${EMPTY_CARD} { line-height: 1.5 !important; }`)).toEqual([]);
    expect(typographyViolations(STATE_FILE, `${EMPTY_CARD} { line-height: 1.3 !important; }`)).toEqual([`${EMPTY_CARD}: line-height`]);
    expect(typographyViolations(STATE_FILE, '.x { LINE-HEIGHT: 1.5 !important; }')).toEqual(['.x: line-height']);
  });

  it('the declaration helpers fold case and drop the flag, and the shorthand table is what the checks rely on (controls)', () => {
    expect(declarationValue('line-height: 1.5 !important')).toBe('1.5');
    expect(declarationValue('Color: RED ! IMPORTANT')).toBe('red');
    expect(declarationName('FONT-Weight: 700')).toBe('font-weight');
    expect(touches('font')).toContain('line-height');
    expect(touches('border-block-end')).toEqual(['border']);
    expect(touches('border-top-right-radius')).toEqual(['border-radius']);
    expect(touches('background-color')).toEqual(['background']);
    expect(touches('row-gap')).toEqual(['gap']);
    expect(touches('display')).toEqual(['display']);
  });
});

describe('(b) F-3: the attribute must be on the LAST compound selector and outside :not()', () => {
  const rowWrap = (selector: string): string[] => wrapViolations(ROW_FILE, `${selector} { overflow-wrap: anywhere; }`);

  it('refuses the attribute in an earlier compound or inside :not() (plants)', () => {
    expect(rowWrap(`[${OPS_ID_ATTR}] ~ [data-ops-facts] dd`)).toEqual([`[${OPS_ID_ATTR}] ~ [data-ops-facts] dd`]);
    expect(rowWrap(`[${OPS_EVIDENCE_ATTR}] > dd`)).toEqual([`[${OPS_EVIDENCE_ATTR}] > dd`]);
    expect(rowWrap(`[${OPS_ID_ATTR}] dd`)).toEqual([`[${OPS_ID_ATTR}] dd`]);
    expect(rowWrap(`[data-ops-head]:not([${OPS_ID_ATTR}])`)).toEqual([`[data-ops-head]:not([${OPS_ID_ATTR}])`]);
    expect(rowWrap(`[data-ops-facts]:not([${OPS_EVIDENCE_ATTR}]) dd`)).toEqual([`[data-ops-facts]:not([${OPS_EVIDENCE_ATTR}]) dd`]);
    expect(rowWrap(`:is([${OPS_ID_ATTR}] dd)`)).toEqual([`:is([${OPS_ID_ATTR}] dd)`]);
    expect(wrapViolations(ROW_FILE, `[${OPS_EVIDENCE_ATTR}], [${OPS_ID_ATTR}] ~ [data-ops-facts] dd { overflow-wrap: anywhere; }`)).toEqual([`[${OPS_ID_ATTR}] ~ [data-ops-facts] dd`]);
  });

  it('keeps a comma inside parentheses in one selector and never accepts it (nit)', () => {
    const nth = `dd:nth-child(n of [${OPS_ID_ATTR}], [${OPS_EVIDENCE_ATTR}])`;
    expect(rules(`${nth}, [${OPS_ID_ATTR}] { overflow-wrap: anywhere; }`).map((rule) => rule.selectors)).toEqual([[nth, `[${OPS_ID_ATTR}]`]]);
    expect(rowWrap(nth)).toEqual([nth]);
  });

  it('accepts the attribute on the subject compound, after any combinator (controls)', () => {
    expect(rowWrap(`[${OPS_ID_ATTR}]`)).toEqual([]);
    expect(rowWrap(`[data-ops-facts] [${OPS_EVIDENCE_ATTR}]`)).toEqual([]);
    expect(rowWrap(`[data-ops-head] > strong[${OPS_ID_ATTR}]`)).toEqual([]);
    expect(rowWrap(`span[${OPS_EVIDENCE_ATTR}]:not([data-x])`)).toEqual([]);
    expect(rowWrap(`[data-ops-facts] dd [${OPS_EVIDENCE_ATTR}='a b']`)).toEqual([]);
  });

  it('the part check (a) takes the same rule: the badge attribute on an earlier compound is refused', () => {
    expect(partViolations(ROW_FILE, `[${OPS_BADGE_ATTR}] .x::part(tag) { color: red; }`)).toEqual([`[${OPS_BADGE_ATTR}] .x::part(tag)`]);
    expect(partViolations(ROW_FILE, `sk-pill-tag:not([${OPS_BADGE_ATTR}])::part(tag) { color: red; }`)).toEqual([`sk-pill-tag:not([${OPS_BADGE_ATTR}])::part(tag)`]);
    expect(partViolations(ROW_FILE, `.row [${OPS_BADGE_ATTR}]::part(tag) { color: red; }`)).toEqual([]);
  });
});

// ---- Ops G-7 (pre-merge fix round 2, F-1): max-width on the row's status badge only ----
const G7_SELECTOR = `sk-pill-tag[${OPS_BADGE_ATTR}]`;

/** Each `selector: max-width: value` outside the one exact badge rule with the value `100%`, in any Ops file. */
function maxWidthViolations(source: string): string[] {
  const out: string[] = [];
  for (const rule of rules(source)) {
    const list = rule.selectors.join(', ');
    const exact = rule.selectors.length === 1 && rule.selectors[0] === G7_SELECTOR;
    for (const declaration of rule.declarations) {
      if (!touches(declarationName(declaration)).some((name) => ['max-width', 'max-inline-size'].includes(name))) continue;
      if (!exact || declarationValue(declaration) !== '100%') out.push(`${list}: ${declaration}`);
    }
  }
  return out;
}

describe('(g) Ops G-7: max-width is set only on the exact row badge selector, to 100%', () => {
  it('detects planted violations (positive controls) and accepts the one real form', () => {
    expect(maxWidthViolations(`${G7_SELECTOR} { max-width: 100%; }`)).toEqual([]);
    expect(maxWidthViolations(`${G7_SELECTOR} { max-width: 100% !important; }`)).toEqual([]);
    expect(maxWidthViolations(`${G7_SELECTOR}, li { max-width: 100%; }`)).toEqual([`${G7_SELECTOR}, li: max-width: 100%`]);
    expect(maxWidthViolations(`.x ${G7_SELECTOR} { max-width: 100%; }`)).toEqual([`.x ${G7_SELECTOR}: max-width: 100%`]);
    expect(maxWidthViolations('[data-ops-row] { max-width: 100%; }')).toEqual(['[data-ops-row]: max-width: 100%']);
    expect(maxWidthViolations(`${G7_SELECTOR} { max-width: 50%; }`)).toEqual([`${G7_SELECTOR}: max-width: 50%`]);
    expect(maxWidthViolations(`${G7_SELECTOR} { MAX-INLINE-SIZE: 100%; }`)).toEqual([]);
    expect(maxWidthViolations('li { max-inline-size: 20rem; }')).toEqual(['li: max-inline-size: 20rem']);
    expect(maxWidthViolations('li { min-width: 0; width: 100%; }')).toEqual([]);
  });

  it('holds no violation in any current Ops file, and the row file sets it exactly once', () => {
    let scanned = 0;
    for (const [name, source] of files) {
      expect(maxWidthViolations(source), name).toEqual([]);
      scanned += 1;
    }
    expect(scanned).toBe(5);
    const row = files.find(([name]) => name === ROW_FILE)?.[1] ?? '';
    expect(rules(row).filter((rule) => rule.declarations.includes('max-width: 100%')).map((rule) => rule.selectors)).toEqual([[G7_SELECTOR]]);
  });
});
