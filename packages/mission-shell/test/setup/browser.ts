import { afterEach } from 'vitest';

// Fails the run on any uncaught error or unhandled rejection (NFR-007). The events are not cancelled
// (no preventDefault), so Vitest's own unhandled-error reporting keeps working too.
const recorded: unknown[] = [];

window.addEventListener('error', (event) => {
  recorded.push(event.error ?? event.message);
});
window.addEventListener('unhandledrejection', (event) => {
  recorded.push(event.reason);
});

afterEach(() => {
  if (recorded.length > 0) {
    const [first] = recorded.splice(0);
    throw first;
  }
});
