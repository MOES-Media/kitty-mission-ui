'use strict';
// Node 22 treats a directory argument to `node --test` as a module to load; this entry point makes
// `node --test scripts/hygiene/` run the suite.
import('./hygiene.test.mjs');
import('./cargo-pins.test.mjs');
import('./rust-toolchain.test.mjs');
