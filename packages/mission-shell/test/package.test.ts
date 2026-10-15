// The package manifest of the shell (pre-merge R1): what a consumer of @moes-media/mission-shell installs and may import.
import { describe, expect, it } from 'vitest';
import shellPackage from '../package.json' with { type: 'json' };
import rootPackage from '../../../package.json' with { type: 'json' };

describe('package manifest', () => {
  it('maps exactly the main entry and the ./testing entry, so no deep import reaches the internals (CODE-BOUNDARY-003)', () => {
    const exportsMap = (shellPackage as { exports?: unknown }).exports;
    expect(exportsMap).toEqual({ '.': './src/index.ts', './testing': './src/testing.ts' });
    expect(shellPackage.main).toBe('src/index.ts');
  });


  it('declares svelte as an exact peer dependency, equal to the workspace pin (CODE-BOUNDARY-004)', () => {
    const peers = (shellPackage as { peerDependencies?: Record<string, string> }).peerDependencies;
    expect(peers?.svelte).toBe(rootPackage.devDependencies.svelte);
    expect(peers?.svelte).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
