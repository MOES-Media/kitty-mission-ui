// The public surface of the Missions and Pipeline elements and of the Work Package screen, frozen. The committed manifest is
// the contract: this test pins what it lists (tags, attributes, events) and the run-time defaults of every property,
// so a later work package that changes the surface fails here and reports the change instead of making it.
import { describe, expect, it } from 'vitest';
import manifest from '../custom-elements.json';
import '../src/index.js';
import { BOARD_LABEL, DEFAULT_LANE_GROUPS, PHASES_LABEL } from '../src/defaults/index.js';

interface ManifestMember {
  kind: string;
  name: string;
  attribute?: string;
  default?: string;
  privacy?: string;
}
interface ManifestDeclaration {
  tagName?: string;
  members?: ManifestMember[];
  events?: { name: string }[];
  attributes?: { name: string }[];
  slots?: unknown[];
  cssParts?: unknown[];
}

const declarations = new Map<string, ManifestDeclaration>();
for (const mod of manifest.modules as { declarations?: ManifestDeclaration[] }[]) {
  for (const decl of mod.declarations ?? []) {
    if (decl.tagName !== undefined) declarations.set(decl.tagName, decl);
  }
}

const NEW_TAGS = ['sk-missions-screen', 'sk-pipeline-screen', 'sk-filter-toggle-group', 'sk-phase-bar', 'sk-work-package-board', 'sk-work-package-screen'];

/** tag, property name, attribute (undefined = property only), default as a run-time value. */
const SURFACE: [string, string, string | undefined, unknown][] = [
  ['sk-missions-screen', 'status', 'status', 'loading'],
  ['sk-missions-screen', 'project', undefined, null],
  ['sk-missions-screen', 'branch', 'branch', ''],
  ['sk-missions-screen', 'missions', undefined, []],
  ['sk-missions-screen', 'pageInfo', undefined, null],
  ['sk-missions-screen', 'now', 'now', null],
  ['sk-missions-screen', 'filter', 'filter', 'all'],
  ['sk-missions-screen', 'query', 'query', ''],
  ['sk-missions-screen', 'loadingMore', 'loading-more', false],
  ['sk-missions-screen', 'laneGroups', undefined, DEFAULT_LANE_GROUPS],
  ['sk-missions-screen', 'labels', undefined, null],
  ['sk-missions-screen', 'errorMessage', 'error-message', ''],
  ['sk-pipeline-screen', 'status', 'status', 'loading'],
  ['sk-pipeline-screen', 'mission', undefined, null],
  ['sk-pipeline-screen', 'laneGroups', undefined, DEFAULT_LANE_GROUPS],
  ['sk-pipeline-screen', 'labels', undefined, null],
  ['sk-pipeline-screen', 'missionsHref', 'missions-href', '#/missions'],
  ['sk-pipeline-screen', 'errorMessage', 'error-message', ''],
  ['sk-filter-toggle-group', 'options', undefined, []],
  ['sk-filter-toggle-group', 'value', 'value', ''],
  ['sk-filter-toggle-group', 'label', 'label', ''],
  ['sk-phase-bar', 'phases', undefined, []],
  ['sk-phase-bar', 'labels', undefined, null],
  ['sk-phase-bar', 'label', 'label', PHASES_LABEL],
  ['sk-work-package-board', 'workPackages', undefined, []],
  ['sk-work-package-board', 'laneGroups', undefined, DEFAULT_LANE_GROUPS],
  ['sk-work-package-board', 'missionId', 'mission-id', ''],
  ['sk-work-package-board', 'labels', undefined, null],
  ['sk-work-package-board', 'label', 'label', BOARD_LABEL],
  ['sk-work-package-screen', 'status', 'status', 'loading'],
  ['sk-work-package-screen', 'detailStatus', 'detail-status', 'ready'],
  ['sk-work-package-screen', 'detailRefusalCode', undefined, null],
  ['sk-work-package-screen', 'workPackage', undefined, null],
  ['sk-work-package-screen', 'detail', undefined, null],
  ['sk-work-package-screen', 'mission', undefined, null],
  ['sk-work-package-screen', 'wpId', 'wp-id', ''],
  ['sk-work-package-screen', 'now', 'now', null],
  ['sk-work-package-screen', 'labels', undefined, null],
  ['sk-work-package-screen', 'errorMessage', 'error-message', ''],
];

/** tag, the exact set of events its manifest entry declares (own dispatches and `@fires` of child events). */
const EVENTS: [string, string[]][] = [
  ['sk-missions-screen', ['sk-filter-change', 'sk-load-more', 'sk-open-mission', 'sk-search']],
  ['sk-pipeline-screen', ['sk-open-missions', 'sk-select-work-package', 'sk-view-artifacts']],
  ['sk-filter-toggle-group', ['sk-filter-change']],
  ['sk-phase-bar', []],
  ['sk-work-package-board', ['sk-select-work-package']],
  ['sk-work-package-screen', ['sk-open-artifact', 'sk-open-mission', 'sk-retry-load', 'sk-select-work-package']],
];

describe('surface freeze', () => {
  it('registers the six tags and lists each in the committed manifest', () => {
    expect(NEW_TAGS).toHaveLength(6);
    let checked = 0;
    for (const tag of NEW_TAGS) {
      expect(customElements.get(tag), tag).toBeDefined();
      expect(declarations.has(tag), tag).toBe(true);
      checked += 1;
    }
    expect(checked).toBe(6);
  });

  it('lists every property of the contracts with its attribute and default in the manifest', () => {
    let checked = 0;
    for (const [tag, name, attribute] of SURFACE) {
      const member = declarations.get(tag)?.members?.find((m) => m.kind === 'field' && m.name === name);
      expect(member, `${tag}.${name}`).toBeDefined();
      expect(member?.attribute, `${tag}.${name} attribute`).toBe(attribute);
      expect(member?.default, `${tag}.${name} default`).toBeDefined();
      checked += 1;
    }
    expect(checked).toBe(SURFACE.length);
  });

  it('gives every property its contract default at run time', () => {
    let checked = 0;
    for (const [tag, name, , expected] of SURFACE) {
      const el = document.createElement(tag) as unknown as Record<string, unknown>;
      expect(el[name], `${tag}.${name}`).toEqual(expected);
      checked += 1;
    }
    expect(checked).toBe(SURFACE.length);
  });

  it('declares exactly the nine events of the contracts, per element', () => {
    let checked = 0;
    const all = new Set<string>();
    for (const [tag, expected] of EVENTS) {
      const names = (declarations.get(tag)?.events ?? []).map((e) => e.name).sort();
      expect(names, tag).toEqual(expected);
      for (const name of names) all.add(name);
      checked += 1;
    }
    expect(checked).toBe(6);
    expect([...all].sort()).toEqual([
      'sk-filter-change',
      'sk-load-more',
      'sk-open-artifact',
      'sk-open-mission',
      'sk-open-missions',
      'sk-retry-load',
      'sk-search',
      'sk-select-work-package',
      'sk-view-artifacts',
    ]);
  });

  it('names "open a Mission" once, verb first: no element declares sk-mission-open (D-01)', () => {
    const declared: string[] = [];
    for (const declaration of declarations.values()) for (const event of declaration.events ?? []) declared.push(event.name);
    expect(declared.filter((name) => /open/.test(name) && /mission/.test(name)).sort()).toEqual([
      'sk-open-mission',
      'sk-open-mission',
      'sk-open-mission',
      'sk-open-missions',
    ]);
    expect(declared).not.toContain('sk-mission-open');
  });

  it('marks the two screens with the required status property and no slots or parts anywhere', () => {
    for (const tag of NEW_TAGS) {
      const decl = declarations.get(tag);
      expect(decl?.slots ?? [], `${tag} slots`).toEqual([]);
      expect(decl?.cssParts ?? [], `${tag} parts`).toEqual([]);
    }
    expect(NEW_TAGS.filter((tag) => declarations.get(tag)?.members?.some((m) => m.name === 'status'))).toEqual([
      'sk-missions-screen',
      'sk-pipeline-screen',
      'sk-work-package-screen',
    ]);
  });

  it('reflects status to an attribute (filter too; the typed query is deliberately not reflected, D-15)', async () => {
    const screen = document.createElement('sk-missions-screen') as HTMLElement & { status: string };
    document.body.append(screen);
    screen.status = 'ready';
    await (screen as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    expect(screen.getAttribute('status')).toBe('ready');
    screen.remove();
  });
});

describe('surface freeze: the Work Package screen (ten properties, four events)', () => {
  const tag = 'sk-work-package-screen';
  const properties = SURFACE.filter(([t]) => t === tag);

  it('has exactly ten properties and four events, no slot and no part, and no property named laneGroups', () => {
    expect(properties).toHaveLength(10);
    const declared = (declarations.get(tag)?.members ?? []).filter((m) => m.kind === 'field');
    expect(declared.map((m) => m.name).sort()).toEqual(properties.map(([, name]) => name).sort());
    expect(declared).toHaveLength(10);
    expect(declarations.get(tag)?.events).toHaveLength(4);
    expect(declarations.get(tag)?.slots ?? []).toEqual([]);
    expect(declarations.get(tag)?.cssParts ?? []).toEqual([]);
    expect(declared.map((m) => m.name)).not.toContain('laneGroups');
  });

  it('declares exactly the attributes of the contract, and every other property is property-only', () => {
    const declared = (declarations.get(tag)?.attributes ?? []).map((a) => a.name).sort();
    expect(declared).toEqual(['detail-status', 'error-message', 'now', 'status', 'wp-id']);
  });

  it('reflects status, and not detailStatus', async () => {
    const screen = document.createElement(tag) as HTMLElement & { status: string; detailStatus: string };
    document.body.append(screen);
    screen.status = 'not-found';
    screen.detailStatus = 'error';
    await (screen as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    expect(screen.getAttribute('status')).toBe('not-found');
    expect(screen.hasAttribute('detail-status')).toBe(false);
    screen.remove();
  });

  it('has ten reactive properties and exactly the five attributes at run time (the committed manifest is checked by manifest:check)', () => {
    const ctor = customElements.get(tag) as unknown as { elementProperties: Map<string, unknown>; observedAttributes: string[] };
    expect([...ctor.elementProperties.keys()].sort()).toEqual(properties.map(([, name]) => name).sort());
    expect(ctor.elementProperties.size).toBe(10);
    expect([...ctor.observedAttributes].sort()).toEqual(['detail-status', 'error-message', 'now', 'status', 'wp-id']);
  });

  it('declares no method of its own beyond the lifecycle hooks, the five dispatch methods and the private helpers', () => {
    // The screen file is frozen after this work package: a new method, public or not, is a change of the file and shows here.
    const proto = customElements.get(tag)?.prototype as object;
    const own = Object.getOwnPropertyNames(proto).filter((name) => typeof Object.getOwnPropertyDescriptor(proto, name)?.value === 'function');
    expect(own.sort()).toEqual(
      [
        'breadcrumbView',
        'constructor',
        'currentWpId',
        'effectiveState',
        'matchingDetail',
        'moveFocusIntoView',
        'openArtifact',
        'openMission',
        'openReview',
        'render',
        'renderDetailNoticeRegion',
        'renderReady',
        'renderStatus',
        'retryLoad',
        'retryPayload',
        'selectWorkPackage',
        'statusContentView',
        'transitionText',
        'updated',
        'willUpdate',
      ].sort(),
    );
    const declaredMethods = (declarations.get(tag)?.members ?? []).filter((m) => m.kind === 'method');
    expect(declaredMethods).toEqual([]);
  });
});

describe('the public type surface (BOUNDARY-004)', () => {
  it('exports the Work Package record and detail view types the screen takes as properties', async () => {
    const entry = await import('../src/index.js');
    expect(entry.SkWorkPackageScreen).toBeDefined();
    const screen = new entry.SkWorkPackageScreen();
    // Compile-time: these two names must resolve from the package entry, or `tsc` fails this file.
    const record: import('../src/index.js').WorkPackageRecordView | null = screen.workPackage;
    const detail: import('../src/index.js').WorkPackageDetailView | null = screen.detail;
    expect([record, detail]).toEqual([null, null]);
  });
});
