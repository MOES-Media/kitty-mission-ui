import { afterEach } from 'vitest';

// Fails the run on any uncaught error or unhandled rejection (NFR-007): the error is recorded and rethrown from an
// afterEach, so the test that caused it fails with the original error. Nothing here only logs.
const recorded: unknown[] = [];
const guard = globalThis as { __shellNodeSetup?: true };

if (guard.__shellNodeSetup !== true) {
  guard.__shellNodeSetup = true;
  process.on('unhandledRejection', (reason) => {
    recorded.push(reason);
  });
  process.on('uncaughtException', (error) => {
    recorded.push(error);
  });
}

afterEach(() => {
  if (recorded.length > 0) {
    const [first] = recorded.splice(0);
    throw first;
  }
});
