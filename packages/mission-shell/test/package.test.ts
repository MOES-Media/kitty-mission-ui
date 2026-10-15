// The package manifest of the shell (pre-merge R1): what a consumer of @moes-media/mission-shell installs and may import.
import { describe, expect, it } from 'vitest';
import shellPackage from '../package.json' with { type: 'json' };
import rootPackage from '../../../package.json' with { type: 'json' };

describe('package manifest', () => {
  it('declares svelte as an exact peer dependency, equal to the workspace pin (CODE-BOUNDARY-004)', () => {
    const peers = (shellPackage as { peerDependencies?: Record<string, string> }).peerDependencies;
    expect(peers?.svelte).toBe(rootPackage.devDependencies.svelte);
    expect(peers?.svelte).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
