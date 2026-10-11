// The states of the screen (IC-08, FR-016, FR-023, FR-024): every state draws exactly one `h1` and names itself in words; the
// busy states show a progress indicator and mark only their panel busy; the controls of a state are drawn inert while there is no
// Mission. Real renders; each "none" assertion has a control that shows the thing in another state.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkArtifactScreen } from '../src/elements/sk-artifact-screen/sk-artifact-screen.js';
import { artifactFrame, pairingProps } from '../src/elements/sk-artifact-screen/fixtures.js';
import type { ArtifactScreenProps, PairingId } from '../src/elements/sk-artifact-screen/fixtures.js';

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

async function settle(screen: SkArtifactScreen): Promise<void> {
  await screen.updateComplete;
  for (let i = 0; i < 3; i += 1) await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}
async function mount(id: PairingId, props: Partial<ArtifactScreenProps> = {}): Promise<SkArtifactScreen> {
  await page.viewport(1280, 900);
  const screen = document.createElement('sk-artifact-screen');
  Object.assign(screen, { ...pairingProps(id), ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(artifactFrame(html`${screen}`), box);
  await settle(screen);
  return screen;
}
const root = (el: Element): ShadowRoot => {
  if (el.shadowRoot === null) throw new Error('no shadow root');
  return el.shadowRoot;
};
const words = (el: Element | null): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const headings = (screen: Element): HTMLElement[] => Array.from(root(screen).querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6'));
const buttons = (screen: Element): HTMLElement[] => Array.from(root(screen).querySelectorAll<HTMLElement>('[data-state-panel] sk-button, [data-refusal] sk-button'));

interface StateCase {
  id: PairingId;
  name: string;
  h1: string;
  body: string | null;
  action: string | null;
  busy: boolean;
  /** The pane draws the toolbar (a loading file keeps its name). */
  toolbar: boolean;
}
const CASES: StateCase[] = [
  { id: 'AV-09', name: 'a refusal', h1: 'Artifact unavailable', body: 'This artifact does not exist in this Mission.', action: null, busy: false, toolbar: false },
  { id: 'AV-14', name: 'the listing error', h1: 'Artifacts unavailable', body: 'The list of artifacts could not be loaded. No artifacts are shown.', action: 'Retry', busy: false, toolbar: false },
  { id: 'AV-18', name: 'an empty listing', h1: 'No artifacts', body: null, action: null, busy: false, toolbar: false },
  { id: 'AV-20', name: 'the listing loading', h1: 'Loading artifacts', body: null, action: null, busy: true, toolbar: false },
  { id: 'AV-21', name: 'the content loading', h1: 'File: spec.md', body: null, action: null, busy: true, toolbar: true },
  { id: 'AV-22', name: 'nothing selected', h1: 'Choose an artifact', body: null, action: null, busy: false, toolbar: false },
  { id: 'AV-23', name: 'a Mission not found', h1: 'Mission not found', body: 'This Mission could not be found.', action: 'Return to Pipeline', busy: false, toolbar: false },
];

describe('every state names itself with exactly one h1', () => {
  it('draws one heading, an h1, per state with the words of the state (the content loading takes the pane\'s hidden h1)', async () => {
    let ran = 0;
    for (const c of CASES) {
      const screen = await mount(c.id);
      const found = headings(screen);
      expect(found.map((h) => h.tagName), c.name).toEqual(['H1']);
      expect(words(found[0] ?? null), c.name).toBe(c.h1);
      ran += 1;
    }
    expect(ran).toBe(7);
  });

  it('draws the visible title of the content loading look as words, with the file name (control: the listing loading has no toolbar)', async () => {
    const content = await mount('AV-21');
    expect(words(root(content).querySelector('[data-state-panel] .sk-empty-state__heading'))).toBe('Loading spec.md');
    expect(root(content).querySelector('[data-region="toolbar"]')).not.toBeNull();
    const listing = await mount('AV-20');
    expect(root(listing).querySelector('[data-region="toolbar"]')).toBeNull();
  });

  it('draws the words, the one control and the busy marker of each state, and nothing else', async () => {
    for (const c of CASES) {
      const screen = await mount(c.id);
      const body = root(screen).querySelector('[data-refusal] .sk-empty-state__body, [data-state-panel] .sk-empty-state__body');
      expect(body === null ? null : words(body), c.name).toBe(c.body);
      expect(buttons(screen).map(words), c.name).toEqual(c.action === null ? [] : [c.action]);
      const panel = root(screen).querySelector('[data-state-panel]');
      expect(panel?.getAttribute('aria-busy') ?? 'false', c.name).toBe(c.busy ? 'true' : 'false');
      expect(root(screen).querySelector('[data-state-panel] progress') !== null, c.name).toBe(c.busy);
      expect((root(screen).querySelector('[data-region="toolbar"]') !== null), c.name).toBe(c.toolbar);
    }
  });
});

describe('the busy look (AV-20, AV-21)', () => {
  it('names the progress indicator by the title and keeps the tree out of it: no inert on the host, aria-busy only on the panel', async () => {
    for (const id of ['AV-20', 'AV-21'] as const) {
      const screen = await mount(id);
      const bar = root(screen).querySelector('progress');
      const title = root(screen).querySelector('[data-state-panel] .sk-empty-state__heading');
      expect(bar?.getAttribute('aria-labelledby'), id).toBe(title?.id);
      expect(title?.id, id).not.toBe('');
      expect(screen.hasAttribute('inert'), id).toBe(false);
      expect(screen.closest('[inert]'), id).toBeNull();
      expect(Array.from(root(screen).querySelectorAll('[aria-busy="true"]')).length, id).toBe(1);
      expect(root(screen).querySelector('[data-root]')?.hasAttribute('aria-busy'), id).toBe(false);
    }
    const ready = await mount('AV-01');
    expect(root(ready).querySelector('progress')).toBeNull();
    expect(root(ready).querySelector('[aria-busy="true"]')).toBeNull();
  });
});

describe('the host text of the listing error', () => {
  it('shows the `errorMessage` of the host in place of the default (control: the default without one)', async () => {
    const custom = await mount('AV-14', { errorMessage: 'The index did not answer.' });
    expect(words(root(custom).querySelector('[data-state-panel] .sk-empty-state__body'))).toBe('The index did not answer.');
    const plain = await mount('AV-14');
    expect(words(root(plain).querySelector('[data-state-panel] .sk-empty-state__body'))).toBe('The list of artifacts could not be loaded. No artifacts are shown.');
  });

  it('never repeats the title as the body (the Missions error panel convention), with a control that the check can fail', async () => {
    const sentence = (text: string): string => text.trim().replace(/[.\s]+$/u, '').toLowerCase();
    for (const props of [{}, { errorMessage: 'The index did not answer.' }]) {
      const screen = await mount('AV-14', props);
      const title = words(root(screen).querySelector('[data-state-panel] h1'));
      const body = words(root(screen).querySelector('[data-state-panel] .sk-empty-state__body'));
      expect(body.length).toBeGreaterThan(0);
      expect(sentence(title)).not.toBe(sentence(body));
    }
    // Control: a host that passes the title as its own message does repeat it, and the check sees that.
    const repeated = await mount('AV-14', { errorMessage: 'Artifacts unavailable' });
    expect(sentence(words(root(repeated).querySelector('[data-state-panel] h1')))).toBe(sentence(words(root(repeated).querySelector('[data-state-panel] .sk-empty-state__body'))));
  });
});

describe('controls without a Mission are drawn inert', () => {
  it('draws Retry and "Return to Pipeline" disabled while `mission` is null (control: enabled with a Mission)', async () => {
    for (const id of ['AV-14', 'AV-23'] as const) {
      const without = await mount(id, { mission: null });
      const [inert] = buttons(without);
      expect(inert?.hasAttribute('disabled'), id).toBe(true);
      const withMission = await mount(id);
      const [live] = buttons(withMission);
      expect(live?.hasAttribute('disabled'), id).toBe(false);
    }
  });

  it('draws the Retry of a refusal inert without a Mission (control: enabled with one)', async () => {
    const without = await mount('AV-13', { mission: null });
    expect(buttons(without)[0]?.hasAttribute('disabled')).toBe(true);
    const withMission = await mount('AV-13');
    expect(buttons(withMission)[0]?.hasAttribute('disabled')).toBe(false);
  });
});

describe('the card of the states (E-45)', () => {
  it('draws every whole-screen state in the same dashed card as the refusal, border-box, inside its cell (control: the document has none)', async () => {
    let ran = 0;
    for (const id of ['AV-14', 'AV-18', 'AV-20', 'AV-21', 'AV-22', 'AV-23'] as const) {
      const screen = await mount(id);
      const panel = root(screen).querySelector<HTMLElement>('[data-state-panel]');
      const card = panel?.querySelector<HTMLElement>('.sk-empty-state');
      if (panel === null || panel === undefined || card === null || card === undefined) throw new Error(`no card ${id}`);
      const style = getComputedStyle(card);
      expect(style.boxSizing, id).toBe('border-box');
      expect(style.borderTopStyle, id).toBe('dashed');
      expect(card.getBoundingClientRect().width, id).toBeLessThanOrEqual(panel.getBoundingClientRect().width);
      ran += 1;
    }
    expect(ran).toBe(6);
    const doc = await mount('AV-01');
    expect(root(doc).querySelector('[data-state-panel]')).toBeNull();
  });
});
