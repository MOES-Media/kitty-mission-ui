'use strict';
// Node 22 treats a directory argument to `node --test` as a module to load; this entry point makes
// `node --test scripts/gate-proof/` run the suite.
import('./gate-proof.test.mjs');
