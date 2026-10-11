// The fixture registry: every fixture export, the schema it validates against, its kind and its TypeScript target,
// plus the named relaxations. Nothing here touches the file system; validate.mjs applies the patches.
//
// kind: 'valid'   validates as is (the export `satisfies` the contract type)
//       'host'    carries host-only fields (`stale`, `actor`), stripped before validation (satisfies the view type)
//       'relaxed' deviates from the contract by one NAMED relaxation (reverted-must-fail proof in check.mjs)
const f = (schema, kind, satisfies, relaxation) => ({ schema, kind, satisfies, ...(relaxation ? { relaxation } : {}) });

export const FIXTURES = {
  project: f('Project', 'valid', 'Project'),
  projectEmpty: f('Project', 'valid', 'Project'),
  // ---- Projects screen (mission-ui#9): two host overlays the contract examples do not give ----
  projectUnknownHealth: f('Project', 'relaxed', 'ProjectView', 'health-open'),
  projectLong: f('Project', 'valid', 'Project'),
  projectSchemaDrift: f('Project', 'valid', 'Project'),
  projectAllNull: f('Project', 'valid', 'Project'),
  pageMixed: f('MissionOverviewPage', 'host', 'MissionOverviewPageView'),
  pageFull: f('MissionOverviewPage', 'host', 'MissionOverviewPageView'),
  pageLast: f('MissionOverviewPage', 'host', 'MissionOverviewPageView'),
  pageFirst: f('MissionOverviewPage', 'valid', 'MissionOverviewPage'),
  pageExhausted: f('MissionOverviewPage', 'valid', 'MissionOverviewPage'),
  pageLong: f('MissionOverviewPage', 'valid', 'MissionOverviewPage'),
  pageLongNames: f('MissionOverviewPage', 'valid', 'MissionOverviewPage'),
  detailImplement: f('MissionDetail', 'valid', 'MissionDetail'),
  detailBothInProgress: f('MissionDetail', 'valid', 'MissionDetail'),
  detailEarly: f('MissionDetail', 'valid', 'MissionDetail'),
  detailAllPending: f('MissionDetail', 'valid', 'MissionDetail'),
  detailAllComplete: f('MissionDetail', 'valid', 'MissionDetail'),
  detailBlockers: f('MissionDetail', 'valid', 'MissionDetail'),
  detailBadges: f('MissionDetail', 'host', 'MissionDetailView'),
  detailSubtasks: f('MissionDetail', 'valid', 'MissionDetail'),
  detailLongNames: f('MissionDetail', 'valid', 'MissionDetail'),
  detailPhases3: f('MissionDetail', 'relaxed', 'MissionDetailView', 'phases-open'),
  detailPhases7: f('MissionDetail', 'relaxed', 'MissionDetailView', 'phases-open'),
  detailUnknownLane: f('MissionDetail', 'relaxed', 'MissionDetailView', 'lane-open'),
  detailCustomGroups: f('MissionDetail', 'valid', 'MissionDetail'),

  // ---- Work Package detail screen (mission-ui#5): 27 Work Package fixtures, 21 detail and refusal fixtures ----
  wpPopulated: f('WorkPackage', 'valid', 'WorkPackage'),
  wpWithPrompt: f('WorkPackage', 'valid', 'WorkPackage'),
  wpProvisional: f('WorkPackage', 'valid', 'WorkPackage'),
  wpNoEvents: f('WorkPackage', 'valid', 'WorkPackage'),
  wpActorStructured: f('WorkPackage', 'valid', 'WorkPackage'),
  wpActorHandle: f('WorkPackage', 'valid', 'WorkPackage'),
  wpActorRedacted: f('WorkPackage', 'valid', 'WorkPackage'),
  wpCanceled: f('WorkPackage', 'valid', 'WorkPackage'),
  wpCanceledSynthetic: f('WorkPackage', 'valid', 'WorkPackage'),
  wpCanceledNullReason: f('WorkPackage', 'valid', 'WorkPackage'),
  wpOverride: f('WorkPackage', 'valid', 'WorkPackage'),
  wpOverridePartial: f('WorkPackage', 'valid', 'WorkPackage'),
  wpReviewNone: f('WorkPackage', 'valid', 'WorkPackage'),
  wpApproved: f('WorkPackage', 'valid', 'WorkPackage'),
  wpChangesRequested: f('WorkPackage', 'valid', 'WorkPackage'),
  wpDone: f('WorkPackage', 'valid', 'WorkPackage'),
  wpHistoryRich: f('WorkPackage', 'valid', 'WorkPackage'),
  wpStale: f('WorkPackage', 'valid', 'WorkPackage'),
  wpFresh: f('WorkPackage', 'valid', 'WorkPackage'),
  wpNotApplicable: f('WorkPackage', 'valid', 'WorkPackage'),
  wpStalenessOmitted: f('WorkPackage', 'relaxed', 'WorkPackageRecordView', 'provisional-omittable'),
  wpFactsNull: f('WorkPackage', 'valid', 'WorkPackage'),
  wpBlocked: f('WorkPackage', 'valid', 'WorkPackage'),
  wpReady: f('WorkPackage', 'valid', 'WorkPackage'),
  wpLong: f('WorkPackage', 'valid', 'WorkPackage'),
  wpBulkHistory: f('WorkPackage', 'valid', 'WorkPackage'),
  wpUnknownLane: f('WorkPackage', 'relaxed', 'WorkPackageRecordView', 'wp-lane-open'),
  detailPopulated: f('WorkPackageDetail', 'valid', 'WorkPackageDetail'),
  detailNoCycles: f('WorkPackageDetail', 'valid', 'WorkPackageDetail'),
  detailNullWorkspace: f('WorkPackageDetail', 'valid', 'WorkPackageDetail'),
  detailWorkspaceNoWorktree: f('WorkPackageDetail', 'valid', 'WorkPackageDetail'),
  detailPlanningLane: f('WorkPackageDetail', 'valid', 'WorkPackageDetail'),
  detailUnknownChangeState: f('WorkPackageDetail', 'valid', 'WorkPackageDetail'),
  detailUnparseableCycle: f('WorkPackageDetail', 'valid', 'WorkPackageDetail'),
  detailRefusalNotFound: f('WorkPackageDetailRefusal', 'valid', 'WorkPackageDetailRefusal'),
  detailRefusalUnreadable: f('WorkPackageDetailRefusal', 'valid', 'WorkPackageDetailRefusal'),
  detailSubtasksNone: f('WorkPackageDetail', 'valid', 'WorkPackageDetail'),
  detailSubtaskNulls: f('WorkPackageDetail', 'valid', 'WorkPackageDetail'),
  detailDepsNone: f('WorkPackageDetail', 'valid', 'WorkPackageDetail'),
  detailDepsBlocked: f('WorkPackageDetail', 'valid', 'WorkPackageDetail'),
  detailDepNullLane: f('WorkPackageDetail', 'valid', 'WorkPackageDetail'),
  detailOwnedNone: f('WorkPackageDetail', 'valid', 'WorkPackageDetail'),
  detailLinksPromptNull: f('WorkPackageDetail', 'valid', 'WorkPackageDetail'),
  detailLinksNone: f('WorkPackageDetail', 'valid', 'WorkPackageDetail'),
  detailRedaction: f('WorkPackageDetail', 'valid', 'WorkPackageDetail'),
  detailLong: f('WorkPackageDetail', 'valid', 'WorkPackageDetail'),
  detailUnknownLanes: f('WorkPackageDetail', 'relaxed', 'WorkPackageDetailView', 'detail-lane-open'),
  detailOmittedProvisional: f('WorkPackageDetail', 'relaxed', 'WorkPackageDetailView', 'detail-omittable'),

  // ---- Artifact Viewer screen (mission-ui#7): 13 contract examples and 17 overlays, 30 documents (27 valid, 3 relaxed) ----
  listingPopulated: f('ArtifactListing', 'valid', 'ArtifactListing'),
  listingTruncated: f('ArtifactListing', 'valid', 'ArtifactListing'),
  contentMarkdown: f('ArtifactContent', 'valid', 'ArtifactContent'),
  contentRedacted: f('ArtifactContent', 'valid', 'ArtifactContent'),
  contentJson: f('ArtifactContent', 'valid', 'ArtifactContent'),
  contentEmpty: f('ArtifactContent', 'valid', 'ArtifactContent'),
  refusalInvalidPath: f('ArtifactRefusal', 'valid', 'ArtifactRefusal'),
  refusalNotFound: f('ArtifactRefusal', 'valid', 'ArtifactRefusal'),
  refusalTooLarge: f('ArtifactRefusal', 'valid', 'ArtifactRefusal'),
  refusalNotText: f('ArtifactRefusal', 'valid', 'ArtifactRefusal'),
  refusalSecret: f('ArtifactRefusal', 'valid', 'ArtifactRefusal'),
  refusalUnreadable: f('ArtifactRefusal', 'valid', 'ArtifactRefusal'),
  refusalListingUnreadable: f('ArtifactRefusal', 'valid', 'ArtifactRefusal'),
  listingWithOpenFiles: f('ArtifactListing', 'valid', 'ArtifactListing'),
  listingEmpty: f('ArtifactListing', 'valid', 'ArtifactListing'),
  listingUnreadableRows: f('ArtifactListing', 'valid', 'ArtifactListing'),
  listingUnknownKind: f('ArtifactListing', 'relaxed', 'ArtifactListingView', 'artifact-kind-open'),
  contentUnknownKind: f('ArtifactContent', 'relaxed', 'ArtifactContentView', 'artifact-kind-open'),
  refusalUnknownCode: f('ArtifactRefusal', 'relaxed', 'ArtifactRefusalView', 'refusal-code-open'),
  listingLongNames: f('ArtifactListing', 'valid', 'ArtifactListing'),
  listingDeep: f('ArtifactListing', 'valid', 'ArtifactListing'),
  contentFeatures: f('ArtifactContent', 'valid', 'ArtifactContent'),
  contentHostile: f('ArtifactContent', 'valid', 'ArtifactContent'),
  contentYaml: f('ArtifactContent', 'valid', 'ArtifactContent'),
  contentJsonl: f('ArtifactContent', 'valid', 'ArtifactContent'),
  contentCsv: f('ArtifactContent', 'valid', 'ArtifactContent'),
  contentPlain: f('ArtifactContent', 'valid', 'ArtifactContent'),
  contentBom: f('ArtifactContent', 'valid', 'ArtifactContent'),
  contentPrompt: f('ArtifactContent', 'valid', 'ArtifactContent'),
  contentReviewCycle: f('ArtifactContent', 'valid', 'ArtifactContent'),

  // ---- Drift screen (mission-ui#10): the six contract examples and eleven overlays. The 1000-finding report is NOT here:
  // bulk.ts generates it and gate `contract` validates it (check.mjs, checkBulk), as for the 500-Mission page. ----
  reportPopulated: f('DriftReport', 'valid', 'DriftReport'),
  reportClean: f('DriftReport', 'valid', 'DriftReport'),
  reportCorruptJson: f('DriftReport', 'valid', 'DriftReport'),
  reportTruncated: f('DriftReport', 'valid', 'DriftReport'),
  refusalMissionNotFound: f('DriftRefusal', 'valid', 'DriftRefusal'),
  refusalScanUnreadable: f('DriftRefusal', 'valid', 'DriftRefusal'),
  reportUnknownKind: f('DriftReport', 'relaxed', 'DriftReportView', 'drift-vocabulary-open'),
  reportUnknownSeverity: f('DriftReport', 'relaxed', 'DriftReportView', 'drift-vocabulary-open'),
  reportUnknownAuthority: f('DriftReport', 'relaxed', 'DriftReportView', 'drift-vocabulary-open'),
  reportUnknownRemedy: f('DriftReport', 'relaxed', 'DriftReportView', 'drift-vocabulary-open'),
  reportUnknownSourceCode: f('DriftReport', 'valid', 'DriftReport'),
  reportOneSidedLane: f('DriftReport', 'valid', 'DriftReport'),
  reportManyLanes: f('DriftReport', 'valid', 'DriftReport'),
  reportLongSlugMission: f('DriftReport', 'valid', 'DriftReport'),
  reportMissionUnlisted: f('DriftReport', 'valid', 'DriftReport'),
  reportScoped: f('DriftReport', 'valid', 'DriftReport'),
  reportScopedForeign: f('DriftReport', 'valid', 'DriftReport'),
};

/** Every distinct `satisfies` target, for the generated import line. */
export const SATISFIES_TARGETS = [...new Set(Object.values(FIXTURES).map((x) => x.satisfies))].sort();

/**
 * Named relaxations. `schema` is the name of the schema the patch applies to, or a list of names. `patch` is applied to a `structuredClone` of the dereferenced schema (never to the pristine
 * copy). `allowedPath` is the pattern every error of the STRICT validator must match for a fixture of this
 * relaxation: a second, unrelated defect cannot hide behind the relaxation.
 *
 * Tally rule of `lane-open` (also the rule C5 applies): the nine known lanes only; a work package with a null or
 * unknown lane is in no count and not in `wpTotal`.
 */
export const RELAXATIONS = {
  'phases-open': {
    schema: 'MissionDetail',
    description: 'phases loses minItems/maxItems and MissionPhase.name becomes an open string; the name-conditioned allOf is kept',
    allowedPath: /^\/phases(\/\d+\/name)?$/,
    patch(schema) {
      const part = schema.allOf.find((x) => x.properties && x.properties.phases);
      delete part.properties.phases.minItems;
      delete part.properties.phases.maxItems;
      part.properties.phases.items.properties.name = { type: 'string', minLength: 1 };
    },
  },
  'lane-open': {
    schema: 'MissionDetail',
    description: 'WorkPackageSummary.statusLane becomes an open string or null; unknown and null lanes are uncounted',
    allowedPath: /^\/workPackages\/\d+\/statusLane$/,
    patch(schema) {
      const part = schema.allOf.find((x) => x.properties && x.properties.workPackages);
      part.properties.workPackages.items.properties.statusLane = { type: ['string', 'null'] };
    },
  },
  // ---- mission-ui#5: lane members of the Work Package and its detail become open strings; nothing else changes ----
  'wp-lane-open': {
    schema: 'WorkPackage',
    description: 'WorkPackage.statusLane, history[].fromStatusLane (or null), history[].toStatusLane and the values of the open subtasks map become open strings',
    allowedPath: /^(?:\/statusLane|\/history\/\d+\/(?:from|to)StatusLane|\/subtasks\/[^/]+)$/,
    patch(schema) {
      schema.properties.statusLane = { type: ['string', 'null'] };
      const entry = schema.properties.history.items.properties;
      entry.fromStatusLane = { type: ['string', 'null'] };
      entry.toStatusLane = { type: 'string' };
      schema.properties.subtasks.additionalProperties = { type: 'string' };
    },
  },
  'detail-lane-open': {
    schema: 'WorkPackageDetail',
    description: 'Subtask.statusLane and DependencyRef.statusLane of the detail become open strings or null',
    allowedPath: /^(?:\/subtasks\/\d+\/statusLane|\/dependencies\/\d+\/statusLane)$/,
    patch(schema) {
      schema.properties.subtasks.items.properties.statusLane = { type: ['string', 'null'] };
      schema.properties.dependencies.items.properties.statusLane = { type: ['string', 'null'] };
    },
  },
  'provisional-omittable': {
    schema: 'WorkPackage',
    description: 'staleness is removed from required (a host may omit the provisional member); nothing else changes',
    allowedPath: /^$/,
    allowedMissing: ['staleness'],
    patch(schema) {
      schema.required = schema.required.filter((k) => k !== 'staleness');
    },
  },
  'detail-omittable': {
    schema: 'WorkPackageDetail',
    description: 'reviewCycles and workspace are removed from required (a host may omit the provisional members); nothing else changes',
    allowedPath: /^$/,
    allowedMissing: ['reviewCycles', 'workspace'],
    patch(schema) {
      schema.required = schema.required.filter((k) => k !== 'reviewCycles' && k !== 'workspace');
    },
  },
  // ---- mission-ui#9: ProjectHealth is provisional and a client must tolerate a value it does not know ----
  'health-open': {
    schema: 'Project',
    description: 'Project.health becomes an open string; nothing else changes',
    allowedPath: /^\/health$/,
    patch(schema) {
      schema.properties.health = { type: 'string' };
    },
  },
  // ---- mission-ui#7: the artifact vocabulary is provisional upstream, so a kind and a refusal code the screen has never seen must survive ----
  'artifact-kind-open': {
    // one relaxation, two schemas: the kind of a listing entry (ArtifactEntry) and the kind of a content (ArtifactContent)
    schema: ['ArtifactListing', 'ArtifactContent'],
    description: 'ArtifactEntry.kind and ArtifactContent.kind become non-empty open strings; nothing else changes',
    allowedPath: /^\/entries\/\d+\/kind$|^\/kind$/,
    patch(schema) {
      const open = { type: 'string', minLength: 1 };
      if (schema.properties.entries) schema.properties.entries.items.properties.kind = open;
      else schema.properties.kind = open;
    },
  },
  'refusal-code-open': {
    schema: 'ArtifactRefusal',
    description: 'the code of ArtifactRefusal becomes a non-empty open string; the status rules of the seven codes stay',
    allowedPath: /^\/code$/,
    patch(schema) {
      // the LAST allOf entry is the one that carries the closed seven-value code enum
      schema.allOf[schema.allOf.length - 1].properties.code = { type: 'string', minLength: 1 };
    },
  },
  // ---- mission-ui#10: the vocabularies of a Drift finding are provisional and a client must tolerate a word it does not know ----
  'drift-vocabulary-open': {
    schema: 'DriftReport',
    description: 'DriftFinding.kind, severity, authority, derivedSide and remedy (or null) and LaneComparison.persistedStatusLane and derivedStatusLane (or null) become open strings; sourceCode is a pattern and needs no widening',
    allowedPath: /^\/findings\/\d+\/(?:kind|severity|authority|derivedSide|remedy|laneComparison\/\d+\/(?:persisted|derived)StatusLane)$/,
    patch(schema) {
      const finding = schema.properties.findings.items.properties;
      for (const field of ['kind', 'severity', 'authority', 'derivedSide']) finding[field] = { type: 'string', minLength: 1 };
      finding.remedy = { type: ['string', 'null'], minLength: 1 };
      const row = finding.laneComparison.items.properties;
      row.persistedStatusLane = { type: ['string', 'null'] };
      row.derivedStatusLane = { type: ['string', 'null'] };
    },
  },
};

/** The schema names a relaxation patches: `schema` is one name or a list of names. */
export const relaxationSchemas = (relaxation) => [relaxation.schema].flat();

/**
 * Whether one error of the STRICT validator lies inside a relaxation: its path matches `allowedPath` and, for an
 * omittable relaxation, the error is the `required` error naming only one of the members it frees.
 */
export function errorAllowed(relaxation, error) {
  if (!relaxation.allowedPath.test(error.path)) return false;
  if (!relaxation.allowedMissing) return true;
  return error.keyword === 'required' && relaxation.allowedMissing.includes(error.missingProperty);
}
