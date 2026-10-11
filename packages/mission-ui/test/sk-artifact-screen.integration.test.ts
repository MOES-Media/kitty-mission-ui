// The host composition of the Artifact Viewer (SC-009, FR-037): a host renders the screen passing only contract-shaped data (the
// listing and the content as the contract documents), the Mission, the view states, `now` and labels, with no change to the screen
// and no I/O performed by it. The "host" below is a plain function; it never reaches into the screen except to read the result.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import { contentJson, contentMarkdown, detailImplement, listingPopulated, listingWithOpenFiles } from '../src/contract/fixtures.generated.js';
import type { ArtifactContentView, ArtifactListingView } from '../src/contract/types.js';
import type { MissionDetailView } from '../src/contract/types.js';
import type { SkArtifactScreen } from '../src/elements/sk-artifact-screen/sk-artifact-screen.js';
import { artifactFrame } from '../src/elements/sk-artifact-screen/fixtures.js';

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

/** Every I/O door the charter forbids to a screen; each spy records its calls, and none may be called. */
function spyOnIo(): Array<{ name: string; spy: ReturnType<typeof vi.fn> }> {
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no I/O in a screen'));
  const xhr = vi.spyOn(XMLHttpRequest.prototype, 'open');
  const getItem = vi.spyOn(Storage.prototype, 'getItem');
  const setItem = vi.spyOn(Storage.prototype, 'setItem');
  const beacon = vi.spyOn(navigator, 'sendBeacon');
  const socket = vi.spyOn(globalThis, 'WebSocket').mockImplementation(() => {
    throw new Error('no I/O in a screen');
  });
  return [
    { name: 'fetch', spy: fetchSpy },
    { name: 'XMLHttpRequest.open', spy: xhr },
    { name: 'Storage.getItem', spy: getItem },
    { name: 'Storage.setItem', spy: setItem },
    { name: 'navigator.sendBeacon', spy: beacon },
    { name: 'WebSocket', spy: socket },
  ];
}

const frames = async (n = 3): Promise<void> => {
  for (let i = 0; i < n; i += 1) await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
};

// What the host holds: the contract documents, as the contract types them.
const listing: ArtifactListingView = listingWithOpenFiles as unknown as ArtifactListingView;
const markdown: ArtifactContentView = contentMarkdown as unknown as ArtifactContentView;
const json: ArtifactContentView = contentJson as unknown as ArtifactContentView;
const detail = detailImplement as unknown as MissionDetailView;

const HOST_NOW = '2026-09-30T14:00:00Z';
const HOST_SIZE = 'host-size-text';

describe('a host composes the Artifact screen from contract-shaped data only', () => {
  it('renders from the contract documents, the Mission, the view states, now and labels, and performs no I/O', async () => {
    await page.viewport(1280, 900);
    const io = spyOnIo();
    const screen = document.createElement('sk-artifact-screen') as SkArtifactScreen;
    const events: string[] = [];
    for (const name of ['sk-select-artifact', 'sk-open-link', 'sk-select-work-package', 'sk-open-mission', 'sk-retry-load']) screen.addEventListener(name, () => events.push(name));
    // The Mission the listing belongs to: a MissionDetail is accepted as is; the host pairs it with the listing by `missionId`.
    const mission = { ...detail, missionId: listing.missionId };
    // The host's whole contribution: contract documents, the Mission (a MissionDetail is accepted as is), the work package ids, the
    // view states, `now` and the label hooks.
    Object.assign(screen, {
      status: 'ready',
      contentStatus: 'ready',
      listing,
      content: markdown,
      selectedPath: markdown.path,
      mission,
      workPackages: detail.workPackages.map((wp) => ({ wpId: wp.wpId, title: wp.title })),
      view: 'rendered',
      now: HOST_NOW,
      labels: { size: () => HOST_SIZE },
    });
    const box = document.createElement('div');
    document.body.append(box);
    render(artifactFrame(html`${screen}`), box);
    await screen.updateComplete;
    await frames();

    const text = screen.shadowRoot?.textContent ?? '';
    expect(screen.shadowRoot?.querySelector('article[data-scroll="article"] > h1')?.textContent).toBe('Example Mission');
    expect(text, 'the host size label is used').toContain(HOST_SIZE);
    expect(text, 'the Mission fact is shown').toContain(String(detail.friendlyName));

    // A host-driven state change: the same screen shows a non-markdown document as Raw only, with no change to the screen.
    Object.assign(screen, { content: json, selectedPath: json.path });
    await screen.updateComplete;
    await frames();
    expect(screen.shadowRoot?.querySelector('article[data-scroll="article"]')).toBeNull();
    expect(screen.shadowRoot?.querySelector('[data-scroll="source"]')).not.toBeNull();

    // A listing state: the host passes the listing failure and the screen shows it.
    Object.assign(screen, { status: 'error', listing: null, content: null, selectedPath: '' });
    await screen.updateComplete;
    expect(screen.shadowRoot?.textContent).not.toContain('Example Mission');

    expect(events, 'a render and three host updates emit nothing').toEqual([]);
    expect(io.length).toBe(6);
    for (const { name, spy } of io) expect(spy.mock.calls.length, `${name} was called`).toBe(0);
  });

  it('a Mission that does not own the listing shows the loading state, never another Mission\'s tree (control for the pairing above)', async () => {
    await page.viewport(1280, 900);
    const screen = document.createElement('sk-artifact-screen') as SkArtifactScreen;
    Object.assign(screen, { status: 'ready', listing, content: markdown, selectedPath: markdown.path, mission: detail, now: HOST_NOW });
    document.body.append(screen);
    await screen.updateComplete;
    expect(screen.shadowRoot?.querySelector('article[data-scroll="article"]')).toBeNull();
    expect(screen.shadowRoot?.textContent).toContain('Loading artifacts');
  });

  it('positive control: the I/O spies do record a call made on the same doors', async () => {
    const io = spyOnIo();
    await expect(fetch('/probe')).rejects.toThrow();
    localStorage.getItem('probe');
    expect(io.find((entry) => entry.name === 'fetch')!.spy.mock.calls.length).toBe(1);
    expect(io.find((entry) => entry.name === 'Storage.getItem')!.spy.mock.calls.length).toBe(1);
  });

  it('the same contract documents render from the unmodified fixture listing too (the host does not need the open-files overlay)', async () => {
    await page.viewport(1280, 900);
    const screen = document.createElement('sk-artifact-screen') as SkArtifactScreen;
    Object.assign(screen, { status: 'ready', listing: listingPopulated, content: markdown, selectedPath: markdown.path, now: HOST_NOW });
    document.body.append(screen);
    await screen.updateComplete;
    expect(screen.shadowRoot?.querySelector('article[data-scroll="article"] > h1')?.textContent).toBe('Example Mission');
  });
});
