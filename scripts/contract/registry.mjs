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
};

/** Every distinct `satisfies` target, for the generated import line. */
export const SATISFIES_TARGETS = [...new Set(Object.values(FIXTURES).map((x) => x.satisfies))].sort();

/**
 * Named relaxations. `patch` is applied to a `structuredClone` of the dereferenced schema (never to the pristine
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
};
