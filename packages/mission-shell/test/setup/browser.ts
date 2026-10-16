// NFR-007 / R5-11: an uncaught error or unhandled rejection must fail the run, and nothing here may swallow one.
// Vitest's own handling does that (it reports "Unhandled Errors" and exits 1, in a test, in a hook and across files),
// and any listener or afterEach/afterAll drain registered here weakened it, so this file intercepts nothing. It stays
// as the project's named setup hook; add a passive observer here only if it never consumes or cancels the event.
export {};
