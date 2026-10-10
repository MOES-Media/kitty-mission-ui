// The story frame's two optional inputs (IC-06b): a sidebar tree and a skip link text. The defaults leave every existing frame as it was.
import { render } from 'lit';
import { afterEach, describe, expect, it } from 'vitest';
import '../src/index.js';
import { shellFrame } from '../src/story-support/shell-frame.js';

const host = document.createElement('div');
document.body.append(host);
afterEach(() => render(null, host));

describe('shellFrame options', () => {
  it('keeps the default skip link and draws no tree', async () => {
    render(shellFrame(document.createElement('div') as never, {}), host);
    const shell = host.querySelector('sk-mission-shell')!;
    expect(shell.querySelector('[slot="skip-link"]')!.textContent).toBe('Skip to the content');
    expect(shell.querySelector('sk-shell-tree')).toBeNull();
  });

  it('passes the skip link text and the tree through', async () => {
    const items = [{ id: 'leaf:spec.md', label: 'spec.md', kind: 'leaf' as const, href: '#spec' }];
    render(shellFrame(document.createElement('div') as never, { skipLink: 'Skip to artifact', tree: { items, current: 'leaf:spec.md' } }), host);
    const shell = host.querySelector('sk-mission-shell')!;
    expect(shell.querySelector('[slot="skip-link"]')!.textContent).toBe('Skip to artifact');
    const tree = shell.querySelector<HTMLElement & { items: unknown; current: string; heading: string }>('sk-shell-tree[slot="sidebar-section"]')!;
    expect(tree.items).toBe(items);
    expect(tree.current).toBe('leaf:spec.md');
    expect(tree.heading).toBe('Artifacts');
    expect(shell.querySelectorAll('sk-shell-tree').length).toBe(1);
  });
});
