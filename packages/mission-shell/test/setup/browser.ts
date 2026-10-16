import { afterAll, afterEach } from 'vitest';

// Fails the run on any uncaught error or unhandled rejection (NFR-007, R5-11). The events are not cancelled
// (no preventDefault), so Vitest's own unhandled-error reporting keeps working too. The record is drained in afterEach
// and in afterAll, so an error raised in a hook or after the last test still fails the file.
const recorded: unknown[] = [];

window.addEventListener('error', (event) => {
  recorded.push(event.error ?? event.message);
});
window.addEventListener('unhandledrejection', (event) => {
  recorded.push(event.reason);
});

function rethrow(): void {
  if (recorded.length > 0) {
    const [first] = recorded.splice(0);
    throw first;
  }
}

afterEach(rethrow);
afterAll(async () => {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  rethrow();
});
