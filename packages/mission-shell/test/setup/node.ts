import { afterAll, afterEach } from 'vitest';

// Fails the run on any uncaught error or unhandled rejection (NFR-007, R5-11). The error is recorded and rethrown from
// afterEach (so the test that caused it fails with the original error) and from afterAll (so an error raised in a
// hook or after the last test still fails the file). Nothing here only logs. The record lives on globalThis next to
// the guard, so handlers registered by an earlier evaluation (--isolate=false) drain into the same array.
interface Store {
  recorded: unknown[];
}
const holder = globalThis as { __shellNodeSetup?: Store };

if (holder.__shellNodeSetup === undefined) {
  const store: Store = { recorded: [] };
  holder.__shellNodeSetup = store;
  process.on('unhandledRejection', (reason) => {
    store.recorded.push(reason);
  });
  process.on('uncaughtException', (error) => {
    store.recorded.push(error);
  });
}

function rethrow(): void {
  const store = holder.__shellNodeSetup;
  if (store !== undefined && store.recorded.length > 0) {
    const [first] = store.recorded.splice(0);
    throw first;
  }
}

afterEach(rethrow);
afterAll(async () => {
  // Give a rejection raised by an earlier afterAll a turn of the event loop to be reported.
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  rethrow();
});
