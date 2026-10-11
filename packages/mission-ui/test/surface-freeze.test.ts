/// <reference types="vite/client" />
// The public surface of the Missions and Pipeline elements and of the Work Package screen, frozen. The committed manifest is
// the contract: this test pins what it lists (tags, attributes, events) and the run-time defaults of every property,
// so a later work package that changes the surface fails here and reports the change instead of making it.
import { describe, expect, it } from 'vitest';
import manifest from '../custom-elements.json';
import '../src/index.js';
import { BOARD_LABEL, DEFAULT_LANE_GROUPS, PHASES_LABEL } from '../src/defaults/index.js';
import type { ShellLayout } from '../src/shell-types.js';

interface ManifestMember {
  kind: string;
  name: string;
  attribute?: string;
  default?: string;
  privacy?: string;
  reflects?: boolean;
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
      'sk-open-mission',
      'sk-open-mission',
      'sk-open-missions',
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

describe('the public type surface: the Projects screen (BOUNDARY-002)', () => {
  it('exports ProjectView, the type of ProjectEntry.project, from the package entry', async () => {
    const entry = await import('../src/index.js');
    const screen = new entry.SkProjectsScreen();
    // Compile-time: these names must resolve from the package entry, or `tsc` fails this file.
    const view: import('../src/index.js').ProjectView | undefined = screen.entries[0]?.project;
    const asEntry: import('../src/index.js').ProjectEntry = view === undefined ? { key: 'k', location: '' } : { key: 'k', location: '', project: view };
    expect(asEntry.project).toBeUndefined();
  });
});

describe('surface freeze: the Projects screen (five properties, three events) and the open-project dialog (five properties, three events)', () => {
  const SCREEN = 'sk-projects-screen';
  const DIALOG = 'sk-open-project-dialog';
  const PROJECT_SURFACE: [string, string, string | undefined, unknown][] = [
    [SCREEN, 'status', 'status', 'loading'],
    [SCREEN, 'entries', undefined, []],
    [SCREEN, 'now', 'now', null],
    [SCREEN, 'labels', undefined, null],
    [SCREEN, 'errorMessage', 'error-message', ''],
    [DIALOG, 'open', 'open', false],
    [DIALOG, 'location', 'location', ''],
    [DIALOG, 'folders', undefined, []],
    [DIALOG, 'selected', undefined, null],
    [DIALOG, 'status', 'status', 'ready'],
  ];
  const PROJECT_EVENTS: [string, string[]][] = [
    [SCREEN, ['sk-open-project', 'sk-request-open-project', 'sk-retry-load']],
    [DIALOG, ['sk-browse-folder', 'sk-confirm-open-project', 'sk-retry-load']],
  ];
  const fields = (tag: string) => (declarations.get(tag)?.members ?? []).filter((m) => m.kind === 'field');

  it('registers both tags and lists each in the committed manifest', () => {
    let checked = 0;
    for (const tag of [SCREEN, DIALOG]) {
      expect(customElements.get(tag), tag).toBeDefined();
      expect(declarations.has(tag), tag).toBe(true);
      checked += 1;
    }
    expect(checked).toBe(2);
  });

  it('has exactly five properties each, with the contract attributes and defaults, in the manifest and at run time', () => {
    expect(PROJECT_SURFACE.filter(([tag]) => tag === SCREEN)).toHaveLength(5);
    expect(PROJECT_SURFACE.filter(([tag]) => tag === DIALOG)).toHaveLength(5);
    let checked = 0;
    for (const [tag, name, attribute, expected] of PROJECT_SURFACE) {
      const member = fields(tag).find((m) => m.name === name);
      expect(member, `${tag}.${name}`).toBeDefined();
      expect(member?.attribute, `${tag}.${name} attribute`).toBe(attribute);
      expect(member?.default, `${tag}.${name} default`).toBeDefined();
      const element = document.createElement(tag) as unknown as Record<string, unknown>;
      expect(element[name], `${tag}.${name} run-time default`).toEqual(expected);
      checked += 1;
    }
    expect(checked).toBe(10);
    for (const tag of [SCREEN, DIALOG]) {
      expect(fields(tag).map((m) => m.name).sort(), tag).toEqual(PROJECT_SURFACE.filter(([t]) => t === tag).map(([, name]) => name).sort());
      expect(fields(tag), tag).toHaveLength(5);
    }
  });

  it('reflects exactly status (both) and open (dialog) in the manifest, and no other property', () => {
    let reflected = 0;
    for (const [tag] of [[SCREEN], [DIALOG]] as const) {
      const names = fields(tag).filter((m) => m.reflects === true).map((m) => m.name).sort();
      expect(names, tag).toEqual(tag === SCREEN ? ['status'] : ['open', 'status']);
      reflected += names.length;
    }
    expect(reflected).toBe(3);
  });

  it('declares exactly the attributes of the contracts; every other property is property-only', () => {
    const attributes = (tag: string) => (declarations.get(tag)?.attributes ?? []).map((a) => a.name).sort();
    expect(attributes(SCREEN)).toEqual(['error-message', 'now', 'status']);
    expect(attributes(DIALOG)).toEqual(['location', 'open', 'status']);
    const ctor = (tag: string) => customElements.get(tag) as unknown as { elementProperties: Map<string, unknown>; observedAttributes: string[] };
    expect(ctor(SCREEN).elementProperties.size).toBe(5);
    expect(ctor(DIALOG).elementProperties.size).toBe(5);
    expect([...ctor(SCREEN).observedAttributes].sort()).toEqual(['error-message', 'now', 'status']);
    expect([...ctor(DIALOG).observedAttributes].sort()).toEqual(['location', 'open', 'status']);
  });

  it('declares exactly three events each, no slot and no part; sk-retry-load is the one shared name', () => {
    let checked = 0;
    for (const [tag, expected] of PROJECT_EVENTS) {
      expect((declarations.get(tag)?.events ?? []).map((e) => e.name).sort(), tag).toEqual(expected);
      expect(declarations.get(tag)?.events, tag).toHaveLength(3);
      expect(declarations.get(tag)?.slots ?? [], `${tag} slots`).toEqual([]);
      expect(declarations.get(tag)?.cssParts ?? [], `${tag} parts`).toEqual([]);
      checked += 1;
    }
    expect(checked).toBe(2);
    const retryDeclarers = [...declarations.entries()]
      .filter(([, declaration]) => (declaration.events ?? []).some((e) => e.name === 'sk-retry-load'))
      .map(([tag]) => tag)
      .sort();
    expect(retryDeclarers).toEqual(['sk-artifact-screen', 'sk-drift-screen', 'sk-open-project-dialog', 'sk-projects-screen', 'sk-work-package-screen']);
    // `some` per tag would pass a component that declares the event twice: count every declaration of the name.
    const retryDeclarations = [...declarations.values()].reduce((total, declaration) => total + (declaration.events ?? []).filter((e) => e.name === 'sk-retry-load').length, 0);
    expect(retryDeclarations).toBe(5);
  });

  it('marks the Projects screen, and not the dialog, as a screen with the `@screen` line the manifest gate looks for', async () => {
    const sources = import.meta.glob('../src/elements/{sk-projects-screen/sk-projects-screen,sk-open-project-dialog/sk-open-project-dialog}.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const marker = /^[ \t]*\*[ \t]*@screen[ \t]*$/m;
    const keys = Object.keys(sources).sort();
    expect(keys).toHaveLength(2);
    expect(marker.test(sources[keys.find((key) => key.includes('sk-projects-screen.ts')) ?? ''] ?? '')).toBe(true);
    expect(marker.test(sources[keys.find((key) => key.includes('sk-open-project-dialog.ts')) ?? ''] ?? '')).toBe(false);
    // Both carry a status property: the screen because the gate requires it, the dialog because it states its listing.
    expect(fields(SCREEN).some((m) => m.name === 'status')).toBe(true);
    expect(fields(DIALOG).some((m) => m.name === 'status')).toBe(true);
  });

  it('reflects status on both, and open on the dialog', async () => {
    const screen = document.createElement(SCREEN) as HTMLElement & { status: string; updateComplete: Promise<boolean> };
    const dialog = document.createElement(DIALOG) as HTMLElement & { status: string; open: boolean; updateComplete: Promise<boolean> };
    document.body.append(screen, dialog);
    screen.status = 'ready';
    dialog.status = 'error';
    dialog.open = true;
    await Promise.all([screen.updateComplete, dialog.updateComplete]);
    expect(screen.getAttribute('status')).toBe('ready');
    expect(dialog.getAttribute('status')).toBe('error');
    expect(dialog.hasAttribute('open')).toBe(true);
    screen.remove();
    dialog.remove();
  });

  it('declares no method beyond the lifecycle hooks, the dispatch methods and the private helpers', () => {
    // Both element files are frozen after this work package: a new method, public or not, is a change of the file and shows here.
    const own = (tag: string) => {
      const proto = customElements.get(tag)?.prototype as object;
      return Object.getOwnPropertyNames(proto)
        .filter((name) => typeof Object.getOwnPropertyDescriptor(proto, name)?.value === 'function')
        .sort();
    };
    expect(own(SCREEN)).toEqual(
      ['constructor', 'entryText', 'moveFocusIntoView', 'openProject', 'render', 'renderBody', 'requestOpenProject', 'retryProject', 'retryProjects', 'stateText', 'transitionText', 'updated', 'willUpdate'].sort(),
    );
    expect(own(DIALOG)).toEqual(
      ['closeDialog', 'confirmOpen', 'constructor', 'focusFirstControl', 'listingText', 'render', 'renderListing', 'retryFolders', 'returnFocus', 'selectFolder', 'selectedValid', 'updated', 'willUpdate'].sort(),
    );
    expect((declarations.get(SCREEN)?.members ?? []).filter((m) => m.kind === 'method')).toEqual([]);
    expect((declarations.get(DIALOG)?.members ?? []).filter((m) => m.kind === 'method')).toEqual([]);
  });
});

describe('surface freeze: the shell layout value set', () => {
  it('lists project, mission and picker, in the manifest and as the type', () => {
    const layouts: ShellLayout[] = ['project', 'mission', 'picker'];
    const member = (declarations.get('sk-mission-shell')?.members ?? []).find((m) => m.kind === 'field' && m.name === 'layout') as (ManifestMember & { description?: string; type?: { text: string } }) | undefined;
    expect(member?.attribute).toBe('layout');
    expect(member?.default).toBe("'project'");
    expect(member?.type?.text).toBe('ShellLayout');
    let found = 0;
    for (const layout of layouts) {
      expect(member?.description, layout).toContain(`\`${layout}\``);
      found += 1;
    }
    expect(found).toBe(3);
    expect(layouts).toHaveLength(3);
  });

  it('resolves picker exactly and keeps the fallback to project for any other value', async () => {
    const shell = document.createElement('sk-mission-shell') as HTMLElement & { layout: string; updateComplete: Promise<boolean> };
    document.body.append(shell);
    const resolved: Record<string, boolean> = {};
    for (const layout of ['picker', 'project', 'mission', 'bogus']) {
      shell.layout = layout;
      await shell.updateComplete;
      resolved[layout] = shell.shadowRoot?.querySelector('sk-context-sidebar, sk-personal-rail') === null;
    }
    // picker draws no navigation; the others keep theirs (a project-layout shell has the context sidebar or the rail).
    expect(resolved['picker']).toBe(true);
    expect(Object.keys(resolved)).toHaveLength(4);
    expect(resolved['bogus']).toBe(resolved['project']);
    shell.remove();
  });
});

describe('the public type surface of the Artifact Viewer (BOUNDARY-001, BOUNDARY-002, BOUNDARY-003)', () => {
  it('exports the two tree helpers from the package entry', async () => {
    const entry = await import('../src/index.js');
    expect(typeof entry.buildArtifactTree).toBe('function');
    expect(typeof entry.pathOfArtifactNode).toBe('function');
  });

  it('resolves every type a host needs to fill the properties and listen to the events (compile-time: tsc fails this file otherwise)', async () => {
    const entry = await import('../src/index.js');
    const screen = new entry.SkArtifactScreen();
    // Compile-time: each name must resolve from the package entry. The assignments pin the property types they describe.
    const listing: import('../src/index.js').ArtifactListingView | null = screen.listing;
    const content: import('../src/index.js').ArtifactContentView | null = screen.content;
    const entries: import('../src/index.js').ArtifactEntryView[] = listing?.entries ?? [];
    const status: import('../src/index.js').ArtifactStatus = screen.status;
    const contentStatus: import('../src/index.js').ArtifactContentStatus = screen.contentStatus;
    const tab: import('../src/index.js').ArtifactTab = screen.view;
    const mission: import('../src/index.js').ArtifactScreenMission | null = screen.mission;
    const workPackages: import('../src/index.js').ArtifactScreenWorkPackage[] = screen.workPackages;
    const labels: import('../src/index.js').ArtifactLabelHooks | null = screen.labels;
    const vocabulary: import('../src/index.js').ArtifactVocabulary | null = screen.vocabulary;
    const options: import('../src/index.js').ArtifactTreeOptions | null = null;
    const result: import('../src/index.js').ArtifactTreeResult | null = null;
    expect([listing, content, entries, status, contentStatus, tab, mission, workPackages, labels, vocabulary, options, result]).toEqual([
      null, null, [], 'loading', 'ready', 'rendered', null, [], null, null, null, null,
    ]);
  });

  it('types the two link events on addEventListener (compile-time: a missing HTMLElementEventMap entry makes e.detail an error)', () => {
    const screen = document.createElement('sk-artifact-screen');
    const seen: string[] = [];
    screen.addEventListener('sk-select-artifact', (e) => seen.push(e.detail.path));
    screen.addEventListener('sk-open-link', (e) => seen.push(e.detail.href));
    screen.dispatchEvent(new CustomEvent('sk-select-artifact', { detail: { path: 'spec.md' } }));
    screen.dispatchEvent(new CustomEvent('sk-open-link', { detail: { href: 'https://example.invalid/' } }));
    expect(seen).toEqual(['spec.md', 'https://example.invalid/']);
  });
});

describe('surface freeze: the Artifact Viewer (thirteen properties, five events)', () => {
  const tag = 'sk-artifact-screen';
  /** property name, attribute (undefined = property only), default as a run-time value. */
  const ARTIFACT_SURFACE: [string, string | undefined, unknown][] = [
    ['status', 'status', 'loading'],
    ['contentStatus', 'content-status', 'ready'],
    ['listing', undefined, null],
    ['content', undefined, null],
    ['refusalCode', undefined, null],
    ['selectedPath', 'selected-path', ''],
    ['mission', undefined, null],
    ['workPackages', undefined, []],
    ['view', 'view', 'rendered'],
    ['now', 'now', null],
    ['labels', undefined, null],
    ['errorMessage', 'error-message', ''],
    ['vocabulary', undefined, null],
  ];
  const ARTIFACT_EVENTS = ['sk-open-link', 'sk-open-mission', 'sk-retry-load', 'sk-select-artifact', 'sk-select-work-package'];

  it('is registered and listed in the committed manifest', () => {
    expect(customElements.get(tag)).toBeDefined();
    expect(declarations.has(tag)).toBe(true);
  });

  it('lists exactly thirteen properties, each with its attribute and default in the manifest', () => {
    expect(ARTIFACT_SURFACE).toHaveLength(13);
    const declared = (declarations.get(tag)?.members ?? []).filter((m) => m.kind === 'field' && m.privacy !== 'private');
    expect(declared.map((m) => m.name).sort()).toEqual(ARTIFACT_SURFACE.map(([name]) => name).sort());
    let checked = 0;
    for (const [name, attribute] of ARTIFACT_SURFACE) {
      const member = declared.find((m) => m.name === name);
      expect(member?.attribute, `${name} attribute`).toBe(attribute);
      expect(member?.default, `${name} default`).toBeDefined();
      checked += 1;
    }
    expect(checked).toBe(13);
  });

  it('gives every property its contract default at run time', () => {
    const el = document.createElement(tag) as unknown as Record<string, unknown>;
    let checked = 0;
    for (const [name, , expected] of ARTIFACT_SURFACE) {
      expect(el[name], name).toEqual(expected);
      checked += 1;
    }
    expect(checked).toBe(13);
  });

  it('declares exactly the attributes of the contract and no slot and no part', () => {
    const declared = (declarations.get(tag)?.attributes ?? []).map((a) => a.name).sort();
    expect(declared).toEqual(['content-status', 'error-message', 'now', 'selected-path', 'status', 'view']);
    expect(declarations.get(tag)?.slots ?? []).toEqual([]);
    expect(declarations.get(tag)?.cssParts ?? []).toEqual([]);
  });

  it('declares exactly the five events of the contract', () => {
    const names = (declarations.get(tag)?.events ?? []).map((e) => e.name).sort();
    expect(names).toEqual(ARTIFACT_EVENTS);
  });

  it('states the host obligation of sk-open-link in the manifest text: the href is untrusted', () => {
    const event = (declarations.get(tag)?.events ?? []).find((e) => e.name === 'sk-open-link') as { name: string; description?: string } | undefined;
    expect(event?.description ?? '').toContain('untrusted');
    // Positive control: the other events do not carry the word, so the assertion is about this event's own text.
    const other = (declarations.get(tag)?.events ?? []).find((e) => e.name === 'sk-open-mission') as { description?: string } | undefined;
    expect(other?.description ?? '').not.toContain('untrusted');
  });
});

describe('surface freeze: the Drift screen (eleven properties, six events)', () => {
  const tag = 'sk-drift-screen';
  // tag, property, attribute (undefined = property only), default
  const DRIFT: [string, string | undefined, unknown][] = [
    ['status', 'status', 'loading'],
    ['report', undefined, null],
    ['selectedFinding', undefined, null],
    ['missionId', 'mission-id', ''],
    ['missions', undefined, null],
    ['rescanning', 'rescanning', false],
    ['copyResult', 'copy-result', null],
    ['refusalCode', 'refusal-code', null],
    ['now', 'now', null],
    ['labels', undefined, null],
    ['errorMessage', 'error-message', ''],
  ];
  const ATTRIBUTES = ['copy-result', 'error-message', 'mission-id', 'now', 'refusal-code', 'rescanning', 'status'];

  it('is registered and listed in the committed manifest', () => {
    expect(customElements.get(tag)).toBeDefined();
    expect(declarations.has(tag)).toBe(true);
  });

  it('has exactly eleven properties, each with its attribute and default in the manifest', () => {
    expect(DRIFT).toHaveLength(11);
    const declared = (declarations.get(tag)?.members ?? []).filter((m) => m.kind === 'field');
    expect(declared.map((m) => m.name).sort()).toEqual(DRIFT.map(([name]) => name).sort());
    expect(declared).toHaveLength(11);
    let checked = 0;
    for (const [name, attribute] of DRIFT) {
      const member = declared.find((m) => m.name === name);
      expect(member?.attribute, `${name} attribute`).toBe(attribute);
      expect(member?.default, `${name} default`).toBeDefined();
      checked += 1;
    }
    expect(checked).toBe(11);
  });

  it('has none of the properties the contract deliberately lacks', () => {
    const names = (declarations.get(tag)?.members ?? []).map((m) => m.name);
    let checked = 0;
    for (const absent of ['findings', 'sort', 'sortBy', 'filter', 'page', 'pageInfo', 'cursor', 'clipboard', 'selectedIndex']) {
      expect(names, absent).not.toContain(absent);
      checked += 1;
    }
    expect(checked).toBe(9);
  });

  it('gives every property its contract default at run time', () => {
    const el = document.createElement(tag) as unknown as Record<string, unknown>;
    let checked = 0;
    for (const [name, , expected] of DRIFT) {
      expect(el[name], name).toEqual(expected);
      checked += 1;
    }
    expect(checked).toBe(11);
  });

  it('declares exactly the six events, the three new ones among them, no slot and no part', () => {
    const names = (declarations.get(tag)?.events ?? []).map((e) => e.name).sort();
    expect(names).toEqual(['sk-copy-command', 'sk-open-mission', 'sk-open-missions', 'sk-rescan-drift', 'sk-retry-load', 'sk-select-finding']);
    expect(declarations.get(tag)?.events).toHaveLength(6);
    expect(declarations.get(tag)?.slots ?? []).toEqual([]);
    expect(declarations.get(tag)?.cssParts ?? []).toEqual([]);
  });

  it('declares exactly the attributes of the contract, and every other property is property-only', () => {
    expect((declarations.get(tag)?.attributes ?? []).map((a) => a.name).sort()).toEqual(ATTRIBUTES);
    const ctor = customElements.get(tag) as unknown as { elementProperties: Map<string, unknown>; observedAttributes: string[] };
    expect([...ctor.elementProperties.keys()].sort()).toEqual(DRIFT.map(([name]) => name).sort());
    expect(ctor.elementProperties.size).toBe(11);
    expect([...ctor.observedAttributes].sort()).toEqual(ATTRIBUTES);
  });

  it('reflects status, and neither rescanning nor copyResult', async () => {
    const screen = document.createElement(tag) as HTMLElement & { status: string; rescanning: boolean; copyResult: string | null };
    document.body.append(screen);
    screen.status = 'not-found';
    screen.rescanning = true;
    screen.copyResult = 'copied';
    await (screen as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    expect(screen.getAttribute('status')).toBe('not-found');
    expect(screen.hasAttribute('rescanning')).toBe(false);
    expect(screen.hasAttribute('copy-result')).toBe(false);
    screen.remove();
  });

  it('reads its attributes: mission-id, rescanning, copy-result, refusal-code, now and error-message', async () => {
    const screen = document.createElement(tag) as unknown as HTMLElement & Record<string, unknown>;
    screen.setAttribute('mission-id', 'M1');
    screen.setAttribute('rescanning', '');
    screen.setAttribute('copy-result', 'manual');
    screen.setAttribute('refusal-code', 'x_code');
    screen.setAttribute('now', '2026-10-06T09:00:00Z');
    screen.setAttribute('error-message', 'words');
    document.body.append(screen);
    await (screen as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    expect([screen['missionId'], screen['rescanning'], screen['copyResult'], screen['refusalCode'], screen['now'], screen['errorMessage']]).toEqual(['M1', true, 'manual', 'x_code', '2026-10-06T09:00:00Z', 'words']);
    screen.remove();
  });

  it('declares no method of its own beyond the lifecycle hooks, the six dispatch methods and the private helpers', () => {
    // The screen file is frozen after this work package: a new method, public or not, is a change of the file and shows here.
    const proto = customElements.get(tag)?.prototype as object;
    const own = Object.getOwnPropertyNames(proto).filter((name) => typeof Object.getOwnPropertyDescriptor(proto, name)?.value === 'function');
    expect(own.sort()).toEqual(
      [
        'constructor',
        'copyCommand',
        'detailProps',
        'effectiveState',
        'focusFellToBody',
        'headerProps',
        'listProps',
        'manualReadBack',
        'moveFocusIntoView',
        'openMission',
        'openMissions',
        'render',
        'renderDetailRegion',
        'renderReady',
        'renderState',
        'rescanDrift',
        'retryLoad',
        'selectFinding',
        'selectedPosition',
        'selectedView',
        'shownCopyResult',
        'shownReport',
        'stateProps',
        'updated',
        'willUpdate',
      ].sort(),
    );
    expect((declarations.get(tag)?.members ?? []).filter((m) => m.kind === 'method')).toEqual([]);
  });

  it('exports the element, every view type a host needs and the event detail types from the package entry (compile-time)', async () => {
    const entry = await import('../src/index.js');
    expect(entry.SkDriftScreen).toBeDefined();
    const screen = new entry.SkDriftScreen();
    // Compile-time: these names must resolve from the package entry, or `tsc` fails this file.
    const report: import('../src/index.js').DriftReportView | null = screen.report;
    const key: import('../src/index.js').DriftFindingKey | null = screen.selectedFinding;
    const names: Readonly<Record<string, import('../src/index.js').DriftMissionName>> | null = screen.missions;
    const status: import('../src/index.js').DriftScreenStatus = screen.status;
    const copy: import('../src/index.js').DriftCopyResult | null = screen.copyResult;
    const hooks: import('../src/index.js').LabelHooks | null = screen.labels;
    const contract: import('../src/index.js').DriftReport | null = null;
    const finding: import('../src/index.js').DriftFinding | null = null;
    const view: [import('../src/index.js').DriftFindingView | null, import('../src/index.js').LaneComparisonView | null] = [null, null];
    const refusal: [import('../src/index.js').DriftRefusal | null, import('../src/index.js').DriftRefusalCode | null] = [null, null];
    // the Drift member joins the event union only; `RetryLoadDetail` (the Work Package and Projects payload) stays exact
    const retry: import('../src/index.js').RetryLoadEventDetail = { missionId: null, target: 'drift-report' };
    // @ts-expect-error the Drift member is not part of RetryLoadDetail
    const notWp: import('../src/index.js').RetryLoadDetail = { missionId: null, target: 'drift-report' };
    void notWp;
    const drift: import('../src/index.js').DriftRetryDetail = { missionId: null, target: 'drift-report' };
    const details: [
      import('../src/index.js').SkSelectFindingDetail,
      import('../src/index.js').SkRescanDriftDetail,
      import('../src/index.js').SkCopyCommandDetail,
      import('../src/index.js').SkDriftRetryLoadDetail,
    ] = [{ missionId: 'm', kind: 'k', artifactPath: 'p' }, { missionId: null }, { text: 't', missionId: 'm', remedy: 'r' }, drift];
    expect([report, key, names, status, copy, hooks, contract, finding, view, refusal, retry.target, details.length]).toEqual([null, null, null, 'loading', null, null, null, null, [null, null], [null, null], 'drift-report', 4]);
    // the three new events are typed on HTMLElementEventMap: the detail needs no cast
    screen.addEventListener('sk-select-finding', (event) => void event.detail.artifactPath);
    screen.addEventListener('sk-rescan-drift', (event) => void event.detail.missionId);
    screen.addEventListener('sk-copy-command', (event) => void event.detail.text);
    // a listener for `sk-retry-load` on this screen sees the Drift member without a cast (it falls out of the event map if the member does)
    screen.addEventListener('sk-retry-load', (event) => {
      if (event.detail.target === 'drift-report') void event.detail.missionId;
    });
  });
});
