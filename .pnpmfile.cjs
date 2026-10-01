'use strict';
// Runs before dependency resolution: fail fast, offline, when the registry credential is missing.
require('./scripts/preflight-core.cjs').check(process.argv, process.env);

module.exports = { hooks: {} };
